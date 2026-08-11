import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tenders",
  description: "All tenders collected so far — see which run found each one.",
};

export default function TendersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
