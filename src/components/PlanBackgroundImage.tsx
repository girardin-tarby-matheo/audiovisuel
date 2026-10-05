import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { useStudio } from "../store/studioStore";

/** Image de fond du plan : derrière les objets, déplaçable seulement en mode « Placer ». */
export function PlanBackgroundImage({ zoom }: { zoom: number }) {
  const background = useStudio((s) => s.planBackground);
  const editing = useStudio((s) => s.planBackgroundEditing);
  const update = useStudio((s) => s.updatePlanBackground);
  const setEditing = useStudio((s) => s.setPlanBackgroundEditing);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);

  useEffect(() => {
    if (!editing) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setEditing(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, setEditing]);

  if (!background) return null;

  const onPointerDown = (event: ReactPointerEvent<HTMLImageElement>) => {
    if (!editing || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: background.x, originY: background.y };
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLImageElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    update({
      x: Math.round(drag.originX + (event.clientX - drag.startX) / zoom),
      y: Math.round(drag.originY + (event.clientY - drag.startY) / zoom),
    });
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLImageElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
  };

  return (
    <img
      src={background.image}
      alt=""
      draggable={false}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={`absolute select-none ${editing ? "cursor-move outline outline-2 outline-dashed outline-amber-300/70" : "pointer-events-none"}`}
      style={{
        left: background.x,
        top: background.y,
        width: background.width,
        height: background.width / background.aspect,
        opacity: background.opacity,
        zIndex: editing ? 8 : 0,
        touchAction: "none",
      }}
    />
  );
}
