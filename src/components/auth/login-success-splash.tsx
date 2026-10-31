"use client";

import Image from "next/image";
import {
  Suspense,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import styles from "./login-success-splash.module.css";

const SPLASH_DURATION_MS = 1850;
const FADE_OUT_DURATION_MS = 420;

type WelcomeTransitionContextValue = {
  isSplashVisible: boolean;
  isFadingOut: boolean;
  isWelcomeActive: boolean;
  startWelcome: () => void;
  markTargetReady: () => void;
  dismissWelcome: () => void;
};

const WelcomeTransitionContext =
  createContext<WelcomeTransitionContextValue | null>(null);

export function WelcomeTransitionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [isSplashVisible, setIsSplashVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isWelcomeActive, setIsWelcomeActive] = useState(false);

  const hasWelcomeFlowRef = useRef(false);
  const fadeTimerRef = useRef<number | null>(null);

  const startWelcome = useCallback(() => {
    hasWelcomeFlowRef.current = true;
    setIsWelcomeActive(true);
    setIsSplashVisible(true);
    setIsFadingOut(false);
  }, []);

  const markTargetReady = useCallback(() => {
    if (!hasWelcomeFlowRef.current || fadeTimerRef.current !== null) {
      return;
    }

    // Dashboard sudah ter-render di belakang splash. Mulai fade sekarang.
    setIsFadingOut(true);

    fadeTimerRef.current = window.setTimeout(() => {
      setIsSplashVisible(false);
      setIsFadingOut(false);
      setIsWelcomeActive(false);
      hasWelcomeFlowRef.current = false;
      fadeTimerRef.current = null;
    }, FADE_OUT_DURATION_MS);
  }, []);

  const dismissWelcome = useCallback(() => {
    if (fadeTimerRef.current !== null) {
      window.clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }

    hasWelcomeFlowRef.current = false;
    setIsSplashVisible(false);
    setIsFadingOut(false);
    setIsWelcomeActive(false);
  }, []);

  useEffect(() => {
    return () => {
      if (fadeTimerRef.current !== null) {
        window.clearTimeout(fadeTimerRef.current);
      }
    };
  }, []);

  const contextValue: WelcomeTransitionContextValue = {
    isSplashVisible,
    isFadingOut,
    isWelcomeActive,
    startWelcome,
    markTargetReady,
    dismissWelcome,
  };

  return (
    <WelcomeTransitionContext.Provider value={contextValue}>
      {children}
      <Suspense fallback={null}>
        <WelcomeSplashController />
      </Suspense>
    </WelcomeTransitionContext.Provider>
  );
}

/**
 * Controller diletakkan di root layout agar splash tidak ikut unmount
 * ketika Next.js berpindah dari /welcome ke /dashboard.
 */
function WelcomeSplashController() {
  const pathname = usePathname();
  const router = useRouter();
  const transition = useContext(WelcomeTransitionContext);

  const {
    isSplashVisible,
    isFadingOut,
    isWelcomeActive,
    startWelcome,
    markTargetReady,
    dismissWelcome,
  } = transition ?? {
    isSplashVisible: false,
    isFadingOut: false,
    isWelcomeActive: false,
    startWelcome: () => undefined,
    markTargetReady: () => undefined,
    dismissWelcome: () => undefined,
  };

  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  useEffect(() => {
    if (pathname !== "/welcome") {
      return;
    }

    // Timeout 0ms membuat state aktif setelah commit, tanpa setState
    // sinkron langsung di dalam effect.
    const activateTimer = window.setTimeout(startWelcome, 0);

    // Splash tetap tampil selama 1,85 detik, lalu mulai navigasi.
    const navigationTimer = window.setTimeout(() => {
      router.replace("/dashboard");
    }, SPLASH_DURATION_MS);

    return () => {
      window.clearTimeout(activateTimer);
      window.clearTimeout(navigationTimer);
    };
  }, [pathname, router, startWelcome]);

  useEffect(() => {
    if (
      !isWelcomeActive ||
      pathname === "/welcome" ||
      pathname === "/dashboard" ||
      isAdminRoute
    ) {
      return;
    }

    // Jika sesi tidak valid dan dashboard mengarahkan kembali ke /login,
    // splash tetap ditutup agar tidak tertinggal di layar.
    const fallbackTimer = window.setTimeout(markTargetReady, 0);
    return () => window.clearTimeout(fallbackTimer);
  }, [pathname, isAdminRoute, isWelcomeActive, markTargetReady]);


  // Admin tidak pernah menampilkan splash. Bersihkan juga state transisi lama
  // agar overlay tidak muncul lagi saat berpindah halaman.
  useEffect(() => {
    if (!isAdminRoute) {
      return;
    }

    const dismissTimer = window.setTimeout(dismissWelcome, 0);
    return () => window.clearTimeout(dismissTimer);
  }, [isAdminRoute, dismissWelcome]);

  const shouldShowSplash = !isAdminRoute && (pathname === "/welcome" || isSplashVisible);

  if (!shouldShowSplash) {
    return null;
  }

  return (
    <main
      className={`${styles.screen} ${isFadingOut ? styles.fadeOut : ""}`}
      role="status"
      aria-label="MARIVEST"
      aria-live="polite"
    >
      <div className={styles.logo}>
        <Image
          src="/images/marivest.png"
          alt="Logo MARIVEST"
          width={420}
          height={420}
          priority
          sizes="(max-width: 480px) 62vw, 250px"
          className={styles.logoImage}
        />
      </div>

      <p className={styles.wordmark}>MARIVEST</p>
    </main>
  );
}

/**
 * Pasang komponen ini di halaman tujuan setelah seluruh data server selesai
 * dimuat. useEffect berjalan setelah konten dashboard ikut ter-commit.
 */
export function WelcomeTransitionReady() {
  const transition = useContext(WelcomeTransitionContext);
  const markTargetReady = transition?.markTargetReady;

  useEffect(() => {
    markTargetReady?.();
  }, [markTargetReady]);

  return null;
}
