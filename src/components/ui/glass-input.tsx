import type { InputHTMLAttributes } from "react";

export function GlassInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={[
        "h-12 w-full rounded-2xl border border-white/18 bg-white/10 px-4 text-sm text-white outline-none placeholder:text-white/60",
        "backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] transition focus:border-sky-200/50 focus:bg-white/14 focus:ring-2 focus:ring-sky-200/25",
        className,
      ].join(" ")}
      {...props}
    />
  );
}
