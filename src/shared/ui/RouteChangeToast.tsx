"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import toast from "react-hot-toast";
import { sidebarNav } from "@/shared/lib/nav";

/**
 * Renders nothing — just fires a toast on client-side navigation.
 * App Router has no routeChangeStart/Complete events, so this runs once per
 * pathname change (post-navigation) rather than showing a loading toast first.
 */
export default function RouteChangeToast() {
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!pathname || pathname.startsWith("/verify")) return;

    const pageSlug = pathname.split("/").pop() || "overview";
    const page = sidebarNav.find((item) => item.href === pathname || item.href.endsWith(`/${pageSlug}`));
    const pageName = page ? page.label : pageSlug.charAt(0).toUpperCase() + pageSlug.slice(1);

    toast.success(`${pageName} loaded`, { id: "route-success", duration: 2000 });
  }, [pathname]);

  return null;
}
