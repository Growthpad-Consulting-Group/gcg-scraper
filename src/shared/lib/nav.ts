export type NavItem = {
  href: string;
  icon: string;
  label: string;
};

export type NavGroup = {
  category: string;
  icon: string;
  items: NavItem[];
};

export const sidebarNavGroups: NavGroup[] = [
  {
    category: "Overview",
    icon: "mdi:view-dashboard",
    items: [{ href: "/overview", icon: "mdi:view-dashboard", label: "Dashboard Overview" }],
  },
  {
    category: "Tenders",
    icon: "mdi:briefcase-search",
    items: [
      { href: "/run-query", icon: "mdi:database-search", label: "Run Query" },
      { href: "/tenders", icon: "mdi:briefcase-search", label: "View Tenders" },
      { href: "/keyword-manager", icon: "mdi:tag", label: "Keyword Manager" },
      { href: "/upload-website", icon: "mdi:cloud-upload", label: "Upload Website" },
    ],
  },
  {
    category: "Leads",
    icon: "mdi:map-marker-radius",
    items: [{ href: "/leads", icon: "mdi:map-marker-radius", label: "Business Leads" }],
  },
  {
    category: "Automation",
    icon: "akar-icons:schedule",
    items: [{ href: "/scheduler", icon: "akar-icons:schedule", label: "Scheduler" }],
  },
];

/** Flat list of every nav item, derived from the grouped structure — kept for lookups that don't care about grouping. */
export const sidebarNav: NavItem[] = sidebarNavGroups.flatMap((group) => group.items);
