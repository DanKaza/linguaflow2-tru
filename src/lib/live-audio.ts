"use client";

/**
 * Tumpukan audio untuk live voice (WS /sensei/live).
 *
 * - Capture: AudioContext 16 kHz + AudioWorklet (`/pcm-worklet.js`) →
 *   callback per chunk PCM16 mono base64 (~128 ms).
 * - Playback: queue AudioBuffer 24 kHz yang dijadwalkan berurutan di
 *   AudioContext output — mulus tanpa jeda antar chunk, dan bisa
 *   di-"interrupt" (murid menyela → queue dibuang).
 */

/* ─────────────────────────────────────────────
 * Capture (mic → PCM16 @16 kHz base64)
 * ───────────────────────────────────────────── */

export interface MicCapture {
  start: () => Promise<void>;
  stop: () => void;
}

export async function startMicCapture(
  onChunk: (pcmBase64: string) => void,
): Promise<MicCapture> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  // SampleRate 16 kHz diminta langsung — Chrome/Edge/Firefox resample sendiri.
  const ctx = new AudioContext({ sampleRate: 16000 });
  // Kebijakan autoplay: context bisa mulai suspended — resume sebelum worklet dipasang
  // supaya chunk tidak hilang diam-diam (sesi "tersambung tapi mati").
  if (ctx.state === "suspended") await ctx.resume();
  await ctx.audioWorklet.addModule("/pcm-worklet.js");

  const source = ctx.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ctx, "pcm-worklet");
  node.port.onmessage = (e) => {
    const data = e.data as { pcmBase64?: string };
    if (data?.pcmBase64) onChunk(data.pcmBase64);
  };
  source.connect(node);
  // Worklet tidak boleh terhubung ke destination (mencegah echo/feedback).

  return {
    start: async () => {
      /* sudah berjalan sejak setup */
    },
    stop: () => {
      try {
        source.disconnect();
        node.disconnect();
        stream.getTracks().forEach((t) => t.stop());
        void ctx.close();
      } catch {
        /* ignore */
      }
    },
  };
}

/* ─────────────────────────────────────────────
 * Playback (PCM16 @24 kHz base64 → speaker)
 * ───────────────────────────────────────────── */

function base64ToFloat32(b64: string): Float32Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const int16 = new Int16Array(bytes.buffer);
  const float = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) float[i] = int16[i] / 0x8000;
  return float;
}

export class LiveAudioPlayer {
  private ctx: AudioContext | null = null;
  private nextTime = 0;
  private playing = false;

  /** Enqueue satu chunk audio 24 kHz untuk diputar berurutan. */
  enqueue(pcmBase64: string) {
    if (!this.ctx) {
      this.ctx = new AudioContext({ sampleRate: 24000 });
    }
    void this.ctx.resume();

    const samples = base64ToFloat32(pcmBase64);
    if (samples.length === 0) return;

    const buffer = this.ctx.createBuffer(1, samples.length, 24000);
    buffer.copyToChannel(samples as Float32Array<ArrayBuffer>, 0);

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.ctx.destination);

    // Jadwalkan berurutan; bila queue tertinggal > 300 ms, mulai sekarang.
    const now = this.ctx.currentTime;
    if (this.nextTime < now) this.nextTime = now + 0.02;
    src.start(this.nextTime);
    this.nextTime += buffer.duration;
    this.playing = true;
  }

  /** Buang queue & hentikan playback (dipakai saat event `interrupted`). */
  interrupt() {
    if (!this.ctx) return;
    void this.ctx.close();
    this.ctx = null;
    this.nextTime = 0;
    this.playing = false;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  dispose() {
    this.interrupt();
  }
}
