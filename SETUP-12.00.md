# Runbook Fikri — Setup CI/CD MARIVEST

Setelah semua langkah di sini selesai, tim cukup: **buat branch → push → buka PR → merge**.
Lint, typecheck, build, preview deploy, smoke test, deploy production, dan migrasi database berjalan sendiri.

---

## A. SEBELUM 12.00 — tanpa menyentuh repo

- [ ] `node -v` = v24, Docker Desktop jalan, `marivest-kit.zip` diekstrak
- [ ] Sultan & Affan jadi collaborator repo (Settings > Collaborators)
- [ ] **Project Vercel dibuat** (tanpa Git dulu):
      ```bash
      npx vercel login
      npx vercel project add marivest
      ```
- [ ] Vercel > project `marivest` > Settings > **Deployment Protection**
  - Vercel Authentication: **Standard Protection** (hanya preview; URL production tetap publik untuk juri)
  - **Protection Bypass for Automation** > Add > salin secret-nya (untuk langkah C3)
- [ ] Vercel > Settings > **Environment Variables** (centang Production + Preview + Development), begitu Sultan mengirim:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SECRET_KEY` (hanya jika dipakai)

## B. 12.00 — Scaffold & push pertama (±5 menit)

```bash
git clone https://github.com/<owner>/<repo>.git marivest
cd marivest
npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
```

Salin **seluruh isi** folder `marivest-kit` ke root repo (termasuk `.github` dan file berawalan titik). Lalu:

```bash
node scripts/apply-kit.mjs
npm install @supabase/supabase-js @supabase/ssr
npx supabase init
npm run lint && npm run typecheck && npm run build
git add -A
git commit -m "chore: scaffold Next.js + CI/CD kit"
git push origin main
```

Kabari tim: **"main siap, silakan pull."**

## C. Sambungkan semuanya (±7 menit)

1. **Vercel > project `marivest` > Settings > Git > Connect Git Repository** → pilih repo. Vercel langsung deploy `main`. Catat URL production dan kirim ke Sultan untuk Supabase Auth > URL Configuration.
2. Jika env var belum sempat diisi di langkah A: isi sekarang, lalu **Deployments > deployment teratas > ⋯ > Redeploy**. (Env var baru hanya berlaku untuk deployment berikutnya.)
3. **GitHub repo > Settings > Secrets and variables > Actions > New repository secret**:

   | Secret | Isi | Wajib? |
   |---|---|---|
   | `VERCEL_AUTOMATION_BYPASS_SECRET` | dari langkah A | ya |
   | `SUPABASE_ACCESS_TOKEN` | dibuat Sultan (supabase.com > Account > Access Tokens) | jika pakai folder migrasi |
   | `SUPABASE_PROJECT_REF` | ID di URL dashboard Supabase | jika pakai folder migrasi |
   | `SUPABASE_DB_PASSWORD` | password DB dari Sultan | jika pakai folder migrasi |

4. **Ruleset** — tunggu CI pertama selesai di tab Actions, lalu Settings > Rules > Rulesets > New branch ruleset:
   - Target: `main` (Include default branch)
   - ✅ Require a pull request before merging — Required approvals: **0**
   - ✅ Require status checks to pass → tambahkan **`check`**
   - ✅ Block force pushes
   - Bypass list: tambahkan dirimu (role Admin), untuk darurat menjelang deadline

## D. Verifikasi sekali (±3 menit)

- [ ] Buat branch `test/ci`, ubah satu teks, buka PR
- [ ] PR menampilkan: ✅ CI `check`, ✅ komentar bot Vercel dengan link preview, ✅ **Smoke test deployment**
- [ ] Tutup PR (jangan merge), hapus branch
- [ ] Buka URL production di **jendela incognito** → terbuka tanpa login

**Selesai.** Dari sini tidak ada lagi yang perlu diatur.

---

## Yang berjalan otomatis setelah ini

| Kejadian | Yang terjadi otomatis |
|---|---|
| Push ke branch / buka PR | CI (cek secret, lint, typecheck, build) + preview deploy Vercel |
| Preview selesai deploy | Smoke test ke semua halaman di `app/` (ditemukan otomatis, tidak perlu daftar manual) |
| Perubahan Dockerfile/compose/package.json | Build ulang image dev untuk memastikan tetap jalan |
| Merge ke `main` | Deploy production + smoke test production |
| Merge file di `supabase/migrations/` | Migrasi diterapkan ke database (jika secrets diisi) |
| Push baru ke PR yang sama | Run CI & build Vercel lama dibatalkan otomatis |

## Aturan main tim (sampaikan ke Sultan & Affan)

- Kerja di branch `feat/<nama>`, jangan push langsung ke `main` (memang akan ditolak).
- Merge hanya jika CI hijau. QA di link preview pakai `docs/QA-CHECKLIST.md`.
- Jangan commit `.env.local` — CI akan gagal dan kunci harus diganti.
- Perubahan skema: `npx supabase migration new <nama>` lalu tulis SQL di file yang dibuat.

## Jika ada masalah

| Gejala | Penyebab umum | Solusi |
|---|---|---|
| CI gagal di "Cek kebocoran secret" | `.env.local` ikut ter-commit | `git rm --cached .env.local`, commit, lalu **ganti kunci** di Supabase |
| Smoke test: `/` 401 | bypass secret salah/belum diisi | ulangi A (bypass) dan C3 |
| Smoke test: halaman lain 404/500 | halaman benar-benar rusak di deployment itu | buka link preview, cek log di Vercel > Deployments > Logs |
| Build lokal OK, Vercel gagal | env var belum diset untuk Preview | cek A / C2 |
| Login di Vercel balik ke localhost | Supabase Auth URL Configuration belum diisi | Sultan isi Site URL + Redirect URLs |
| Docker lambat di Windows | file watching | `npm run docker:dev` (sudah pakai `--watch`) atau `npm run dev` langsung |
| Status check `check` tidak muncul di ruleset | CI belum pernah jalan | tunggu run pertama, lalu tambahkan |
| Darurat jam terakhir, CI lama | — | merge lewat bypass admin di ruleset; jangan matikan CI |
