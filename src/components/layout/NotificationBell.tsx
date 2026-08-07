"use client";

import { useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";

/** Bell button + notification sheet. No fake data — shows an honest empty state. */
export function NotificationBell({
  size = 20,
  color = "text-indigo",
}: {
  size?: number;
  color?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`relative ${color}`}
        aria-label="Notifikasi"
      >
        <Bell size={size} />
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Notifikasi">
        <div className="flex flex-col items-center py-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-tint-soft">
            <BellOff size={24} className="text-indigo/40" />
          </span>
          <p className="mt-4 text-sm font-bold text-ink">Belum ada notifikasi</p>
          <p className="mt-1 max-w-[16rem] text-xs text-ink-soft">
            Pemberitahuan tugas dan pengingat belajar akan muncul di sini.
          </p>
        </div>
      </BottomSheet>
    </>
  );
}
