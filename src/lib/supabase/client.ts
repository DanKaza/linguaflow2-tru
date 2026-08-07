"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          if (typeof document === "undefined") return null;
          const match = document.cookie.match(
            new RegExp(`(^| )${name}=([^;]+)`),
          );
          return match ? decodeURIComponent(match[2]) : null;
        },
        set(name: string, value: string, options: any) {
          if (typeof document === "undefined") return;
          let cookie = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Lax`;
          if (options?.maxAge) cookie += `; max-age=${options.maxAge}`;
          if (options?.domain) cookie += `; domain=${options.domain}`;
          if (options?.secure) cookie += "; Secure";
          document.cookie = cookie;
        },
        remove(name: string, options: any) {
          if (typeof document === "undefined") return;
          document.cookie = `${name}=; path=/; max-age=0`;
        },
      },
    },
  );
}
