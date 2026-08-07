"use client";

import { useCallback } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { StudentBottomNav } from "@/components/layout/StudentBottomNav";
import { StudentSidebar } from "@/components/layout/StudentSidebar";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { useAuth } from "@/lib/auth-context";
import { useLocalStorage } from "@/lib/use-local-storage";

/** Default greeting header — only used on dashboard */
export function StudentTopBar({ name = "Murid" }: { name?: string }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-warm-white px-4 py-3 md:hidden">
      <div className="flex items-center gap-2">
        <Avatar name={name} size={36} />
        <div>
          <p className="text-xs text-ink-soft">Halo,</p>
          <p className="text-sm font-bold text-ink leading-none">{name.split(" ")[0]}</p>
        </div>
      </div>
      <NotificationBell size={22} />
    </header>
  );
}

/** Simple title-only header — for pages with functional need */
export function SimpleHeader({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-warm-white px-4 py-3 md:hidden">
      <span className="text-base font-bold text-ink">{title}</span>
      <NotificationBell size={20} />
    </header>
  );
}

export function StudentShell({
  children,
  name: propName,
  header,
  title,
  noHeader,
}: {
  children: React.ReactNode;
  name?: string;
  header?: React.ReactNode;
  title?: string;
  noHeader?: boolean;
}) {
  const { profile } = useAuth();
  const displayName = propName || profile?.full_name || "Murid";

  // Sidebar desktop bisa diciutkan menjadi rel ikon (tersimpan lintas halaman).
  const [collapsed, setCollapsed] = useLocalStorage<boolean>(
    "lf-sidebar-collapsed",
    false,
  );
  const toggleSidebar = useCallback(() => setCollapsed((c) => !c), [setCollapsed]);

  let topBar: React.ReactNode | null;
  if (noHeader) {
    topBar = null;
  } else if (header) {
    topBar = header;
  } else if (title) {
    topBar = <SimpleHeader title={title} />;
  } else {
    topBar = <StudentTopBar name={displayName} />;
  }

  return (
    <div className="min-h-screen bg-warm-white">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:z-[999] focus:top-4 focus:left-4 focus:rounded-btn focus:bg-indigo focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white focus:outline-none"
      >
        Langsung ke konten
      </a>
      <StudentSidebar collapsed={collapsed} onToggle={toggleSidebar} />
      {topBar}
      <main
        id="main-content"
        className={`mx-auto max-w-lg px-4 pb-20 pt-4 transition-all duration-300 md:px-6 md:pt-6 ${
          collapsed ? "md:ml-16 md:max-w-6xl" : "md:ml-60 md:max-w-4xl"
        }`}
      >
        {children}
      </main>
      <StudentBottomNav />
    </div>
  );
}
