"use client";

import { useCallback } from "react";
import { AppSidebar, type SidebarItem } from "@/components/layout/AppSidebar";
import { useLocalStorage } from "@/lib/use-local-storage";

/**
 * Kerangka halaman untuk area guru & admin.
 * Memegang state sidebar yang bisa diciutkan (desktop) dan menggeser
 * padding konten utama agar memanfaatkan ruang yang tersedia.
 */
export function AppShell({
  role,
  items,
  userName,
  userSub,
  bottomNav,
  children,
}: {
  role: "teacher" | "admin";
  items: SidebarItem[];
  userName: string;
  userSub: string;
  bottomNav?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useLocalStorage<boolean>(
    "lf-sidebar-collapsed",
    false,
  );
  const toggle = useCallback(() => setCollapsed((c) => !c), [setCollapsed]);

  return (
    <div className="min-h-screen bg-warm-white">
      <AppSidebar
        role={role}
        items={items}
        userName={userName}
        userSub={userSub}
        collapsed={collapsed}
        onToggle={toggle}
      />
      <div
        className={`transition-all duration-300 ${collapsed ? "md:pl-16" : "md:pl-60"}`}
      >
        <div className="mx-auto max-w-7xl px-4 pb-20 pt-6 md:px-8 md:py-8 md:pb-8">
          {children}
        </div>
      </div>
      {bottomNav}
    </div>
  );
}
