# Checklist QA MARIVEST

Diturunkan dari kriteria keberhasilan di proposal (bagian 6.4). Centang di URL **preview Vercel** tiap PR, lalu ulangi penuh di **production** sebelum submission.

Prioritas bug: **P0** menghambat demo · **P1** data salah/tidak konsisten · **P2** kosmetik.

## Akun demo (isi setelah seed)

| Role | Email | Catatan |
|---|---|---|
| Pelaku Usaha | | Mina Bahari, kategori pembudidaya ikan |
| Mitra (Investor A) | | komitmen Rp2.000.000 |
| Mitra (Investor B) | | komitmen Rp3.000.000 |
| Mitra (Pembeli) | | Restoran Seafood Jaya |
| SuperAdmin | | dibuat manual, tidak lewat registrasi publik |

Simpan password di password manager tim, bukan di repo.

## 1. Autentikasi & role
- [ ] Registrasi hanya menawarkan dua pilihan: Pelaku Usaha dan Mitra
- [ ] Tidak ada jalur registrasi SuperAdmin dari UI publik
- [ ] Login tiap role diarahkan ke dashboard yang benar
- [ ] Logout menghapus sesi; tombol back tidak membuka halaman terproteksi
- [ ] Halaman `/admin` (atau setaranya) menolak Pelaku Usaha dan Mitra

## 2. Profil usaha & verifikasi
- [ ] Pelaku Usaha bisa membuat dan memperbarui profil (kategori sebagai atribut, bukan role)
- [ ] Status awal: menunggu verifikasi
- [ ] SuperAdmin bisa: setujui / minta perbaikan
- [ ] Profil yang belum disetujui tidak bisa memublikasikan proyek pendanaan

## 3. Financial
- [ ] Proyek yang belum disetujui tidak tampil di katalog pendanaan
- [ ] Komitmen Rp2.000.000 dari target Rp5.000.000 → progres **40%**
- [ ] Komitmen Rp3.000.000 berikutnya → **100%**, status **Funded (Simulation)**
- [ ] Komitmen **negatif** atau **0** ditolak
- [ ] Komitmen **melebihi sisa target** ditolak
- [ ] **Double-click** tombol submit tidak membuat dua komitmen
- [ ] Label "simulasi" terlihat di semua angka dana

## 4. Bagi hasil (pelaporan)
- [ ] Pendapatan 6.500.000 − biaya 5.500.000 → laba **1.000.000**
- [ ] Rasio 30/70 → investor **300.000**, pelaku usaha **700.000**
- [ ] Proporsi komitmen → Investor A **120.000**, Investor B **180.000**
- [ ] Skenario **impas/rugi** tidak menampilkan bagi hasil positif
- [ ] Penjualan Marketplace yang tidak dikaitkan proyek **tidak** masuk perhitungan bagi hasil

## 5. Marketplace
- [ ] Pelaku Usaha bisa tambah produk (nama, kategori, harga, satuan, stok, foto)
- [ ] Katalog bisa dibuka tanpa login; memesan meminta login Mitra
- [ ] Pesan 10 kg bandeng @Rp30.000 → total **Rp300.000**, status **Pending**
- [ ] Penjual mengubah status: Pending → Confirmed → Completed / Cancelled
- [ ] Pesanan Completed tercatat **sekali** di ringkasan penjualan (refresh & klik ulang)
- [ ] Jumlah pesanan ≤ stok; kuantitas 0/negatif ditolak
- [ ] Marketplace bisa dipakai tanpa menyentuh modul Financial

## 6. Hak akses (uji di level data, bukan cuma UI)
- [ ] Pelaku Usaha A tidak bisa mengubah profil/proyek/produk milik Pelaku Usaha B (coba lewat ubah ID di URL atau request langsung)
- [ ] Mitra tidak bisa mengubah status pesanan
- [ ] RLS aktif di semua tabel publik (Supabase Dashboard > Database > Tables: tidak ada label "RLS disabled")
- [ ] Secret key Supabase tidak muncul di bundle browser (DevTools > Sources, cari `sb_secret`)

## 7. Deployment & responsivitas
- [ ] URL production terbuka di jendela incognito (tanpa login Vercel)
- [ ] Alur utama berjalan di lebar layar ponsel (DevTools 390px)
- [ ] Tidak ada error merah di Console pada alur demo
- [ ] Workflow "Smoke test deployment" hijau untuk deployment terakhir (halaman baru ikut dicek otomatis)

## 8. Sebelum submission (jam 23.00–24.00)
- [ ] Data demo di production bersih dan sesuai skenario Mina Bahari
- [ ] README berisi cara menjalankan (Docker & tanpa Docker) dan link production
- [ ] Release tag dibuat dari commit yang di-deploy
- [ ] Semua link submission dibuka ulang dari perangkat lain
