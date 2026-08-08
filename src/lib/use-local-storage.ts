"use client";

import {
  useCallback,
  useSyncExternalStore,
  type Dispatch,
  type SetStateAction,
} from "react";

/**
 * localStorage hook — hydration-safe dan tanpa "flash".
 *
 * Pola lama (useState + useEffect) me-render nilai default dulu, baru membaca
 * localStorage di effect setelah mount. Akibatnya nilai default tampil
 * sekilas — misalnya sidebar yang sudah diciutkan tiba-tiba "terbuka" lalu
 * tertutup lagi. Karena area murid tidak punya layout bersama, shell di-
 * remount di tiap navigasi, jadi flash itu muncul setiap pindah menu.
 *
 * Solusi: `useSyncExternalStore`.
 *  - Server & hydrasi memakai getServerSnapshot (= initial) → cocok dengan
 *    HTML server (tanpa error hydration).
 *  - Bila nilai client berbeda dari server, React me-render ulang dengan
 *    getSnapshot SEBELUM paint → flash tidak terlihat sama sekali.
 *  - Pada navigasi client (tanpa SSR), nilai tersimpan sudah tersedia sejak
 *    render pertama → sidebar langsung dalam kondisi yang benar.
 *  - Perubahan dari tab lain ikut disinkronkan lewat event `storage`.
 */

/* ── Store mini (module-level) ─────────────────────────────
 * `cache` menjaga referensi nilai tetap stabil per key. Kalau getSnapshot
 * re-parse localStorage setiap render, array/objek mendapat referensi baru
 * terus-menerus dan React akan render ulang tanpa henti. */

const cache = new Map<string, unknown>();
const listeners = new Set<() => void>();

function readStored<T>(key: string, initial: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return initial;
    const parsed = JSON.parse(stored);

    // Fall back ke `initial` saat bentuk tersimpan tidak cocok dengan tipe
    // yang diharapkan (stale/corrupt value dari skema lama). Mencegah crash
    // runtime seperti `prev.includes is not a function` saat array tersimpan
    // sebagai `{}`.
    let valid: unknown = parsed;
    if (Array.isArray(initial)) {
      valid = Array.isArray(parsed) ? parsed : initial;
    } else if (initial instanceof Date) {
      valid = initial;
    } else if (typeof initial === "object" && initial !== null) {
      valid =
        parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? parsed
          : initial;
    } else {
      valid = typeof parsed === typeof initial ? parsed : initial;
    }
    return valid as T;
  } catch {
    return initial;
  }
}

function emit() {
  for (const l of listeners) l();
}

export function useLocalStorage<T>(
  key: string,
  initial: T,
): [T, Dispatch<SetStateAction<T>>] {
  const getSnapshot = useCallback((): T => {
    if (!cache.has(key)) cache.set(key, readStored(key, initial));
    return cache.get(key) as T;
  }, [key, initial]);

  // Berlangganan: listener lokal (update dari setStored di tab ini) + event
  // `storage` (perubahan dari tab lain).
  const subscribe = useCallback(
    (listener: () => void) => {
      listeners.add(listener);
      const onStorage = (e: StorageEvent) => {
        if (e.key === null) {
          cache.clear();
        } else if (e.key === key) {
          cache.delete(key);
        } else {
          return;
        }
        emit();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
      };
    },
    [key],
  );

  const value = useSyncExternalStore(subscribe, getSnapshot, () => initial);

  const setStored: Dispatch<SetStateAction<T>> = useCallback(
    (next) => {
      // Baca nilai terkini dari cache, atau baca ulang localStorage bila
      // cache sedang di-invalidate (event `storage` dari tab lain) — supaya
      // update fungsional tidak menghitung dari `initial` dan menghapus data.
      const current = cache.has(key)
        ? (cache.get(key) as T)
        : readStored(key, initial);
      const resolved =
        typeof next === "function" ? (next as (p: T) => T)(current) : next;
      cache.set(key, resolved);
      try {
        localStorage.setItem(key, JSON.stringify(resolved));
      } catch {
        // ignore — mode privat / kuota penuh
      }
      emit(); // beri tahu React untuk re-render dengan nilai baru
    },
    [key, initial],
  );

  return [value, setStored];
}
