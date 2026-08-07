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
   * Fetch or auto-create a profile for the given user.
   *
   * NOTE: Kadang `maybeSingle()` mengembalikan error `{}` (empty object)
   * ketika cookie JWT belum ready. Kita treat error sebagai "belum ada profile".
   */
  const ensureProfile = useCallback(
    async (
      userId: string,
      meta?: { role?: string; full_name?: string; email?: string | null },
    ) => {
      try {
        // 1) Try to find existing profile
        const result = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        const existing = result.data;
        const findError = result.error;

        // Log error detail untuk debugging (stringify karena kadang {} )
        if (findError) {
          console.warn(
            "[Auth] find profile returned error (akan coba insert):",
            JSON.stringify(findError),
          );
        }

        if (existing) {
          setProfile(existing as Profile);
          return;
        }

        // 2) Safety net: auto-create missing profile
        const newProfile = {
          id: userId,
          role: (meta?.role as Role) || "murid",
          full_name: meta?.full_name || meta?.email?.split("@")[0] || "User",
          email: meta?.email || null,
        };

        const insertResult = await supabase
          .from("profiles")
          .insert(newProfile)
          .select()
          .maybeSingle();

        const inserted = insertResult.data;
        const insertError = insertResult.error;

        if (insertError) {
          // Error apapun (duplicate key 23505, recursive RLS 42P17, dsb)
          // → coba SELECT ulang, mungkin profile sudah ada
          const { data: retry, error: retryError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .maybeSingle();

          if (retry) {
            setProfile(retry as Profile);
          } else {
            // SELECT juga gagal — log error detail
            console.error(
              "[Auth] Insert + retry SELECT both failed:",
              { insertCode: (insertError as any)?.code, insertMsg: insertError.message, retryError: retryError ? JSON.stringify(retryError) : null },
            );
          }
          return;
        }

        if (inserted) {
          setProfile(inserted as Profile);
        }
      } catch (err) {
        console.error("[Auth] ensureProfile exception:", err);
      }
    },
    [supabase],
  );

  const refreshProfile = useCallback(async () => {
    if (user) {
      await ensureProfile(user.id, {
        role: user.user_metadata?.role,
        full_name: user.user_metadata?.full_name,
        email: user.email,
      });
    }
  }, [user, ensureProfile]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (mounted && session?.user) {
        setUser(session.user);
        await ensureProfile(session.user.id, {
          role: session.user.user_metadata?.role,
          full_name: session.user.user_metadata?.full_name,
          email: session.user.email,
        });
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
            await ensureProfile(session.user.id, {
              role: session.user.user_metadata?.role,
              full_name: session.user.user_metadata?.full_name,
              email: session.user.email,
            });
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
  }, [supabase, ensureProfile, router]);

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
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });

      if (authError) return { error: authError.message };

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
