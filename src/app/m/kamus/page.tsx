"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Search, Bookmark, X, Volume2, ArrowUpDown, Layers, ChevronRight } from "lucide-react";
import { StudentShell } from "@/components/layout/StudentShell";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AnimatedPage, staggerContainer, staggerItem } from "@/components/ui/AnimatedPage";
import { useLocalStorage } from "@/lib/use-local-storage";
import { useJapaneseSpeech, isSpeechSupported } from "@/lib/speech";
import { vocabulary } from "@/data/vocabulary";
import type { VocabularyWord } from "@/lib/types";
import { makeJapaneseSentence } from "@/lib/utils";

type Word = VocabularyWord;

type SortKey = "furigana" | "arti";

/** Label Indonesia untuk part of speech dari word bank. */
function posLabel(pos?: string): string {
  if (!pos) return "";
  if (pos.startsWith("v")) return "kata kerja";
  if (pos.startsWith("adj") || pos.startsWith("a-")) return "kata sifat";
  if (pos.startsWith("n")) return "kata benda";
  if (pos.startsWith("adv")) return "kata keterangan";
  if (pos.startsWith("prt")) return "partikel";
  return "kosakata";
}

export default function KamusList() {
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("furigana");
  const [selected, setSelected] = useState<Word | null>(null);
  const [bookmarked, setBookmarked] = useLocalStorage<string[]>("lf-bookmarks", []);
  const [deck, setDeck] = useLocalStorage<Word[]>("lf-deck", []);
  const [deckToast, setDeckToast] = useState(false);

  // Render bertahap: hanya sebagian kata yang dirender, sisanya dimuat
  // saat scroll — dulu seluruh ±3.000 kata dirender sekaligus (lambat).
  const PAGE = 100;
  const [visibleCount, setVisibleCount] = useState(PAGE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const { isSpeaking, speak } = useJapaneseSpeech();
  const speechOn = isSpeechSupported();

  function toggleBookmark(k: string) {
    setBookmarked((prev) =>
      prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k],
    );
  }

  function addToDeck(k: string) {
    const w = vocabulary.find((x) => x.kanji === k);
    if (!w) return;
    setDeck((prev) => (prev.some((p) => p.kanji === k) ? prev : [...prev, w]));
    setDeckToast(true);
    setTimeout(() => setDeckToast(false), 1800);
  }

  const filtered = useMemo(
    () =>
      vocabulary
        .filter(
          (w) =>
            w.kanji.includes(q) ||
            w.furigana.includes(q) ||
            w.romaji.toLowerCase().includes(q.toLowerCase()) ||
            w.arti.toLowerCase().includes(q.toLowerCase()),
        )
        .sort((a, b) =>
          sortBy === "furigana"
            ? a.furigana.localeCompare(b.furigana, "ja")
            : a.arti.localeCompare(b.arti, "id"),
        ),
    [q, sortBy],
  );

  function kanaGroup(kana: string): string {
    const c = kana[0];
    if ('あいうえおぁぃぅぇぉ'.includes(c)) return 'あ';
    if ('かきくけこがぎぐげご'.includes(c)) return 'か';
    if ('さしすせそざじずぜぞ'.includes(c)) return 'さ';
    if ('たちつてとだぢづでど'.includes(c)) return 'た';
    if ('なにぬねの'.includes(c)) return 'な';
    if ('はひふへほばびぶべぼ'.includes(c)) return 'は';
    if ('まみむめも'.includes(c)) return 'ま';
    if ('やゆよゃゅょ'.includes(c)) return 'や';
    if ('らりるれろ'.includes(c)) return 'ら';
    if ('わをん'.includes(c)) return 'わ';
    return c;
  }

  const groups = useMemo(() => {
    const acc: Record<string, Word[]> = {};
    for (const w of filtered) {
      const key = sortBy === "furigana" ? kanaGroup(w.furigana) : w.arti[0]?.toUpperCase() ?? "#";
      (acc[key] ??= []).push(w);
    }
    return acc;
  }, [filtered, sortBy]);

  // Potong daftar ke batas render: group utuh selama muat, lalu sisanya.
  const visibleGroups = useMemo(() => {
    let budget = visibleCount;
    const out: [string, Word[]][] = [];
    for (const [k, list] of Object.entries(groups)) {
      if (budget <= 0) break;
      const take = Math.min(list.length, budget);
      out.push([k, list.slice(0, take)]);
      budget -= take;
    }
    return out;
  }, [groups, visibleCount]);
  const hasMore = visibleCount < filtered.length;

  // Kata terkait: ambil maksimal 3 kata lain dari level yang sama.
  const relatedWords = useMemo(
    () =>
      selected
        ? vocabulary
            .filter((w) => w.level === selected.level && w.kanji !== selected.kanji)
            .slice(0, 3)
        : [],
    [selected],
  );

  // Infinite scroll: saat sentinel terlihat, muat PAGE kata berikutnya.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((v) => v + PAGE);
        }
      },
      { rootMargin: "600px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, PAGE]);

  // Lock body scroll when bottom sheet is open, preventing layout shift
  useEffect(() => {
    if (selected) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [selected]);

  return (
    <StudentShell noHeader>
      <AnimatedPage>
        <h1 className="text-2xl font-bold text-ink">Kamus</h1>
        <p className="text-xs text-ink-soft">{vocabulary.length.toLocaleString("id-ID")} kosakata N5–N3</p>

        {/* Search */}
        <div className="relative mt-4">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setVisibleCount(PAGE);
            }}
            placeholder="Cari kanji, hiragana, atau arti..."
            className="pl-10 pr-24"
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {q && (
              <button
                onClick={() => {
                  setQ("");
                  setVisibleCount(PAGE);
                }}
                className="flex h-7 w-7 items-center justify-center text-ink-soft transition-colors hover:text-indigo"
                aria-label="Hapus pencarian"
              >
                <X size={16} />
              </button>
            )}
            <button
              onClick={() => {
                setSortBy((s) => (s === "furigana" ? "arti" : "furigana"));
                setVisibleCount(PAGE);
              }}
              className="flex items-center gap-1 rounded-full bg-indigo-tint-soft px-2.5 py-1 text-[11px] font-semibold text-indigo transition-colors hover:bg-indigo-tint-soft/70"
              aria-label="Urutkan"
            >
              <ArrowUpDown size={14} />
              {sortBy === "furigana" ? "Aい" : "A-Z"}
            </button>
          </div>
        </div>

        {deck.length > 0 && (
          <Link
            href="/m/deck"
            className="mt-3 flex items-center justify-between rounded-btn bg-indigo-tint-soft px-4 py-2.5 text-sm font-semibold text-indigo transition-colors hover:bg-indigo-tint-soft/70"
          >
            <span className="flex items-center gap-2">
              <Layers size={16} /> Lihat Deck Latihan
            </span>
            <span className="flex items-center gap-1">
              {deck.length} kata <ChevronRight size={16} />
            </span>
          </Link>
        )}

        {filtered.length === 0 ? (
          <motion.div
            className="relative mt-10 flex flex-col items-center overflow-hidden rounded-card border border-line bg-paper py-12 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <span className="lf-kanji-watermark absolute -top-3 left-1/2 -translate-x-1/2 text-[120px]">探</span>
            <div className="seigaiha absolute inset-0 opacity-[0.05]" />
            <div className="relative">
              <p className="text-sm font-semibold text-ink">Kata tidak ditemukan</p>
              <p className="mt-1 text-xs text-ink-soft">Coba kata lain atau periksa ejaan</p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            className="mt-4 space-y-5 pb-4"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {visibleGroups.map(([k, list]) => (
              <motion.section key={k} variants={staggerItem}>
                <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-indigo">
                  <span className="jp">{k}</span>
                  <span className="text-[10px] text-ink-soft">
                    {sortBy === "furigana" ? "行" : "huruf"}
                  </span>
                  <span className="ml-auto text-[11px] font-normal text-ink-soft">
                    {groups[k]?.length ?? list.length} kata
                  </span>
                </h2>
                <div className="divide-y divide-line overflow-hidden rounded-card border border-line bg-paper">
                  {list.map((w, i) => (
                    <motion.div
                      key={`${w.kanji}-${w.furigana}`}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.25, delay: Math.min(i, 10) * 0.02 }}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelected(w)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelected(w);
                        }
                      }}
                      className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-all hover:bg-indigo-tint-soft/60 active:bg-indigo-tint-soft"
                    >
                      <span className="jp-bold w-20 text-xl text-indigo">{w.kanji}</span>
                      <span className="jp text-xs text-ink-soft">{w.furigana}</span>
                      <span className="flex-1 truncate text-sm font-semibold text-ink">{w.arti}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBookmark(w.kanji);
                        }}
                        className="transition-colors"
                        aria-label="Bookmark"
                      >
                        <Bookmark
                          size={18}
                          className={
                            (Array.isArray(bookmarked) && bookmarked.includes(w.kanji))
                              ? "fill-gold text-gold"
                              : "text-ink-soft hover:text-gold"
                          }
                        />
                      </button>
                      {speechOn && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            speak(w.kanji, { kana: w.furigana, key: `row-${w.kanji}` });
                          }}
                          className="transition-colors hover:text-indigo"
                          aria-label="Dengar"
                        >
                          <Volume2
                            size={18}
                            className={isSpeaking(`row-${w.kanji}`) ? "animate-pulse text-indigo" : "text-ink-soft"}
                          />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            ))}

            {/* Load lebih banyak (infinite scroll) */}
            {hasMore && (
              <div className="pb-4 text-center">
                <div ref={sentinelRef} className="h-1" aria-hidden="true" />
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setVisibleCount((v) => v + PAGE)}
                >
                  Muat lebih banyak ({Math.min(visibleCount, filtered.length)}/{filtered.length})
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatedPage>

      {/* Bottom sheet — spring animation */}
      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
            />

            {/* Sheet */}
            <motion.div
              className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-card bg-paper pb-8 shadow-soft-lg"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{
                type: "spring",
                damping: 28,
                stiffness: 300,
                mass: 0.8,
              }}
            >
              <div className="sticky top-0 z-10 bg-paper px-5 pb-2 pt-3">
                <div className="mx-auto mb-1 h-1.5 w-12 rounded-full bg-line" />
              </div>

              <div className="px-5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="jp-bold text-5xl text-indigo">{selected.kanji}</span>
                    <div className="mt-1 flex items-center gap-3 text-sm text-ink-soft">
                      <span className="jp">{selected.furigana}</span>
                      <span className="h-3 w-px bg-line" />
                      <span>{selected.romaji}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      className="flex h-9 w-9 items-center justify-center text-indigo/60 transition-colors hover:text-indigo"
                      aria-label="Bookmark"
                      onClick={() => toggleBookmark(selected.kanji)}
                    >
                      <Bookmark
                        size={18}
                        className={Array.isArray(bookmarked) && bookmarked.includes(selected.kanji) ? "fill-gold text-gold" : ""}
                      />
                    </motion.button>
                    {speechOn && (
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        className="flex h-9 w-9 items-center justify-center text-indigo/60 transition-colors hover:text-indigo"
                        aria-label="Dengar"
                        onClick={() => speak(selected.kanji, { kana: selected.furigana, key: "sheet" })}
                      >
                        <Volume2 size={18} className={isSpeaking("sheet") ? "animate-pulse text-indigo" : ""} />
                      </motion.button>
                    )}
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => setSelected(null)}
                      className="flex h-9 w-9 items-center justify-center text-indigo/60 transition-colors hover:text-indigo"
                      aria-label="Tutup"
                    >
                      <X size={18} />
                    </motion.button>
                  </div>
                </div>

                <Badge tone="indigo" className="mt-3">
                  {selected.level}
                </Badge>

                {/* Arti */}
                <h3 className="mt-5 text-sm font-bold text-ink">Arti</h3>
                <p className="text-sm text-ink-soft">
                  {selected.arti}
                  {posLabel(selected.pos) && ` (${posLabel(selected.pos)})`}
                </p>

                {/* Contoh Kalimat */}
                <h3 className="mt-4 text-sm font-bold text-ink">Contoh Kalimat</h3>
                <div className="mt-2 space-y-2">
                  {(() => {
                    const ex = makeJapaneseSentence(selected);
                    return (
                      <button
                        onClick={() => speak(ex.jp, { key: "contoh" })}
                        className="w-full rounded-btn bg-indigo-tint-soft p-3 text-left transition-colors hover:bg-indigo-tint-soft/70"
                      >
                        <p className="jp text-sm text-ink">{ex.jp}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-ink-soft">
                          {ex.id}
                          {speechOn && (
                            <Volume2
                              size={12}
                              className={isSpeaking("contoh") ? "animate-pulse text-indigo" : "text-indigo"}
                            />
                          )}
                        </p>
                      </button>
                    );
                  })()}
                </div>

                {/* Kata Terkait */}
                <h3 className="mt-4 text-sm font-bold text-ink">Kata Terkait</h3>
                <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto">
                  {relatedWords.map((r) => (
                    <button
                      key={`${r.kanji}-${r.furigana}`}
                      onClick={() => {
                        setQ(r.kanji);
                        setVisibleCount(PAGE);
                        setSelected(null);
                      }}
                      className="jp shrink-0 cursor-pointer rounded-full border border-indigo bg-paper px-3 py-1.5 text-sm text-indigo transition-colors hover:bg-indigo hover:text-white"
                    >
                      {r.kanji}
                    </button>
                  ))}
                </div>

                <Button
                  fullWidth
                  variant="outline"
                  className="mt-6 transition-all active:scale-[0.98]"
                  onClick={() => addToDeck(selected.kanji)}
                >
                  {deck.some((d) => d.kanji === selected.kanji) ? "Sudah di Deck Latihan" : "Tambah ke Deck Latihan"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deck confirmation toast */}
      <AnimatePresence>
        {deckToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-28 left-1/2 z-50 -translate-x-1/2 rounded-full bg-indigo px-4 py-2 text-xs font-semibold text-white shadow-soft-lg"
          >
            Ditambahkan ke Deck Latihan ({deck.length} kata)
          </motion.div>
        )}
      </AnimatePresence>
    </StudentShell>
  );
}
