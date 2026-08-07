export type ClassValue =
  | string
  | number
  | null
  | undefined
  | false
  | ClassValue[]
  | Record<string, boolean | null | undefined>;

/** JLPT level — N5 is easiest, N1 hardest. */
export type JLPTLevel = "N5" | "N4" | "N3" | "N2" | "N1";

/**
 * A single vocabulary word/entry used across the student area
 * (kamus, deck, belajar/sesi, kuis generator, etc.).
 *
 * This is the canonical shape produced by `scripts/build-vocab.mjs`
 * from open-source JLPT word lists + Indonesian translations.
 */
export interface VocabularyWord {
  /** Written form, e.g. 食べる. */
  kanji: string;
  /** Kana reading, e.g. たべる. */
  furigana: string;
  /** Romaji reading, e.g. taberu. */
  romaji: string;
  /** Indonesian meaning, e.g. "Makan". */
  arti: string;
  /** JLPT level. */
  level: JLPTLevel;
  /** Part of speech tag from JMDict-style data, e.g. "v1". */
  pos?: string;
  /** Frequency rank — lower is more common. */
  frequency?: number;
}
