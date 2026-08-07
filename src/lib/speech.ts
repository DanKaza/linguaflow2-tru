"use client";

import { useCallback, useEffect, useState } from "react";

// Browser-native Japanese TTS — Web Speech API.
// No backend, no API key, no recurring cost. Chrome/Edge/Android ship with
// neural Google Japanese voices; quality is comparable to paid TTS for free.

// ─── Voice loading ─────────────────────────────────────────────────────────
// `speechSynthesis.getVoices()` is async: it may return [] until the browser
// fires `voiceschanged`. We resolve voices once via event + polling fallback
// (some browsers never fire the event, e.g. older Chrome on Windows).

let voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return Promise.resolve([]);
  }
  const synth = window.speechSynthesis;

  const immediate = synth.getVoices();
  if (immediate.length > 0) return Promise.resolve(immediate);

  if (!voicesPromise) {
    voicesPromise = new Promise<SpeechSynthesisVoice[]>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve(synth.getVoices());
      };

      // Older Chrome on Windows sometimes never fires voiceschanged —
      // polling above covers that; this is a safety net to resolve anyway.
      const poll = setInterval(() => {
        if (settled) return;
        if (synth.getVoices().length > 0) finish();
      }, 200);

      window.setTimeout(() => {
        clearInterval(poll);
        finish();
      }, 3000);

      synth.addEventListener("voiceschanged", finish, { once: true });
    }).then((voices) => {
      // Jangan cache hasil kosong selamanya: Chrome di Android memuat suara
      // secara lazy, jadi getVoices() bisa kosong di awal. Jika kosong,
      // buang promise agar klik berikutnya mencoba lagi.
      if (voices.length === 0) voicesPromise = null;
      return voices;
    });
  }
  return voicesPromise;
}

function pickJapaneseVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const ja = voices.filter((v) => v.lang?.toLowerCase().startsWith("ja"));
  if (ja.length === 0) return null;
  // Prefer Google's neural voice; fall back to any ja voice.
  return (
    ja.find((v) => v.name.toLowerCase().includes("google")) ??
    ja.find((v) => v.name.toLowerCase().includes("natural")) ??
    ja[0]
  );
}

// ─── Public API ────────────────────────────────────────────────────────────

export interface SpeakOptions {
  /** Furigana/kana reading. When the text contains kanji, prefer reading the
   *  kana so a single word (e.g. 犬) is read with its correct reading
   *  (いぬ) instead of an ambiguous on-yomi. */
  kana?: string;
  onStart?: () => void;
  onEnd?: () => void;
}

/** Speak Japanese text. Returns false only when the Web Speech API itself is
 *  unavailable; otherwise it always attempts to speak with lang="ja-JP" — the
 *  browser falls back to its default voice when no explicit Japanese voice is
 *  found, so the button should always be shown whenever isSpeechSupported(). */
export async function speakJapanese(text: string, opts: SpeakOptions = {}): Promise<boolean> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  const synth = window.speechSynthesis;

  const voices = await loadVoices();
  const voice = pickJapaneseVoice(voices);

  // Prefer kana when the input is a single kanji word (ambiguous readings).
  const hasKanji = /[\u3400-\u9fff]/.test(text);
  const spoken = opts.kana && hasKanji ? opts.kana : text;

  const utter = new SpeechSynthesisUtterance(spoken);
  utter.lang = voice?.lang || "ja-JP";
  if (voice) utter.voice = voice;
  utter.rate = 0.9;
  utter.pitch = 1;

  utter.onstart = () => opts.onStart?.();
  utter.onend = () => opts.onEnd?.();
  utter.onerror = () => opts.onEnd?.();

  synth.cancel();
  synth.resume();

  // Chrome bug: calling speak() synchronously right after cancel() drops the
  // utterance. Defer one tick so the previous utterance is fully cancelled.
  window.setTimeout(() => {
    synth.speak(utter);
  }, 60);

  return true;
}

/** Stop any ongoing speech. */
export function stopJapaneseSpeech(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
}

/** Sync check — whether the Web Speech API exists at all. */
export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Async check — whether a Japanese voice is actually available. */
export async function hasJapaneseVoice(): Promise<boolean> {
  if (!isSpeechSupported()) return false;
  const voices = await loadVoices();
  return pickJapaneseVoice(voices) !== null;
}

// ─── React hook ────────────────────────────────────────────────────────────

export function useJapaneseSpeech() {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    hasJapaneseVoice().then((ok) => {
      if (mounted) setAvailable(ok);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const speak = useCallback((text: string, opts: SpeakOptions & { key?: string } = {}) => {
    const key = opts.key ?? text;
    return speakJapanese(text, {
      ...opts,
      onStart: () => {
        setSpeakingKey(key);
        opts.onStart?.();
      },
      onEnd: () => {
        setSpeakingKey((cur) => (cur === key ? null : cur));
        opts.onEnd?.();
      },
    });
  }, []);

  const isSpeaking = useCallback((key: string) => speakingKey === key, [speakingKey]);

  return { available, speakingKey, isSpeaking, speak, stop: stopJapaneseSpeech };
}
