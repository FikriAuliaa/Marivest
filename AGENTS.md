<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# ATURAN PROYEK MARIVEST (untuk AI coding agent)

## Konteks

Prototipe web untuk INCEPTION 2026 Hackathon (build sprint 24 jam). Dua modul berdiri sendiri, berbagi akun dan profil usaha:

- Financial & Investment: pelaku usaha perikanan membuat proyek pendanaan; Mitra memberi komitmen SIMULASI dan melihat ilustrasi bagi hasil.
- Marketplace: katalog produk perikanan dan pemesanan SIMULASI.

SEMUA UANG SIMULASI. Dilarang:
- Payment gateway.
- Transfer atau pencairan dana nyata.
- Janji keuntungan.
- Fitur AI.
- Integrasi logistik.
- Sertifikasi halal.
- Verifikasi identitas otomatis.
- Aplikasi mobile native.

## Stack (jangan diganti)

- Next.js 16 App Router dengan folder `src/`.
- TypeScript strict.
- Tailwind CSS 4.
- npm dan Node.js 24.
- Supabase (Auth, PostgreSQL, Storage) via `@supabase/ssr` dan `@supabase/supabase-js`.
- Deploy Vercel (region Singapore).

Ketentuan Next.js 16:
- `middleware.ts` sudah diganti menjadi `src/proxy.ts`.
- `cookies()`, `headers()`, `params`, dan `searchParams` bersifat async; selalu gunakan `await`.
- `next lint` sudah dihapus; gunakan `npm run lint`.
- `next build` tidak menjalankan lint.
- Jika ragu tentang API Next.js, baca dokumentasi lokal di `node_modules/next/dist/docs/` terlebih dahulu.

## Environment Variables

Gunakan nama variable secara persis:

- `NEXT_PUBLIC_SUPABASE_URL`: client dan server.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: client dan server.
- `SUPABASE_SECRET_KEY`: server saja, hanya jika diperlukan untuk seeding/admin.

Ketentuan:
- Jangan menggunakan `SUPABASE_SECRET_KEY` pada komponen `"use client"`.
- Jangan memberikan prefix `NEXT_PUBLIC_` pada secret key.
- Jika menambahkan environment variable baru, tambahkan ke `.env.example` dan kabari Fikri untuk pengaturan Vercel.
- Jangan pernah commit `.env.local`.

## Struktur Kode

Gunakan struktur berikut:

```text
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── financial/
│   ├── marketplace/
│   ├── dashboard/
│   └── admin/
├── components/
└── lib/
    ├── supabase/
    │   ├── server.ts
    │   └── client.ts
    └── domain/
        ├── funding.ts
        ├── profit-sharing.ts
        └── orders.ts

src/proxy.ts
supabase/
└── migrations/
```

Ketentuan:
- `src/lib/supabase/server.ts` menggunakan `createServerClient` dari `@supabase/ssr`.
- `src/lib/supabase/client.ts` menggunakan `createBrowserClient`.
- `src/proxy.ts` digunakan untuk refresh sesi dan proteksi route.
- Semua perubahan skema database harus masuk ke `supabase/migrations/`.

Fungsi di `src/lib/domain/` merupakan LOGIKA BISNIS MURNI (input → output). Dilarang memanggil Supabase, `fetch`, atau React di dalamnya agar mudah diuji.

Fungsi yang harus tersedia:

- `funding.ts`: `fundingPercent`, `remainingTarget`, `validateCommitment`.
- `profit-sharing.ts`: `netProfit`, `splitProfit`, `allocateToInvestors`.
- `orders.ts`: `canTransition(from, to, actorRole)`, `orderTotal(price, qty)`.

## Model Data

Nama tabel menggunakan `snake_case`.

Uang selalu disimpan sebagai integer rupiah (`bigint`), tidak pernah menggunakan float.

### Tabel

| Tabel | Kolom utama |
|---|---|
| profiles | id (= auth.users.id), full_name, role |
| business_profiles | owner_id, name, category, description, verification_status |
| funding_projects | business_id, target_amount, purpose, description, investor_share_ratio, verification_status, funding_status |
| funding_commitments | project_id, investor_id, amount, idempotency_key (unique) |
| products | business_id, name, category, description, price, unit, stock, image_url, is_published |
| orders | product_id, buyer_id, quantity, total_amount, status |
| financial_entries | business_id, project_id (nullable), type (revenue/cost), amount, period, note |

### Enum

**role**
- `pelaku_usaha`
- `mitra`
- `superadmin`

**category** (atribut profil usaha, BUKAN role)
- `nelayan_tangkap`
- `pembudidaya_ikan`
- `petambak`
- `petani_rumput_laut`
- `umkm_perikanan`

**verification_status**
- `pending`
- `needs_revision`
- `approved`

**funding_status**
- `open`
- `funded`

Status `funded` ditampilkan sebagai "Funded (Simulation)".

**orders.status**
- `pending`
- `confirmed`
- `completed`
- `cancelled`

## Aturan Bisnis

1. Total selalu dihitung dari baris data (`SUM`), bukan counter yang di-increment. Hal ini mencegah komitmen atau pesanan terhitung dua kali.

2. Persentase pendanaan:
   `total komitmen / target × 100`.

   Contoh:
   - Target Rp5.000.000.
   - Komitmen Rp2.000.000 = 40%.
   - Tambahan Rp3.000.000 = 100% dan status menjadi `funded`.

3. Validasi komitmen wajib dilakukan di server/database, bukan hanya UI:
   - Amount > 0.
   - Amount ≤ sisa target.
   - Proyek berstatus approved dan open.
   - Pengecekan dan insert dilakukan dalam satu fungsi PostgreSQL (RPC) dengan `SELECT ... FOR UPDATE`.
   - Gunakan `idempotency_key` (`crypto.randomUUID()` per submit) untuk mencegah double-submit.
   - Tombol submit dinonaktifkan selama proses pending.

4. Bagi hasil:
   - Laba = revenue − cost dari `financial_entries` yang `project_id`-nya merupakan proyek tersebut saja.
   - Jika laba > 0, bagian investor = laba × `investor_share_ratio`.
   - Bagian investor dibagi berdasarkan proporsi komitmen.
   - Gunakan integer rupiah, bulatkan ke bawah; sisa pembulatan diberikan kepada pelaku usaha.
   - Jika laba ≤ 0, tampilkan Impas/Rugi tanpa pembagian.

   Contoh:
   - Revenue Rp6.500.000.
   - Cost Rp5.500.000.
   - Rasio investor 30%.
   - Total laba Rp1.000.000.
   - Bagian investor Rp300.000.
   - Bagian pelaku usaha Rp700.000.
   - Investor A dengan komitmen Rp2.000.000 mendapat Rp120.000.
   - Investor B dengan komitmen Rp3.000.000 mendapat Rp180.000.

5. Penjualan Marketplace tidak otomatis menjadi laba proyek.

6. Alur pesanan:
   - `pending` → `confirmed` → `completed`.
   - Pesanan juga dapat berubah menjadi `cancelled`.
   - Hanya pemilik produk yang boleh mengubah status pesanan.
   - Kuantitas harus > 0 dan ≤ stok.
   - Stok berkurang saat status menjadi `confirmed`.
   - Stok dikembalikan saat `confirmed` → `cancelled`.

7. Profil usaha dan proyek yang belum `approved` tidak boleh tampil di katalog publik.

8. Teks UI tidak boleh menjanjikan keuntungan. Status verifikasi bukan jaminan kelayakan investasi.

## Keamanan dan Hak Akses

- Row Level Security (RLS) wajib aktif pada SEMUA tabel di schema `public`.
- Jangan pernah menonaktifkan RLS.
- Pelaku usaha hanya boleh mengubah data miliknya (`owner_id = auth.uid()` melalui relasi).
- Mitra dapat membaca data approved/published, membuat komitmen dan pesanan atas namanya sendiri, serta tidak bisa mengubah status pesanan.
- Gunakan helper SQL `public.is_superadmin()` dengan `SECURITY DEFINER` dan `STABLE` untuk policy SuperAdmin.
- Trigger pembuat `profiles` dari `auth.users` hanya menerima role `pelaku_usaha` atau `mitra`. Selain itu, gunakan `mitra` sebagai default.
- User tidak boleh mengubah kolom role miliknya sendiri.
- SuperAdmin dibuat manual oleh tim.
- Proteksi route dilakukan melalui `src/proxy.ts` dan pengecekan role di Server Component/Server Action.
- Pengecekan UI saja tidak cukup untuk keamanan.

## Pengambilan Data dan Mutasi

- Ambil data di Server Component atau Server Action menggunakan `src/lib/supabase/server.ts`.
- Supabase client di browser hanya digunakan untuk kebutuhan interaktif seperti upload foto.
- Mutasi dilakukan melalui Server Action dan `revalidatePath`.
- Validasi input wajib dilakukan di server. Boleh menggunakan Zod untuk validasi.

## Wajib Lolos CI dan Smoke Test

- Setiap halaman dapat dibuka tanpa login tanpa menyebabkan crash.
- Redirect ke `/login` diperbolehkan.
- Error 500 tidak diperbolehkan.
- Halaman harus aman ketika database kosong dengan menampilkan empty state.
- Sebelum commit, wajib menjalankan:

```bash
npm run lint
npm run typecheck
npm run build
```

Dilarang mengakali CI menggunakan:
- `@ts-ignore`.
- `any` untuk membungkam error.
- `eslint-disable` massal.
- `ignoreBuildErrors`.

## Migrasi Database

Setiap perubahan skema wajib menggunakan migration:

```bash
npx supabase migration new <nama>
```

Tulis SQL perubahan pada file migration yang dibuat.

Ketentuan SQL:
- Gunakan `CREATE TABLE IF NOT EXISTS`.
- Gunakan `ADD COLUMN IF NOT EXISTS`.
- Gunakan `CREATE OR REPLACE FUNCTION`.
- Gunakan `DROP POLICY IF EXISTS` sebelum membuat policy.
- Gunakan `CREATE INDEX IF NOT EXISTS`.
- SQL harus aman dijalankan ulang (idempotent).
- SQL yang diuji melalui SQL Editor dashboard tetap wajib dimasukkan ke file migration pada PR yang sama.
- Migration diterapkan otomatis saat merge ke `main`.
- Jangan menjalankan `supabase db reset` terhadap project remote.

## UI

- Semua teks UI menggunakan Bahasa Indonesia.
- Format rupiah menggunakan:

```typescript
new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
```

- Semua angka pendanaan, pesanan, dan bagi hasil harus memiliki badge "Simulasi".
- Responsif hingga lebar layar 360px.
- Financial & Investment dan Marketplace harus terpisah jelas di navigasi.

## Git Workflow

- Gunakan branch `feat/<fitur>` untuk fitur baru.
- Gunakan branch `fix/<bug>` untuk perbaikan bug.
- Semua perubahan diajukan melalui Pull Request ke `main`.
- Jangan push langsung ke `main`.
- Format commit:
  - `feat:` untuk fitur baru.
  - `fix:` untuk perbaikan bug.
  - `chore:` untuk konfigurasi dan pemeliharaan.
  - `db:` untuk perubahan database.

Alur kerja:

```bash
git checkout main
git pull --ff-only origin main
git checkout -b feat/<nama-fitur>

# Implementasi, review, dan testing

npm run lint
npm run typecheck
npm run build

git add -A
git commit -m "feat: <ringkasan>"
git push -u origin feat/<nama-fitur>
```

Selanjutnya buat PR ke `main`, tunggu CI hijau dan preview Vercel berhasil, lalu kabari Fikri untuk proses merge.

Ketentuan:
- Satu fitur = satu branch = satu PR.
- Jangan mengerjakan Financial dan Marketplace sekaligus dalam satu PR.
- Baca diff dan uji alur fitur sebelum push.
- PR dibuat kecil dan bertahap.

## File yang Tidak Boleh Diubah Tanpa Izin Fikri

- `.github/`
- `Dockerfile.dev`
- `compose.yaml`
- `.dockerignore`
- `vercel.json`
- `scripts/`
- `.nvmrc`
- `.gitattributes`

## Docker

- Dependency/package baru wajib dipasang menggunakan `npm install <paket>` dari laptop (host), bukan dari dalam container.
- Tujuannya agar `package-lock.json` ikut diperbarui dan dapat di-commit.
- Jangan mengubah konfigurasi Docker yang dilindungi tanpa izin Fikri.
