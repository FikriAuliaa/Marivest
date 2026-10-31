"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signInAction, signUpAction } from "@/app/actions/auth";
import type { AuthActionState } from "@/lib/auth/types";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassInput } from "@/components/ui/glass-input";
import { GlassSegment } from "@/components/ui/glass-segment";

type Mode = "signin" | "signup";
type AccountType = "pelaku_usaha" | "mitra";

const initialAuthState: AuthActionState = {
  status: "idle",
  message: "",
};

function Feedback({ state }: { state: AuthActionState }) {
  if (!state.message) {
    return null;
  }

  const isSuccess = state.status === "success";

  return (
    <p
      role="status"
      aria-live="polite"
      className={[
        "rounded-2xl border px-4 py-3 text-sm leading-6",
        isSuccess
          ? "border-emerald-200/25 bg-emerald-100/10 text-emerald-50"
          : "border-rose-200/25 bg-rose-100/10 text-rose-50",
      ].join(" ")}
    >
      {state.message}
    </p>
  );
}

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("signin");
  const [accountType, setAccountType] = useState<AccountType>("mitra");

  const [signInState, signInFormAction, signInPending] = useActionState(
    signInAction,
    initialAuthState,
  );
  const [signUpState, signUpFormAction, signUpPending] = useActionState(
    signUpAction,
    initialAuthState,
  );

  return (
    <main className="min-h-screen bg-[#08152d] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col overflow-hidden bg-slate-950 shadow-[0_30px_120px_rgba(0,0,0,0.32)] md:rounded-[36px] md:border md:border-white/10">
        <section
          className="relative flex min-h-screen flex-col justify-between overflow-hidden px-5 pb-8 pt-6"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(5,16,31,0.56), rgba(6,11,24,0.85)), url('/images/nile-river.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,239,255,0.16),transparent_32%),radial-gradient(circle_at_bottom,rgba(255,208,146,0.18),transparent_25%)]" />

          <div className="relative z-10 flex items-center justify-between">
            <div className="glass-badge">MARIVEST</div>
            <Link
              href="/"
              className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-medium text-white/85 backdrop-blur-xl transition hover:bg-white/16"
            >
              Kembali
            </Link>
          </div>

          <div className="relative z-10 mt-10 space-y-4 text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-sky-100/70">
              Access Portal
            </p>
            <h1 className="text-3xl font-semibold leading-tight text-white">
              {mode === "signin"
                ? "Masuk ke ekosistem MARIVEST"
                : "Buat akun MARIVEST baru"}
            </h1>
            <p className="mx-auto max-w-sm text-sm leading-6 text-white/78">
              {mode === "signin"
                ? "Masuk untuk mengakses perjalanan MARIVEST, memantau pengembangan usaha, dan menjelajahi peluang maritim yang terhubung."
                : "Daftarkan akun Pelaku Usaha atau Mitra. Akses fitur investasi menggunakan akun Mitra sesuai hak akses yang tersedia."}
            </p>
          </div>

          <GlassCard className="relative z-10 mt-6 p-5">
            <div className="mb-5 grid grid-cols-2 gap-2 rounded-[24px] border border-white/15 bg-white/10 p-1.5 backdrop-blur-xl">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={[
                  "rounded-[18px] px-4 py-3 text-sm font-semibold transition",
                  mode === "signin"
                    ? "bg-white/22 text-white ring-1 ring-white/30"
                    : "text-white/70 hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={[
                  "rounded-[18px] px-4 py-3 text-sm font-semibold transition",
                  mode === "signup"
                    ? "bg-white/22 text-white ring-1 ring-white/30"
                    : "text-white/70 hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                Sign Up
              </button>
            </div>

            {mode === "signin" ? (
              <form action={signInFormAction} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="signin-email" className="text-sm text-white/80">
                    Email
                  </label>
                  <GlassInput
                    id="signin-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="Masukkan email Anda"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="signin-password" className="text-sm text-white/80">
                    Password
                  </label>
                  <GlassInput
                    id="signin-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Masukkan password"
                    required
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-white/70">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-white/30 bg-transparent"
                    />
                    Ingat saya
                  </label>
                  <span className="font-medium text-sky-100/70">
                    Lupa password?
                  </span>
                </div>
                <Feedback state={signInState} />
                <GlassButton
                  type="submit"
                  fullWidth
                  disabled={signInPending}
                  className="disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {signInPending ? "Memproses..." : "Sign In"}
                </GlassButton>
              </form>
            ) : (
              <form action={signUpFormAction} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="signup-name" className="text-sm text-white/80">
                    Nama Lengkap
                  </label>
                  <GlassInput
                    id="signup-name"
                    name="full_name"
                    type="text"
                    autoComplete="name"
                    placeholder="Masukkan nama lengkap"
                    minLength={2}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="signup-email" className="text-sm text-white/80">
                    Email
                  </label>
                  <GlassInput
                    id="signup-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="Masukkan email aktif"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="signup-password" className="text-sm text-white/80">
                      Password
                    </label>
                    <GlassInput
                      id="signup-password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Minimal 8 karakter"
                      minLength={8}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="signup-confirm" className="text-sm text-white/80">
                      Konfirmasi Password
                    </label>
                    <GlassInput
                      id="signup-confirm"
                      name="confirm_password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Ulangi password"
                      minLength={8}
                      required
                    />
                  </div>
                </div>
                <GlassSegment
                  label="Jenis Akun"
                  value={accountType}
                  onChange={(value) => setAccountType(value as AccountType)}
                  options={[
                    { label: "Pembeli / Mitra", value: "mitra" },
                    { label: "Pelaku Usaha", value: "pelaku_usaha" },
                  ]}
                />
                <input type="hidden" name="role" value={accountType} />
                <div className="rounded-2xl border border-amber-200/20 bg-amber-100/10 px-4 py-3 text-xs leading-5 text-amber-50/85 backdrop-blur-xl">
                  Investor menggunakan akun{" "}
                  <span className="font-semibold">Pembeli / Mitra</span>. Role
                  SuperAdmin tidak tersedia pada pendaftaran publik.
                </div>
                <Feedback state={signUpState} />
                <GlassButton
                  type="submit"
                  fullWidth
                  disabled={signUpPending}
                  className="disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {signUpPending ? "Memproses..." : "Sign Up"}
                </GlassButton>
              </form>
            )}

            <div className="mt-5 border-t border-white/10 pt-4 text-center text-xs leading-5 text-white/65">
              Dengan melanjutkan, Anda menyetujui kebijakan platform dan
              penggunaan ekosistem MARIVEST untuk kebutuhan simulasi sistem.
            </div>
          </GlassCard>
        </section>
      </div>
    </main>
  );
}
