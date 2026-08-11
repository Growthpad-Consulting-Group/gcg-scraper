import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leads",
  description: "Business and people leads collected from Google Maps and LinkedIn searches.",
};

export default function LeadsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
