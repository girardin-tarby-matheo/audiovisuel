import { useState, useMemo, type ReactNode } from "react";
import { Hand, MousePointer2, Minus, Plus, Maximize2, Search, X, Sparkles, SlidersHorizontal } from "lucide-react";
import { CATEGORIES } from "../lib/catalog";
import { ItemGlyph } from "./ItemGlyph";
import { VisualAsset } from "./VisualAsset";
import { useStudio } from "../store/studioStore";

export function Sidebar() {
  const addFromCatalog = useStudio((s) => s.addFromCatalog);
  const camera = useStudio((s) => s.camera);
  const selectedId = useStudio((s) => s.selectedId);
  const items = useStudio((s) => s.items);
  const catalog = useStudio((s) => s.catalog);
  const setCatalogModalOpen = useStudio((s) => s.setCatalogModalOpen);
  const setEditingCatalogItemId = useStudio((s) => s.setEditingCatalogItemId);

  const [search, setSearch] = useState("");
  const [addedId, setAddedId] = useState<string | null>(null);

  const query = search.toLowerCase().trim();

  const filtered = useMemo(() => {
    if (!query) return catalog;
    return catalog.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.short.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query),
    );
  }, [catalog, query]);

  const categoryCount = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of items) {
      map[item.category] = (map[item.category] || 0) + 1;
    }
    return map;
  }, [items]);

  const placeAtView = (catalogId: string) => {
    const board = document.querySelector<HTMLElement>("[data-board]");
    if (!board) {
      addFromCatalog(catalogId, 480, 360);
      return;
    }
    const rect = board.getBoundingClientRect();
    const x = (rect.width / 2 - camera.x) / camera.zoom;
    const y = (rect.height / 2 - camera.y) / camera.zoom;
    addFromCatalog(catalogId, x, y);
    setAddedId(catalogId);
    setTimeout(() => setAddedId(null), 400);
  };

  return (
    <aside className="panel-glass flex w-[280px] shrink-0 flex-col">
      <div className="border-b border-white/6 px-4 py-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-cyan-200/70">Bibliothèque</p>
            <h2 className="text-sm font-semibold text-white">Éléments de tournage</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingCatalogItemId(null);
              setCatalogModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-2.5 py-1.5 text-[11px] font-semibold text-amber-200 hover:bg-amber-400/20 hover:border-amber-400/50 transition active:scale-95"
            title="Personnaliser les photos, noms et paramètres des objets"
          >
            <Sparkles size={13} className="text-amber-300" />
            <span>Personnaliser</span>
          </button>
        </div>

        <p className="text-[11px] text-slate-400 leading-tight">Glissez sur le plateau ou cliquez pour poser au centre.</p>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            aria-label="Rechercher un élément de tournage"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un élément…"
            className="field pl-8 pr-8 text-xs py-1.5"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Effacer la recherche"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-white"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {CATEGORIES.map((category) => {
          const catItems = filtered.filter((item) => item.category === category.id);
          if (catItems.length === 0) return null;
          const onBoard = categoryCount[category.id] || 0;

          return (
            <section key={category.id}>
              <div className="mb-2 flex items-center justify-between px-1">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {category.label}
                </h3>
                {onBoard > 0 && (
                  <span className="rounded-full bg-white/[0.06] px-2 py-0.5 font-mono text-[9px] text-slate-400">
                    {onBoard}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {catItems.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("application/shotboard", item.id);
                      event.dataTransfer.effectAllowed = "copy";
                    }}
                    onClick={() => placeAtView(item.id)}
                    className={`group relative rounded-xl border bg-white/[0.03] p-2.5 text-left transition-all duration-200 hover:border-amber-300/30 hover:bg-white/[0.06] hover:shadow-lg hover:shadow-black/20 active:scale-[0.97] ${addedId === item.id
                      ? "border-emerald-400/40 bg-emerald-400/[0.06]"
                      : "border-white/8"
                      }`}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <div className="mb-2 flex h-10 items-center justify-center rounded-lg bg-black/25 transition-colors group-hover:bg-black/35 overflow-hidden relative">
                      <VisualAsset
                        visualKey={item.visualKey ?? item.id}
                        image={item.image}
                        fit={item.fit}
                        background={item.background}
                        alt={item.name}
                        fallback={<ItemGlyph category={item.category} catalogId={item.id} color={item.color} size={22} />}
                      />
                    </div>
                    <p className="text-[12px] font-medium leading-tight text-slate-100 truncate">{item.name}</p>
                    <p className="mt-0.5 font-mono text-[9px] tracking-widest text-slate-500">{item.short}</p>
                    {addedId === item.id && (
                      <div className="absolute inset-0 rounded-xl border-2 border-emerald-400/50" style={{ animation: "pulse-ring 500ms ease forwards" }} />
                    )}
                  </button>
                ))}
              </div>
            </section>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-xs text-slate-500">Aucun élément trouvé pour « {search} »</p>
        )}
      </div>

      {selectedId && (
        <p className="border-t border-white/6 px-4 py-2 text-[10px] text-slate-500">
          Un élément est sélectionné sur le plateau.
        </p>
      )}
    </aside>
  );
}

export function BottomToolbar() {
  const tool = useStudio((s) => s.tool);
  const setTool = useStudio((s) => s.setTool);
  const camera = useStudio((s) => s.camera);
  const setCamera = useStudio((s) => s.setCamera);
  const items = useStudio((s) => s.items);
  const spacePan = useStudio((s) => s.spacePan);

  const panOn = tool === "pan" || spacePan;
  const zoomPct = Math.round(camera.zoom * 100);

  const fit = () => {
    if (!items.length) {
      setCamera({ x: 80, y: 40, zoom: 1 });
      return;
    }
    const board = document.querySelector<HTMLElement>("[data-board]");
    if (!board) return;
    const xs = items.map((i) => i.x);
    const ys = items.map((i) => i.y);
    const minX = Math.min(...xs) - 140;
    const maxX = Math.max(...xs) + 140;
    const minY = Math.min(...ys) - 140;
    const maxY = Math.max(...ys) + 140;
    const w = board.clientWidth;
    const h = board.clientHeight;
    const zoom = Math.min(1.4, Math.max(0.35, Math.min(w / (maxX - minX), h / (maxY - minY)) * 0.9));
    setCamera({
      zoom,
      x: w / 2 - ((minX + maxX) / 2) * zoom,
      y: h / 2 - ((minY + maxY) / 2) * zoom,
    });
  };

  return (
    <div className="no-export pointer-events-auto absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-white/10 bg-[#10141c]/90 p-1.5 shadow-2xl backdrop-blur-md">
      <ToolBtn active={!panOn && tool === "select"} onClick={() => setTool("select")} label="Sélection (V)">
        <MousePointer2 size={16} />
      </ToolBtn>
      <ToolBtn active={panOn} onClick={() => setTool("pan")} label="Déplacement (H)">
        <Hand size={16} />
      </ToolBtn>
      <span className="mx-1 h-5 w-px bg-white/10" />
      <ToolBtn onClick={() => setCamera({ ...camera, zoom: Math.max(0.25, camera.zoom - 0.1) })} label="Zoom -">
        <Minus size={16} />
      </ToolBtn>
      <span className="min-w-[3.2rem] text-center font-mono text-[11px] text-slate-300">{zoomPct}%</span>
      <ToolBtn onClick={() => setCamera({ ...camera, zoom: Math.min(2.4, camera.zoom + 0.1) })} label="Zoom +">
        <Plus size={16} />
      </ToolBtn>
      <ToolBtn onClick={fit} label="Recadrer tout">
        <Maximize2 size={16} />
      </ToolBtn>
    </div>
  );
}

function ToolBtn({
  children,
  onClick,
  active,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
  label: string;
}) {
  return (
    <div className="tooltip-trigger">
      <button
        type="button"
        title={label}
        aria-label={label}
        aria-pressed={active}
        onClick={onClick}
        className={`rounded-xl p-2.5 transition-all duration-180 ${active
          ? "bg-amber-300/15 text-amber-200 shadow-inner"
          : "text-slate-300 hover:bg-white/6 hover:text-white active:scale-95"
          }`}
      >
        {children}
      </button>
      <span className="tooltip-text">{label}</span>
    </div>
  );
}
