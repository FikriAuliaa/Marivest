import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Poppins } from "next/font/google";
import { WelcomeTransitionProvider } from "@/components/auth/login-success-splash";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "MARIVEST | Ekosistem Perikanan Digital",
  description:
    "Marketplace dan informasi peluang pendanaan untuk pelaku usaha perikanan.",
  icons: {
    icon: [{ url: "/images/marivest.png", type: "image/png" }],
    shortcut: "/images/marivest.png",
    apple: "/images/marivest.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className={`${poppins.variable} h-full antialiased`}>
<body className="min-h-full flex flex-col">
        <WelcomeTransitionProvider>{children}</WelcomeTransitionProvider>
      </body>
    </html>
  );
}
