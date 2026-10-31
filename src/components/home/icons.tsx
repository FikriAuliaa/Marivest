import type { SVGProps } from "react";

export type IconName =
  | "fish"
  | "shrimp"
  | "wheat"
  | "home"
  | "search"
  | "heart"
  | "bell"
  | "cart"
  | "grid"
  | "waves"
  | "leaf"
  | "wallet"
  | "package"
  | "clipboard"
  | "map-pin"
  | "plus"
  | "arrow-right"
  | "arrow-up-right"
  | "chevron-right"
  | "close"
  | "check"
  | "clock"
  | "user"
  | "shield-check"
  | "sparkles"
  | "filter"
  | "shopping-bag"
  | "truck"
  | "info";

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  filled?: boolean;
};

export function Icon({
  name,
  size = 20,
  strokeWidth = 1.8,
  filled = false,
  ...props
}: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
    ...props,
  };

  if (name === "wheat") {
    return (
      <span
        className="material-symbols-outlined"
        style={{
          fontSize: size,
          fontFamily: '"Material Symbols Outlined"',
          fontFeatureSettings: '"liga"',
          fontVariationSettings: '"FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24',
        }}
        aria-hidden="true"
      >
        wheat
      </span>
    );
  }

  switch (name) {
    case "fish":
      return (
        <svg {...common}>
          <path d="M3 12c2.2-3.8 5.3-5.7 9.1-5.7 3.3 0 5.8 1.5 8.1 5.7-2.3 4.2-4.8 5.7-8.1 5.7C8.3 17.7 5.2 15.8 3 12Z" />
          <path d="m3 12-1.5-3v6L3 12Z" />
          <path d="M12 8.8c1.2 1.8 1.2 4.6 0 6.4" />
          <circle cx="16.2" cy="10.2" r=".7" fill="currentColor" stroke="none" />
        </svg>
      );
    case "shrimp":
      return (
        <svg {...common}>
          <path d="M19.2 5.2c-3.6-1.4-7.6-.4-10.1 2.2-2.5 2.6-2.8 6.2-.7 8.5 2.2 2.4 6 2.5 8.8.3 1.8-1.4 2.8-3.4 2.8-5.5" />
          <path d="m19.2 10.7 2.7-2.4.1 3.3-2.8 2.4" />
          <path d="M9.2 7.1 6.4 4.5M7.8 8.5 3.7 7.1M11.2 16.3l-1.4 3M14.4 16.2l.1 3.2M17.1 14.8l1.3 2.7" />
          <path d="m10.2 7.7 1.5 4.1m1.1-5.2 1.2 5.5m1.5-5.2.7 5.2" />
          <circle cx="17.1" cy="7.3" r=".8" fill="currentColor" stroke="none" />
        </svg>
      );
    case "home":
      return (
        <svg {...common} fill={filled ? "currentColor" : "none"}>
          <path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2v-9Z" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="10.8" cy="10.8" r="6.8" />
          <path d="m16 16 5 5" />
        </svg>
      );
    case "heart":
      return (
        <svg {...common} fill={filled ? "currentColor" : "none"}>
          <path d="M20.8 8.7c0 5.1-8.8 10.2-8.8 10.2S3.2 13.8 3.2 8.7A4.7 4.7 0 0 1 12 6.2a4.7 4.7 0 0 1 8.8 2.5Z" />
        </svg>
      );
    case "bell":
      return (
        <svg {...common}>
          <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
          <path d="M10 21h4" />
        </svg>
      );
    case "cart":
      return (
        <svg {...common}>
          <path d="M3 4h2l2.2 11.1a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 1.9-1.5L21 8H6" />
          <circle cx="10" cy="20" r="1.2" fill="currentColor" />
          <circle cx="18" cy="20" r="1.2" fill="currentColor" />
        </svg>
      );
    case "grid":
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
        </svg>
      );
    case "waves":
      return (
        <svg {...common}>
          <path d="M2.5 8c2.1 0 2.1-2 4.2-2s2.1 2 4.2 2 2.1-2 4.2-2 2.1 2 4.2 2 2.1-2 4.2-2" />
          <path d="M2.5 13c2.1 0 2.1-2 4.2-2s2.1 2 4.2 2 2.1-2 4.2-2 2.1 2 4.2 2 2.1-2 4.2-2" />
          <path d="M2.5 18c2.1 0 2.1-2 4.2-2s2.1 2 4.2 2 2.1-2 4.2-2 2.1 2 4.2 2 2.1-2 4.2-2" />
        </svg>
      );
    case "leaf":
      return (
        <svg {...common}>
          <path d="M20.5 3.5C11 3.4 5.1 5.1 4 11c-.8 4.2 2 7.2 5.8 6.8 6-.6 9.3-6.6 10.7-14.3Z" />
          <path d="M3.5 21c2.6-5.3 6.2-8.6 11.1-11.5" />
        </svg>
      );
    case "wallet":
      return (
        <svg {...common}>
          <path d="M4 6.5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6.5Z" />
          <path d="M3 7V5a2 2 0 0 1 2-2h12" />
          <path d="M20 11h-5a2 2 0 0 0 0 4h5" />
          <path d="M15.5 13h.01" />
        </svg>
      );
    case "package":
      return (
        <svg {...common}>
          <path d="m12 3 9 4.5v9L12 21l-9-4.5v-9L12 3Z" />
          <path d="m3.5 7.7 8.5 4.5 8.5-4.5M12 12.2V21" />
          <path d="m7.5 5.3 9 4.6" />
        </svg>
      );
    case "clipboard":
      return (
        <svg {...common}>
          <rect x="5" y="4.5" width="14" height="17" rx="2" />
          <path d="M9 4.5V3h6v1.5M8.5 10h7M8.5 14h7M8.5 18h4" />
        </svg>
      );
    case "map-pin":
      return (
        <svg {...common}>
          <path d="M20 10c0 5.2-8 11-8 11S4 15.2 4 10a8 8 0 1 1 16 0Z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "arrow-right":
      return (
        <svg {...common}>
          <path d="M4 12h15M13 5l7 7-7 7" />
        </svg>
      );
    case "arrow-up-right":
      return (
        <svg {...common}>
          <path d="M7 17 17 7M8 7h9v9" />
        </svg>
      );
    case "chevron-right":
      return (
        <svg {...common}>
          <path d="m9 18 6-6-6-6" />
        </svg>
      );
    case "close":
      return (
        <svg {...common}>
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4.5 4.5L19 7" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3.5 2" />
        </svg>
      );
    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
        </svg>
      );
    case "shield-check":
      return (
        <svg {...common}>
          <path d="M12 22s8-3.8 8-10V5l-8-3-8 3v7c0 6.2 8 10 8 10Z" />
          <path d="m8.5 12 2.3 2.3 4.8-5" />
        </svg>
      );
    case "sparkles":
      return (
        <svg {...common}>
          <path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z" />
          <path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" />
          <path d="m5 2 .7 2.3L8 5l-2.3.7L5 8l-.7-2.3L2 5l2.3-.7L5 2Z" />
        </svg>
      );
    case "filter":
      return (
        <svg {...common}>
          <path d="M4 6h16M7 12h10m-7 6h4" />
        </svg>
      );
    case "shopping-bag":
      return (
        <svg {...common}>
          <path d="M5 8h14l1 13H4L5 8Z" />
          <path d="M9 9V6a3 3 0 0 1 6 0v3" />
        </svg>
      );
    case "truck":
      return (
        <svg {...common}>
          <path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z" />
          <circle cx="7.5" cy="19" r="1.8" />
          <circle cx="17.5" cy="19" r="1.8" />
        </svg>
      );
    case "info":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 7.5h.01" />
        </svg>
      );
  }
}
