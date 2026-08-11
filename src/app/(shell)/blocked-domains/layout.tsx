import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blocked Domains",
  description: "Domains excluded from scraping.",
};

export default function BlockedDomainsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
