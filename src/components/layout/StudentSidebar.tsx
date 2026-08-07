"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ListChecks,
  BookText,
  MessageCircle,
  User,
  Mic,
  Trophy,
  Layers,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/lib/auth-context";

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}

const studentItems: SidebarItem[] = [
  { label: "Belajar", href: "/m/belajar", icon: BookOpen },
  { label: "Kuis", href: "/m/kuis", icon: ListChecks },
  { label: "Deck Latihan", href: "/m/deck", icon: Layers },
  { label: "Kamus", href: "/m/kamus", icon: BookText },
  { label: "AI Sensei", href: "/m/sensei", icon: MessageCircle },
  { label: "Ucapan", href: "/m/speech", icon: Mic },
  { label: "Peringkat", href: "/m/leaderboard", icon: Trophy },
  { label: "Profil", href: "/m/profil", icon: User },
];

export function StudentSidebar({
  collapsed,
  onToggle,
}: {
  /** Sidebar desktop diciutkan menjadi rel ikon (desktop saja). */
  collapsed: boolean;
  onToggle: () => void;
}) {
  const path = usePathname();
  const { profile, signOut } = useAuth();
  const userName = profile?.full_name || "Murid";

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 hidden border-r border-line bg-paper transition-[width] duration-300 md:block ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      <div className="flex h-full flex-col">
        <div
          className={`flex h-16 items-center ${collapsed ? "justify-center px-0" : "justify-between pl-5 pr-3"}`}
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
          {studentItems.map((it) => {
            const active =
              path === it.href ||
              (it.href !== "/m/dashboard" && path.startsWith(it.href));
            const Icon = it.icon;
            return (
              <Link
                key={it.label}
                href={it.href}
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
                <User size={18} />
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
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-tint-soft text-indigo">
                  <User size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{userName}</p>
                  <p className="truncate text-xs text-ink-soft">
                    {profile?.class_code || (profile?.role === "murid" ? "Murid" : "")}
                  </p>
                </div>
              </div>
              <button
                onClick={signOut}
                className="mt-2 flex w-full items-center gap-2 rounded-btn px-2 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-red-50 hover:text-red-500"
              >
                <LogOut size={16} />
                Keluar
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
