import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy same-origin untuk API LinguaFlow (MODE PROTOTIPE).
 *
 * Kenapa ada: server API (lg.tixrouter.my.id) saat ini TIDAK mengirim header
 * `Access-Control-Allow-Origin` untuk origin aplikasi kita, sehingga fetch
 * langsung dari browser diblokir CORS (preflight 204 tanpa allow-origin).
 * Curl/server tidak kena CORS — makanya chat bisa jalan dari backend tapi
 * gagal di browser.
 *
 * Alur: browser → route ini (same-origin, tanpa CORS) → API LinguaFlow.
 * Semua method & path diteruskan apa adanya, termasuk body multipart STT dan
 * respons audio TTS (streamed kembali dengan content-type aslinya).
 *
 * Base API diambil dari env server `LINGUAFLOW_API_URL` (tanpa prefix
 * NEXT_PUBLIC_ supaya tidak bocor ke bundle client).
 */

const API_BASE =
  process.env.LINGUAFLOW_API_URL ??
  process.env.NEXT_PUBLIC_LINGUAFLOW_API_URL ??
  "https://lg.tixrouter.my.id/api/v1";

/** Batas timeout proxy — chat AI bisa >30 dtk di jam sibuk. */
const PROXY_TIMEOUT_MS = 60_000;

async function proxy(req: NextRequest): Promise<NextResponse> {
  // /api/linguaflow/<path...> → <API_BASE>/<path...>?<query>
  const path = req.nextUrl.pathname.replace(/^\/api\/linguaflow\//, "");
  const target = `${API_BASE}/${path}${req.nextUrl.search}`;

  const headers = new Headers();
  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  let body: ArrayBuffer | undefined;
  if (hasBody) {
    body = await req.arrayBuffer(); // rekaman STT kecil (≤ beberapa MB) — buffering aman
  }

  try {
    const res = await fetch(target, {
      method: req.method,
      headers,
      body,
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
      cache: "no-store",
    });

    // Teruskan respons apa adanya — termasuk status error (401/502/…)
    // supaya parsing pesan di client tetap bekerja.
    const resHeaders = new Headers();
    const resContentType = res.headers.get("content-type");
    if (resContentType) resHeaders.set("Content-Type", resContentType);
    resHeaders.set("Cache-Control", "no-store");

    return new NextResponse(res.body, { status: res.status, headers: resHeaders });
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      return NextResponse.json(
        { error: "Waktu habis — server API lambat merespons.", code: "TIMEOUT" },
        { status: 504 },
      );
    }
    const message = err instanceof Error ? err.message : "Koneksi ke server API gagal.";
    return NextResponse.json({ error: message, code: "PROXY_ERROR" }, { status: 502 });
  }
}

export { proxy as GET, proxy as POST };
