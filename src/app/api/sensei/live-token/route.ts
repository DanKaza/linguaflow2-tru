import { NextResponse } from "next/server";

/**
 * Broker kredensial Suara Live (Google Gemini Live API).
 *
 * Browser berkomunikasi langsung dengan WebSocket Gemini
 * (`wss://generativelanguage.googleapis.com/...BidiGenerateContent?key=...`),
 * tapi API key TIDAK BOLEH masuk bundle client. Route ini menyimpan key di
 * env server-only (`GEMINI_API_KEY`, tanpa prefix NEXT_PUBLIC_) dan
 * menyerahkannya sesaat sebelum handshake. Key-nya sendiri dapat dibatasi
 * di Google AI Studio (HTTP referrer) + bisa dirotasi kapan saja.
 *
 * Catatan: ephemeral token endpoint (`authTokens:create`) mengembalikan 404
 * untuk key API key biasa — sudah diuji — jadi penyerahan key langsung ini
 * pendekatan paling praktis untuk prototipe.
 */

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Suara live belum dikonfigurasi — set GEMINI_API_KEY di .env.local lalu restart server dev.",
        code: "NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  return NextResponse.json(
    { apiKey },
    // Cegah caching key di CDN/browser antar sesi.
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
