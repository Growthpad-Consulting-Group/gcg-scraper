import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Overview",
  description: "Run activity, scheduled tasks, and tender sources at a glance.",
};

export default function OverviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
