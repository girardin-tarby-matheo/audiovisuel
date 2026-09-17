import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import type { DragEvent, PointerEvent as ReactPointerEvent } from "react";
import { BoardNode } from "./BoardNode";
import { BottomToolbar } from "./Sidebar";
import { screenToWorld, useStudio } from "../store/studioStore";

function Minimap() {
  const items = useStudio((s) => s.items);
  const camera = useStudio((s) => s.camera);
  const selectedId = useStudio((s) => s.selectedId);

  const size = 160;
  const padding = 40;

  const bounds = useMemo(() => {
    if (!items.length) return { minX: 0, minY: 0, maxX: 1000, maxY: 700 };
    const xs = items.map((i) => i.x);
    const ys = items.map((i) => i.y);
    return {
      minX: Math.min(...xs) - padding,
      minY: Math.min(...ys) - padding,
      maxX: Math.max(...xs) + padding,
      maxY: Math.max(...ys) + padding,
    };
  }, [items]);

  const rangeX = Math.max(bounds.maxX - bounds.minX, 200);
  const rangeY = Math.max(bounds.maxY - bounds.minY, 200);
  const aspect = rangeX / rangeY;
  const w = aspect >= 1 ? size : size * aspect;
  const h = aspect >= 1 ? size / aspect : size;

  const mapX = (x: number) => ((x - bounds.minX) / rangeX) * w;
  const mapY = (y: number) => ((y - bounds.minY) / rangeY) * h;

  return (
    <div
      className="minimap no-export pointer-events-auto absolute bottom-20 right-4 z-20 bg-[#0c0e14]/85"
      style={{ width: w + 8, height: h + 8, padding: 4 }}
    >
      <svg width={w} height={h} className="block">
        {items.map((item) => {
          const cx = mapX(item.x);
          const cy = mapY(item.y);
          const isSelected = item.id === selectedId;
          const colors: Record<string, string> = {
            camera: "#5eead4",
            light: "#f5b942",
            talent: "#a78bfa",
            set: "#94a3b8",
          };
          return (
            <circle
              key={item.id}
              cx={cx}
              cy={cy}
              r={isSelected ? 4 : 2.5}
              fill={colors[item.category] ?? "#94a3b8"}
              opacity={isSelected ? 1 : 0.65}
            />
          );
        })}
      </svg>
    </div>
  );
}

export function CanvasBoard() {
  const boardRef = useRef<HTMLDivElement>(null);
  const items = useStudio((s) => s.items);
  const selectedId = useStudio((s) => s.selectedId);
  const camera = useStudio((s) => s.camera);
  const tool = useStudio((s) => s.tool);
  const spacePan = useStudio((s) => s.spacePan);
  const setCamera = useStudio((s) => s.setCamera);
  const setSpacePan = useStudio((s) => s.setSpacePan);
  const select = useStudio((s) => s.select);
  const addFromCatalog = useStudio((s) => s.addFromCatalog);
  const moveItem = useStudio((s) => s.moveItem);
  const removeItem = useStudio((s) => s.removeItem);
  const setTool = useStudio((s) => s.setTool);

  const [isDragOver, setIsDragOver] = useState(false);
  const panActive = tool === "pan" || spacePan;

  // Keyboard shortcuts
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const typing =
        event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
      if (event.code === "Space" && !event.repeat && !typing) {
        event.preventDefault();
        setSpacePan(true);
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selectedId && !typing) {
        event.preventDefault();
        removeItem(selectedId);
      }
      if (typing) return;
      if (event.key.toLowerCase() === "v") setTool("select");
      if (event.key.toLowerCase() === "h") setTool("pan");
    };
    const up = (event: KeyboardEvent) => {
      if (event.code === "Space") setSpacePan(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [removeItem, selectedId, setSpacePan, setTool]);

  // Wheel zoom (native event for passive: false)
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const onWheelNative = (event: WheelEvent) => {
      event.preventDefault();
      const rect = board.getBoundingClientRect();
      const current = useStudio.getState().camera;
      const sx = event.clientX - rect.left;
      const sy = event.clientY - rect.top;
      const wx = (sx - current.x) / current.zoom;
      const wy = (sy - current.y) / current.zoom;
      const factor = event.deltaY > 0 ? 0.92 : 1.08;
      const zoom = Math.min(2.5, Math.max(0.25, current.zoom * factor));
      setCamera({
        zoom,
        x: sx - wx * zoom,
        y: sy - wy * zoom,
      });
    };
    board.addEventListener("wheel", onWheelNative, { passive: false });
    return () => board.removeEventListener("wheel", onWheelNative);
  }, [setCamera]);

  // Pan logic
  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!boardRef.current) return;
      const isPan = panActive || event.button === 1;
      if (!isPan) {
        if (event.target === event.currentTarget || (event.target as HTMLElement).dataset.world) {
          select(null);
        }
        return;
      }
      event.preventDefault();
      const startX = event.clientX;
      const startY = event.clientY;
      const origin = { ...useStudio.getState().camera };
      event.currentTarget.setPointerCapture(event.pointerId);
      const move = (ev: PointerEvent) => {
        setCamera({
          ...origin,
          x: origin.x + (ev.clientX - startX),
          y: origin.y + (ev.clientY - startY),
        });
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [panActive, select, setCamera],
  );

  // Drop handling
  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragOver(false);
      const catalogId = event.dataTransfer.getData("application/shotboard");
      if (!catalogId || !boardRef.current) return;
      const rect = boardRef.current.getBoundingClientRect();
      const world = screenToWorld(event.clientX, event.clientY, rect, useStudio.getState().camera);
      addFromCatalog(catalogId, world.x, world.y);
    },
    [addFromCatalog],
  );

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  return (
    <section className="relative min-w-0 flex-1 overflow-hidden">
      <div
        ref={boardRef}
        data-board
        data-zoom={camera.zoom}
        id="board-export"
        onPointerDown={onPointerDown}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`grid-floor absolute inset-0 overflow-hidden transition-all duration-150 ${isDragOver ? "drop-hover" : ""
          } ${panActive ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
      >
        <div
          data-world
          className="absolute left-0 top-0 origin-top-left will-change-transform"
          style={{
            transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
            width: 4000,
            height: 4000,
          }}
        >
          {items.map((item) => (
            <BoardNode
              key={item.id}
              item={item}
              selected={item.id === selectedId}
              panActive={panActive}
              zoom={camera.zoom}
              onSelect={select}
              onMove={moveItem}
              onRemove={removeItem}
            />
          ))}
        </div>

        {/* Drop zone hint */}
        {isDragOver && (
          <div className="no-export pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="animate-fade-in rounded-2xl border border-dashed border-amber-300/30 bg-amber-300/5 px-8 py-4 backdrop-blur-sm">
              <p className="text-sm font-medium text-amber-200/80">Déposez l'élément ici</p>
            </div>
          </div>
        )}
      </div>

      <BottomToolbar />
      <Minimap />

      {/* Mode indicator */}
      <div className="no-export pointer-events-none absolute left-4 top-3 flex items-center gap-2">
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full transition-colors ${panActive ? "bg-cyan-400" : "bg-amber-300"
            }`}
        />
        <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
          {panActive ? "Mode déplacement · espace ou H" : "Mode sélection · V · molette pour zoomer"}
        </p>
      </div>
    </section>
  );
}
