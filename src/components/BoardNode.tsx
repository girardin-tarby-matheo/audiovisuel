import { useRef, useEffect, useCallback, type PointerEvent as ReactPointerEvent } from "react";
import { ItemGlyph } from "./ItemGlyph";
import { CATALOG_MAP } from "../lib/catalog";
import type { BoardObject } from "../lib/types";

type Props = {
  item: BoardObject;
  selected: boolean;
  panActive: boolean;
  zoom: number;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onUpdate: (id: string, patch: Partial<BoardObject>) => void;
  onRemove: (id: string) => void;
};

export function BoardNode({ item, selected, panActive, zoom, onSelect, onMove, onUpdate, onRemove }: Props) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);
  const controlRef = useRef<{ type: "rotation" | "beam" | "camera" | "resize"; pointerId: number; startX?: number; startY?: number; startWidth?: number; startHeight?: number } | null>(null);
  const size = 52 * item.scale;
  const defaults = CATALOG_MAP[item.catalogId]?.defaults;
  const width = item.width ?? defaults?.width ?? size;
  const height = item.height ?? defaults?.height ?? size;
  const isNew = useRef(true);

  useEffect(() => {
    // Mark as "not new" after mount animation completes
    const timer = setTimeout(() => { isNew.current = false; }, 350);
    return () => clearTimeout(timer);
  }, []);

  const finishDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
  }, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (panActive || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: item.x, originY: item.y };
    onSelect(item.id);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    onMove(item.id, drag.originX + (event.clientX - drag.startX) / zoom, drag.originY + (event.clientY - drag.startY) / zoom);
  };

  const onControlPointerDown = (type: "rotation" | "beam" | "camera" | "resize", event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    controlRef.current = {
      type,
      pointerId: event.pointerId,
      ...(type === "resize" ? { startX: event.clientX, startY: event.clientY, startWidth: width, startHeight: height } : {}),
    };
  };

  const onControlPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const control = controlRef.current;
    const node = nodeRef.current;
    if (!control || control.pointerId !== event.pointerId || !node) return;
    event.preventDefault();
    const bounds = node.getBoundingClientRect();
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;

    if (control.type === "rotation") {
      const angle = Math.round((Math.atan2(dy, dx) * 180) / Math.PI + 90);
      onUpdate(item.id, { rotation: angle > 180 ? angle - 360 : angle < -180 ? angle + 360 : angle });
    } else if (control.type === "resize") {
      const angle = (-item.rotation * Math.PI) / 180;
      const deltaX = event.clientX - control.startX!;
      const deltaY = event.clientY - control.startY!;
      const localDeltaX = deltaX * Math.cos(angle) - deltaY * Math.sin(angle);
      const localDeltaY = deltaX * Math.sin(angle) + deltaY * Math.cos(angle);
      const nextWidth = Math.min(800, Math.max(40, control.startWidth! + (localDeltaX * 2) / zoom));
      const nextHeight = Math.min(800, Math.max(40, control.startHeight! + (localDeltaY * 2) / zoom));
      if (event.shiftKey) {
        const ratio = control.startWidth! / control.startHeight!;
        onUpdate(item.id, { width: nextWidth, height: Math.min(800, Math.max(40, nextWidth / ratio)) });
      } else {
        onUpdate(item.id, { width: nextWidth, height: nextHeight });
      }
    } else if (control.type === "camera") {
      const angle = (-item.rotation * Math.PI) / 180;
      const localX = dx * Math.cos(angle) - dy * Math.sin(angle);
      const localY = dx * Math.sin(angle) + dy * Math.cos(angle);
      const fov = Math.round(Math.min(120, Math.max(18, Math.abs((Math.atan2(localX, -localY) * 180) / Math.PI) * 2)));
      onUpdate(item.id, { fov });
    } else {
      const radius = Math.round(Math.min(420, Math.max(40, Math.hypot(dx, dy) / zoom / item.scale)));
      // Repasser la position de la souris dans le repère local du projecteur.
      // Sans cette inversion, le contrôle part à l’envers dès que l’élément est tourné.
      const angle = (-item.rotation * Math.PI) / 180;
      const localX = dx * Math.cos(angle) - dy * Math.sin(angle);
      const localY = dx * Math.sin(angle) + dy * Math.cos(angle);
      const opening = Math.round(Math.min(180, Math.max(12, Math.abs((Math.atan2(localX, -localY) * 180) / Math.PI) * 2)));
      onUpdate(item.id, { beamRadius: radius, beamSpread: opening });
    }
  };

  const finishControl = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!controlRef.current || controlRef.current.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    controlRef.current = null;
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
        width: item.category === "set" ? width : size,
        height: item.category === "set" ? height : size,
        transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
        zIndex: selected ? 20 : 5,
        animation: isNew.current ? "scale-in 280ms cubic-bezier(0.34, 1.56, 0.64, 1) both" : undefined,
      }}
    >
      {selected && (
        <>
          <div
            className="pointer-events-none absolute left-[calc(100%+2px)] top-1/2 h-px w-5 -translate-y-1/2 bg-amber-300/60"
            aria-hidden="true"
          />
          <div
            role="slider"
            tabIndex={0}
            aria-label={`Orientation de ${item.name}`}
            aria-valuemin={-180}
            aria-valuemax={180}
            aria-valuenow={item.rotation}
            onPointerDown={(event) => onControlPointerDown("rotation", event)}
            onPointerMove={onControlPointerMove}
            onPointerUp={finishControl}
            onPointerCancel={finishControl}
            onLostPointerCapture={finishControl}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft" || event.key === "ArrowDown") onUpdate(item.id, { rotation: Math.max(-180, item.rotation - (event.shiftKey ? 15 : 1)) });
              if (event.key === "ArrowRight" || event.key === "ArrowUp") onUpdate(item.id, { rotation: Math.min(180, item.rotation + (event.shiftKey ? 15 : 1)) });
            }}
            className="control-handle control-handle-rotation absolute left-[calc(100%+22px)] top-1/2 z-30 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-amber-200/80 bg-[#17151a] text-[10px] text-amber-200 shadow-lg"
            title="Faire pivoter"
          >
            ↻
          </div>
          {item.category === "set" && (
            <div
              role="group"
              tabIndex={0}
              aria-label={`Redimensionner ${item.name}`}
              onPointerDown={(event) => onControlPointerDown("resize", event)}
              onPointerMove={onControlPointerMove}
              onPointerUp={finishControl}
              onPointerCancel={finishControl}
              onLostPointerCapture={finishControl}
              onKeyDown={(event) => {
                const step = event.shiftKey ? 10 : 1;
                if (event.key === "ArrowRight") onUpdate(item.id, { width: Math.min(800, width + step) });
                if (event.key === "ArrowLeft") onUpdate(item.id, { width: Math.max(40, width - step) });
                if (event.key === "ArrowDown") onUpdate(item.id, { height: Math.min(800, height + step) });
                if (event.key === "ArrowUp") onUpdate(item.id, { height: Math.max(40, height - step) });
              }}
              className="control-handle control-handle-resize absolute -bottom-2 -right-2 z-30 h-5 w-5 rounded-sm border border-violet-200/80 bg-[#17151a] shadow-lg"
              title="Redimensionner"
            >
              <span className="pointer-events-none absolute bottom-0.5 right-0.5 h-2.5 w-2.5 border-b-2 border-r-2 border-violet-200" />
            </div>
          )}
          {item.category === "camera" && (
            <div
              role="slider"
              tabIndex={0}
              aria-label={`Champ de vision de ${item.name}`}
              aria-valuemin={18}
              aria-valuemax={120}
              aria-valuenow={item.fov}
              onPointerDown={(event) => onControlPointerDown("camera", event)}
              onPointerMove={onControlPointerMove}
              onPointerUp={finishControl}
              onPointerCancel={finishControl}
              onLostPointerCapture={finishControl}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft" || event.key === "ArrowDown") onUpdate(item.id, { fov: Math.max(18, item.fov - (event.shiftKey ? 10 : 1)) });
                if (event.key === "ArrowRight" || event.key === "ArrowUp") onUpdate(item.id, { fov: Math.min(120, item.fov + (event.shiftKey ? 10 : 1)) });
              }}
              className="control-handle control-handle-camera absolute z-30 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-200/80 bg-[#11191b] text-[10px] text-cyan-200 shadow-lg"
              style={{
                left: `calc(50% + ${Math.sin(halfFov) * coneRange}px)`,
                top: `calc(50% - ${Math.cos(halfFov) * coneRange}px)`,
              }}
              title="Modifier le champ de vision"
            >
              ◔
            </div>
          )}
          {item.category === "light" && (
            <>
              <div
                role="group"
                tabIndex={0}
                aria-label={`Rayon et ouverture du faisceau de ${item.name}`}
                onPointerDown={(event) => onControlPointerDown("beam", event)}
                onPointerMove={onControlPointerMove}
                onPointerUp={finishControl}
                onPointerCancel={finishControl}
                onLostPointerCapture={finishControl}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") onUpdate(item.id, { beamRadius: Math.max(40, item.beamRadius - (event.shiftKey ? 10 : 1)) });
                  if (event.key === "ArrowUp") onUpdate(item.id, { beamRadius: Math.min(420, item.beamRadius + (event.shiftKey ? 10 : 1)) });
                  if (event.key === "ArrowLeft") onUpdate(item.id, { beamSpread: Math.max(12, item.beamSpread - (event.shiftKey ? 10 : 1)) });
                  if (event.key === "ArrowRight") onUpdate(item.id, { beamSpread: Math.min(180, item.beamSpread + (event.shiftKey ? 10 : 1)) });
                }}
                className="control-handle control-handle-beam absolute z-30 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-amber-200/80 bg-[#17151a] text-[10px] text-amber-200 shadow-lg"
                style={{
                  left: `calc(50% + ${Math.sin(halfBeam) * beamRange}px)`,
                  top: `calc(50% - ${Math.cos(halfBeam) * beamRange}px)`,
                }}
                title="Modifier le rayon et l’ouverture du faisceau"
              >
                ↗
              </div>
            </>
          )}
        </>
      )}

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
        role="button"
        tabIndex={0}
        aria-label={`${item.name}. Déplacer l’élément`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onLostPointerCapture={finishDrag}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect(item.id);
          }
          if (event.key === "Delete" || event.key === "Backspace") {
            event.preventDefault();
            onRemove(item.id);
          }
        }}
        className={`drag-surface relative flex h-full w-full flex-col items-center justify-center border transition-all duration-200 ${item.category === "set"
            ? "rounded-xl backdrop-blur-sm"
            : "node-marker rounded-full"
          } ${selected
            ? "border-amber-300/70 bg-[#10141c]/92 shadow-[0_0_0_1px_rgba(245,185,66,0.3),0_12px_40px_rgba(0,0,0,0.35)]"
            : item.category === "set"
              ? "border-white/10 bg-[#10141c]/88 hover:border-white/20 hover:bg-[#10141c]/95"
              : "border-white/15 bg-[#10141c]/80 hover:border-white/35 hover:bg-[#10141c]/95"
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

        <span className={item.category === "camera" && item.catalogId !== "cam-drone" ? "-rotate-90" : undefined}>
          <ItemGlyph category={item.category} catalogId={item.catalogId} color={item.color} size={item.category === "set" ? 28 : 22} />
        </span>
        {item.category === "set" && (
          <span className="mt-1 font-mono text-[9px] tracking-[0.18em] text-white/70">{item.label}</span>
        )}

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
