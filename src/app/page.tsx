"use client";

import { useState } from "react";

import { SmoothScroll } from "@/components/landing/SmoothScroll";
import { Opening } from "@/components/landing/Opening";
import { Hero } from "@/components/landing/Hero";
import { ProductReveal } from "@/components/landing/ProductReveal";
import { FiturBento } from "@/components/landing/FiturBento";
import { SpeechScene } from "@/components/landing/SpeechScene";
import { FlashcardLeaderboard } from "@/components/landing/FlashcardLeaderboard";
import { StoryScene } from "@/components/landing/StoryScene";
import { TeamScene } from "@/components/landing/TeamScene";
import { EndingScene } from "@/components/landing/EndingScene";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingSectionBg } from "@/components/landing/LandingSectionBg";

export default function LandingPage() {
  const [opened, setOpened] = useState(false);

  return (
    <SmoothScroll>
      {!opened && <Opening onDone={() => setOpened(true)} />}
      <LandingNav />
      <main id="main-content" className="relative overflow-x-hidden">
        <div className="relative hero-glow hero-glow-vermillion">
          <Hero />
        </div>

        {/* ─── 01 Produk ─── */}
        <LandingSectionBg><ProductReveal /></LandingSectionBg>

        {/* ─── 02 Belajar + 03 AI Sensei (Bento) ─── */}
        <LandingSectionBg><FiturBento /></LandingSectionBg>

        {/* ─── 04 Latihan Ucapan ─── */}
        <LandingSectionBg><SpeechScene /></LandingSectionBg>

        {/* ─── 05 Flashcard + 06 Peringkat (Side by side) ─── */}
        <LandingSectionBg><FlashcardLeaderboard /></LandingSectionBg>

        {/* ─── 07 Cerita ─── */}
        <LandingSectionBg><StoryScene /></LandingSectionBg>

        {/* ─── Tim ─── */}
        <LandingSectionBg><TeamScene /></LandingSectionBg>

        {/* ─── Ending + Footer ─── */}
        <LandingSectionBg><EndingScene /></LandingSectionBg>
        <LandingSectionBg><LandingFooter /></LandingSectionBg>
      </main>
    </SmoothScroll>
  );
}
