import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Website Sources",
  description: "Configure the websites scraped for tender listings.",
};

export default function WebsiteSourcesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
