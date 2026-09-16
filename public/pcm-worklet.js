/**
 * AudioWorklet untuk menangkap mic sebagai PCM16 mono 16 kHz (base64).
 *
 * Di-load via `new AudioContext({ sampleRate: 16000 })` + `audioWorklet.addModule('/pcm-worklet.js')`.
 * Downmix semua channel ke mono, konversi Float32 → Int16 dengan clamping,
 * lalu kirim per 2048 sample (~128 ms @16 kHz) — pas untuk streaming WS.
 */
class PcmWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = new Int16Array(2048);
    this._offset = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    // Downmix semua channel ke mono.
    const channels = input.length;
    const frames = input[0].length;
    for (let i = 0; i < frames; i++) {
      let sum = 0;
      for (let ch = 0; ch < channels; ch++) sum += input[ch][i];
      const mono = sum / channels;

      // Float32 [-1, 1] → Int16 dengan clamping.
      const s = Math.max(-1, Math.min(1, mono));
      this._buffer[this._offset++] = s < 0 ? s * 0x8000 : s * 0x7fff;

      if (this._offset >= this._buffer.length) {
        // Int16Array → base64 (via Uint8 view) dan kirim ke main thread.
        const bytes = new Uint8Array(this._buffer.buffer, 0, this._buffer.length * 2);
        let binary = "";
        const CHUNK = 0x8000;
        for (let b = 0; b < bytes.length; b += CHUNK) {
          binary += String.fromCharCode.apply(null, bytes.subarray(b, b + CHUNK));
        }
        this.port.postMessage({ pcmBase64: btoa(binary) });
        this._offset = 0;
      }
    }
    return true;
  }
}

registerProcessor("pcm-worklet", PcmWorklet);
