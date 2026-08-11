import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scheduler",
  description: "Manage recurring scraping tasks and their run frequency.",
};

export default function SchedulerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
