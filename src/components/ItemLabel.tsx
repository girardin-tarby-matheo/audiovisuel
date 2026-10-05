import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { RotateCcw } from "lucide-react";
import type { LabelPlacement } from "../lib/labelLayout";
import type { BoardObject } from "../lib/types";

type Props = {
  item: BoardObject;
  place: LabelPlacement;
  selected: boolean;
  zoom: number;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: Partial<BoardObject>) => void;
};

/**
 * Nom d'un objet sur le plan. Double-clic : le nom devient déplaçable (glisser pour le
 * poser où l'on veut, Échap ou clic ailleurs pour terminer). ↺ rend le placement automatique.
 */
export function ItemLabel({ item, place, selected, zoom, onSelect, onUpdate }: Props) {
  const [moving, setMoving] = useState(false);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moving) return;
    const stop = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (event instanceof PointerEvent && rootRef.current?.contains(event.target as Node)) return;
      setMoving(false);
    };
    window.addEventListener("keydown", stop);
    window.addEventListener("pointerdown", stop);
    return () => {
      window.removeEventListener("keydown", stop);
      window.removeEventListener("pointerdown", stop);
    };
  }, [moving]);

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    if (!moving) {
      onSelect(item.id);
      return;
    }
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: place.x - item.x,
      originY: place.y - item.y,
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    onUpdate(item.id, {
      labelOffset: {
        x: Math.round(drag.originX + (event.clientX - drag.startX) / zoom),
        y: Math.round(drag.originY + (event.clientY - drag.startY) / zoom),
      },
    });
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
  };

  return (
    <div
      ref={rootRef}
      className="pointer-events-none absolute text-center"
      style={{ left: place.x, top: place.y, width: place.width, transform: "translate(-50%, -50%)", zIndex: moving || selected ? 40 : 15 }}
    >
      <div className="relative mx-auto w-fit max-w-full">
        <p
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={(event) => { event.stopPropagation(); setMoving(true); onSelect(item.id); }}
          title={moving ? "Glisser pour déplacer · Échap pour terminer" : "Double-clic pour déplacer le nom"}
          className={`item-label pointer-events-auto select-none truncate rounded-full border px-2.5 py-[3px] text-[11px] font-semibold leading-tight backdrop-blur-sm transition-colors ${moving
            ? "cursor-grab border-dashed border-amber-300 bg-surface text-amber-100 shadow-[0_0_0_3px_rgba(245,185,66,0.2)] active:cursor-grabbing"
            : selected
              ? "cursor-pointer border-amber-300/50 bg-surface/90 text-amber-100"
              : "cursor-pointer border-white/10 bg-surface/70 text-slate-100 hover:border-white/25"}`}
        >
          {item.name}
        </p>
        {moving && item.labelOffset && (
          <button
            type="button"
            aria-label="Remettre le nom en placement automatique"
            title="Placement automatique"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => { event.stopPropagation(); onUpdate(item.id, { labelOffset: undefined }); setMoving(false); }}
            className="no-export pointer-events-auto absolute -right-3 -top-3 flex h-5 w-5 items-center justify-center rounded-full border border-white/15 bg-surface text-amber-200 shadow-lg hover:bg-amber-400/20"
          >
            <RotateCcw size={10} />
          </button>
        )}
      </div>
      {selected && item.notes && !moving && (
        <p className="item-label pointer-events-none mx-auto mt-1 w-max max-w-[220px] rounded-md bg-surface/85 px-2 py-0.5 text-[9.5px] leading-snug text-slate-300 backdrop-blur-sm">
          {item.notes}
        </p>
      )}
    </div>
  );
}
