import type { Metadata } from "next";
import { Questrial } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { Providers } from "./providers";

const questrial = Questrial({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GCG Scraper",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={questrial.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
