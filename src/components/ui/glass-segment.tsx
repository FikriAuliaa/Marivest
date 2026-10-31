"use client";

import { useId } from "react";

type Option = { label: string; value: string };
type GlassSegmentProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
};

export function GlassSegment({ label, value, onChange, options }: GlassSegmentProps) {
  const groupId = useId();
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/70">{label}</p>
      <div className="grid grid-cols-2 gap-2 rounded-[24px] border border-white/18 bg-white/10 p-1.5 backdrop-blur-xl">
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <label
              key={option.value}
              htmlFor={`${groupId}-${option.value}`}
              className={[
                "relative flex cursor-pointer items-center justify-center rounded-[18px] px-3 py-2 text-sm font-medium transition duration-200",
                checked ? "bg-white/20 text-white shadow-[0_10px_30px_rgba(0,0,0,0.15)] ring-1 ring-white/30" : "text-white/70 hover:bg-white/10 hover:text-white",
              ].join(" ")}
            >
              <input
                id={`${groupId}-${option.value}`}
                type="radio"
                className="sr-only"
                checked={checked}
                onChange={() => onChange(option.value)}
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </div>
  );
}
