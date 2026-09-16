import type { Metadata } from "next";
import Script from "next/script";
import { Inter, Noto_Sans_JP, Playfair_Display } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme";
import { DemoSessionProvider } from "@/lib/demo-session";

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
  metadataBase: new URL("https://linguaflowdemo.vercel.app"),
  title: {
    default: "LinguaFlow — Belajar Bahasa Jepang",
    template: "%s · LinguaFlow",
  },
  description:
    "Platform belajar Bahasa Jepang interaktif untuk murid Indonesia — flashcard kosakata JLPT, kuis harian, latihan pelafalan, dan AI Sensei.",
  applicationName: "LinguaFlow",
  keywords: [
    "belajar bahasa Jepang",
    "JLPT",
    "N5",
    "N4",
    "N3",
    "flashcard kosakata",
    "AI Sensei",
    "SMK",
  ],
  openGraph: {
    type: "website",
    url: "https://linguaflowdemo.vercel.app",
    siteName: "LinguaFlow",
    title: "LinguaFlow — Belajar Bahasa Jepang",
    description:
      "Platform belajar Bahasa Jepang interaktif untuk murid Indonesia — flashcard kosakata JLPT, kuis harian, latihan pelafalan, dan AI Sensei.",
    locale: "id_ID",
    // Gambar disediakan otomatis oleh src/app/opengraph-image.tsx.
  },
  twitter: {
    card: "summary_large_image",
    title: "LinguaFlow — Belajar Bahasa Jepang",
    description:
      "Platform belajar Bahasa Jepang interaktif untuk murid Indonesia — flashcard kosakata JLPT, kuis harian, latihan pelafalan, dan AI Sensei.",
    // Gambar disediakan otomatis oleh src/app/opengraph-image.tsx.
  },
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
          <DemoSessionProvider>{children}</DemoSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
