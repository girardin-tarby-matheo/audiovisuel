import type { ReactNode } from "react";
import type { Category } from "../lib/types";

type Props = { category: Category; catalogId: string; color: string; size?: number };

/**
 * Pictogrammes duotones (trait + aplat translucide) partagés par le plan, la
 * bibliothèque et le synoptique : une même grammaire visuelle pour tous les objets.
 */
export function ItemGlyph({ category, catalogId, color, size = 28 }: Props) {
  const line = { fill: "none", stroke: color, strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const solid = { fill: `${color}2e`, stroke: color, strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const dot = { fill: color, stroke: "none" };

  const glyphs: Record<string, ReactNode> = {
    "cam-main": (
      <>
        <rect x="4" y="10" width="16" height="12" rx="2.5" {...solid} />
        <path d="M20 14l7-3.5v11L20 18z" {...solid} />
        <circle cx="12" cy="16" r="3" {...line} />
        <path d="M8 10V7.5h8V10" {...line} />
      </>
    ),
    "cam-b": (
      <>
        <rect x="5" y="11" width="14" height="11" rx="2.5" {...solid} />
        <path d="M19 14l6-3v10.5l-6-3z" {...solid} />
        <circle cx="12" cy="16.5" r="2.6" {...line} />
        <circle cx="22" cy="8" r="1.4" {...dot} />
      </>
    ),
    "cam-shoulder": (
      <>
        <rect x="8" y="9" width="17" height="10" rx="2.5" {...solid} />
        <path d="M25 11h3v6h-3" {...line} />
        <circle cx="16" cy="14" r="2.8" {...line} />
        <path d="M11 19v6h8l2-6M7 25h6" {...line} />
      </>
    ),
    "cam-drone": (
      <>
        <rect x="12.5" y="12.5" width="7" height="7" rx="2" {...solid} />
        <path d="M13 13l-5-5M19 13l5-5M13 19l-5 5M19 19l5 5" {...line} />
        <circle cx="7" cy="7" r="2.6" {...line} />
        <circle cx="25" cy="7" r="2.6" {...line} />
        <circle cx="7" cy="25" r="2.6" {...line} />
        <circle cx="25" cy="25" r="2.6" {...line} />
      </>
    ),
    "cam-crane": (
      <>
        <path d="M5 26h9M9.5 26V15" {...line} />
        <path d="M6 12l18-6" {...line} />
        <rect x="21" y="8" width="8" height="7" rx="1.8" {...solid} />
        <circle cx="9.5" cy="13" r="1.6" {...dot} />
      </>
    ),
    "cam-pov": (
      <>
        <rect x="9" y="10" width="14" height="12" rx="3.5" {...solid} />
        <circle cx="16" cy="16" r="3.4" {...line} />
        <circle cx="16" cy="16" r="1" {...dot} />
        <path d="M13 10V8h6v2" {...line} />
      </>
    ),
    "light-soft": (
      <>
        <path d="M8 8h16l3 12H5z" {...solid} />
        <path d="M11 11h10M10 15h12" {...line} opacity={0.55} />
        <path d="M16 20v6M11 27h10" {...line} />
      </>
    ),
    "light-led": (
      <>
        <rect x="5" y="7" width="22" height="15" rx="2.5" {...solid} />
        <circle cx="11" cy="12" r="1.2" {...dot} />
        <circle cx="16" cy="12" r="1.2" {...dot} />
        <circle cx="21" cy="12" r="1.2" {...dot} />
        <circle cx="11" cy="17" r="1.2" {...dot} />
        <circle cx="16" cy="17" r="1.2" {...dot} />
        <circle cx="21" cy="17" r="1.2" {...dot} />
        <path d="M16 22v5M11 27h10" {...line} />
      </>
    ),
    "light-spot": (
      <>
        <path d="M6 12l12-4v14L6 18z" {...solid} />
        <path d="M18 10l8-3M18 15h9M18 20l8 3" {...line} opacity={0.6} />
        <path d="M10 18v8" {...line} />
      </>
    ),
    "light-fresnel": (
      <>
        <rect x="5" y="9" width="13" height="13" rx="2" {...solid} />
        <path d="M18 10l5-3v16l-5-3z" {...solid} />
        <path d="M26 11l2-1M26 16h3M26 21l2 1" {...line} opacity={0.6} />
        <path d="M11 22v4M8 26h6" {...line} />
      </>
    ),
    "light-tube": (
      <>
        <rect x="4" y="13" width="24" height="6" rx="3" {...solid} />
        <path d="M9 16h14" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity={0.7} />
      </>
    ),
    "light-practical": (
      <>
        <path d="M10 6h12l3 10H7z" {...solid} />
        <path d="M16 16v8M11 26h10" {...line} />
      </>
    ),
    "grip-cstand": (
      <>
        <path d="M16 6v19M16 25l-7 3M16 25l7 3M16 25v3.5" {...line} />
        <path d="M16 9h8" {...line} />
        <circle cx="25" cy="9" r="2.4" {...solid} />
      </>
    ),
    "grip-flag": (
      <>
        <path d="M8 4v24" {...line} />
        <rect x="10" y="6" width="15" height="12" rx="1" {...solid} />
        <path d="M5 28h6" {...line} />
      </>
    ),
    "grip-butterfly": (
      <>
        <rect x="5" y="6" width="22" height="16" rx="1.5" {...solid} />
        <path d="M5 6l22 16M27 6L5 22" {...line} opacity={0.4} />
        <path d="M16 22v5M11 27h10" {...line} />
      </>
    ),
    "audio-boom": (
      <>
        <path d="M4 26l17-14" {...line} />
        <rect x="19" y="6" width="9" height="7" rx="3.5" transform="rotate(30 23.5 9.5)" {...solid} />
        <circle cx="5" cy="25" r="1.8" {...dot} />
      </>
    ),
    "audio-lav": (
      <>
        <rect x="12.5" y="6" width="7" height="12" rx="3.5" {...solid} />
        <path d="M9 14a7 7 0 0 0 14 0M16 21v5M11 26h10" {...line} />
      </>
    ),
    "audio-stand": (
      <>
        <rect x="12.5" y="4" width="7" height="11" rx="3.5" {...solid} />
        <path d="M16 15v11M16 26l-6 3M16 26l6 3" {...line} />
        <path d="M9 12a7 7 0 0 0 14 0" {...line} opacity={0.6} />
      </>
    ),
    "set-table": (
      <>
        <path d="M4 12h24l-2 3H6z" {...solid} />
        <path d="M7 15v11M25 15v11M10 15v6M22 15v6" {...line} />
      </>
    ),
    "set-chair": (
      <>
        <path d="M10 5h12v10H10z" {...solid} />
        <path d="M8 18h16v3H8zM11 21v6M21 21v6" {...line} />
      </>
    ),
    "set-cyc": (
      <>
        <path d="M4 26V10a6 6 0 0 1 6-6h12a6 6 0 0 1 6 6v16" {...line} opacity={0.5} />
        <path d="M4 24c5-8 19-8 24 0z" {...solid} />
      </>
    ),
    "set-monitor": (
      <>
        <rect x="4" y="6" width="24" height="16" rx="2.5" {...solid} />
        <path d="M11 26h10M16 22v4" {...line} />
        <path d="M8 18l4-5 3 3 3-4 4 6" {...line} opacity={0.65} />
      </>
    ),
    "set-atem-mini": (
      <>
        <rect x="3" y="9" width="26" height="14" rx="2.5" {...solid} />
        <rect x="6" y="12" width="4" height="3" rx="0.8" {...dot} />
        <rect x="12" y="12" width="4" height="3" rx="0.8" {...dot} opacity={0.6} />
        <rect x="18" y="12" width="4" height="3" rx="0.8" {...dot} opacity={0.6} />
        <path d="M7 19h18" {...line} opacity={0.6} />
      </>
    ),
    "set-sound-desk": (
      <>
        <rect x="3" y="8" width="26" height="16" rx="2.5" {...solid} />
        <path d="M9 12v8M16 12v8M23 12v8" {...line} opacity={0.55} />
        <rect x="7.5" y="14" width="3" height="3" rx="0.8" {...dot} />
        <rect x="14.5" y="17" width="3" height="3" rx="0.8" {...dot} />
        <rect x="21.5" y="13" width="3" height="3" rx="0.8" {...dot} />
      </>
    ),
    "talent-director": (
      <>
        <circle cx="16" cy="9" r="4" {...solid} />
        <path d="M7 26c1-6 4-9 9-9s8 3 9 9" {...line} />
        <path d="M22 4l5 2-1 4-5-2z" {...solid} />
      </>
    ),
    "talent-op": (
      <>
        <circle cx="16" cy="9" r="4" {...solid} />
        <path d="M7 26c1-6 4-9 9-9s8 3 9 9" {...line} />
        <rect x="19" y="15" width="9" height="6" rx="1.5" {...solid} />
      </>
    ),
    "talent-actor": (
      <>
        <circle cx="16" cy="9" r="4" {...solid} />
        <path d="M7 26c1-6 4-9 9-9s8 3 9 9" {...line} />
        <path d="M13 7.6l1 .8M19 7.6l-1 .8" {...line} strokeWidth={1.2} />
      </>
    ),
    "talent-guest": (
      <>
        <circle cx="16" cy="9" r="4" {...solid} />
        <path d="M7 26c1-6 4-9 9-9s8 3 9 9" {...line} />
        <path d="M16 18l-2 4 2 4 2-4z" {...solid} />
      </>
    ),
    "talent-extra": (
      <>
        <circle cx="16" cy="9" r="4" {...solid} />
        <path d="M7 26c1-6 4-9 9-9s8 3 9 9" {...line} strokeDasharray="2.5 2.5" />
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
    talent: glyphs["talent-actor"],
    set: (
      <>
        <rect x="6" y="8" width="20" height="16" rx="3" {...solid} />
        <path d="M6 14h20" {...line} opacity={0.5} />
      </>
    ),
  };

  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" style={{ overflow: "visible" }}>
      {glyphs[catalogId] ?? fallback[category] ?? fallback.set}
    </svg>
  );
}
