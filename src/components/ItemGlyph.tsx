import type { Category } from "../lib/types";

type Props = { category: Category; catalogId: string; color: string; size?: number };

export function ItemGlyph({ category, catalogId, color, size = 28 }: Props) {
  const s = size;
  const common = { fill: "none", stroke: color, strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  if (catalogId === "cam-drone") {
    return (
      <svg width={s} height={s} viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="3.2" stroke={color} fill={`${color}33`} />
        <path d="M8 10h4M20 10h4M8 22h4M20 22h4" {...common} />
        <circle cx="8" cy="10" r="2.2" {...common} />
        <circle cx="24" cy="10" r="2.2" {...common} />
        <circle cx="8" cy="22" r="2.2" {...common} />
        <circle cx="24" cy="22" r="2.2" {...common} />
      </svg>
    );
  }

  if (category === "camera") {
    return (
      <svg width={s} height={s} viewBox="0 0 32 32">
        <rect x="5" y="10" width="15" height="12" rx="2.5" stroke={color} fill={`${color}22`} />
        <path d="M20 13.5l6-3.2v11.4l-6-3.2z" stroke={color} fill={`${color}33`} />
        <circle cx="12.5" cy="16" r="3" {...common} />
      </svg>
    );
  }

  if (catalogId === "light-tube") {
    return (
      <svg width={s} height={s} viewBox="0 0 32 32">
        <rect x="7" y="13" width="18" height="6" rx="3" stroke={color} fill={`${color}33`} />
      </svg>
    );
  }

  if (category === "light") {
    return (
      <svg width={s} height={s} viewBox="0 0 32 32">
        <path d="M16 6v3M8.5 9.5l2.2 2.2M23.5 9.5l-2.2 2.2" {...common} />
        <path d="M11 16a5 5 0 1 1 10 0c0 2.2-1.4 3.4-2.2 4.6-.5.8-.8 1.6-.8 2.4h-4c0-.8-.3-1.6-.8-2.4C12.4 19.4 11 18.2 11 16z" stroke={color} fill={`${color}28`} />
        <path d="M13 25h6" {...common} />
      </svg>
    );
  }

  if (catalogId === "set-boom") {
    return (
      <svg width={s} height={s} viewBox="0 0 32 32">
        <path d="M6 24l16-14" {...common} />
        <path d="M22 8l4 2-3 5-4-2z" stroke={color} fill={`${color}33`} />
      </svg>
    );
  }

  if (catalogId === "set-lav") {
    return (
      <svg width={s} height={s} viewBox="0 0 32 32">
        <rect x="13" y="8" width="6" height="10" rx="3" stroke={color} fill={`${color}22`} />
        <path d="M11 16a5 5 0 0 0 10 0M16 21v4M12 25h8" {...common} />
      </svg>
    );
  }

  if (catalogId === "set-table") {
    return (
      <svg width={s} height={s} viewBox="0 0 32 32">
        <path d="M6 13h20M8 13v10M24 13v10M6 13l2-4h16l2 4" {...common} />
      </svg>
    );
  }

  if (catalogId === "set-chair") {
    return (
      <svg width={s} height={s} viewBox="0 0 32 32">
        <path d="M11 8v10h10V8M9 18h14M12 18v7M20 18v7M10 25h4M18 25h4" {...common} />
      </svg>
    );
  }

  if (catalogId === "set-cyc") {
    return (
      <svg width={s} height={s} viewBox="0 0 32 32">
        <path d="M6 24c4-10 16-10 20 0" {...common} />
        <path d="M6 24h20" {...common} />
      </svg>
    );
  }

  if (catalogId === "set-monitor") {
    return (
      <svg width={s} height={s} viewBox="0 0 32 32">
        <rect x="6" y="8" width="20" height="13" rx="2" stroke={color} fill={`${color}18`} />
        <path d="M13 25h6M16 21v4" {...common} />
      </svg>
    );
  }

  return (
    <svg width={s} height={s} viewBox="0 0 32 32">
      <circle cx="16" cy="12" r="4.5" stroke={color} fill={`${color}22`} />
      <path d="M8 24c1.6-4.2 4.4-6 8-6s6.4 1.8 8 6" {...common} />
    </svg>
  );
}
