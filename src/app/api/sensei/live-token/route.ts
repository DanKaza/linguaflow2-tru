import { NextResponse } from "next/server";

/**
 * Token broker untuk WebSocket live voice (`WS /sensei/live?token=<JWT>`).
 *
 * Kenapa route ini ada: browser TIDAK BOLEH memegang kredensial admin API
 * (username/password admin di `api.md`). Kredensial disimpan hanya di env
 * server-side (tanpa prefix NEXT_PUBLIC_) — route ini yang login ke API
 * (`POST /admin/auth/login`), lalu menyerahkan accessToken berumur pendek
 * ke client khusus untuk handshake WebSocket.
 *
 * Token di-cache di memori sampai mendekati kedaluwarsa agar tiap sesi
 * live tidak menambah beban login di API.
 */

const API_BASE =
  process.env.LINGUAFLOW_API_URL ??
  process.env.NEXT_PUBLIC_LINGUAFLOW_API_URL ??
  "https://lg.tixrouter.my.id/api/v1";

/** Cache token sederhana (per instance server). */
let cachedToken: string | null = null;
let cachedExpiresAt = 0;

interface LoginResponse {
  accessToken?: string;
  expiresIn?: number;
}

export async function GET() {
  const username = process.env.LINGUAFLOW_ADMIN_USERNAME;
  const password = process.env.LINGUAFLOW_ADMIN_PASSWORD;

  if (!username || !password) {
    return NextResponse.json(
      {
        error:
          "Live voice belum dikonfigurasi — set LINGUAFLOW_ADMIN_USERNAME & LINGUAFLOW_ADMIN_PASSWORD di environment (lihat .env.example).",
        code: "NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  // Pakai token cache bila masih berlaku (margin 60 detik).
  const now = Date.now();
  if (cachedToken && now < cachedExpiresAt - 60_000) {
    return NextResponse.json(
      { accessToken: cachedToken },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    const res = await fetch(`${API_BASE}/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    const data = (await res.json().catch(() => null)) as LoginResponse | null;

    if (!res.ok || !data?.accessToken) {
      return NextResponse.json(
        { error: "Login ke API gagal — periksa kredensial admin di server.", code: "UNAUTHORIZED" },
        { status: 502 },
      );
    }

    cachedToken = data.accessToken;
    // expiresIn dalam detik (default 7 hari) — cache maksimal 1 jam agar
    // token yang beredar di browser selalu pendek.
    const ttlSeconds = Math.min(Number(data.expiresIn ?? 604_800), 3600);
    cachedExpiresAt = now + ttlSeconds * 1000;

    return NextResponse.json(
      { accessToken: cachedToken },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return NextResponse.json(
        { error: "Waktu habis — API tidak merespons.", code: "TIMEOUT" },
        { status: 504 },
      );
    }
    return NextResponse.json(
      { error: "Tidak bisa terhubung ke server API.", code: "NETWORK" },
      { status: 502 },
    );
  }
}
