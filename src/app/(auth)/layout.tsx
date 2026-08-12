import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to the GCG Scraper dashboard.",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
