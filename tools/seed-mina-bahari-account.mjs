// One-time MARIVEST demo account setup. No password or secret is stored in this file.
// Run from repo root: node --env-file=.env.local tools/seed-mina-bahari-account.mjs
// Pass MINA_BAHARI_PASSWORD as a temporary environment variable (see README).
import { createClient } from "@supabase/supabase-js";

const email = "minabahari@gmail.com";
const fullName = "Mina Bahari";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const password = process.env.MINA_BAHARI_PASSWORD;

if (!url || !secret || !password) {
  console.error("Butuh NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, dan MINA_BAHARI_PASSWORD. Lihat docs/SEED-MINA-BAHARI.md.");
  process.exitCode = 1;
} else if (password.length < 8) {
  console.error("Password harus berisi minimal 8 karakter.");
  process.exitCode = 1;
} else {
  const admin = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  try {
    let found = null;
    let scanFinished = false;
    for (let page = 1; page <= 100; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
      if (error) throw new Error(`Gagal memeriksa user Auth: ${error.message}`);
      found = data.users.find((user) => user.email?.toLowerCase() === email);
      if (found || data.users.length < 100) {
        scanFinished = true;
        break;
      }
    }
    if (!scanFinished) throw new Error("Daftar user terlalu besar untuk pemeriksaan otomatis. Periksa email secara manual agar tidak membuat duplikat.");

    if (found) {
      const { data: profile, error } = await admin
        .from("profiles")
        .select("role")
        .eq("id", found.id)
        .maybeSingle();
      if (error || profile?.role !== "pelaku_usaha") {
        throw new Error("Email sudah dipakai tetapi role profiles bukan pelaku_usaha. Tidak mengubah akun yang sudah ada.");
      }
      console.log("Akun Mina Bahari sudah ada sebagai pelaku_usaha. Tidak membuat duplikat atau mereset password.");
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, role: "pelaku_usaha" },
      });
      if (error || !data.user) throw new Error(error?.message ?? "Gagal membuat akun demo.");
      console.log("Akun Mina Bahari dibuat di Supabase Auth; trigger profiles akan mengisi role pelaku_usaha.");
    }
    console.log("Lanjutkan dengan migration dataset Mina Bahari (npx supabase db push).");
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
