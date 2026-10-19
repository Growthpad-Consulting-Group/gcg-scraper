import SettingsSidebarLayout from "@/widgets/settings-shell/ui/SettingsSidebarLayout";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <SettingsSidebarLayout>{children}</SettingsSidebarLayout>;
}
