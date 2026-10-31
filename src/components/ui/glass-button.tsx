import type { ButtonHTMLAttributes, ReactNode } from "react";
import { forwardRef } from "react";

type GlassButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  fullWidth?: boolean;
};

const variantClasses: Record<NonNullable<GlassButtonProps["variant"]>, string> = {
  // Bright, frosted-white CTA inspired by the supplied onboarding reference.
  primary:
    "bg-white text-[#17365f] shadow-[0_18px_45px_rgba(4,18,42,0.28)] ring-1 ring-white/90 hover:bg-sky-50",
  secondary:
    "bg-white/20 text-white ring-1 ring-white/35 hover:bg-white/28",
  ghost:
    "bg-white/10 text-white/90 ring-1 ring-white/20 hover:bg-white/15",
};

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ children, className = "", variant = "primary", fullWidth = false, type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={[
          "group relative inline-flex min-h-12 items-center justify-center overflow-hidden rounded-full px-6 py-3 text-sm font-semibold tracking-[0.02em] transition duration-200 ease-out",
          "backdrop-blur-2xl active:translate-y-[2px] active:scale-[0.985]",
          fullWidth ? "w-full" : "w-auto",
          variantClasses[variant],
          className,
        ].join(" ")}
        {...props}
      >
        <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.08))] opacity-60" />
        <span className="pointer-events-none absolute inset-px rounded-full bg-white/20" />
        <span className="relative z-10 flex items-center gap-2">{children}</span>
      </button>
    );
  },
);

GlassButton.displayName = "GlassButton";
