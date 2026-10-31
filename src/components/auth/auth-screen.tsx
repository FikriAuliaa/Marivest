"use client";

import { useState } from "react";
import Link from "next/link";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassInput } from "@/components/ui/glass-input";
import { GlassSegment } from "@/components/ui/glass-segment";

type Mode = "signin" | "signup";
type AccountType = "pelaku_usaha" | "mitra";

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("signin");
  const [accountType, setAccountType] = useState<AccountType>("mitra");

  return (
    <main className="min-h-screen bg-[#08152d] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col overflow-hidden bg-slate-950 shadow-[0_30px_120px_rgba(0,0,0,0.32)] md:rounded-[36px] md:border md:border-white/10">
        <section
          className="relative flex min-h-screen flex-col justify-between overflow-hidden px-5 pb-8 pt-6"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(5,16,31,0.56), rgba(6,11,24,0.85)), url('/images/nile-river.jfif')",
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
            <p className="text-sm uppercase tracking-[0.3em] text-sky-100/70">Access Portal</p>
            <h1 className="text-3xl font-semibold leading-tight text-white">
              {mode === "signin" ? "Masuk ke ekosistem MARIVEST" : "Buat akun MARIVEST baru"}
            </h1>
            <p className="mx-auto max-w-sm text-sm leading-6 text-white/78">
              {mode === "signin"
                ? "Masuk untuk mengakses perjalanan MARIVEST, memantau pengembangan usaha, dan menjelajahi peluang maritim yang terhubung."
                : "Daftarkan akun Pelaku Usaha atau Pembeli/Mitra. Akses investor dapat diajukan setelah akun aktif melalui proses validasi tambahan."}
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
              <form className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-white/80">Email</label>
                  <GlassInput type="email" placeholder="Masukkan email Anda" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-white/80">Password</label>
                  <GlassInput type="password" placeholder="Masukkan password" />
                </div>
                <div className="flex items-center justify-between text-xs text-white/70">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="h-4 w-4 rounded border-white/30 bg-transparent" />
                    Ingat saya
                  </label>
                  <button type="button" className="font-medium text-sky-100 hover:text-white">
                    Lupa password?
                  </button>
                </div>
                <GlassButton type="submit" fullWidth>
                  Sign In
                </GlassButton>
              </form>
            ) : (
              <form className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-white/80">Nama Lengkap</label>
                  <GlassInput type="text" placeholder="Masukkan nama lengkap" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-white/80">Email</label>
                  <GlassInput type="email" placeholder="Masukkan email aktif" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm text-white/80">Password</label>
                    <GlassInput type="password" placeholder="Minimal 8 karakter" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-white/80">Konfirmasi Password</label>
                    <GlassInput type="password" placeholder="Ulangi password" />
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
                <div className="rounded-2xl border border-amber-200/20 bg-amber-100/10 px-4 py-3 text-xs leading-5 text-amber-50/85 backdrop-blur-xl">
                  Investor menggunakan akun <span className="font-semibold">Pembeli / Mitra</span> dan dapat mengajukan upgrade setelah akun aktif.
                </div>
                <GlassButton type="submit" fullWidth>
                  Sign Up
                </GlassButton>
              </form>
            )}

            <div className="mt-5 border-t border-white/10 pt-4 text-center text-xs leading-5 text-white/65">
              Dengan melanjutkan, Anda menyetujui kebijakan platform dan penggunaan ekosistem MARIVEST untuk kebutuhan simulasi sistem.
            </div>
          </GlassCard>
        </section>
      </div>
    </main>
  );
}
