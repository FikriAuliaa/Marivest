import { requireRole } from "@/lib/auth/profile";
import { signOutAction } from "@/app/actions/auth";

export const instant = false;

export default async function AdminPage() {
  const profile = await requireRole("superadmin");

  return (
    <main className="min-h-screen bg-[#08152d] px-5 py-10 text-white">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="glass-badge">MARIVEST · ADMIN</div>
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
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-amber-100/75">
            SuperAdmin
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Selamat datang, {profile.fullName}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 sm:text-base">
            Panel administratif MARIVEST. Pengelolaan verifikasi usaha, proyek
            pendanaan, dan pengguna akan ditambahkan pada tahap berikutnya.
          </p>
        </div>
      </section>
    </main>
  );
}
