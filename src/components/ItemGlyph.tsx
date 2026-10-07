import type { ReactNode } from "react";
import type { Category } from "../lib/types";

type Props = { category: Category; catalogId: string; color: string; size?: number };

/**
 * Pictogrammes duotones (trait + aplat translucide) partagés par le plan, la bibliothèque et
 * le synoptique. Grille de 32, marge de 3, trait arrondi ; le trait s'épaissit en petite taille
 * pour rester lisible dans les pions du plan.
 */
export function ItemGlyph({ category, catalogId, color, size = 28 }: Props) {
  const strokeWidth = 2.25 - Math.min(0.5, Math.max(0, (size - 22) / 140));
  const base = { stroke: color, strokeWidth, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const line = { ...base, fill: "none" };
  const solid = { ...base, fill: `${color}33` };
  const strong = { ...base, fill: `${color}66` };
  const dot = { fill: color, stroke: "none" };
  const soft = { ...line, opacity: 0.55 };

  /** Buste commun aux personnes : tête + épaules. */
  const bust = (
    <>
      <circle cx="16" cy="10.5" r="4.6" {...solid} />
      <path d="M6.5 27.5c.8-5.6 4.4-8.8 9.5-8.8s8.7 3.2 9.5 8.8z" {...solid} />
    </>
  );

  const glyphs: Record<string, ReactNode> = {
    // ── Caméras ──
    "cam-main": (
      <>
        <path d="M8 11V7.5h8.5V11" {...line} />
        <rect x="3.5" y="11" width="17" height="13" rx="2.5" {...solid} />
        <path d="M20.5 14.5h3.2l4.3-3.2v13.4l-4.3-3.2h-3.2z" {...strong} />
        <circle cx="8.5" cy="16" r="1.5" {...dot} />
        <path d="M12.5 14.5v7" {...soft} />
      </>
    ),
    "cam-b": (
      <>
        <rect x="5" y="7" width="19" height="12" rx="6" {...solid} />
        <circle cx="21" cy="13" r="4.2" {...strong} />
        <circle cx="21" cy="13" r="1.5" {...dot} />
        <path d="M14.5 19v5M9 27.5h11M14.5 24l-4.5 3.5M14.5 24l4.5 3.5" {...line} />
      </>
    ),
    "cam-shoulder": (
      <>
        <rect x="5" y="10" width="17" height="9" rx="2.5" {...solid} />
        <path d="M22 11.5h3.5v6H22z" {...strong} />
        <path d="M25.5 12.5l3.5-1.5v8l-3.5-1.5" {...line} />
        <path d="M8 10V7h6v3" {...line} />
        <path d="M9 19v4.5c0 1.4 1 2.5 2.4 2.5h6.1" {...line} />
        <circle cx="9" cy="14.5" r="1.4" {...dot} />
      </>
    ),
    "cam-drone": (
      <>
        <path d="M12.5 12.5l-4.7-4.7M19.5 12.5l4.7-4.7M12.5 19.5l-4.7 4.7M19.5 19.5l4.7 4.7" {...line} />
        <circle cx="6.5" cy="6.5" r="3.4" {...solid} />
        <circle cx="25.5" cy="6.5" r="3.4" {...solid} />
        <circle cx="6.5" cy="25.5" r="3.4" {...solid} />
        <circle cx="25.5" cy="25.5" r="3.4" {...solid} />
        <rect x="11.5" y="11.5" width="9" height="9" rx="3" {...strong} />
        <circle cx="16" cy="16" r="1.9" {...dot} />
      </>
    ),
    "cam-crane": (
      <>
        <path d="M8.5 29.5l5-8.5 5 8.5M10.7 26h5.6" {...line} />
        <path d="M4 18.5L23 8" {...line} />
        <rect x="1.8" y="16.5" width="6" height="6" rx="1.4" {...strong} />
        <circle cx="13.5" cy="13.4" r="1.9" {...dot} />
        <rect x="21.5" y="3.5" width="8.5" height="8.5" rx="2" {...solid} />
        <circle cx="25.7" cy="7.7" r="1.9" {...dot} />
      </>
    ),
    "cam-pov": (
      <>
        <rect x="6" y="7" width="20" height="18" rx="5" {...solid} />
        <circle cx="16" cy="16" r="5.6" {...strong} />
        <circle cx="16" cy="16" r="2.2" {...dot} />
        <circle cx="22.5" cy="10.5" r="1.2" {...dot} />
      </>
    ),

    // ── Lumières ──
    "light-soft": (
      <>
        <path d="M8.5 5.5h15l4.5 13H4z" {...solid} />
        <path d="M11 10h10M9 14.5h14" {...soft} />
        <path d="M16 18.5V27M10.5 28.5h11" {...line} />
      </>
    ),
    "light-led": (
      <>
        <rect x="4" y="5.5" width="24" height="16" rx="3" {...solid} />
        <circle cx="10.5" cy="10.5" r="1.7" {...dot} />
        <circle cx="16" cy="10.5" r="1.7" {...dot} />
        <circle cx="21.5" cy="10.5" r="1.7" {...dot} />
        <circle cx="10.5" cy="16.5" r="1.7" {...dot} />
        <circle cx="16" cy="16.5" r="1.7" {...dot} />
        <circle cx="21.5" cy="16.5" r="1.7" {...dot} />
        <path d="M16 21.5V27M10.5 28.5h11" {...line} />
      </>
    ),
    "light-spot": (
      <>
        <rect x="3.5" y="11" width="14" height="10" rx="2.5" {...solid} />
        <path d="M17.5 11.5L22 8.5v15l-4.5-3z" {...strong} />
        <path d="M25 10l3-1.8M25.5 16h3.5M25 22l3 1.8" {...line} />
        <path d="M10.5 21v5.5M6.5 28h8" {...line} />
      </>
    ),
    "light-fresnel": (
      <>
        <rect x="2.5" y="10" width="3" height="9" rx="1" {...strong} />
        <rect x="26.5" y="10" width="3" height="9" rx="1" {...strong} />
        <circle cx="16" cy="14.5" r="9" {...solid} />
        <circle cx="16" cy="14.5" r="5.2" {...line} />
        <circle cx="16" cy="14.5" r="1.8" {...dot} />
        <path d="M16 23.5V27M11 28.5h10" {...line} />
      </>
    ),
    "light-tube": (
      <>
        <rect x="3" y="11.5" width="26" height="9" rx="4.5" {...solid} />
        <path d="M8 16h16" stroke="#fff" strokeWidth={strokeWidth * 0.8} strokeLinecap="round" opacity={0.75} />
        <path d="M7.5 11.5v-3M24.5 11.5v-3M7.5 20.5v3M24.5 20.5v3" {...soft} />
      </>
    ),
    "light-practical": (
      <>
        <path d="M9.5 4.5h13l4 11h-21z" {...solid} />
        <circle cx="16" cy="10.5" r="2" {...dot} />
        <path d="M16 15.5V25" {...line} />
        <rect x="10.5" y="25" width="11" height="3.5" rx="1.7" {...strong} />
      </>
    ),

    // ── Grip ──
    "grip-cstand": (
      <>
        <path d="M16 4v19M16 23L7 29M16 23l9 6M16 23v6" {...line} />
        <path d="M16 9.5h8.5" {...line} />
        <circle cx="26.5" cy="9.5" r="2.8" {...strong} />
        <circle cx="16" cy="9.5" r="1.5" {...dot} />
      </>
    ),
    "grip-flag": (
      <>
        <path d="M7.5 4v24M3.5 28.5h8" {...line} />
        <rect x="9.5" y="5.5" width="17" height="13" rx="1.5" {...solid} />
        <path d="M13 18.5l6-13M19 18.5l6-13" {...soft} />
      </>
    ),
    "grip-butterfly": (
      <>
        <rect x="4" y="4.5" width="24" height="15" rx="1.8" {...solid} />
        <rect x="7.5" y="8" width="17" height="8" rx="0.8" {...soft} />
        <circle cx="4" cy="4.5" r="1.4" {...dot} />
        <circle cx="28" cy="4.5" r="1.4" {...dot} />
        <circle cx="4" cy="19.5" r="1.4" {...dot} />
        <circle cx="28" cy="19.5" r="1.4" {...dot} />
        <path d="M16 19.5V28M10 29h12" {...line} />
      </>
    ),

    // ── Audio ──
    "audio-boom": (
      <>
        <path d="M4.5 27.5L20 11" {...line} />
        <rect x="19" y="3" width="8" height="15" rx="4" transform="rotate(40 23 10.5)" {...strong} />
        <path d="M21.5 8.5l5 4.6" stroke="#fff" strokeWidth={strokeWidth * 0.7} strokeLinecap="round" opacity={0.6} />
        <circle cx="5" cy="27" r="2" {...dot} />
      </>
    ),
    "audio-lav": (
      <>
        <circle cx="16" cy="9.5" r="4.8" {...strong} />
        <rect x="12.5" y="14.5" width="7" height="5" rx="1.5" {...solid} />
        <path d="M16 19.5c0 3-5 3.5-5 6.5 0 2 2 2.8 5 2.8" {...line} />
      </>
    ),
    "audio-stand": (
      <>
        <rect x="12" y="3.5" width="8" height="12" rx="4" {...strong} />
        <path d="M14 7.5h4M14 10.5h4" {...soft} />
        <path d="M8.5 11.5a7.5 7.5 0 0 0 15 0" {...line} />
        <path d="M16 19v8M16 27l-6.5 2.5M16 27l6.5 2.5M16 27v2.5" {...line} />
      </>
    ),

    // ── Équipe ──
    "talent-director": (
      <>
        {bust}
        <path d="M10.2 11a5.8 5.8 0 0 1 11.6 0" {...line} />
        <rect x="8.2" y="9.8" width="2.6" height="4.4" rx="1.2" {...dot} />
        <rect x="21.2" y="9.8" width="2.6" height="4.4" rx="1.2" {...dot} />
        <path d="M10 14.2c.3 2 1.6 3 3.6 3.2" {...line} />
      </>
    ),
    "talent-op": (
      <>
        {bust}
        <rect x="19" y="15.5" width="10" height="7" rx="1.8" {...strong} />
        <circle cx="24" cy="19" r="1.9" {...dot} />
      </>
    ),
    "talent-actor": (
      <>
        {bust}
        <path d="M25.5 3.5l1.1 2.7 2.8 1.1-2.8 1.1-1.1 2.7-1.1-2.7-2.8-1.1 2.8-1.1z" {...dot} />
      </>
    ),
    "talent-guest": (
      <>
        {bust}
        <path d="M16 19l-2.4 2.6L16 28.5l2.4-6.9z" {...strong} />
      </>
    ),
    "talent-extra": (
      <>
        <circle cx="16" cy="10.5" r="4.6" {...line} strokeDasharray="3 3" />
        <path d="M6.5 27.5c.8-5.6 4.4-8.8 9.5-8.8s8.7 3.2 9.5 8.8" {...line} strokeDasharray="3 3" />
      </>
    ),

    // ── Décors & régie ──
    "set-table": (
      <>
        <rect x="2.5" y="10.5" width="27" height="5" rx="2" {...solid} />
        <path d="M6.5 15.5v12M25.5 15.5v12M6.5 22h19" {...line} />
      </>
    ),
    "set-chair": (
      <>
        <rect x="8" y="3.5" width="11" height="12" rx="2.5" {...solid} />
        <rect x="7" y="15.5" width="19" height="4.5" rx="1.8" {...strong} />
        <path d="M9.5 20v8.5M23.5 20v8.5" {...line} />
      </>
    ),
    "set-cyc": (
      <>
        <path d="M4.5 4.5v14c0 5 4 9 9 9h14v-23z" {...solid} />
        <path d="M10 6v10M16 6v10M22 6v10" {...soft} />
        <path d="M4.5 4.5h23" {...line} />
      </>
    ),
    "set-monitor": (
      <>
        <rect x="2.5" y="5.5" width="27" height="18" rx="2.8" {...solid} />
        <rect x="5.5" y="8.5" width="21" height="12" rx="1.2" {...line} opacity={0.5} />
        <path d="M8 16.5l4-4.5 3.2 3.3 3-4 4.8 5.2" {...line} />
        <path d="M16 23.5v3.5M10.5 28h11" {...line} />
      </>
    ),
    "set-atem-mini": (
      <>
        <rect x="2" y="8" width="28" height="17" rx="3.2" {...solid} />
        <rect x="5" y="11" width="4" height="3.2" rx="0.8" {...dot} />
        <rect x="10.5" y="11" width="4" height="3.2" rx="0.8" {...dot} opacity={0.65} />
        <rect x="16" y="11" width="4" height="3.2" rx="0.8" {...dot} opacity={0.65} />
        <rect x="21.5" y="11" width="4" height="3.2" rx="0.8" {...dot} opacity={0.65} />
        <rect x="5" y="17" width="4" height="3.2" rx="0.8" {...dot} opacity={0.35} />
        <rect x="10.5" y="17" width="4" height="3.2" rx="0.8" {...dot} opacity={0.35} />
        <circle cx="24.5" cy="19" r="2.6" {...strong} />
      </>
    ),
    "set-sound-desk": (
      <>
        <rect x="2" y="6" width="28" height="20" rx="3.2" {...solid} />
        <path d="M8 10.5v11M13.5 10.5v11M19 10.5v11M24.5 10.5v11" {...soft} />
        <rect x="6.3" y="15" width="3.4" height="3.4" rx="0.9" {...dot} />
        <rect x="11.8" y="18" width="3.4" height="3.4" rx="0.9" {...dot} />
        <rect x="17.3" y="12.5" width="3.4" height="3.4" rx="0.9" {...dot} />
        <rect x="22.8" y="16" width="3.4" height="3.4" rx="0.9" {...dot} />
      </>
    ),
  };

  // Variantes historiques
  glyphs["set-boom"] = glyphs["audio-boom"];
  glyphs["set-lav"] = glyphs["audio-lav"];

  const fallback: Record<string, ReactNode> = {
    camera: glyphs["cam-main"],
    light: glyphs["light-soft"],
    grip: glyphs["grip-cstand"],
    audio: glyphs["audio-lav"],
    talent: (
      <>
        {bust}
      </>
    ),
    set: (
      <>
        <rect x="5" y="7" width="22" height="18" rx="3.5" {...solid} />
        <path d="M5 14h22" {...soft} />
      </>
    ),
  };

  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" style={{ overflow: "visible" }}>
      {glyphs[catalogId] ?? fallback[category] ?? fallback.set}
    </svg>
  );
}
