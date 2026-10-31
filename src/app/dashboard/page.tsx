import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireProfile } from "@/lib/auth/profile";
import { signOutAction } from "@/app/actions/auth";

export default async function DashboardPage() {
  await connection();

  const profile = await requireProfile();

  if (profile.role === "superadmin") {
    redirect("/admin");
  }

  const isSeller = profile.role === "pelaku_usaha";

  return (
    <main className="min-h-screen bg-[#08152d] px-5 py-10 text-white">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="glass-badge">MARIVEST</div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm text-white transition hover:bg-white/15"
            >
              Keluar
            </button>
          </form>
        </header>

        <div className="rounded-[28px] border border-white/15 bg-white/10 p-7 shadow-2xl backdrop-blur-xl sm:p-10">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-sky-100/70">
            Dashboard {isSeller ? "Pelaku Usaha" : "Mitra"}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Selamat datang, {profile.fullName}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 sm:text-base">
            {isSeller
              ? "Anda masuk sebagai Pelaku Usaha. Area ini akan menjadi pusat pengelolaan profil usaha, produk perikanan, dan proyek pendanaan Anda."
              : "Anda masuk sebagai Mitra. Area ini akan menjadi pusat untuk menjelajahi produk perikanan dan melihat peluang pendanaan simulasi."}
          </p>
          <div className="mt-7 inline-flex rounded-full border border-emerald-200/20 bg-emerald-200/10 px-4 py-2 text-xs font-medium text-emerald-100">
            Akun terautentikasi
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <article className="rounded-2xl border border-white/12 bg-white/[0.06] p-6">
            <h2 className="text-lg font-semibold">Marketplace</h2>
            <p className="mt-2 text-sm leading-6 text-white/65">
              {isSeller
                ? "Pengelolaan katalog produk akan dihubungkan pada tahap Marketplace."
                : "Katalog produk dan pemesanan simulasi akan dihubungkan pada tahap Marketplace."}
            </p>
          </article>
          <article className="rounded-2xl border border-white/12 bg-white/[0.06] p-6">
            <h2 className="text-lg font-semibold">Financial & Investment</h2>
            <p className="mt-2 text-sm leading-6 text-white/65">
              {isSeller
                ? "Pengajuan proyek pendanaan dan laporan usaha akan dihubungkan pada tahap Financial."
                : "Komitmen pendanaan simulasi dan ilustrasi bagi hasil akan dihubungkan pada tahap Financial."}
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
