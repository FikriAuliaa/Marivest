import type { ReactNode } from "react";

type GlassCardProps = {
  children: ReactNode;
  className?: string;
};

export function GlassCard({ children, className = "" }: GlassCardProps) {
  return (
    <div
      className={[
        "relative overflow-hidden rounded-[28px] border border-white/20 bg-white/10 p-4 shadow-[0_24px_60px_rgba(3,18,42,0.28)] backdrop-blur-2xl",
        className,
      ].join(" ")}
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.18),rgba(255,255,255,0.04))]" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
