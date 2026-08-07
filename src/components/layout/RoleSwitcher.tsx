"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/auth-context";

const roles: { key: Role; label: string; prefix: string }[] = [
  { key: "murid", label: "👤 Murid", prefix: "/m" },
  { key: "guru", label: "👩‍🏫 Guru", prefix: "/g" },
  { key: "admin", label: "🛠️ Admin", prefix: "/a" },
];

/** Dev-only — lets you preview dashboards for different roles. */
export function RoleSwitcher({ current }: { current: Role }) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2 rounded-btn border border-line bg-paper p-1">
      {roles.map((r) => (
        <button
          key={r.key}
          onClick={() => router.push(r.prefix + "/dashboard")}
          className={cn(
            "flex-1 rounded-btn px-3 py-1.5 text-sm font-semibold transition-colors",
            r.key === current
              ? "bg-indigo text-white shadow-soft"
              : "text-ink-soft hover:text-indigo",
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
