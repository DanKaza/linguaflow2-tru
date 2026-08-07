"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  FileQuestion,
  BarChart3,
  Settings,
  Menu,
  X,
  UserCircle,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/Logo";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

export interface SidebarItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}

export function AppSidebar({
  role,
  items,
  userName: propUserName,
  userSub: propUserSub,
  collapsed,
  onToggle,
}: {
  role: "teacher" | "admin";
  items: SidebarItem[];
  userName?: string;
  userSub?: string;
  /** Sidebar desktop diciutkan menjadi rel ikon (dipaksa false di mobile). */
  collapsed: boolean;
  onToggle: () => void;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const userName = profile?.full_name || propUserName || "User";
  const userSub = propUserSub || (role === "teacher" ? "Guru" : "Admin");

  // Versi penuh — dipakai di drawer mobile (selalu tampil lengkap).
  const fullSidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Logo />
      </div>
      <nav className="flex-1 space-y-1 px-3 py-2">
        {items.map((it) => {
          const active = path === it.href || (it.href !== "/" && path.startsWith(it.href));
          const Icon = it.icon;
          return (
            <Link
              key={it.label}
              href={it.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-btn px-3 py-2.5 text-sm font-semibold transition-colors",
                active
                  ? "bg-indigo-tint-soft text-indigo"
                  : "text-ink-soft hover:bg-indigo-tint-soft/50 hover:text-indigo",
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
              {it.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-line p-3">
        <div className="flex items-center gap-3 rounded-btn px-2 py-2">
          <UserCircle size={36} className="text-indigo" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-ink">{userName}</p>
            <p className="truncate text-xs text-ink-soft">{userSub}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="mt-1 flex w-full items-center gap-2 rounded-btn px-2 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-red-50 hover:text-red-500"
        >
          <LogOut size={16} />
          Keluar
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar with hamburger */}
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-paper/80 px-4 backdrop-blur-md md:hidden">
        <Logo size={24} />
        <button onClick={() => setOpen(true)} aria-label="Buka menu">
          <Menu size={24} className="text-indigo" />
        </button>
      </div>

      {/* Desktop sidebar — bisa diciutkan menjadi rel ikon */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-line bg-paper transition-[width] duration-300 md:block ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        <div className="flex h-full flex-col">
          <div
            className={`flex h-16 items-center ${collapsed ? "justify-center px-0" : "justify-between px-3"}`}
          >
            {!collapsed && <Logo />}
            <button
              onClick={onToggle}
              aria-label={collapsed ? "Buka menu samping" : "Tutup menu samping"}
              title={collapsed ? "Perluas menu" : "Ciutkan menu"}
              className="flex h-9 w-9 items-center justify-center rounded-btn text-ink-soft transition-colors hover:bg-indigo-tint-soft/60 hover:text-indigo"
            >
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-3 py-2">
            {items.map((it) => {
              const active = path === it.href || (it.href !== "/" && path.startsWith(it.href));
              const Icon = it.icon;
              return (
                <Link
                  key={it.label}
                  href={it.href}
                  onClick={() => setOpen(false)}
                  title={collapsed ? it.label : undefined}
                  aria-label={collapsed ? it.label : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-btn px-3 py-2.5 text-sm font-semibold transition-colors",
                    collapsed ? "justify-center px-0" : "",
                    active
                      ? "bg-indigo-tint-soft text-indigo"
                      : "text-ink-soft hover:bg-indigo-tint-soft/50 hover:text-indigo",
                  )}
                >
                  <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
                  {!collapsed && it.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-line p-3">
            {collapsed ? (
              <div className="flex flex-col items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-tint-soft text-indigo">
                  <UserCircle size={18} />
                </span>
                <button
                  onClick={signOut}
                  aria-label="Keluar"
                  title="Keluar"
                  className="text-ink-soft transition-colors hover:text-red-500"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 rounded-btn px-2 py-2">
                  <UserCircle size={36} className="text-indigo" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{userName}</p>
                    <p className="truncate text-xs text-ink-soft">{userSub}</p>
                  </div>
                </div>
                <button
                  onClick={signOut}
                  className="mt-1 flex w-full items-center gap-2 rounded-btn px-2 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-red-50 hover:text-red-500"
                >
                  <LogOut size={16} />
                  Keluar
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-paper shadow-soft-lg">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 text-ink-soft"
              aria-label="Tutup menu"
            >
              <X size={22} />
            </button>
            {fullSidebar}
          </aside>
        </div>
      )}
    </>
  );
}

export const teacherItems: SidebarItem[] = [
  { label: "Dashboard", href: "/g/dashboard", icon: LayoutDashboard },
  { label: "Kelas Saya", href: "/g/kelas", icon: Users },
  { label: "Tugas", href: "/g/tugas", icon: ClipboardList },
  { label: "Kuis", href: "/g/kuis", icon: FileQuestion },
  { label: "Laporan", href: "/g/laporan", icon: BarChart3 },
  { label: "Profil", href: "/g/profil", icon: Settings },
];

export const adminItems: SidebarItem[] = [
  { label: "Dashboard", href: "/a/dashboard", icon: LayoutDashboard },
  { label: "Guru", href: "/a/guru", icon: Users },
  { label: "Murid", href: "/a/murid", icon: UserCircle },
  { label: "Kelas", href: "/a/kelas", icon: ClipboardList },
  { label: "Laporan", href: "/a/laporan", icon: BarChart3 },
  { label: "Pengaturan", href: "/a/pengaturan", icon: Settings },
];
