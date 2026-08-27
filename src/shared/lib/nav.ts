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
      // "New Run" (not "Run Query") — this one page also launches website scans, document
      // parsing, and GMB/LinkedIn/Reddit lead searches, not just tender search queries; a name
      // this narrow made it easy to miss as the hub for those too.
      { href: "/run-query", icon: "solar:database-broken", label: "New Run" },
      { href: "/tenders", icon: "solar:case-minimalistic-broken", label: "View Tenders" },
      { href: "/leads", icon: "solar:map-point-broken", label: "Business Leads" },
      // Previously only reachable by already knowing to go to New Run's Website mode — a
      // 200+-site tracked list deserves its own entry point.
      { href: "/website-sources", icon: "solar:global-broken", label: "Website Sources" },
    ],
  },
  {
    category: "Automate",
    icon: "solar:calendar-broken",
    items: [
      { href: "/automation", icon: "solar:calendar-broken", label: "Automation" },
      { href: "/blocked-domains", icon: "solar:shield-cross-broken", label: "Blocked Domains" },
    ],
  },
  {
    category: "Configure",
    icon: "solar:settings-broken",
    items: [{ href: "/settings", icon: "solar:settings-broken", label: "Settings" }],
  },
];

/** Flat list of every nav item, derived from the grouped structure — kept for lookups that don't care about grouping. */
export const sidebarNav: NavItem[] = sidebarNavGroups.flatMap((group) => group.items);
