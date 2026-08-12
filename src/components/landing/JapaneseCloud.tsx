"use client";

import { motion } from "framer-motion";

/**
 * JapaneseCloud — Traditional Kasumi / Mega Mendung cloud motifs.
 *
 * Each cloud variant has TWO layers (back + front) for depth,
 * inspired by kasumi (霞) and mega mendung batik patterns.
 *
 * Layers are positioned so the cloud NEVER clips at SVG edges
 * — safe for use in overflow-hidden containers.
 */

// ─── Path Definitions ───────────────────────────────────────

type CloudVariant = "kasumi-large" | "kasumi-medium" | "kasumi-small";

interface CloudDef {
  viewBox: string;
  backPath: string;
  frontPath: string;
}

const CLOUDS: Record<CloudVariant, CloudDef> = {
  /**
   * kasumi-large — 5 scallops, wide horizontal band.
   * Ideal for full-width hero placement.
   */
  "kasumi-large": {
    viewBox: "0 0 520 100",
    backPath: [
      "M20,75",
      "C20,35 50,25 70,45",
      "C75,10 120,5 145,35",
      "C150,0 210,0 235,30",
      "C240,5 285,10 310,38",
      "C315,20 350,25 368,48",
      "C375,40 405,45 410,58",
      "C400,75 360,80 315,70",
      "C260,82 195,82 150,72",
      "C95,82 55,85 30,75",
      "C15,80 15,70 20,75 Z",
    ].join(" "),
    frontPath: [
      "M35,68",
      "C35,40 58,32 75,48",
      "C80,22 110,18 130,40",
      "C135,12 175,12 195,36",
      "C200,20 228,24 245,44",
      "C250,36 268,40 278,52",
      "C270,68 240,72 210,65",
      "C170,74 130,74 100,66",
      "C68,74 45,76 32,68",
      "C25,72 25,65 35,68 Z",
    ].join(" "),
  },

  /**
   * kasumi-medium — 4 scallops, medium band.
   * Good for section corners or smaller containers.
   */
  "kasumi-medium": {
    viewBox: "0 0 400 80",
    backPath: [
      "M15,60",
      "C15,30 38,22 55,38",
      "C60,10 100,8 125,32",
      "C130,2 180,2 200,28",
      "C205,12 240,18 255,40",
      "C260,32 290,36 300,48",
      "C290,65 255,70 220,60",
      "C175,72 130,72 90,60",
      "C55,70 30,72 20,62",
      "C10,66 10,58 15,60 Z",
    ].join(" "),
    frontPath: [
      "M28,55",
      "C28,35 45,28 60,42",
      "C65,20 90,18 110,38",
      "C115,10 150,10 168,34",
      "C172,22 198,26 210,44",
      "C200,58 175,62 150,55",
      "C120,64 90,64 70,55",
      "C45,62 30,64 25,56",
      "C20,60 22,53 28,55 Z",
    ].join(" "),
  },

  /**
   * kasumi-small — 3 scallops, compact accent.
   * Perfect for tight spaces or scattered decor.
   */
  "kasumi-small": {
    viewBox: "0 0 280 60",
    backPath: [
      "M12,45",
      "C12,20 30,15 48,30",
      "C52,5 90,5 112,25",
      "C115,10 148,15 160,35",
      "C165,28 185,30 195,40",
      "C185,55 155,60 130,50",
      "C95,60 60,60 35,50",
      "C15,55 8,50 12,45 Z",
    ].join(" "),
    frontPath: [
      "M22,42",
      "C22,25 35,20 50,33",
      "C55,14 80,14 100,30",
      "C103,20 128,22 138,36",
      "C130,48 110,52 92,46",
      "C68,52 45,52 32,46",
      "C20,50 18,45 22,42 Z",
    ].join(" "),
  },
};

// ─── Color Palettes ─────────────────────────────────────────

type CloudColor = "navy" | "vermillion" | "gold" | "ink";

const COLOR_MAP: Record<CloudColor, { back: string; front: string }> = {
  navy: { back: "text-navy/[0.08]", front: "text-navy/[0.05]" },
  vermillion: { back: "text-jp-red/[0.07]", front: "text-jp-red/[0.04]" },
  gold: { back: "text-gold/[0.08]", front: "text-gold/[0.05]" },
  ink: { back: "text-ink/[0.06]", front: "text-ink/[0.035]" },
};

// ─── Component ──────────────────────────────────────────────

interface Props {
  /** Cloud shape variant. Default: "kasumi-large". */
  variant?: CloudVariant;
  /** Color theme. Default: "navy". */
  color?: CloudColor;
  /** Optional framer-motion props for scroll-driven animation. */
  motionProps?: Parameters<typeof motion.div>[0];
  /** Additional CSS classes for the wrapper. */
  className?: string;
}

function CloudContent({ cloud, palette }: { cloud: CloudDef; palette: { back: string; front: string } }) {
  return (
    <>
      <svg
        viewBox={cloud.viewBox}
        fill="currentColor"
        className={`w-full h-auto ${palette.back}`}
        aria-hidden="true"
      >
        <path d={cloud.backPath} />
      </svg>
      {/* Front layer — slightly smaller, overlays inside for depth */}
      <svg
        viewBox={cloud.viewBox}
        fill="currentColor"
        className="absolute inset-0 w-full h-auto"
        style={{ transform: "scale(0.92)" }}
        aria-hidden="true"
      >
        <path d={cloud.frontPath} className={palette.front} />
      </svg>
    </>
  );
}

export function JapaneseCloud({
  variant = "kasumi-large",
  color = "navy",
  motionProps,
  className = "",
}: Props) {
  const cloud = CLOUDS[variant];
  const palette = COLOR_MAP[color];

  if (motionProps) {
    return (
      <motion.div
        className={`relative pointer-events-none select-none ${className}`}
        aria-hidden="true"
        {...motionProps}
      >
        <CloudContent cloud={cloud} palette={palette} />
      </motion.div>
    );
  }

  return (
    <div
      className={`relative pointer-events-none select-none ${className}`}
      aria-hidden="true"
    >
      <CloudContent cloud={cloud} palette={palette} />
    </div>
  );
}

// ─── Pre-built positioned cloud helpers ─────────────────────

/**
 * Convenience preset: large navy cloud for the top-left of a section.
 * Already has blur and max-width constraints.
 */
export function CloudTopLeft({
  variant = "kasumi-large",
  color = "navy",
  widthClass = "w-[70%] max-w-[650px]",
  className = "",
}: {
  variant?: CloudVariant;
  color?: CloudColor;
  widthClass?: string;
  className?: string;
}) {
  return (
    <JapaneseCloud
      variant={variant}
      color={color}
      className={`absolute top-0 left-0 -translate-x-[6%] -translate-y-[18%] ${widthClass} blur-[1px] ${className}`}
    />
  );
}

/**
 * Convenience preset: medium cloud for the bottom-right of a section.
 */
export function CloudBottomRight({
  variant = "kasumi-medium",
  color = "navy",
  widthClass = "w-[55%] max-w-[500px]",
  className = "",
}: {
  variant?: CloudVariant;
  color?: CloudColor;
  widthClass?: string;
  className?: string;
}) {
  return (
    <JapaneseCloud
      variant={variant}
      color={color}
      className={`absolute bottom-0 right-0 translate-x-[8%] translate-y-[20%] ${widthClass} blur-[0.5px] ${className}`}
    />
  );
}

/**
 * Convenience preset: small accent cloud for scattered placement.
 */
export function CloudAccent({
  variant = "kasumi-small",
  color = "navy",
  widthClass = "w-[30%] max-w-[280px]",
  className = "",
}: {
  variant?: CloudVariant;
  color?: CloudColor;
  widthClass?: string;
  className?: string;
}) {
  return (
    <JapaneseCloud
      variant={variant}
      color={color}
      className={`absolute ${widthClass} blur-[0.3px] ${className}`}
    />
  );
}
