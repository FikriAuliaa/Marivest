"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GlassButton } from "@/components/ui/glass-button";

type HeroSlide = {
  id: number;
  image: string;
  title: string;
  lines: [string, string];
};

const heroSlides: HeroSlide[] = [
  {
    id: 1,
    image: "/images/fish-cleaning.jpg",
    title: "Mengubah Gelombang Menyalakan Masa Depan",
    lines: ["Mengubah Gelombang", "Menyalakan Masa Depan"],
  },
  {
    id: 2,
    image: "/images/fisher.jpg",
    title: "Dari Pesisir Laut Melintas Keberagaman",
    lines: ["Dari Pesisir Laut", "Melintas Keberagaman"],
  },
];

const imageCards = [
  {
    id: "pon",
    image: "/images/pon.jpg",
    alt: "Kolam dan aktivitas budidaya perikanan",
    title: "Kolam & Budidaya",
    description: "Ekosistem pembudidayaan dan pengelolaan ikan.",
  },
  {
    id: "nelaya",
    image: "/images/nnelayan.jpg",
    alt: "Nelayan menangkap ikan di laut",
    title: "Nelayan",
    description: "Aktivitas nelayan dan hasil tangkapan laut.",
  },
  {
    id: "tambak",
    image: "/images/tambak.jpg",
    alt: "Tambak dan komunitas perikanan",
    title: "Tambak & Komunitas",
    description: "Pengelolaan tambak dan penguatan komunitas perikanan.",
  },
];

export function OnboardingFlow() {
  const [step, setStep] = useState(0);
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const router = useRouter();
  const currentSlide = useMemo(() => heroSlides[step], [step]);

  const handleNext = () => {
    if (step < heroSlides.length) {
      setStep((previous) => previous + 1);
      return;
    }
    router.push("/login");
  };

  return (
    <main className="min-h-dvh bg-[#08152d] text-white">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col overflow-hidden bg-slate-950 shadow-[0_30px_120px_rgba(0,0,0,0.32)] [container-type:inline-size] md:rounded-[36px] md:border md:border-white/10">
        {step < heroSlides.length ? (
          <section className="relative h-dvh min-h-[540px] w-full overflow-hidden">
            <div className="absolute inset-0">
              <Image
                src={currentSlide.image}
                alt={currentSlide.title}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 430px"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,21,46,0.12)_0%,rgba(7,21,46,0.02)_42%,rgba(7,21,46,0.62)_100%)]" />
            </div>

            <div className="relative z-10 flex items-center justify-between px-5 pt-6">
              <div className="glass-badge">MARIVEST</div>
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="rounded-full border border-white/35 bg-white/15 px-4 py-2 text-xs font-medium text-white backdrop-blur-xl transition hover:bg-white/25"
              >
                Lewati
              </button>
            </div>

            {/* Two intentionally fixed lines match the original splash composition. */}
            <div className="absolute inset-x-0 bottom-[clamp(143px,21dvh,196px)] z-10 px-4 text-center">
              <h1 className="mx-auto max-w-full text-[clamp(1.12rem,5.9cqw,1.7rem)] font-semibold leading-[1.2] tracking-[-0.035em] text-white drop-shadow-[0_3px_12px_rgba(0,0,0,0.55)]">
                {currentSlide.lines.map((line) => (
                  <span key={line} className="block whitespace-nowrap">{line}</span>
                ))}
              </h1>
            </div>

            <div className="absolute inset-x-0 bottom-0 z-10 space-y-4 px-5 pb-[max(18px,env(safe-area-inset-bottom))]">
              <div className="flex justify-center gap-2">
                {heroSlides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    aria-label={`Pindah ke slide ${index + 1}`}
                    onClick={() => setStep(index)}
                    className={[
                      "h-2.5 rounded-full transition-all duration-300",
                      index === step ? "w-8 bg-white" : "w-2.5 bg-white/55",
                    ].join(" ")}
                  />
                ))}
              </div>
              <GlassButton fullWidth onClick={handleNext}>
                Berikutnya
              </GlassButton>
            </div>
          </section>
        ) : (
          <section className="relative flex min-h-screen flex-col overflow-hidden bg-[#101827] px-5 pb-8 pt-14">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_78%,rgba(101,133,196,0.42),transparent_42%),linear-gradient(180deg,#151a26_0%,#101827_58%,#526a9d_100%)]" />
            <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.7)_1px,transparent_0)] [background-size:22px_22px]" />

            <div className="relative z-10 mx-auto w-full max-w-sm text-center">
              <h1 className="text-balance text-[2.3rem] font-semibold leading-[1.12] tracking-[-0.035em] text-white sm:text-[2.65rem]">
                Selamat datang di Marivest
              </h1>
              <p className="mx-auto mt-5 max-w-[23rem] text-base leading-7 text-white/85 sm:text-lg sm:leading-8">
                Mengubah sektor maritim Indonesia menjadi ruang investasi yang adil, bukan lagi sekadar kerja keras tanpa hasil yang sepadan.
              </p>
            </div>

            {/* Larger overlapping image cards. Hover, focus, or tap reveals each category. */}
            <div className="relative z-10 mt-auto flex min-h-[420px] items-end justify-center overflow-visible pb-6 pt-10">
              <div className="flex w-full items-end justify-center">
                {imageCards.map((card, index) => {
                  const isActive = activeCard === card.id;
                  return (
                    <button
                      key={card.id}
                      type="button"
                      aria-label={`${card.title}: ${card.description}`}
                      aria-expanded={isActive}
                      onMouseEnter={() => setActiveCard(card.id)}
                      onMouseLeave={() => setActiveCard(null)}
                      onFocus={() => setActiveCard(card.id)}
                      onBlur={() => setActiveCard(null)}
                      onClick={() => setActiveCard((current) => current === card.id ? null : card.id)}
                      className={[
                        "group relative h-[330px] w-[220px] shrink-0 overflow-hidden rounded-[26px] border border-white/35 bg-white/10 shadow-[0_26px_58px_rgba(0,0,0,0.42)] transition-all duration-300 ease-out",
                        "focus-visible:z-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80",
                        "active:translate-y-2 active:scale-[0.97] active:rotate-0",
                        isActive
                          ? "z-40 -translate-y-2 rotate-0 scale-[1.04] opacity-100"
                          : index === 0
                            ? "z-0 -mr-[132px] translate-y-5 -rotate-[8deg] scale-[0.86] opacity-95 sm:-mr-[140px]"
                            : index === 1
                              ? "z-20 scale-100 opacity-100"
                              : "z-0 -ml-[132px] translate-y-5 rotate-[8deg] scale-[0.86] opacity-95 sm:-ml-[140px]",
                      ].join(" ")}
                    >
                      <Image
                        src={card.image}
                        alt={card.alt}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                        sizes="(max-width: 640px) 220px, 245px"
                      />
                      <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/30 via-transparent to-white/10" />
                      <span
                        className={[
                          "pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-slate-950/95 via-slate-950/55 to-slate-950/5 p-5 text-left transition-all duration-300",
                          isActive ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100",
                        ].join(" ")}
                      >
                        <span className="text-lg font-semibold leading-tight text-white drop-shadow-md sm:text-xl">
                          {card.title}
                        </span>
                        <span className="mt-2 text-xs leading-5 text-white/85 sm:text-sm sm:leading-6">
                          {card.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="relative z-10 mt-auto">
              <GlassButton fullWidth onClick={() => router.push("/login")}>
                Masuk ke MARIVEST
              </GlassButton>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
