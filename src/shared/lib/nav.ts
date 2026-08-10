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
    icon: "solar:widget-2-broken",
    items: [{ href: "/overview", icon: "solar:widget-2-broken", label: "Dashboard Overview" }],
  },
  {
    category: "Scrape",
    icon: "solar:database-broken",
    items: [
      { href: "/run-query", icon: "solar:database-broken", label: "Run Query" },
      { href: "/tenders", icon: "solar:case-minimalistic-broken", label: "View Tenders" },
      { href: "/leads", icon: "solar:map-point-broken", label: "Business Leads" },
    ],
  },
  {
    category: "Automate",
    icon: "solar:calendar-broken",
    items: [
      { href: "/scheduler", icon: "solar:calendar-broken", label: "Scheduler" },
      { href: "/keyword-manager", icon: "solar:tag-broken", label: "Keyword Manager" },
      { href: "/blocked-domains", icon: "solar:shield-cross-broken", label: "Blocked Domains" },
    ],
  },
];

/** Flat list of every nav item, derived from the grouped structure — kept for lookups that don't care about grouping. */
export const sidebarNav: NavItem[] = sidebarNavGroups.flatMap((group) => group.items);
