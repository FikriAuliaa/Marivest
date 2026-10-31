# MARIVEST

Empowering Fisheries, Connecting the Future — prototipe platform pendanaan simulatif dan marketplace untuk pelaku usaha perikanan. Dibuat oleh tim Vivat ITS untuk INCEPTION 2026 Hackathon.

> Semua pendanaan, pesanan, dan bagi hasil di aplikasi ini adalah **simulasi**. Tidak ada transaksi uang sungguhan.

**Demo:** <URL production Vercel>

## Tech stack

Next.js · React · Tailwind CSS · Supabase (Auth, PostgreSQL, Storage) · Docker Compose (dev) · GitHub Actions · Vercel

## Menjalankan secara lokal

Siapkan env:

```bash
cp .env.example .env.local   # isi URL dan publishable key Supabase
```

**Dengan Docker** (direkomendasikan):

```bash
docker compose up --build --watch
```

**Tanpa Docker** (Node.js 24):

```bash
npm ci
npm run dev
```

Buka http://localhost:3000.

## Akun demo

| Role | Email | Password |
|---|---|---|
| Pelaku Usaha | | |
| Mitra | | |
| SuperAdmin | | |

## CI/CD

- **CI** (setiap PR & push ke `main`): cek kebocoran secret, lint, typecheck, build.
- **Vercel**: preview deployment per PR, production otomatis dari `main`.
- **Smoke test**: otomatis mengecek semua halaman di `app/` setelah setiap deployment berhasil.
- **Supabase migrations**: file di `supabase/migrations` diterapkan saat merge ke `main`.

## Tim

- Sultan Alamsyah L.M. — Application Development
- Fikri Aulia As Sa'adi — Deployment & Technical QA
- Achlano Affan Rasyad — Documentation & Product Demonstration
