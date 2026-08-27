import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Run",
  description: "Build and launch a new scraping run from keywords, a website, a document, or a lead search.",
};

export default function RunQueryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
