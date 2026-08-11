import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Automation",
  description: "Manage recurring scraping tasks and their run frequency.",
};

export default function AutomationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
