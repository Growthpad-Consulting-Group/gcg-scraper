import AppShell from "@/widgets/app-shell/ui/AppShell";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
