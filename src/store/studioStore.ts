import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CATALOG_MAP } from "../lib/catalog";
import type { BoardObject, BoardStatus, CameraView, ToolMode } from "../lib/types";

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

function fromCatalog(catalogId: string, x: number, y: number): BoardObject | null {
  const src = CATALOG_MAP[catalogId];
  if (!src) return null;
  return {
    id: uid(),
    catalogId: src.id,
    category: src.category,
    name: src.name,
    label: src.short,
    notes: src.description,
    x,
    y,
    rotation: src.defaults.rotation,
    scale: src.defaults.scale,
    color: src.color,
    fov: src.defaults.fov ?? 50,
    beamRadius: src.defaults.beamRadius ?? 160,
    beamSpread: src.defaults.beamSpread ?? 80,
    intensity: src.defaults.intensity ?? 70,
  };
}

const seedItems = (): BoardObject[] => {
  const layout: Array<[string, number, number]> = [
    ["set-cyc", 520, 180],
    ["set-table", 540, 390],
    ["set-chair", 430, 430],
    ["set-chair", 650, 430],
    ["talent-guest", 430, 360],
    ["talent-actor", 650, 360],
    ["cam-main", 540, 640],
    ["cam-b", 280, 560],
    ["light-soft", 250, 280],
    ["light-led", 820, 280],
    ["light-fresnel", 540, 90],
    ["set-boom", 360, 250],
    ["talent-director", 760, 620],
  ];
  return layout
    .map(([id, x, y]) => fromCatalog(id, x, y))
    .filter((item): item is BoardObject => Boolean(item));
};

type StudioState = {
  title: string;
  status: BoardStatus;
  items: BoardObject[];
  selectedId: string | null;
  camera: CameraView;
  tool: ToolMode;
  spacePan: boolean;
  toast: string | null;
  setTitle: (title: string) => void;
  setStatus: (status: BoardStatus) => void;
  setTool: (tool: ToolMode) => void;
  setSpacePan: (value: boolean) => void;
  setCamera: (camera: CameraView) => void;
  select: (id: string | null) => void;
  addFromCatalog: (catalogId: string, x: number, y: number) => string | null;
  updateItem: (id: string, patch: Partial<BoardObject>) => void;
  moveItem: (id: string, x: number, y: number) => void;
  removeItem: (id: string) => void;
  setToast: (message: string | null) => void;
  resetBoard: () => void;
};

export const useStudio = create<StudioState>()(
  persist(
    (set, get) => ({
      title: "Plateau — Interview studio",
      status: "prep",
      items: seedItems(),
      selectedId: null,
      camera: { x: 80, y: 40, zoom: 1 },
      tool: "select",
      spacePan: false,
      toast: null,
      setTitle: (title) => set({ title }),
      setStatus: (status) => set({ status }),
      setTool: (tool) => set({ tool }),
      setSpacePan: (spacePan) => set({ spacePan }),
      setCamera: (camera) => set({ camera }),
      select: (selectedId) => set({ selectedId }),
      addFromCatalog: (catalogId, x, y) => {
        const item = fromCatalog(catalogId, x, y);
        if (!item) return null;
        set({ items: [...get().items, item], selectedId: item.id });
        return item.id;
      },
      updateItem: (id, patch) =>
        set({
          items: get().items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        }),
      moveItem: (id, x, y) =>
        set({
          items: get().items.map((item) => (item.id === id ? { ...item, x, y } : item)),
        }),
      removeItem: (id) =>
        set({
          items: get().items.filter((item) => item.id !== id),
          selectedId: get().selectedId === id ? null : get().selectedId,
        }),
      setToast: (toast) => set({ toast }),
      resetBoard: () =>
        set({
          items: seedItems(),
          selectedId: null,
          camera: { x: 80, y: 40, zoom: 1 },
          title: "Plateau — Interview studio",
          status: "prep",
        }),
    }),
    {
      name: "shotboard-studio",
      partialize: (state) => ({
        title: state.title,
        status: state.status,
        items: state.items,
        camera: state.camera,
      }),
    },
  ),
);

export function screenToWorld(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  camera: CameraView,
) {
  return {
    x: (clientX - rect.left - camera.x) / camera.zoom,
    y: (clientY - rect.top - camera.y) / camera.zoom,
  };
}
