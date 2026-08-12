"use client";

import { ReactNode, ViewTransition } from "react";
import Sidebar from "@/widgets/app-shell/ui/Sidebar";
import Header from "@/widgets/app-shell/ui/Header";
import SimpleFooter from "@/shared/ui/SimpleFooter";
import CommandPalette from "@/widgets/app-shell/ui/CommandPalette";
import ChatWidget from "@/features/chat/components/ChatWidget";
import useSidebar from "@/shared/hooks/useSidebar";
import useUserProfile from "@/features/auth/hooks/useUserProfile";
import { useNotifications } from "@/shared/contexts/NotificationsContext";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { CommandPaletteProvider } from "@/shared/contexts/CommandPaletteContext";
import { useNavShortcuts } from "@/widgets/app-shell/lib/shortcuts";

/**
 * Keeps the existing liquid-glass Header/Sidebar chrome, but seats it on the
 * control-room dark-first canvas tokens and wires in ⌘K + `G`+letter shortcuts
 * (docs/UI_REDESIGN.md §4). Pages own their own content only.
 */
export default function AppShell({ children }: { children: ReactNode }) {
  const { resolvedMode: mode, toggleMode } = useTheme();
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const { user, loading: userLoading, handleLogout } = useUserProfile();
  const { notifications, isLoading: notificationsLoading, markNotificationAsRead, clearAllNotifications } = useNotifications();

  useNavShortcuts();

  return (
    <CommandPaletteProvider>
      {/* Fixed to the viewport height with `main` as the single internal scroll region — needed
          so position:sticky works for anything inside main (e.g. the Tenders page's filter
          sidebar). Previously `main` had overflow-hidden with no height constraint anywhere above
          it, which silently breaks sticky (it becomes the sticky containing block but never
          itself scrolls, since the *document* was scrolling instead) without providing any actual
          clipping benefit — every flex ancestor down to `main` needs min-h-0 too, since flex items
          default to min-height:auto and won't shrink/scroll without it. */}
      <div className="flex h-screen flex-col overflow-hidden bg-canvas">
        <div className="flex min-h-0 flex-1">
          <Sidebar isOpen={!!isSidebarOpen} mode={mode} onLogout={handleLogout} toggleSidebar={toggleSidebar} user={user} loading={userLoading} />

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <Header
              toggleSidebar={toggleSidebar}
              isSidebarOpen={!!isSidebarOpen}
              mode={mode}
              toggleMode={toggleMode}
              onLogout={handleLogout}
              user={user}
              loading={userLoading}
              notifications={notifications}
              isLoading={notificationsLoading}
              onMarkAsRead={markNotificationAsRead}
              onClearAll={clearAllNotifications}
            />

            <main className="flex-1 overflow-y-auto p-6 transition-all duration-300 md:p-8">
              <ViewTransition name="page" share="auto" enter="auto" exit="auto">
                {children}
              </ViewTransition>
            </main>

            <SimpleFooter />
          </div>
        </div>

        <CommandPalette />
        <ChatWidget />
      </div>
    </CommandPaletteProvider>
  );
}
