import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import type { DragEvent, PointerEvent as ReactPointerEvent } from "react";
import { BoardNode } from "./BoardNode";
import { ItemLabel } from "./ItemLabel";
import { AlignBar } from "./AlignBar";
import { PlanBackgroundImage } from "./PlanBackgroundImage";
import { computeLabelPlacements } from "../lib/labelLayout";
import { BottomToolbar } from "./Sidebar";
import { screenToWorld, useStudio } from "../store/studioStore";
import type { CameraView } from "../lib/types";

type MarqueeState = {
  pointerId: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  additive: boolean;
};

const MINIMAP_COLORS: Record<string, string> = {
  camera: "#5eead4",
  light: "#f5b942",
  audio: "#4ade80",
  grip: "#c084fc",
  talent: "#a78bfa",
  set: "#94a3b8",
};

/** Mini-carte : aperçu du plateau, zone visible et navigation (clic ou glisser pour recentrer la vue). */
function Minimap() {
  const items = useStudio((s) => s.items);
  const camera = useStudio((s) => s.camera);
  const selectedIds = useStudio((s) => s.selectedIds);
  const setCamera = useStudio((s) => s.setCamera);
  const [view, setView] = useState({ width: 0, height: 0 });
  const dragging = useRef(false);

  useEffect(() => {
    const board = document.getElementById("board-export");
    if (!board) return;
    const update = () => setView({ width: board.clientWidth, height: board.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(board);
    return () => observer.disconnect();
  }, []);

  const size = 168;
  const padding = 120;

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

  const rangeX = Math.max(bounds.maxX - bounds.minX, 300);
  const rangeY = Math.max(bounds.maxY - bounds.minY, 300);
  const aspect = rangeX / rangeY;
  const w = aspect >= 1 ? size : size * aspect;
  const h = aspect >= 1 ? size / aspect : size;

  const mapX = (x: number) => ((x - bounds.minX) / rangeX) * w;
  const mapY = (y: number) => ((y - bounds.minY) / rangeY) * h;

  const viewport = {
    x: mapX(-camera.x / camera.zoom),
    y: mapY(-camera.y / camera.zoom),
    width: (view.width / camera.zoom / rangeX) * w,
    height: (view.height / camera.zoom / rangeY) * h,
  };

  const recenter = (event: ReactPointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const worldX = bounds.minX + ((event.clientX - rect.left) / rect.width) * rangeX;
    const worldY = bounds.minY + ((event.clientY - rect.top) / rect.height) * rangeY;
    const current = useStudio.getState().camera;
    setCamera({ zoom: current.zoom, x: view.width / 2 - worldX * current.zoom, y: view.height / 2 - worldY * current.zoom });
  };

  return (
    <div
      className="minimap no-export pointer-events-auto absolute bottom-20 right-4 z-20 hidden bg-chrome/85 md:block"
      style={{ width: w + 8, height: h + 8, padding: 4 }}
      title="Cliquez ou glissez pour déplacer la vue"
    >
      <svg
        width={w}
        height={h}
        className="block cursor-crosshair overflow-hidden rounded-lg"
        onPointerDown={(event) => {
          event.stopPropagation();
          dragging.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          recenter(event);
        }}
        onPointerMove={(event) => {
          if (dragging.current) recenter(event);
        }}
        onPointerUp={(event) => {
          dragging.current = false;
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
      >
        {items.filter((item) => item.category === "set").map((item) => (
          <rect
            key={item.id}
            x={mapX(item.x) - (((item.width ?? 110) / rangeX) * w) / 2}
            y={mapY(item.y) - (((item.height ?? 60) / rangeY) * h) / 2}
            width={((item.width ?? 110) / rangeX) * w}
            height={((item.height ?? 60) / rangeY) * h}
            rx={2}
            fill={`${MINIMAP_COLORS.set}33`}
            stroke={selectedIds.includes(item.id) ? "#f5b942" : `${MINIMAP_COLORS.set}88`}
            strokeWidth={selectedIds.includes(item.id) ? 1.5 : 0.8}
          />
        ))}
        {items.filter((item) => item.category !== "set").map((item) => {
          const selected = selectedIds.includes(item.id);
          return (
            <circle
              key={item.id}
              cx={mapX(item.x)}
              cy={mapY(item.y)}
              r={selected ? 4 : 3}
              fill={MINIMAP_COLORS[item.category] ?? "#94a3b8"}
              stroke={selected ? "#fff" : "none"}
              strokeWidth={1.2}
              opacity={selected ? 1 : 0.85}
            />
          );
        })}
        {view.width > 0 && (
          <rect
            x={viewport.x}
            y={viewport.y}
            width={Math.max(4, viewport.width)}
            height={Math.max(4, viewport.height)}
            rx={2}
            fill="rgb(245 185 66 / 0.08)"
            stroke="#f5b942"
            strokeWidth={1.2}
            pointerEvents="none"
          />
        )}
      </svg>
    </div>
  );
}

export function CanvasBoard() {
  const boardRef = useRef<HTMLDivElement>(null);
  const itemsMap = useStudio((s) => s.items);
  const items = useMemo(() => Object.values(itemsMap), [itemsMap]);
  const selectedId = useStudio((s) => s.selectedId);
  const selectedIds = useStudio((s) => s.selectedIds);
  const visibleLayers = useStudio((s) => s.visibleLayers);
  const camera = useStudio((s) => s.camera);
  const tool = useStudio((s) => s.tool);
  const spacePan = useStudio((s) => s.spacePan);
  const setCamera = useStudio((s) => s.setCamera);
  const setSpacePan = useStudio((s) => s.setSpacePan);
  const select = useStudio((s) => s.select);
  const selectMany = useStudio((s) => s.selectMany);
  const addFromCatalog = useStudio((s) => s.addFromCatalog);
  const moveItem = useCallback(useStudio((s) => s.moveItem), []);
  const moveItems = useCallback(useStudio((s) => s.moveItems), []);
  const updateItem = useCallback(useStudio((s) => s.updateItem), []);
  const removeItem = useCallback(useStudio((s) => s.removeItem), []);
  const duplicateItems = useCallback(useStudio((s) => s.duplicateItems), []);
  const setTool = useStudio((s) => s.setTool);

  const [isDragOver, setIsDragOver] = useState(false);
  const [marquee, setMarquee] = useState<{ startX: number; startY: number; x: number; y: number } | null>(null);
  const marqueeRef = useRef<MarqueeState | null>(null);
  const panRef = useRef<{ pointerId: number; startX: number; startY: number; origin: CameraView } | null>(null);
  const panActive = tool === "pan" || spacePan;
  const clipboardRef = useRef<string[]>([]);
  const selectedItems = useMemo(() => items.filter((candidate) => selectedIds.includes(candidate.id)), [items, selectedIds]);

  // Cadrage automatique au premier lancement (caméra par défaut) : le plan est centré sur ses objets
  // et recadré quand la zone change de taille (panneaux repliés…), jusqu'à ce que vous touchiez à la
  // vue ou aux objets.
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const initial = useStudio.getState().camera;
    let autoFit = initial.x === 80 && initial.y === 40;
    let fitting = false;

    const fit = () => {
      if (!autoFit || !board.clientWidth) return;
      const list = useStudio.getState().items;
      if (!list.length) return;
      const xs = list.map((i) => i.x);
      const ys = list.map((i) => i.y);
      const minX = Math.min(...xs) - 80;
      const maxX = Math.max(...xs) + 80;
      const minY = Math.min(...ys) - 80;
      const maxY = Math.max(...ys) + 80;
      const w = board.clientWidth;
      const h = board.clientHeight;
      const zoom = Math.min(1.15, Math.max(0.65, Math.min(w / (maxX - minX), h / (maxY - minY)) * 0.9));
      fitting = true;
      setCamera({ zoom, x: w / 2 - ((minX + maxX) / 2) * zoom, y: h / 2 - ((minY + maxY) / 2) * zoom });
      fitting = false;
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(board);
    const unsubscribe = useStudio.subscribe((state, prev) => {
      if ((!fitting && state.camera !== prev.camera) || state.items !== prev.items) autoFit = false;
    });
    return () => {
      observer.disconnect();
      unsubscribe();
    };
  }, [setCamera]);

  // Keyboard shortcuts
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const typing =
        event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
      if (event.code === "Space" && !event.repeat && !typing) {
        event.preventDefault();
        setSpacePan(true);
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selectedIds.length > 0 && !typing) {
        event.preventDefault();
        selectedIds.forEach(removeItem);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c" && !typing) {
        event.preventDefault();
        clipboardRef.current = [...selectedIds];
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v" && !typing) {
        event.preventDefault();
        duplicateItems(clipboardRef.current.length ? clipboardRef.current : selectedIds);
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
  }, [removeItem, selectedIds, setSpacePan, setTool]);

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
          const rect = boardRef.current.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;
          marqueeRef.current = {
            pointerId: event.pointerId,
            startX: x,
            startY: y,
            currentX: x,
            currentY: y,
            additive: event.shiftKey || event.ctrlKey || event.metaKey,
          };
          setMarquee({ startX: x, startY: y, x, y });
          event.currentTarget.setPointerCapture(event.pointerId);
          if (!marqueeRef.current.additive) select(null);
        }
        return;
      }
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      panRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, origin: { ...useStudio.getState().camera } };
    },
    [panActive, select],
  );

  const finishMarquee = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const activeMarquee = marqueeRef.current;
    if (!activeMarquee || activeMarquee.pointerId !== event.pointerId || !boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const endX = event.clientX - rect.left;
    const endY = event.clientY - rect.top;
    const left = Math.min(activeMarquee.startX, endX);
    const right = Math.max(activeMarquee.startX, endX);
    const top = Math.min(activeMarquee.startY, endY);
    const bottom = Math.max(activeMarquee.startY, endY);
    const currentCamera = useStudio.getState().camera;
    const selected = items.filter((item) => {
      const x = currentCamera.x + item.x * currentCamera.zoom;
      const y = currentCamera.y + item.y * currentCamera.zoom;
      return x >= left && x <= right && y >= top && y <= bottom;
    }).map((item) => item.id);
    selectMany(selected, activeMarquee.additive);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    marqueeRef.current = null;
    setMarquee(null);
  }, [items, selectMany]);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const activeMarquee = marqueeRef.current;
    if (activeMarquee && activeMarquee.pointerId === event.pointerId) {
      const rect = boardRef.current?.getBoundingClientRect();
      if (rect) {
        activeMarquee.currentX = event.clientX - rect.left;
        activeMarquee.currentY = event.clientY - rect.top;
        setMarquee({ startX: activeMarquee.startX, startY: activeMarquee.startY, x: activeMarquee.currentX, y: activeMarquee.currentY });
      }
      return;
    }
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    event.preventDefault();
    setCamera({ ...pan.origin, x: pan.origin.x + event.clientX - pan.startX, y: pan.origin.y + event.clientY - pan.startY });
  }, [setCamera]);

  const finishPan = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (marqueeRef.current) {
      finishMarquee(event);
      return;
    }
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    panRef.current = null;
  }, [finishMarquee]);

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

  const visibleItems = useMemo(() => items.filter((item) => {
    const layer = item.category === "light" || (item.layer as string) === "power" ? "lights" : (item.layer as string) === "data" ? "accessories" : item.layer ?? (item.category === "audio" ? "audio" : item.category === "camera" ? "video" : "accessories");
    return visibleLayers?.[layer] ?? true;
  }), [items, visibleLayers]);
  const placements = useMemo(() => computeLabelPlacements(visibleItems), [visibleItems]);
  const labelLayer = visibleItems.map((item) => {
    const place = placements.get(item.id);
    if (!place) return null;
    return <ItemLabel key={`label-${item.id}`} item={item} place={place} selected={selectedIds.includes(item.id)} zoom={camera.zoom} onSelect={select} onUpdate={updateItem} />;
  });

  return (
    <section className="relative min-w-0 flex-1 overflow-hidden">
      <div
        ref={boardRef}
        data-board
        data-zoom={camera.zoom}
        id="board-export"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishPan}
        onPointerCancel={finishPan}
        onLostPointerCapture={finishPan}
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
          <PlanBackgroundImage zoom={camera.zoom} />
          {labelLayer}
          {visibleItems.map((item) => (
            <BoardNode
              key={item.id}
              item={item}
              selected={selectedIds.includes(item.id)}
              selectedItems={selectedItems}
              panActive={panActive}
              zoom={camera.zoom}
              onSelect={select}
              onMove={moveItem}
              onMoveMany={moveItems}
              onUpdate={updateItem}
              onRemove={removeItem}
            />
          ))}
        </div>

        {marquee && (
          <div
            className="pointer-events-none absolute z-50 border border-amber-400 bg-amber-300/10"
            style={{
              left: Math.min(marquee.startX, marquee.x),
              top: Math.min(marquee.startY, marquee.y),
              width: Math.abs(marquee.x - marquee.startX),
              height: Math.abs(marquee.y - marquee.startY),
            }}
          />
        )}

        {items.length === 0 && !isDragOver && (
          <div className="no-export pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-3xl border border-dashed border-white/15 bg-surface/70 px-8 py-6 text-center backdrop-blur-sm">
              <p className="text-sm font-semibold text-slate-100">Le plateau est vide</p>
              <p className="mt-1 text-xs text-slate-400">Glissez un élément depuis la bibliothèque, ou cliquez dessus pour le poser au centre.</p>
            </div>
          </div>
        )}

        {/* Drop zone hint */}
        {isDragOver && (
          <div className="no-export pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="animate-fade-in rounded-2xl border border-dashed border-amber-300/30 bg-amber-300/5 px-8 py-4 backdrop-blur-sm">
              <p className="text-sm font-medium text-amber-200/80">Déposez l'élément ici</p>
            </div>
          </div>
        )}
      </div>

      <AlignBar />
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
