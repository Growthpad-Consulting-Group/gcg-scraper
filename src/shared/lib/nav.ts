export type NavItem = {
  href: string;
  icon: string;
  label: string;
};

export const sidebarNav: NavItem[] = [
  { href: "/overview", icon: "mdi:view-dashboard", label: "Dashboard Overview" },
  { href: "/run-query", icon: "mdi:database-search", label: "Run Query" },
  { href: "/tenders", icon: "mdi:briefcase-search", label: "View Tenders" },
  { href: "/keyword-manager", icon: "mdi:tag", label: "Keyword Manager" },
  { href: "/upload-website", icon: "mdi:cloud-upload", label: "Upload Website" },
  { href: "/scheduler", icon: "akar-icons:schedule", label: "Scheduler" },
];
