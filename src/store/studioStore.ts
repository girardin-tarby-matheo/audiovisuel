import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CATALOG, CATALOG_MAP } from "../lib/catalog";
import { SYNOPTIC_TEMPLATES } from "../lib/synopticTemplates";
import { GRID_SIZE } from "../lib/constants";
import { computeSynopticAutoLayout } from "../lib/synopticLayout";
import type { PlanBackground, BoardLayer, BoardObject, BoardStatus, CableType, CameraView, CatalogItem, SynopticLink, SynopticNode, ToolMode, ViewMode } from "../lib/types";

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const DEFAULT_VISIBLE_LAYERS = { video: true, audio: true, accessories: true, lights: true } as const;

function getBoardLayer(item: Pick<BoardObject, "category" | "layer"> | Pick<CatalogItem, "category" | "layer">): BoardLayer {
  if (item.category === "light") return "lights";
  if ((item.layer as string | undefined) === "power") return "lights";
  if ((item.layer as string | undefined) === "data") return "accessories";
  if (item.layer) return item.layer;
  if (item.category === "audio") return "audio";
  return item.category === "camera" ? "video" : "accessories";
}

function fromCatalogWithList(catalogList: CatalogItem[], catalogId: string, x: number, y: number): BoardObject | null {
  const src = catalogList.find((c) => c.id === catalogId) ?? CATALOG_MAP[catalogId];
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
    width: src.defaults.width,
    height: src.defaults.height,
    color: src.color,
    fov: src.defaults.fov ?? 50,
    beamRadius: src.defaults.beamRadius ?? 160,
    beamSpread: src.defaults.beamSpread ?? 80,
    intensity: src.defaults.intensity ?? 70,
    visualKey: src.visualKey ?? src.id,
    image: src.image,
    fit: src.fit,
    background: src.background,
    portsIn: src.portsIn ? structuredClone(src.portsIn) : undefined,
    portsOut: src.portsOut ? structuredClone(src.portsOut) : undefined,
    needsPower: src.needsPower,
    warningBadge: src.warningBadge,
    deviceType: src.deviceType,
    layer: getBoardLayer(src),
    specs: src.specs ? structuredClone(src.specs) : undefined,
  };
}

const seedItems = (catalogList: CatalogItem[] = CATALOG): BoardObject[] => {
  const layout: Array<[string, number, number]> = [
    ["set-cyc", 520, 180],
    ["set-table", 540, 390],
    ["set-chair", 430, 430],
    ["set-chair", 650, 430],
    ["set-atem-mini", 180, 300],
    ["set-monitor", 180, 205],
    ["set-sound-desk", 180, 430],
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
    .map(([id, x, y]) => fromCatalogWithList(catalogList, id, x, y))
    .filter((item): item is BoardObject => Boolean(item));
};

function addMissingControlRoom(items: BoardObject[], catalogList: CatalogItem[] = CATALOG): BoardObject[] {
  const additions: Array<[string, number, number]> = [
    ["set-atem-mini", 180, 300],
    ["set-monitor", 180, 205],
    ["set-sound-desk", 180, 430],
  ];
  const existing = new Set(items.map((item) => item.catalogId));
  return additions.reduce((result, [catalogId, x, y]) => {
    if (existing.has(catalogId)) return result;
    const item = fromCatalogWithList(catalogList, catalogId, x, y);
    if (!item) return result;
    existing.add(catalogId);
    return [...result, item];
  }, items);
}

type StudioState = {
  title: string;
  status: BoardStatus;
  items: BoardObject[];
  catalog: CatalogItem[];
  selectedId: string | null;
  selectedIds: string[];
  camera: CameraView;
  tool: ToolMode;
  spacePan: boolean;
  toast: string | null;
  viewMode: ViewMode;
  synopticNodes: SynopticNode[];
  synopticLinks: SynopticLink[];
  visibleLayers: Record<BoardLayer, boolean>;
  planBackground: PlanBackground | null;
  planBackgroundEditing: boolean;
  highlightedNodeIds: string[];
  highlightedLinkIds: string[];
  isCatalogModalOpen: boolean;
  editingCatalogItemId: string | null;
  setTitle: (title: string) => void;
  setStatus: (status: BoardStatus) => void;
  setTool: (tool: ToolMode) => void;
  setSpacePan: (value: boolean) => void;
  setCamera: (camera: CameraView) => void;
  select: (id: string | null, additive?: boolean) => void;
  selectMany: (ids: string[], additive?: boolean) => void;
  setCatalogModalOpen: (open: boolean) => void;
  setEditingCatalogItemId: (id: string | null) => void;
  addFromCatalog: (catalogId: string, x: number, y: number) => string | null;
  updateItem: (id: string, patch: Partial<BoardObject>) => void;
  moveItem: (id: string, x: number, y: number) => void;
  moveItems: (moves: Array<{ id: string; x: number; y: number }>) => void;
  duplicateItems: (ids: string[]) => void;
  removeItem: (id: string) => void;
  setToast: (message: string | null) => void;
  resetBoard: () => void;
  setViewMode: (viewMode: ViewMode) => void;
  setLayerVisibility: (layer: BoardLayer, visible: boolean) => void;
  setPlanBackground: (background: PlanBackground | null) => void;
  updatePlanBackground: (patch: Partial<PlanBackground>) => void;
  setPlanBackgroundEditing: (editing: boolean) => void;
  traceSignal: (nodeId: string) => void;
  clearSignalTrace: () => void;
  addCatalogItem: (item: Omit<CatalogItem, "id"> & { id?: string }) => string;
  updateCatalogItem: (id: string, patch: Partial<CatalogItem>, syncBoardItems?: boolean) => void;
  duplicateCatalogItem: (id: string) => string | null;
  removeCatalogItem: (id: string) => void;
  resetCatalog: () => void;
  saveItemToCatalog: (itemId: string) => void;
  generateSynoptic: () => void;
  addSynopticNode: (custom?: Partial<SynopticNode>) => void;
  addSynopticNodeFromCatalog: (catalogId: string) => void;
  updateSynopticNode: (id: string, patch: Partial<SynopticNode>) => void;
  moveSynopticNode: (id: string, x: number, y: number) => void;
  moveSynopticNodes: (moves: Array<{ id: string; x: number; y: number }>) => void;
  removeSynopticNode: (id: string) => void;
  toggleSynopticPower: (id: string) => void;
  addSynopticLink: (fromNodeId: string, toNodeId: string, fromPortId?: string, toPortId?: string, cableType?: CableType) => void;
  removeSynopticLink: (id: string) => void;
  updateSynopticLink: (id: string, patch: Partial<SynopticLink>) => void;
  exportProject: () => string;
  importProject: (json: string) => void;
  importEquipmentList: (content: string) => void;
  autoLayoutSynoptic: () => SynopticNode[];
};

export const useStudio = create<StudioState>()(
  persist(
    (set, get) => ({
      title: "Plateau — Interview studio",
      status: "prep",
      catalog: CATALOG,
      items: seedItems(CATALOG),
      selectedId: null,
      selectedIds: [],
      camera: { x: 80, y: 40, zoom: 1 },
      tool: "select",
      spacePan: false,
      toast: null,
      viewMode: "plan",
      synopticNodes: [],
      synopticLinks: [],
      visibleLayers: { ...DEFAULT_VISIBLE_LAYERS },
      planBackground: null,
      planBackgroundEditing: false,
      highlightedNodeIds: [],
      highlightedLinkIds: [],
      isCatalogModalOpen: false,
      editingCatalogItemId: null,
      setTitle: (title) => set({ title }),
      setStatus: (status) => set({ status }),
      setTool: (tool) => set({ tool }),
      setSpacePan: (spacePan) => set({ spacePan }),
      setCamera: (camera) => set({ camera }),
      select: (selectedId, additive = false) => {
        if (!selectedId) return set({ selectedId: null, selectedIds: [] });
        const current = get().selectedIds;
        const selectedIds = additive
          ? current.includes(selectedId)
            ? current.filter((id) => id !== selectedId)
            : [...current, selectedId]
          : [selectedId];
        set({ selectedId: selectedIds[selectedIds.length - 1] ?? null, selectedIds });
      },
      selectMany: (ids, additive = false) => {
        const uniqueIds = [...new Set(ids)];
        const selectedIds = additive ? [...new Set([...get().selectedIds, ...uniqueIds])] : uniqueIds;
        set({ selectedId: selectedIds[selectedIds.length - 1] ?? null, selectedIds });
      },
      setCatalogModalOpen: (isCatalogModalOpen) => set({ isCatalogModalOpen }),
      setEditingCatalogItemId: (editingCatalogItemId) => set({ editingCatalogItemId }),
      addFromCatalog: (catalogId, x, y) => {
        const item = fromCatalogWithList(get().catalog, catalogId, x, y);
        if (!item) return null;
        set({ items: [...get().items, item], selectedId: item.id, selectedIds: [item.id] });
        return item.id;
      },
      updateItem: (id, patch) => {
        const nextItems = get().items.map((item) => (item.id === id ? { ...item, ...patch } : item));

        const nextSynopticNodes = get().synopticNodes.map((node) => {
          if (node.sourceId === id) {
            return {
              ...node,
              ...(patch.name !== undefined ? { title: patch.name } : {}),
              ...(patch.label !== undefined ? { subtitle: patch.label } : {}),
              ...(patch.color !== undefined ? { color: patch.color } : {}),
              ...(patch.image !== undefined ? { image: patch.image } : {}),
              ...(patch.visualKey !== undefined ? { visualKey: patch.visualKey } : {}),
              ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
            };
          }
          return node;
        });

        set({
          items: nextItems,
          synopticNodes: nextSynopticNodes,
        });
      },
      moveItem: (id, x, y) => {
        const snapX = Math.round(x / GRID_SIZE) * GRID_SIZE;
        const snapY = Math.round(y / GRID_SIZE) * GRID_SIZE;
        return set({
          items: get().items.map((item) => (item.id === id ? { ...item, x: snapX, y: snapY } : item)),
        });
      },
      moveItems: (moves) => {
        const positions = new Map(moves.map((move) => [move.id, { x: Math.round(move.x / GRID_SIZE) * GRID_SIZE, y: Math.round(move.y / GRID_SIZE) * GRID_SIZE }]));
        set({ items: get().items.map((item) => positions.get(item.id) ? { ...item, ...positions.get(item.id) } : item) });
      },
      duplicateItems: (ids) => {
        const copies = get().items
          .filter((item) => ids.includes(item.id))
          .map((item) => ({ ...structuredClone(item), id: uid(), x: item.x + GRID_SIZE * 2, y: item.y + GRID_SIZE * 2 }));
        if (!copies.length) return;
        set({ items: [...get().items, ...copies], selectedId: copies[copies.length - 1].id, selectedIds: copies.map((item) => item.id), toast: `${copies.length} élément${copies.length > 1 ? "s" : ""} dupliqué${copies.length > 1 ? "s" : ""} ✓` });
      },
      removeItem: (id) =>
        set({
          items: get().items.filter((item) => item.id !== id),
          selectedId: get().selectedId === id ? null : get().selectedId,
          selectedIds: get().selectedIds.filter((selected) => selected !== id),
        }),
      setToast: (toast) => set({ toast }),
      setViewMode: (viewMode) => set({ viewMode }),
      setLayerVisibility: (layer, visible) => set({ visibleLayers: { ...get().visibleLayers, [layer]: visible } }),
      setPlanBackground: (planBackground) => set({ planBackground, planBackgroundEditing: false }),
      updatePlanBackground: (patch) => {
        const current = get().planBackground;
        if (current) set({ planBackground: { ...current, ...patch } });
      },
      setPlanBackgroundEditing: (planBackgroundEditing) => set({ planBackgroundEditing }),
      traceSignal: (nodeId) => {
        const links = get().synopticLinks;
        const adjacent = new Map<string, string[]>();
        links.forEach((link) => {
          adjacent.set(link.fromNodeId, [...(adjacent.get(link.fromNodeId) ?? []), link.toNodeId]);
          adjacent.set(link.toNodeId, [...(adjacent.get(link.toNodeId) ?? []), link.fromNodeId]);
        });
        const visited = new Set<string>([nodeId]);
        const queue = [nodeId];
        while (queue.length) {
          const current = queue.shift()!;
          (adjacent.get(current) ?? []).forEach((next) => {
            if (!visited.has(next)) {
              visited.add(next);
              queue.push(next);
            }
          });
        }
        const highlightedLinkIds = links.filter((link) => visited.has(link.fromNodeId) && visited.has(link.toNodeId)).map((link) => link.id);
        set({ highlightedNodeIds: [...visited], highlightedLinkIds });
      },
      clearSignalTrace: () => set({ highlightedNodeIds: [], highlightedLinkIds: [] }),

      addCatalogItem: (itemData) => {
        const id = itemData.id || `custom-${Date.now()}`;
        const newItem: CatalogItem = {
          ...itemData,
          id,
          isCustom: true,
          defaults: {
            rotation: 0,
            scale: 1,
            ...itemData.defaults,
          },
        };
        set({
          catalog: [...get().catalog, newItem],
          toast: `« ${newItem.name} » ajouté à la bibliothèque ✓`,
        });
        return id;
      },

      updateCatalogItem: (id, patch, syncBoardItems = true) => {
        const currentCatalog = get().catalog;
        const updatedCatalog = currentCatalog.map((item) => (item.id === id ? { ...item, ...patch } : item));

        let updatedItems = get().items;
        let updatedSynoptic = get().synopticNodes;

        if (syncBoardItems) {
          updatedItems = updatedItems.map((boardItem) => {
            if (boardItem.catalogId !== id) return boardItem;
            return {
              ...boardItem,
              ...(patch.name ? { name: patch.name } : {}),
              ...(patch.short ? { label: patch.short } : {}),
              ...(patch.color ? { color: patch.color } : {}),
              ...(patch.image !== undefined ? { image: patch.image } : {}),
              ...(patch.fit !== undefined ? { fit: patch.fit } : {}),
              ...(patch.background !== undefined ? { background: patch.background } : {}),
              ...(patch.portsIn !== undefined ? { portsIn: structuredClone(patch.portsIn) } : {}),
              ...(patch.portsOut !== undefined ? { portsOut: structuredClone(patch.portsOut) } : {}),
              ...(patch.needsPower !== undefined ? { needsPower: patch.needsPower } : {}),
              ...(patch.warningBadge !== undefined ? { warningBadge: patch.warningBadge } : {}),
              ...(patch.deviceType !== undefined ? { deviceType: patch.deviceType } : {}),
              ...(patch.layer !== undefined ? { layer: patch.layer } : {}),
              ...(patch.specs !== undefined ? { specs: structuredClone(patch.specs) } : {}),
              ...(patch.defaults?.width !== undefined && boardItem.category === "set" ? { width: patch.defaults.width } : {}),
              ...(patch.defaults?.height !== undefined && boardItem.category === "set" ? { height: patch.defaults.height } : {}),
              ...(patch.defaults?.fov !== undefined && boardItem.category === "camera" ? { fov: patch.defaults.fov } : {}),
              ...(patch.defaults?.beamRadius !== undefined && boardItem.category === "light" ? { beamRadius: patch.defaults.beamRadius } : {}),
              ...(patch.defaults?.beamSpread !== undefined && boardItem.category === "light" ? { beamSpread: patch.defaults.beamSpread } : {}),
              ...(patch.defaults?.intensity !== undefined && boardItem.category === "light" ? { intensity: patch.defaults.intensity } : {}),
            };
          });

          const matchedBoardIds = new Set(
            updatedItems.filter((b) => b.catalogId === id).map((b) => b.id)
          );

          updatedSynoptic = updatedSynoptic.map((node) => {
            const matchesBoardItem = node.sourceId && matchedBoardIds.has(node.sourceId);
            const matchesVisualKey = node.visualKey === id || node.id === id;
            if (matchesBoardItem || matchesVisualKey) {
              return {
                ...node,
                ...(patch.name ? { title: patch.name } : {}),
                ...(patch.short ? { subtitle: patch.short } : {}),
                ...(patch.color ? { color: patch.color } : {}),
                ...(patch.image !== undefined ? { image: patch.image } : {}),
                ...(patch.fit !== undefined ? { fit: patch.fit } : {}),
                ...(patch.background !== undefined ? { background: patch.background } : {}),
                ...(patch.portsIn !== undefined ? { portsIn: structuredClone(patch.portsIn) } : {}),
                ...(patch.portsOut !== undefined ? { portsOut: structuredClone(patch.portsOut) } : {}),
                ...(patch.needsPower !== undefined ? { needsPower: patch.needsPower } : {}),
                ...(patch.warningBadge !== undefined ? { warningBadge: patch.warningBadge } : {}),
                ...(patch.deviceType !== undefined ? { deviceType: patch.deviceType } : {}),
              };
            }
            return node;
          });
        }

        set({
          catalog: updatedCatalog,
          items: updatedItems,
          synopticNodes: updatedSynoptic,
          toast: "Objet mis à jour dans la bibliothèque ✓",
        });
      },

      duplicateCatalogItem: (id) => {
        const source = get().catalog.find((c) => c.id === id);
        if (!source) return null;
        const newId = `custom-${Date.now()}`;
        const duplicated: CatalogItem = {
          ...source,
          id: newId,
          name: `${source.name} (Copie)`,
          short: `${source.short}+`,
          isCustom: true,
        };
        set({
          catalog: [...get().catalog, duplicated],
          toast: `« ${duplicated.name} » créé ✓`,
          editingCatalogItemId: newId,
        });
        return newId;
      },

      removeCatalogItem: (id) => {
        set({
          catalog: get().catalog.filter((c) => c.id !== id),
          toast: "Objet supprimé de la bibliothèque",
        });
      },

      resetCatalog: () => {
        const resetItems = get().items.map((boardItem) => {
          const source = CATALOG_MAP[boardItem.catalogId] ?? CATALOG.find((item) => item.id === boardItem.catalogId);
          if (!source) return boardItem;
          return {
            ...boardItem,
            name: source.name,
            label: source.short,
            notes: source.description,
            color: source.color,
            image: source.image,
            fit: source.fit,
            background: source.background,
            layer: getBoardLayer(source),
            specs: source.specs ? structuredClone(source.specs) : undefined,
          };
        });
        set({
          catalog: CATALOG,
          items: resetItems,
          toast: "Bibliothèque réinitialisée aux valeurs d'usine",
        });
      },

      saveItemToCatalog: (itemId) => {
        const boardItem = get().items.find((i) => i.id === itemId);
        if (!boardItem) return;
        const catItem = get().catalog.find((c) => c.id === boardItem.catalogId);
        if (!catItem) return;

        get().updateCatalogItem(catItem.id, {
          name: boardItem.name,
          short: boardItem.label,
          color: boardItem.color,
          image: boardItem.image,
          fit: boardItem.fit,
          background: boardItem.background,
          defaults: {
            ...catItem.defaults,
            rotation: boardItem.rotation,
            scale: boardItem.scale,
            width: boardItem.width,
            height: boardItem.height,
            fov: boardItem.fov,
            beamRadius: boardItem.beamRadius,
            beamSpread: boardItem.beamSpread,
            intensity: boardItem.intensity,
          },
        });
        set({ toast: `Paramètres enregistrés comme modèle par défaut pour « ${catItem.name} » ✓` });
      },

      generateSynoptic: () => {
        const state = get();
        const relevantItems = state.items.filter((item) => {
          if (item.category === "talent") return false;
          if (item.catalogId.startsWith("set-table") || item.catalogId.startsWith("set-chair") || item.catalogId.startsWith("set-cyc") || item.catalogId.startsWith("grip-")) {
            return false;
          }
          return true;
        });

        const nodes: SynopticNode[] = [];
        const links: SynopticLink[] = [];

        // 1. Mélangeur ATEM Mini Expert
        const atemTemplate = SYNOPTIC_TEMPLATES["atem-mini-expert"];
        const atemId = uid();
        nodes.push({
          id: atemId,
          sourceId: null,
          title: atemTemplate.title,
          subtitle: atemTemplate.subtitle,
          deviceType: atemTemplate.deviceType,
          color: atemTemplate.color,
          x: 620,
          y: 200,
          width: 280,
          height: 380,
          portsIn: structuredClone(atemTemplate.portsIn),
          portsOut: structuredClone(atemTemplate.portsOut),
          needsPower: atemTemplate.needsPower,
        });

        // 2. Console Son Yamaha
        const yamahaTemplate = SYNOPTIC_TEMPLATES["yamaha-mg12xu"];
        const yamahaId = uid();
        nodes.push({
          id: yamahaId,
          sourceId: null,
          title: yamahaTemplate.title,
          subtitle: yamahaTemplate.subtitle,
          deviceType: yamahaTemplate.deviceType,
          color: yamahaTemplate.color,
          x: 480,
          y: 680,
          width: 250,
          height: 340,
          portsIn: structuredClone(yamahaTemplate.portsIn),
          portsOut: structuredClone(yamahaTemplate.portsOut),
          needsPower: yamahaTemplate.needsPower,
          warningBadge: yamahaTemplate.warningBadge,
        });

        // Liaison Yamaha -> ATEM
        links.push({
          id: uid(),
          fromNodeId: yamahaId,
          fromPortId: yamahaTemplate.portsOut.find(p => p.id === "stereo-out-1")?.id,
          toNodeId: atemId,
          toPortId: atemTemplate.portsIn.find(p => p.id === "audio-in-1")?.id,
          cableType: "jack",
          label: "Audio Mix",
        });

        // 3. Caméras
        const planCameras = relevantItems.filter((i) => i.category === "camera");
        const camTemplate = SYNOPTIC_TEMPLATES["generic-camera"];
        planCameras.forEach((cam, i) => {
          const nodeId = uid();
          const catalogItem = state.catalog.find((item) => item.id === cam.catalogId);
          nodes.push({
            id: nodeId,
            sourceId: cam.id,
            title: cam.name || `Caméra ${i + 1}`,
            subtitle: cam.label || "Sortie HDMI / SDI",
            category: cam.category,
            deviceType: camTemplate.deviceType,
            color: cam.color || catalogItem?.color || camTemplate.color,
            image: cam.image ?? catalogItem?.image,
            fit: cam.fit ?? catalogItem?.fit,
            background: cam.background ?? catalogItem?.background,
            visualKey: cam.visualKey ?? catalogItem?.visualKey ?? cam.catalogId,
            x: 160,
            y: 180 + i * 115,
            portsIn: [],
            portsOut: structuredClone(camTemplate.portsOut),
            needsPower: true,
          });

          if (i < atemTemplate.portsIn.filter(p => p.type === "hdmi").length) {
            const hdmiPort = atemTemplate.portsIn.filter(p => p.type === "hdmi")[i];
            links.push({
              id: uid(),
              fromNodeId: nodeId,
              fromPortId: camTemplate.portsOut[0].id,
              toNodeId: atemId,
              toPortId: hdmiPort.id,
              cableType: "hdmi",
            });
          }
        });

        // 4. Micros
        const planAudios = relevantItems.filter((i) => i.category === "audio");
        const micTemplate = SYNOPTIC_TEMPLATES["generic-mic"];
        planAudios.slice(0, 4).forEach((mic, i) => {
          const nodeId = uid();
          const catalogItem = state.catalog.find((item) => item.id === mic.catalogId);
          nodes.push({
            id: nodeId,
            sourceId: mic.id,
            title: mic.name || `Micro ${i + 1}`,
            subtitle: mic.label || "XLR",
            category: mic.category,
            deviceType: micTemplate.deviceType,
            color: mic.color || catalogItem?.color || micTemplate.color,
            image: mic.image ?? catalogItem?.image,
            fit: mic.fit ?? catalogItem?.fit,
            background: mic.background ?? catalogItem?.background,
            visualKey: mic.visualKey ?? catalogItem?.visualKey ?? mic.catalogId,
            x: 160,
            y: 670 + i * 95,
            portsIn: [],
            portsOut: structuredClone(micTemplate.portsOut),
            needsPower: false,
          });

          const yamahaPort = yamahaTemplate.portsIn.filter(p => p.type === "xlr")[i];
          if (yamahaPort) {
            links.push({
              id: uid(),
              fromNodeId: nodeId,
              fromPortId: micTemplate.portsOut[0].id,
              toNodeId: yamahaId,
              toPortId: yamahaPort.id,
              cableType: "xlr",
            });
          }
        });

        // 5. Appareils avals
        const avals = [
          { templateId: "pc-stream", x: 1040, y: 120, linkFrom: atemId, fromPort: "pgm-usb-1", toPort: "usb-in" },
          { templateId: "pc-atem", x: 1160, y: 200 },
          { templateId: "headphone-monitor", x: 940, y: 280, linkFrom: atemId, fromPort: "audio-out-jack", toPort: "jack-in" },
          { templateId: "hyperdeck", x: 940, y: 400, linkFrom: atemId, fromPort: "pgm-hdmi", toPort: "hdmi-in", cable: "hdmi" },
          { templateId: "master-screen", x: 1200, y: 380, linkFrom: "hyperdeck-ref", fromPort: "hdmi-out", toPort: "hdmi-in" },
          { templateId: "multiview-screen", x: 940, y: 530, linkFrom: atemId, fromPort: "multiview-hdmi", toPort: "hdmi-in" },
          { templateId: "di-box", x: 790, y: 680, linkFrom: yamahaId, fromPort: "stereo-out-2", toPort: "jack-in" },
        ];

        let hyperDeckNodeId = "";

        avals.forEach(aval => {
          const template = SYNOPTIC_TEMPLATES[aval.templateId];
          const nodeId = uid();
          if (aval.templateId === "hyperdeck") hyperDeckNodeId = nodeId;

          nodes.push({
            id: nodeId,
            sourceId: null,
            title: template.title,
            subtitle: template.subtitle,
            deviceType: template.deviceType,
            color: template.color,
            x: aval.x,
            y: aval.y,
            portsIn: structuredClone(template.portsIn),
            portsOut: structuredClone(template.portsOut),
            needsPower: template.needsPower,
          });

          if (aval.linkFrom) {
            const fromId = aval.linkFrom === "hyperdeck-ref" ? hyperDeckNodeId : aval.linkFrom;
            const fromTemplate = SYNOPTIC_TEMPLATES[aval.linkFrom === "hyperdeck-ref" ? "hyperdeck" : (aval.linkFrom === atemId ? "atem-mini-expert" : "yamaha-mg12xu")];

            // Note: simplified port lookup for brevity in the logic
            links.push({
              id: uid(),
              fromNodeId: fromId,
              fromPortId: aval.fromPort,
              toNodeId: nodeId,
              toPortId: aval.toPort,
              cableType: aval.cable || "hdmi",
            });
          }
        });

        const hyperDeckNode = nodes.find((node) => node.id === hyperDeckNodeId);
        const masterScreenNode = nodes.find((node) => node.title === SYNOPTIC_TEMPLATES["master-screen"].title);
        const hyperDeckOutput = hyperDeckNode?.portsOut.find((port) => port.id === "hdmi-out");
        const masterScreenInput = masterScreenNode?.portsIn.find((port) => port.id === "hdmi-in");
        if (hyperDeckNode && masterScreenNode && hyperDeckOutput && masterScreenInput && !links.some((link) => link.fromNodeId === hyperDeckNode.id && link.toNodeId === masterScreenNode.id)) {
          links.push({
            id: uid(),
            fromNodeId: hyperDeckNode.id,
            fromPortId: hyperDeckOutput.id,
            toNodeId: masterScreenNode.id,
            toPortId: masterScreenInput.id,
            cableType: "hdmi",
          });
        }

        set({
          synopticNodes: nodes,
          synopticLinks: links,
          viewMode: "synoptic",
        });
      },

      addSynopticNode: (custom) => {
        const id = uid();
        const defaultNode: SynopticNode = {
          id,
          sourceId: null,
          title: "Nouvel équipement",
          subtitle: "Entrées / Sorties",
          deviceType: "generic",
          color: "#94a3b8",
          x: 300,
          y: 300,
          portsIn: [{ id: uid(), name: "IN 1", type: "hdmi" }],
          portsOut: [{ id: uid(), name: "OUT 1", type: "hdmi" }],
          needsPower: false,
          ...custom,
        };
        set({ synopticNodes: [...get().synopticNodes, defaultNode] });
      },

      addSynopticNodeFromCatalog: (catalogId) => {
        const catalogItem = get().catalog.find((item) => item.id === catalogId);
        if (!catalogItem) return;

        const existingCount = get().synopticNodes.length;
        const categoryDeviceType: SynopticNode["deviceType"] =
          catalogItem.deviceType ??
          (catalogItem.category === "camera" ? "camera" : catalogItem.category === "audio" ? "audio" : catalogItem.category === "light" ? "light" : "generic");
        const defaultPortsIn = catalogItem.portsIn ?? (categoryDeviceType === "screen" || categoryDeviceType === "recorder" ? [{ id: `${catalogItem.id}-in`, name: "IN 1", type: "hdmi" as CableType }] : []);
        const defaultPortsOut = catalogItem.portsOut ?? (categoryDeviceType === "camera" ? [{ id: `${catalogItem.id}-out`, name: "OUT 1", type: "hdmi" as CableType }] : []);

        get().addSynopticNode({
          title: catalogItem.name,
          subtitle: catalogItem.short,
          category: catalogItem.category,
          deviceType: categoryDeviceType,
          color: catalogItem.color,
          visualKey: catalogItem.visualKey ?? catalogItem.id,
          image: catalogItem.image,
          fit: catalogItem.fit,
          background: catalogItem.background,
          x: 120 + (existingCount % 3) * 280,
          y: 120 + Math.floor(existingCount / 3) * 220,
          portsIn: structuredClone(defaultPortsIn),
          portsOut: structuredClone(defaultPortsOut),
          needsPower: catalogItem.needsPower ?? (catalogItem.category === "camera" || catalogItem.category === "light"),
          warningBadge: catalogItem.warningBadge,
        });
      },

      updateSynopticNode: (id, patch) => {
        const nextSynopticNodes = get().synopticNodes.map((n) => (n.id === id ? { ...n, ...patch } : n));
        const targetNode = nextSynopticNodes.find((n) => n.id === id);

        let nextItems = get().items;
        if (targetNode && targetNode.sourceId) {
          nextItems = nextItems.map((item) => {
            if (item.id === targetNode.sourceId) {
              return {
                ...item,
                ...(patch.title !== undefined ? { name: patch.title } : {}),
                ...(patch.subtitle !== undefined ? { label: patch.subtitle } : {}),
                ...(patch.color !== undefined ? { color: patch.color } : {}),
                ...(patch.image !== undefined ? { image: patch.image } : {}),
                ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
              };
            }
            return item;
          });
        }

        set({
          synopticNodes: nextSynopticNodes,
          items: nextItems,
        });
      },

      moveSynopticNode: (id, x, y) => {
        const snapX = Math.round(x / GRID_SIZE) * GRID_SIZE;
        const snapY = Math.round(y / GRID_SIZE) * GRID_SIZE;
        return set({
          synopticNodes: get().synopticNodes.map((n) => (n.id === id ? { ...n, x: snapX, y: snapY } : n)),
        });
      },
      moveSynopticNodes: (moves) => {
        const positions = new Map(moves.map((move) => [move.id, { x: Math.round(move.x / GRID_SIZE) * GRID_SIZE, y: Math.round(move.y / GRID_SIZE) * GRID_SIZE }]));
        set({ synopticNodes: get().synopticNodes.map((node) => positions.get(node.id) ? { ...node, ...positions.get(node.id) } : node) });
      },

      removeSynopticNode: (id) =>
        set({
          synopticNodes: get().synopticNodes.filter((n) => n.id !== id),
          synopticLinks: get().synopticLinks.filter((l) => l.fromNodeId !== id && l.toNodeId !== id),
        }),

      toggleSynopticPower: (id) =>
        set({
          synopticNodes: get().synopticNodes.map((n) =>
            n.id === id ? { ...n, needsPower: !n.needsPower } : n
          ),
        }),

      addSynopticLink: (fromNodeId, toNodeId, fromPortId, toPortId, cableType = "hdmi") => {
        const newLink: SynopticLink = {
          id: uid(),
          fromNodeId,
          fromPortId,
          toNodeId,
          toPortId,
          cableType,
        };
        set({ synopticLinks: [...get().synopticLinks, newLink] });
      },

      removeSynopticLink: (id) =>
        set({
          synopticLinks: get().synopticLinks.filter((l) => l.id !== id),
        }),

      updateSynopticLink: (id, patch) =>
        set({
          synopticLinks: get().synopticLinks.map((l) => (l.id === id ? { ...l, ...patch } : l)),
        }),

      exportProject: () => {
        const state = get();
        const data = {
          title: state.title,
          status: state.status,
          items: state.items,
          catalog: state.catalog,
          camera: state.camera,
          viewMode: state.viewMode,
          synopticNodes: state.synopticNodes,
          synopticLinks: state.synopticLinks,
          visibleLayers: state.visibleLayers,
          planBackground: state.planBackground,
        };
        return JSON.stringify(data, null, 2);
      },

      importProject: (json) => {
        try {
          const data = JSON.parse(json);
          set({
            title: data.title || "Sans titre",
            status: data.status || "prep",
            items: Array.isArray(data.items) ? data.items.map((item: BoardObject) => ({ ...item, layer: getBoardLayer(item) })) : [],
            catalog: Array.isArray(data.catalog) ? data.catalog : CATALOG,
            camera: data.camera || { x: 80, y: 40, zoom: 1 },
            viewMode: data.viewMode || "plan",
            synopticNodes: Array.isArray(data.synopticNodes) ? data.synopticNodes : [],
            synopticLinks: Array.isArray(data.synopticLinks) ? data.synopticLinks : [],
            planBackground: data.planBackground?.image ? data.planBackground : null,
            planBackgroundEditing: false,
            visibleLayers: { ...DEFAULT_VISIBLE_LAYERS, ...(data.visibleLayers || {}), accessories: data.visibleLayers?.accessories ?? data.visibleLayers?.data ?? true, lights: data.visibleLayers?.lights ?? data.visibleLayers?.power ?? true },
          });
          set({ toast: "Projet importé avec succès ✓" });
        } catch (e) {
          set({ toast: "Erreur lors de l'importation du projet" });
        }
      },

      importEquipmentList: (content) => {
        try {
          const trimmed = content.trim();
          const parsed = trimmed.startsWith("[") ? JSON.parse(trimmed) : (() => {
            const lines = trimmed.split(/\r?\n/).filter(Boolean);
            if (!lines.length) return [];
            const firstColumns = lines[0].split(",").map((value) => value.trim().toLowerCase());
            const hasHeader = firstColumns.some((value) => ["catalogid", "catalog", "name", "x", "y", "label"].includes(value));
            const headers = hasHeader ? firstColumns : ["catalogid", "x", "y", "label"];
            const rows = hasHeader ? lines.slice(1) : lines;
            return rows.map((line) => {
              const values = line.split(",").map((value) => value.trim().replace(/^"|"$/g, ""));
              return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
            });
          })();
          const imported = parsed.map((entry: any, index: number) => {
            const catalogId = entry.catalogId || entry.id || entry.catalog || get().catalog.find((item) => item.name === entry.name)?.id;
            const item = catalogId ? fromCatalogWithList(get().catalog, catalogId, Number(entry.x) || 400 + index * 40, Number(entry.y) || 300 + index * 40) : null;
            return item ? { ...item, ...(entry.name ? { name: entry.name } : {}), ...(entry.label ? { label: entry.label } : {}), ...(entry.layer ? { layer: getBoardLayer({ ...item, layer: entry.layer }) } : {}) } : null;
          }).filter((item): item is BoardObject => Boolean(item));
          if (!imported.length) throw new Error("Aucun équipement reconnu");
          set({ items: [...get().items, ...imported], selectedIds: imported.map((item) => item.id), selectedId: imported[imported.length - 1].id, toast: `${imported.length} équipement${imported.length > 1 ? "s" : ""} importé${imported.length > 1 ? "s" : ""} ✓` });
        } catch {
          set({ toast: "Import équipements invalide" });
        }
      },

      autoLayoutSynoptic: () => {
        const nodes = get().synopticNodes;
        const links = get().synopticLinks;
        if (!nodes.length) return [];

        const nextNodes = computeSynopticAutoLayout(nodes, links);
        set({ synopticNodes: nextNodes, toast: "Synoptique réorganisé selon les flux ✓" });
        return nextNodes;
      },

      resetBoard: () =>
        set({
          items: seedItems(get().catalog),
          selectedId: null,
          selectedIds: [],
          camera: { x: 80, y: 40, zoom: 1 },
          title: "Plateau — Interview studio",
          status: "prep",
          viewMode: "plan",
          synopticNodes: [],
          synopticLinks: [],
          planBackground: null,
          planBackgroundEditing: false,
        }),
    }),
    {
      name: "shotboard-studio",
      version: 6,
      migrate: (persistedState: any, version: number) => {
        let state = persistedState;
        if (version < 2 || !state) {
          state = {
            ...state,
            ...(Array.isArray(state?.items) ? { items: addMissingControlRoom(state.items) } : {}),
            synopticNodes: [],
            synopticLinks: [],
          };
        }
        if (version < 4 && Array.isArray(state.items)) {
          state = { ...state, items: addMissingControlRoom(state.items) };
        }
        if (version < 5) {
          state = {
            ...state,
            catalog: state.catalog && Array.isArray(state.catalog) && state.catalog.length > 0 ? state.catalog : CATALOG,
          };
        }
        if (version < 6 && Array.isArray(state.items)) {
          state = {
            ...state,
            items: state.items.map((item: BoardObject) => ({ ...item, layer: getBoardLayer(item) })),
            visibleLayers: { ...DEFAULT_VISIBLE_LAYERS, ...(state.visibleLayers || {}), accessories: state.visibleLayers?.accessories ?? state.visibleLayers?.data ?? true, lights: state.visibleLayers?.lights ?? state.visibleLayers?.power ?? true },
          };
        }
        if (state) {
          state = {
            ...state,
            visibleLayers: { ...DEFAULT_VISIBLE_LAYERS, ...(state.visibleLayers || {}), accessories: state.visibleLayers?.accessories ?? state.visibleLayers?.data ?? true, lights: state.visibleLayers?.lights ?? state.visibleLayers?.power ?? true },
            items: Array.isArray(state.items)
              ? state.items.map((item: BoardObject) => ({
                ...item,
                layer: getBoardLayer(item),
              }))
              : state.items,
          };
        }
        return state;
      },
      partialize: (state) => ({
        title: state.title,
        status: state.status,
        items: state.items,
        catalog: state.catalog,
        camera: state.camera,
        viewMode: state.viewMode,
        synopticNodes: state.synopticNodes,
        synopticLinks: state.synopticLinks,
        visibleLayers: state.visibleLayers,
        planBackground: state.planBackground,
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
