"use client";

// ═══════════════════════════════════════════════════════════════
// DEMO SESSION — pengganti auth untuk mode prototipe (sementara)
// ═══════════════════════════════════════════════════════════════
// Tidak ada login sungguhan: user memilih salah satu dari 3 akun demo
// di halaman /masuk, dan pilihan itu disimpan di localStorage.
//
// API-nya sengaja dibuat mirip `useAuth()` lama (profile, role, signOut)
// supaya perubahan di halaman-halaman seminimal mungkin.
// Penyimpanan memakai hook `useLocalStorage` (useSyncExternalStore) yang
// sudah hydration-safe — tidak perlu state loading manual.

import { createContext, useContext, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useLocalStorage } from "@/lib/use-local-storage";
import { DEMO_PROFILES, type DemoProfile, type Role } from "@/lib/demo-data";

const STORAGE_KEY = "lf-demo-role";

interface DemoSessionState {
  /** Profil akun demo yang sedang aktif (null saat belum memilih). */
  profile: DemoProfile | null;
  role: Role | null;
  /** Pilih akun demo & simpan ke localStorage. */
  signInAs: (role: Role) => void;
  /** Hapus pilihan & kembali ke halaman /masuk. */
  signOut: () => void;
}

const DemoSessionContext = createContext<DemoSessionState | undefined>(undefined);

function isRole(v: string): v is Role {
  return v === "murid" || v === "guru" || v === "admin";
}

export function DemoSessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  // Disimpan sebagai string biasa supaya validasi readStored cocok
  // (initial null bertipe object → role tersimpan akan dianggap invalid).
  const [storedRole, setStoredRole] = useLocalStorage<string>(STORAGE_KEY, "");

  const role: Role | null = isRole(storedRole) ? storedRole : null;
  const profile = role ? DEMO_PROFILES[role] : null;

  const signInAs = (next: Role) => setStoredRole(next);

  const signOut = () => {
    setStoredRole("");
    router.push("/masuk");
  };

  return (
    <DemoSessionContext.Provider value={{ profile, role, signInAs, signOut }}>
      {children}
    </DemoSessionContext.Provider>
  );
}

export function useDemoSession(): DemoSessionState {
  const ctx = useContext(DemoSessionContext);
  if (!ctx) throw new Error("useDemoSession must be used within DemoSessionProvider");
  return ctx;
}
