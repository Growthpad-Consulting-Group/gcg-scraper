import type { Metadata, Viewport } from "next";
import { Figtree, Inter, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/shared/contexts/ThemeContext";
import { NotificationsProvider } from "@/shared/contexts/NotificationsContext";
import AppToaster from "@/shared/ui/AppToaster";
import ServiceWorkerRegister from "@/shared/ui/ServiceWorkerRegister";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const cloverDisplay = localFont({
  src: [
    {
      path: "../../public/assets/fonts/CloverDisplay-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/assets/fonts/CloverDisplay-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-clover-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GCG Scraper",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GCG Scraper",
  },
};

export const viewport: Viewport = {
  themeColor: "#f05d23",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${figtree.variable} ${cloverDisplay.variable} ${inter.variable} ${jetbrainsMono.variable} ${figtree.className}`}
      >
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-EKPS81S015" strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-EKPS81S015');
          `}
        </Script>
        <ThemeProvider>
          <NotificationsProvider>
            <AppToaster />
            <ServiceWorkerRegister />
            {children}
          </NotificationsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
