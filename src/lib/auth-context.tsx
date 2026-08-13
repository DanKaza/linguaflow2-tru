"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export type Role = "murid" | "guru" | "admin";

export interface Profile {
  id: string;
  role: Role;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  school_id: string | null;
  class_code: string | null;
  nis: string | null;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  role: Role | null;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const role = profile?.role ?? null;

  /**
   * Ambil profile dari DB — HANYA SELECT.
   *
   * Row profile dibuat otomatis oleh trigger `handle_new_user`
   * (lihat supabase/migrations/setup-db.sql) saat user baru terdaftar
   * di auth.users. Karena RLS aktif, client TIDAK boleh INSERT ke tabel
   * `profiles` — cukup baca baris milik user yang sedang login.
   *
   * Catatan: pastikan ada policy SELECT untuk `profiles` yang mengizinkan
   * user membaca barisnya sendiri, misalnya:
   *   create policy "Murid baca profil sendiri" on public.profiles
   *     for select to authenticated using (auth.uid() = id);
   */
  const fetchProfile = useCallback(
    async (userId: string): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.warn("[Auth] Gagal membaca profile:", JSON.stringify(error));
        return null;
      }
      return (data as Profile) ?? null;
    },
    [supabase],
  );

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const fresh = await fetchProfile(user.id);
    if (fresh) setProfile(fresh);
  }, [user, fetchProfile]);

  // Ambil profile saat user/login session sudah tersedia.
  const loadProfileFor = useCallback(
    async (userId: string) => {
      const found = await fetchProfile(userId);
      setProfile(found);
      return found;
    },
    [fetchProfile],
  );

  useEffect(() => {
    let mounted = true;

    async function init() {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (mounted && session?.user) {
        setUser(session.user);
        await loadProfileFor(session.user.id);
      }
      if (mounted) {
        setLoading(false);
        setInitialized(true);
      }
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      try {
        if (event === "SIGNED_IN") {
          setUser(session?.user ?? null);
          if (session?.user) {
            await loadProfileFor(session.user.id);
            // Don't call router.refresh() here — it creates a race condition
            // with the redirect effect in LoginForm.
            // The state changes alone will trigger the redirect.
          }
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setProfile(null);
          router.refresh();
        }
      } catch (err) {
        console.error("[Auth] onAuthStateChange error:", err);
      }

      setLoading(false);
      setInitialized(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, loadProfileFor, router]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error?.message ?? null };
    },
    [supabase],
  );

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      // Metadata dikirim supaya trigger `handle_new_user` mengisi
      // full_name & role (default 'murid') di tabel `profiles`.
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });

      if (authError) return { error: authError.message };

      // Profile dibuat otomatis oleh trigger DB — tidak perlu INSERT manual.
      return { error: null };
    },
    [supabase],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    router.push("/login");
  }, [supabase, router]);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
    });
    return { error: error?.message ?? null };
  }, [supabase]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        loading,
        initialized,
        signIn,
        signUp,
        signOut,
        resetPassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
