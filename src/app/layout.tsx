import type { Metadata } from "next";
import Script from "next/script";
import { Inter, Noto_Sans_JP, Playfair_Display } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth-context";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoJp = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto-jp",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LinguaFlow School — Belajar Bahasa Jepang",
  description:
    "Platform belajar Bahasa Jepang interaktif untuk murid SMK Indonesia. AI Sensei, flashcard, kuis, dan tracking progress real-time.",
};

/** Inline script to set dark class before hydration — prevents flash */
const themeScript = `
(function(){try{var t=localStorage.getItem('lf-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch(e){}})()
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${inter.variable} ${notoJp.variable} ${playfair.variable} font-sans antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-warm-white text-ink transition-colors duration-300">
        <Script
          id="theme-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[999] focus:rounded-btn focus:bg-indigo focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white focus:outline-none focus:shadow-soft-lg"
        >
          Langsung ke konten utama
        </a>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
