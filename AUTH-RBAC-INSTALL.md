# MARIVEST — Auth & RBAC starter patch

Paket ini adalah **patch**, bukan salinan lengkap repository. File onboarding, gambar, konfigurasi Next.js, dan file lain yang tidak disebut di daftar isi tidak diubah.

## Yang disiapkan

- Supabase browser client dan server client (`@supabase/ssr`).
- Next.js 16 `src/proxy.ts` untuk refresh session dan redirect dari route terlindungi.
- Server Actions untuk Sign In, Sign Up, dan Sign Out.
- Callback PKCE untuk verifikasi email.
- Pembacaan role dari tabel `profiles` di server.
- Dashboard awal untuk `pelaku_usaha`, `mitra`, dan `superadmin`.
- Template SQL untuk migration `auth_profiles`.

## Sebelum memasang

1. Pastikan terminal berada di root repository MARIVEST.
2. Tetap gunakan branch `feat/auth-rbac`.
3. Jangan jalankan `git restore`, `git reset --hard`, atau menghapus `public/images/`.
4. Periksa `git status` dan simpan salinan perubahan bila diperlukan.
5. Pastikan `.env.local` berisi:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Jangan masukkan `.env.local` ke ZIP atau Git.

## Cara memasang patch

Ekstrak ZIP ini ke root repository MARIVEST dan izinkan file yang sama untuk ditimpa, khususnya:

- `src/components/auth/auth-screen.tsx`

File lain di paket ini adalah file baru. Jangan menimpa file proyek lain yang tidak ada dalam ZIP.

## Buat migration resmi

Jalankan dari root repository:

```powershell
npx supabase --version
npx supabase migration new auth_profiles
```

CLI akan membuat nama file timestamp di `supabase/migrations/`. **Jangan membuat nama timestamp sendiri.**

Buka file migration yang baru dibuat, lalu salin isi `supabase/auth_profiles_migration.sql` ke dalam file timestamp tersebut. File template `supabase/auth_profiles_migration.sql` berada di luar folder migrations sehingga tidak akan dibaca sebagai migration oleh CLI.

Periksa hasilnya:

```powershell
Get-ChildItem supabase/migrations
```

Jangan menjalankan SQL manual di SQL Editor. Jangan menjalankan `supabase db reset` ke project remote. Ikuti pipeline migration tim ketika PR di-merge.

## Konfigurasi Supabase Auth

Di Supabase Dashboard → Authentication → URL Configuration:

- Site URL untuk pengembangan lokal: `http://localhost:3000`
- Tambahkan Redirect URL: `http://localhost:3000/auth/callback`
- Jika menggunakan `127.0.0.1`, tambahkan juga `http://127.0.0.1:3000/auth/callback`.
- Tambahkan URL callback Vercel yang dipakai tim setelah domain preview/production ditetapkan.

Jika konfirmasi email aktif, pengguna harus membuka email dan menyelesaikan callback sebelum diarahkan ke dashboard.

## Catatan role dan keamanan

Role resmi MARIVEST:

- `pelaku_usaha`
- `mitra`
- `superadmin`

Mitra adalah akun pembeli sekaligus calon investor. Tidak ada pilihan `superadmin` di halaman pendaftaran publik.

Trigger database hanya menerima `pelaku_usaha` atau `mitra` dari metadata pendaftaran. Nilai lain otomatis menjadi `mitra`. Otorisasi aplikasi membaca role dari tabel `profiles`, bukan mempercayai `user_metadata` dari JWT.

Untuk membuat akun SuperAdmin pertama, tim harus mempromosikan akun yang sudah terdaftar melalui akses administratif Supabase (misalnya Table Editor setelah memverifikasi akun yang benar). Jangan menambahkan pilihan SuperAdmin pada formulir publik.

## Uji lokal setelah migration diterapkan

```powershell
npm run lint
npm run typecheck
npm run build
npm run dev
```

Skenario smoke test:

1. Buka `/` tanpa login — onboarding tetap tampil.
2. Buka `/login` — desain login tetap tampil.
3. Sign Up sebagai Pelaku Usaha — email harus membuat baris `profiles` dengan role `pelaku_usaha`.
4. Sign Up sebagai Mitra — email harus membuat baris `profiles` dengan role `mitra`.
5. Jika konfirmasi email aktif, verifikasi email lalu kembali ke aplikasi.
6. Login — Pelaku Usaha dan Mitra diarahkan ke `/dashboard`, dengan konten berbeda.
7. Akun SuperAdmin yang disiapkan tim diarahkan dari `/dashboard` ke `/admin`.
8. Buka `/dashboard` atau `/admin` di browser privat tanpa login — harus diarahkan ke `/login`.
9. Coba mengubah role sendiri dari browser/API — harus ditolak.

## Batasan paket ini

Ini menyelesaikan fondasi Auth dan role awal. Paket ini belum membangun tabel bisnis (`business_profiles`, `funding_projects`, `products`, `orders`, dan seterusnya), proses verifikasi usaha, ataupun modul Financial dan Marketplace.
