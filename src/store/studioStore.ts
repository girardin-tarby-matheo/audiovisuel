import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CATALOG_MAP } from "../lib/catalog";
import type { BoardObject, BoardStatus, CameraView, SynopticLink, SynopticNode, ToolMode, ViewMode } from "../lib/types";

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
    width: src.defaults.width,
    height: src.defaults.height,
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
    .map(([id, x, y]) => fromCatalog(id, x, y))
    .filter((item): item is BoardObject => Boolean(item));
};

function addMissingControlRoom(items: BoardObject[]): BoardObject[] {
  const additions: Array<[string, number, number]> = [
    ["set-atem-mini", 180, 300],
    ["set-monitor", 180, 205],
    ["set-sound-desk", 180, 430],
  ];
  const existing = new Set(items.map((item) => item.catalogId));
  return additions.reduce((result, [catalogId, x, y]) => {
    if (existing.has(catalogId)) return result;
    const item = fromCatalog(catalogId, x, y);
    if (!item) return result;
    existing.add(catalogId);
    return [...result, item];
  }, items);
}

type StudioState = {
  title: string;
  status: BoardStatus;
  items: BoardObject[];
  selectedId: string | null;
  camera: CameraView;
  tool: ToolMode;
  spacePan: boolean;
  toast: string | null;
  viewMode: ViewMode;
  synopticNodes: SynopticNode[];
  synopticLinks: SynopticLink[];
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
  setViewMode: (viewMode: ViewMode) => void;
  generateSynoptic: () => void;
  addSynopticNode: (custom?: Partial<SynopticNode>) => void;
  updateSynopticNode: (id: string, patch: Partial<SynopticNode>) => void;
  moveSynopticNode: (id: string, x: number, y: number) => void;
  removeSynopticNode: (id: string) => void;
  toggleSynopticPower: (id: string) => void;
  addSynopticLink: (fromNodeId: string, toNodeId: string, fromPortId?: string, toPortId?: string, cableType?: CableType) => void;
  removeSynopticLink: (id: string) => void;
  updateSynopticLink: (id: string, patch: Partial<SynopticLink>) => void;
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
      viewMode: "plan",
      synopticNodes: [],
      synopticLinks: [],
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
      setViewMode: (viewMode) => set({ viewMode }),

      generateSynoptic: () => {
        const state = get();
        // Filtrer le mobilier (set-table, set-chair, set-cyc) et les personnes (talent)
        const relevantItems = state.items.filter((item) => {
          if (item.category === "talent") return false;
          if (item.catalogId.startsWith("set-table") || item.catalogId.startsWith("set-chair") || item.catalogId.startsWith("set-cyc") || item.catalogId.startsWith("grip-")) {
            return false;
          }
          return true;
        });

        const nodes: SynopticNode[] = [];
        const links: SynopticLink[] = [];

        // 1. Mélangeur ATEM Mini Expert (Centre-Haut)
        const atemId = uid();
        const atemInHdmi = Array.from({ length: 8 }, (_, i) => ({
          id: uid(),
          name: `HDMI ${i + 1}`,
          type: "hdmi" as CableType,
        }));
        const atemInAudio1 = { id: uid(), name: "Audio 1", type: "jack" as CableType };
        const atemInAudio2 = { id: uid(), name: "Audio 2", type: "jack" as CableType };
        const atemOutPgmUsb1 = { id: uid(), name: "PGM USB", type: "usb" as CableType };
        const atemOutPgmUsb2 = { id: uid(), name: "PGM USB", type: "usb" as CableType };
        const atemOutJack = { id: uid(), name: "Audio Mini-jack", type: "jack" as CableType };
        const atemOutPgm = { id: uid(), name: "HDMI Programme", type: "hdmi" as CableType };
        const atemOutMulti = { id: uid(), name: "HDMI MultiView", type: "hdmi" as CableType };

        nodes.push({
          id: atemId,
          sourceId: null,
          title: "Mélangeur ATEM Mini Expert (dans sa malette)",
          subtitle: "Régie de commutation & encodage",
          deviceType: "mixer",
          color: "#f59e0b",
          x: 620,
          y: 200,
          width: 280,
          height: 380,
          portsIn: [...atemInHdmi, atemInAudio1, atemInAudio2],
          portsOut: [atemOutPgmUsb1, atemOutPgmUsb2, atemOutJack, atemOutPgm, atemOutMulti],
          needsPower: true,
        });

        // 2. Console Son Yamaha MG12XU (Centre-Bas)
        const yamahaId = uid();
        const yamahaIn1 = { id: uid(), name: "1", type: "xlr" as CableType };
        const yamahaIn2 = { id: uid(), name: "2", type: "xlr" as CableType };
        const yamahaIn3 = { id: uid(), name: "3", type: "xlr" as CableType };
        const yamahaIn4 = { id: uid(), name: "4", type: "xlr" as CableType };
        const yamahaOut1 = { id: uid(), name: "Stéréo OUT 1", type: "jack" as CableType };
        const yamahaOut2 = { id: uid(), name: "Stéréo OUT 2", type: "jack" as CableType };
        const yamahaOutJack = { id: uid(), name: "Audio Mini-jack", type: "jack" as CableType };

        nodes.push({
          id: yamahaId,
          sourceId: null,
          title: "Yamaha MG12XU",
          subtitle: "Console de mixage audio",
          deviceType: "audio",
          color: "#3b82f6",
          x: 480,
          y: 680,
          width: 250,
          height: 340,
          portsIn: [yamahaIn1, yamahaIn2, yamahaIn3, yamahaIn4],
          portsOut: [yamahaOut1, yamahaOut2, yamahaOutJack],
          needsPower: true,
          warningBadge: "/!\\ Couper l'alim phantom",
        });

        // Câble audio Yamaha OUT 1 -> ATEM Audio 1
        links.push({
          id: uid(),
          fromNodeId: yamahaId,
          fromPortId: yamahaOut1.id,
          toNodeId: atemId,
          toPortId: atemInAudio1.id,
          cableType: "jack",
          label: "Audio Mix",
        });

        // 3. Caméras du plan (ou caméras par défaut du synoptique de référence)
        const planCameras = relevantItems.filter((i) => i.category === "camera");
        const camSources = planCameras.length > 0
          ? planCameras.map((c, idx) => ({
            id: uid(),
            sourceId: c.id,
            title: c.name || `Caméra ${idx + 1}`,
            subtitle: c.label || "Sortie HDMI / SDI",
            needsPower: true,
          }))
          : [
            { id: uid(), sourceId: null, title: "ZOOM Q8 mini HDMI Grand Angle", subtitle: "Grand Angle", needsPower: true },
            { id: uid(), sourceId: null, title: "Receiver XA45 HF Gradin", subtitle: "Liaison HF", needsPower: true },
            { id: uid(), sourceId: null, title: "XA45 HDMI régie large", subtitle: "Régie large", needsPower: true },
          ];

        camSources.forEach((cam, i) => {
          const outPort = { id: uid(), name: "HDMI", type: "hdmi" as CableType };
          nodes.push({
            id: cam.id,
            sourceId: cam.sourceId,
            title: cam.title,
            subtitle: cam.subtitle,
            deviceType: "camera",
            color: "#06b6d4",
            x: 160,
            y: 180 + i * 115,
            portsIn: [],
            portsOut: [outPort],
            needsPower: cam.needsPower,
          });

          // Brancher sur l'ATEM
          if (i < atemInHdmi.length) {
            links.push({
              id: uid(),
              fromNodeId: cam.id,
              fromPortId: outPort.id,
              toNodeId: atemId,
              toPortId: atemInHdmi[i].id,
              cableType: "hdmi",
            });
          }
        });

        // 4. Microphones (depuis plan ou micros par défaut)
        const planAudios = relevantItems.filter((i) => i.category === "audio");
        const micSources = planAudios.length > 0
          ? planAudios.map((a, idx) => ({
            id: uid(),
            sourceId: a.id,
            title: a.name || `Micro ${idx + 1}`,
            subtitle: a.label || "XLR",
          }))
          : [
            { id: uid(), sourceId: null, title: "Micro serre-tête", subtitle: "Speaker (Tente 16)" },
            { id: uid(), sourceId: null, title: "Micro Reporter", subtitle: "Speaker backup (Tente 16)" },
            { id: uid(), sourceId: null, title: "Micro Reporter", subtitle: "Interview entre 2 matchs" },
            { id: uid(), sourceId: null, title: "Micro cravate", subtitle: "Interview entre 2 matchs" },
          ];

        const yamahaInputs = [yamahaIn1, yamahaIn2, yamahaIn3, yamahaIn4];
        micSources.slice(0, 4).forEach((mic, i) => {
          const outPort = { id: uid(), name: "XLR", type: "xlr" as CableType };
          nodes.push({
            id: mic.id,
            sourceId: mic.sourceId,
            title: mic.title,
            subtitle: mic.subtitle,
            deviceType: "mic",
            color: "#3b82f6",
            x: 160,
            y: 670 + i * 95,
            portsIn: [],
            portsOut: [outPort],
            needsPower: false,
          });

          links.push({
            id: uid(),
            fromNodeId: mic.id,
            fromPortId: outPort.id,
            toNodeId: yamahaId,
            toPortId: yamahaInputs[i].id,
            cableType: "xlr",
          });
        });

        // 5. Appareils avals (Right side)
        // PC diffusion live
        const pcStreamId = uid();
        const pcStreamUsbIn = { id: uid(), name: "USB", type: "usb" as CableType };
        nodes.push({
          id: pcStreamId,
          sourceId: null,
          title: "PC diffusion live",
          subtitle: "Stream OBS / Vmix",
          deviceType: "computer",
          color: "#06b6d4",
          x: 1040,
          y: 120,
          portsIn: [pcStreamUsbIn],
          portsOut: [],
          needsPower: true,
        });
        links.push({
          id: uid(),
          fromNodeId: atemId,
          fromPortId: atemOutPgmUsb1.id,
          toNodeId: pcStreamId,
          toPortId: pcStreamUsbIn.id,
          cableType: "usb",
        });

        // PC ATEM Studio
        const pcAtemId = uid();
        nodes.push({
          id: pcAtemId,
          sourceId: null,
          title: "PC ATEM Studio",
          subtitle: "Contrôle logiciel ATEM",
          deviceType: "computer",
          color: "#64748b",
          x: 1160,
          y: 200,
          portsIn: [],
          portsOut: [],
          needsPower: true,
        });

        // Casque audio régie
        const headphoneAtemId = uid();
        const headphoneIn = { id: uid(), name: "Mini-jack", type: "jack" as CableType };
        nodes.push({
          id: headphoneAtemId,
          sourceId: null,
          title: "Casque audio de MMI",
          subtitle: "Écoute régie ATEM",
          deviceType: "headphone",
          color: "#ec4899",
          x: 940,
          y: 280,
          portsIn: [headphoneIn],
          portsOut: [],
          needsPower: false,
        });
        links.push({
          id: uid(),
          fromNodeId: atemId,
          fromPortId: atemOutJack.id,
          toNodeId: headphoneAtemId,
          toPortId: headphoneIn.id,
          cableType: "jack",
        });

        // HyperDeck Studio HD Mini (Enregistreur)
        const hyperDeckId = uid();
        const hyperDeckSdiIn = { id: uid(), name: "SDI", type: "sdi" as CableType };
        const hyperDeckHdmiOut = { id: uid(), name: "HDMI", type: "hdmi" as CableType };
        nodes.push({
          id: hyperDeckId,
          sourceId: null,
          title: "HyperDeck Studio HD Mini",
          subtitle: "Enregistreur Master",
          deviceType: "recorder",
          color: "#ef4444",
          x: 940,
          y: 400,
          portsIn: [hyperDeckSdiIn],
          portsOut: [hyperDeckHdmiOut],
          needsPower: true,
        });
        links.push({
          id: uid(),
          fromNodeId: atemId,
          fromPortId: atemOutPgm.id,
          toNodeId: hyperDeckId,
          toPortId: hyperDeckSdiIn.id,
          cableType: "sdi",
        });

        // Ecran (ordinateur)
        const screenId = uid();
        const screenHdmiIn = { id: uid(), name: "HDMI", type: "hdmi" as CableType };
        nodes.push({
          id: screenId,
          sourceId: null,
          title: "Ecran (ordinateur)",
          subtitle: "Moniteur Master",
          deviceType: "screen",
          color: "#38bdf8",
          x: 1200,
          y: 380,
          portsIn: [screenHdmiIn],
          portsOut: [],
          needsPower: true,
        });
        links.push({
          id: uid(),
          fromNodeId: hyperDeckId,
          fromPortId: hyperDeckHdmiOut.id,
          toNodeId: screenId,
          toPortId: screenHdmiIn.id,
          cableType: "hdmi",
        });

        // Écran multiview retour malette
        const multiScreenId = uid();
        const multiScreenHdmiIn = { id: uid(), name: "HDMI", type: "hdmi" as CableType };
        nodes.push({
          id: multiScreenId,
          sourceId: null,
          title: "Ecran de retour inclus dans la malette ATEM de GACO",
          subtitle: "MultiView 8 vues",
          deviceType: "screen",
          color: "#f59e0b",
          x: 940,
          y: 530,
          portsIn: [multiScreenHdmiIn],
          portsOut: [],
          needsPower: false,
        });
        links.push({
          id: uid(),
          fromNodeId: atemId,
          fromPortId: atemOutMulti.id,
          toNodeId: multiScreenId,
          toPortId: multiScreenHdmiIn.id,
          cableType: "hdmi",
        });

        // Boîtier d'injection (DI)
        const diId = uid();
        const diJackIn = { id: uid(), name: "Jack et mini-Jack", type: "jack" as CableType };
        const diXlrOut = { id: uid(), name: "XLR", type: "xlr" as CableType };
        nodes.push({
          id: diId,
          sourceId: null,
          title: "Boîtier d'injection (DI)",
          subtitle: "XLR -> Jack et mini-Jack",
          deviceType: "di",
          color: "#64748b",
          x: 790,
          y: 680,
          portsIn: [diJackIn],
          portsOut: [diXlrOut],
          needsPower: false,
        });
        links.push({
          id: uid(),
          fromNodeId: yamahaId,
          fromPortId: yamahaOut2.id,
          toNodeId: diId,
          toPortId: diJackIn.id,
          cableType: "jack",
        });

        // Casque audio MMI (Console son)
        const headphoneYamahaId = uid();
        const headphoneYamahaIn = { id: uid(), name: "Audio Mini-jack", type: "jack" as CableType };
        nodes.push({
          id: headphoneYamahaId,
          sourceId: null,
          title: "Casque audio de MMI",
          subtitle: "Écoute régie Son",
          deviceType: "headphone",
          color: "#ec4899",
          x: 790,
          y: 840,
          portsIn: [headphoneYamahaIn],
          portsOut: [],
          needsPower: false,
        });
        links.push({
          id: uid(),
          fromNodeId: yamahaId,
          fromPortId: yamahaOutJack.id,
          toNodeId: headphoneYamahaId,
          toPortId: headphoneYamahaIn.id,
          cableType: "jack",
        });

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

      updateSynopticNode: (id, patch) =>
        set({
          synopticNodes: get().synopticNodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
        }),

      moveSynopticNode: (id, x, y) =>
        set({
          synopticNodes: get().synopticNodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
        }),

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

      resetBoard: () =>
        set({
          items: seedItems(),
          selectedId: null,
          camera: { x: 80, y: 40, zoom: 1 },
          title: "Plateau — Interview studio",
          status: "prep",
          viewMode: "plan",
          synopticNodes: [],
          synopticLinks: [],
        }),
    }),
    {
      name: "shotboard-studio",
      version: 4,
      migrate: (persistedState: any, version: number) => {
        if (version < 2 || !persistedState) {
          return {
            ...persistedState,
            ...(Array.isArray(persistedState?.items) ? { items: addMissingControlRoom(persistedState.items) } : {}),
            synopticNodes: [],
            synopticLinks: [],
          };
        }
        if (version < 4 && Array.isArray(persistedState.items)) {
          return { ...persistedState, items: addMissingControlRoom(persistedState.items) };
        }
        return persistedState;
      },
      partialize: (state) => ({
        title: state.title,
        status: state.status,
        items: state.items,
        camera: state.camera,
        viewMode: state.viewMode,
        synopticNodes: state.synopticNodes,
        synopticLinks: state.synopticLinks,
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
