import { useRef, useEffect, type PointerEvent as ReactPointerEvent } from "react";
import { ItemGlyph } from "./ItemGlyph";
import type { BoardObject } from "../lib/types";

type Props = {
  item: BoardObject;
  selected: boolean;
  panActive: boolean;
  zoom: number;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onRemove: (id: string) => void;
};

export function BoardNode({ item, selected, panActive, zoom, onSelect, onMove, onRemove }: Props) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const size = 76 * item.scale;
  const isNew = useRef(true);

  useEffect(() => {
    // Mark as "not new" after mount animation completes
    const timer = setTimeout(() => { isNew.current = false; }, 350);
    return () => clearTimeout(timer);
  }, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (panActive || event.button !== 0) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    onSelect(item.id);
    const startX = event.clientX;
    const startY = event.clientY;
    const originX = item.x;
    const originY = item.y;

    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / zoom;
      const dy = (ev.clientY - startY) / zoom;
      onMove(item.id, originX + dx, originY + dy);
    };
    const up = (ev: PointerEvent) => {
      event.currentTarget.releasePointerCapture(ev.pointerId);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // Camera FOV cone
  const coneRange = 210 * item.scale;
  const halfFov = (item.fov / 2) * (Math.PI / 180);
  const camPath = `M 0 0 L ${Math.sin(-halfFov) * coneRange} ${-Math.cos(-halfFov) * coneRange} A ${coneRange} ${coneRange} 0 0 1 ${Math.sin(halfFov) * coneRange} ${-Math.cos(halfFov) * coneRange} Z`;

  // Light beam cone
  const beamRange = item.beamRadius * item.scale;
  const halfBeam = (item.beamSpread / 2) * (Math.PI / 180);
  const lightPath = `M 0 0 L ${Math.sin(-halfBeam) * beamRange} ${-Math.cos(-halfBeam) * beamRange} A ${beamRange} ${beamRange} 0 ${item.beamSpread > 180 ? 1 : 0} 1 ${Math.sin(halfBeam) * beamRange} ${-Math.cos(halfBeam) * beamRange} Z`;

  // Intensity-based opacity for hex strings
  const glowAlpha = Math.round(item.intensity * 0.7).toString(16).padStart(2, "0");
  const beamAlpha = Math.round(20 + item.intensity * 0.35).toString(16).padStart(2, "0");

  return (
    <div
      ref={nodeRef}
      className="absolute"
      style={{
        left: item.x,
        top: item.y,
        width: size,
        height: size,
        transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
        zIndex: selected ? 20 : 5,
        animation: isNew.current ? "scale-in 280ms cubic-bezier(0.34, 1.56, 0.64, 1) both" : undefined,
      }}
    >
      {/* ── Camera FOV cone ── */}
      {item.category === "camera" && (
        <svg
          className="pointer-events-none absolute left-1/2 top-1/2 overflow-visible"
          width="1"
          height="1"
          style={{ opacity: selected ? 0.95 : 0.72, transition: "opacity 200ms" }}
        >
          <defs>
            <linearGradient id={`cam-grad-${item.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={item.color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={item.color} stopOpacity="0.03" />
            </linearGradient>
          </defs>
          <path
            d={camPath}
            fill={`url(#cam-grad-${item.id})`}
            stroke={`${item.color}88`}
            strokeWidth="1"
            strokeDasharray={selected ? "none" : "4 3"}
            style={{ transition: "d 180ms, stroke-dasharray 200ms" }}
          />
          {/* Direction indicator line */}
          <line
            x1="0" y1="0"
            x2="0" y2={-coneRange * 0.4}
            stroke={`${item.color}55`}
            strokeWidth="1"
            strokeDasharray="3 4"
          />
        </svg>
      )}

      {/* ── Light glow + beam cone ── */}
      {item.category === "light" && (
        <>
          {/* Radial glow */}
          <div
            className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${selected ? "animate-glow-pulse" : ""
              }`}
            style={{
              width: item.beamRadius * 1.15 * item.scale,
              height: item.beamRadius * 1.15 * item.scale,
              background: `radial-gradient(circle, ${item.color}${glowAlpha} 0%, ${item.color}00 72%)`,
              filter: `blur(${6 + item.intensity / 18}px)`,
              transition: "width 200ms, height 200ms, filter 200ms",
            }}
          />
          {/* Beam cone */}
          <svg
            className="pointer-events-none absolute left-1/2 top-1/2 overflow-visible"
            width="1"
            height="1"
          >
            <defs>
              <radialGradient id={`light-grad-${item.id}`}>
                <stop offset="0%" stopColor={item.color} stopOpacity="0.3" />
                <stop offset="100%" stopColor={item.color} stopOpacity="0.04" />
              </radialGradient>
            </defs>
            <path
              d={lightPath}
              fill={`url(#light-grad-${item.id})`}
              stroke={`${item.color}55`}
              strokeWidth="0.8"
              style={{ transition: "d 180ms" }}
            />
          </svg>
        </>
      )}

      {/* ── Card body ── */}
      <div
        onPointerDown={onPointerDown}
        className={`relative flex h-full w-full flex-col items-center justify-center rounded-2xl border backdrop-blur-sm transition-all duration-200 ${selected
            ? "border-amber-300/70 bg-[#10141c]/92 shadow-[0_0_0_1px_rgba(245,185,66,0.3),0_12px_40px_rgba(0,0,0,0.35)]"
            : "border-white/10 bg-[#10141c]/88 hover:border-white/20 hover:bg-[#10141c]/95"
          } ${panActive ? "cursor-grab" : "cursor-grab active:cursor-grabbing"}`}
        style={{
          boxShadow: item.category === "light"
            ? `0 0 ${selected ? 32 : 22}px ${item.color}${selected ? "66" : "44"}, 0 8px 20px rgb(0 0 0 / 0.25)`
            : selected
              ? "0 0 0 1px rgba(245,185,66,0.3), 0 12px 40px rgba(0,0,0,0.35)"
              : "0 8px 24px rgb(0 0 0 / 0.22)",
          transition: "box-shadow 200ms, border-color 200ms, background 200ms",
        }}
      >
        {/* Rotation indicator */}
        <div
          className="pointer-events-none absolute -top-1.5 left-1/2 h-3 w-px -translate-x-1/2"
          style={{
            background: `linear-gradient(to top, transparent, ${selected ? item.color : "rgb(255 255 255 / 0.25)"})`,
            transition: "background 200ms",
          }}
        />

        <ItemGlyph category={item.category} catalogId={item.catalogId} color={item.color} size={28} />
        <span className="mt-1 font-mono text-[9px] tracking-[0.18em] text-white/70">{item.label}</span>

        {/* Selection ring pulse */}
        {selected && (
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl border border-amber-300/30"
            style={{ animation: "pulse-ring 1.8s ease infinite" }}
          />
        )}

        {/* Delete button */}
        {selected && (
          <button
            type="button"
            className="absolute -right-2.5 -top-2.5 flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-[#1a1020]/95 text-[12px] text-rose-300 shadow-lg no-export transition-all hover:scale-110 hover:bg-rose-500/30 hover:text-rose-200"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onRemove(item.id);
            }}
            aria-label="Supprimer"
          >
            ×
          </button>
        )}
      </div>

      {/* ── Label below card ── */}
      <div
        className="pointer-events-none absolute left-1/2 top-[calc(100%+6px)] w-40 -translate-x-1/2 text-center"
        style={{ transform: `translateX(-50%) rotate(${-item.rotation}deg)` }}
      >
        <p
          className="truncate text-[11px] font-semibold tracking-wide text-slate-100/90"
          style={{ textShadow: "0 1px 4px rgb(0 0 0 / 0.6), 0 0 12px rgb(0 0 0 / 0.4)" }}
        >
          {item.name}
        </p>
        {item.notes && (
          <p
            className="mt-0.5 truncate text-[9px] text-slate-400/70"
            style={{ textShadow: "0 1px 3px rgb(0 0 0 / 0.5)" }}
          >
            {item.notes}
          </p>
        )}
      </div>
    </div>
  );
}
