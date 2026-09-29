import { useState, useRef, useCallback, useEffect, memo, useMemo, type ChangeEvent, type PointerEvent as ReactPointerEvent } from "react";
import {
  RefreshCw,
  Plus,
  Trash2,
  Zap,
  Radio,
  Sliders,
  Tv,
  Laptop,
  Disc,
  Headphones,
  Mic,
  Video,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  AlertTriangle,
} from "lucide-react";
import { useStudio } from "../store/studioStore";
import { VisualAsset } from "./VisualAsset";
import { ValidationPanel } from "./ValidationPanel";
import { CABLE_COLORS } from "../lib/constants";
import { validateSynoptic } from "../lib/validation";
import type { CableType, SynopticDeviceType, SynopticNode, SynopticPort } from "../lib/types";


// Removed local CABLE_COLORS constant as it is now imported from ../lib/constants

type DragState = {
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  groupOrigins: Array<{ id: string; x: number; y: number }>;
};

type MarqueeState = {
  pointerId: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  additive: boolean;
};

type LinkingState = {
  fromNodeId: string;
  fromPortId: string;
  cableType: CableType;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
};

export function SynopticBoard() {
  const nodesMap = useStudio((state) => state.synopticNodes);
  const nodes = useMemo(() => Object.values(nodesMap), [nodesMap]);
  const links = useStudio((state) => state.synopticLinks);
  const generateSynoptic = useCallback(useStudio((state) => state.generateSynoptic), []);
  const addSynopticNode = useCallback(useStudio((state) => state.addSynopticNode), []);
  const updateSynopticNode = useCallback(useStudio((state) => state.updateSynopticNode), []);
  const moveSynopticNode = useCallback(useStudio((state) => state.moveSynopticNode), []);
  const moveSynopticNodes = useCallback(useStudio((state) => state.moveSynopticNodes), []);
  const removeSynopticNode = useCallback(useStudio((state) => state.removeSynopticNode), []);
  const toggleSynopticPower = useCallback(useStudio((state) => state.toggleSynopticPower), []);
  const addSynopticLink = useCallback(useStudio((state) => state.addSynopticLink), []);
  const removeSynopticLink = useCallback(useStudio((state) => state.removeSynopticLink), []);
  const setToast = useCallback(useStudio((state) => state.setToast), []);
  const highlightedNodeIds = useStudio((state) => state.highlightedNodeIds);
  const highlightedLinkIds = useStudio((state) => state.highlightedLinkIds);
  const traceSignal = useCallback(useStudio((state) => state.traceSignal), []);
  const clearSignalTrace = useCallback(useStudio((state) => state.clearSignalTrace), []);
  const autoLayoutSynoptic = useCallback(useStudio((state) => state.autoLayoutSynoptic), []);
  const spacePan = useStudio((state) => state.spacePan);
  const setSpacePan = useCallback(useStudio((state) => state.setSpacePan), []);

  const [zoom, setZoom] = useState(0.85);
  const [pan, setPan] = useState({ x: 40, y: 30 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Validation logic
  const validationErrors = useMemo(() => {
    try {
      return validateSynoptic(nodes, links);
    } catch (e) {
      console.error("Validation error:", e);
      return [];
    }
  }, [nodes, links]);
  const getNodeError = useCallback((nodeId: string) => {
    return validationErrors.find((e) => e.nodeId === nodeId);
  }, [validationErrors]);

  const [linking, setLinking] = useState<LinkingState | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [marquee, setMarquee] = useState<{ startX: number; startY: number; x: number; y: number } | null>(null);
  const [showValidation, setShowValidation] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const marqueeRef = useRef<MarqueeState | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
      if (event.code === "Space" && !event.repeat && !typing) {
        event.preventDefault();
        setSpacePan(true);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") setSpacePan(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [setSpacePan]);

  // Déplacement d'un bloc équipement
  const onNodePointerDown = (node: SynopticNode, event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest("input,button,.port-handle")) return;
    event.preventDefault();
    event.stopPropagation();
    const additive = event.shiftKey || event.ctrlKey || event.metaKey;
    setSelectedNodeIds((current) => additive
      ? current.includes(node.id) ? current.filter((id) => id !== node.id) : [...current, node.id]
      : [node.id]);
    event.currentTarget.setPointerCapture(event.pointerId);
    const groupOrigins = selectedNodeIds.includes(node.id)
      ? nodes.filter((candidate) => selectedNodeIds.includes(candidate.id)).map(({ id, x, y }) => ({ id, x, y }))
      : [{ id: node.id, x: node.x, y: node.y }];
    dragRef.current = {
      id: node.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: node.x,
      originY: node.y,
      groupOrigins,
    };
  };

  const onNodePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = (event.clientX - drag.startX) / zoom;
    const dy = (event.clientY - drag.startY) / zoom;
    if (drag.groupOrigins.length > 1) {
      moveSynopticNodes(drag.groupOrigins.map((origin) => ({ id: origin.id, x: Math.round(origin.x + dx), y: Math.round(origin.y + dy) })));
    } else {
      moveSynopticNode(drag.id, Math.round(drag.originX + dx), Math.round(drag.originY + dy));
    }
  };

  const finishNodeDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
  };

  // Panning du canevas
  const onCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest(".synoptic-card, .synoptic-ui") || e.button === 2) return;
    if (e.button === 1 || (spacePan && e.button === 0)) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }
    if (e.button !== 0) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;
    const additive = e.shiftKey || e.ctrlKey || e.metaKey;
    marqueeRef.current = { pointerId: e.pointerId, startX, startY, currentX: startX, currentY: startY, additive };
    setMarquee({ startX, startY, x: startX, y: startY });
    if (!additive) setSelectedNodeIds([]);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const activeMarquee = marqueeRef.current;
    if (activeMarquee && activeMarquee.pointerId === e.pointerId) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        activeMarquee.currentX = e.clientX - rect.left;
        activeMarquee.currentY = e.clientY - rect.top;
        setMarquee({ startX: activeMarquee.startX, startY: activeMarquee.startY, x: activeMarquee.currentX, y: activeMarquee.currentY });
      }
      return;
    }
    if (isPanning) {
      setPan({
        x: panStartRef.current.panX + (e.clientX - panStartRef.current.x),
        y: panStartRef.current.panY + (e.clientY - panStartRef.current.y),
      });
      return;
    }

    if (linking) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setLinking((prev) =>
          prev
            ? {
              ...prev,
              currentX: (e.clientX - rect.left - pan.x) / zoom,
              currentY: (e.clientY - rect.top - pan.y) / zoom,
            }
            : null
        );
      }
    }
  };

  const onCanvasPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const activeMarquee = marqueeRef.current;
    if (activeMarquee && activeMarquee.pointerId === e.pointerId) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const endX = e.clientX - rect.left;
        const endY = e.clientY - rect.top;
        const left = Math.min(activeMarquee.startX, endX);
        const right = Math.max(activeMarquee.startX, endX);
        const top = Math.min(activeMarquee.startY, endY);
        const bottom = Math.max(activeMarquee.startY, endY);
        const hits = nodes.filter((node) => {
          const width = node.width || (node.deviceType === "mixer" ? 280 : node.deviceType === "audio" ? 250 : 200);
          const height = node.height || 100;
          const nodeLeft = pan.x + node.x * zoom;
          const nodeTop = pan.y + node.y * zoom;
          return nodeLeft < right && nodeLeft + width * zoom > left && nodeTop < bottom && nodeTop + height * zoom > top;
        }).map((node) => node.id);
        const isClick = right - left < 4 && bottom - top < 4;
        if (!isClick || !activeMarquee.additive) {
          setSelectedNodeIds((current) => activeMarquee.additive ? [...new Set([...current, ...hits])] : hits);
        }
      }
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
      marqueeRef.current = null;
      setMarquee(null);
      return;
    }
    if (isPanning) {
      setIsPanning(false);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignored
      }
    }
    if (linking) {
      setLinking(null);
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey || !e.shiftKey) {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldX = (mouseX - pan.x) / zoom;
      const worldY = (mouseY - pan.y) / zoom;

      const zoomFactor = e.deltaY > 0 ? 0.92 : 1.08;
      const nextZoom = Math.min(1.8, Math.max(0.4, zoom * zoomFactor));

      setZoom(nextZoom);
      setPan({
        x: mouseX - worldX * nextZoom,
        y: mouseY - worldY * nextZoom,
      });
    }
  };

  // Démarrer une liaison depuis un port OUT
  const startLinking = (node: SynopticNode, port: SynopticPort, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const startX = (e.clientX - rect.left - pan.x) / zoom;
    const startY = (e.clientY - rect.top - pan.y) / zoom;

    setLinking({
      fromNodeId: node.id,
      fromPortId: port.id,
      cableType: port.type,
      startX,
      startY,
      currentX: startX,
      currentY: startY,
    });
  };

  // Terminer la liaison sur un port IN
  const completeLinking = (node: SynopticNode, port: SynopticPort, e: React.PointerEvent) => {
    e.stopPropagation();
    if (!linking) return;

    if (linking.fromNodeId === node.id) {
      setToast("Impossible de relier un appareil à lui-même");
      setLinking(null);
      return;
    }

    addSynopticLink(linking.fromNodeId, node.id, linking.fromPortId, port.id, linking.cableType);
    setToast(`Liaison ${linking.cableType.toUpperCase()} créée ✓`);
    setLinking(null);
  };

  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  // Calcul des coordonnées d'un port
  const getPortCoordinates = useCallback(
    (nodeId: string, portId?: string, isOut?: boolean) => {
      const node = nodeMap.get(nodeId);
      if (!node) return null;

      const width = node.width || (node.deviceType === "mixer" ? 280 : node.deviceType === "audio" ? 250 : 200);

      if (!portId) {
        return {
          x: isOut ? node.x + width : node.x,
          y: node.y + (node.height ? node.height / 2 : 50),
        };
      }

      const ports = isOut ? (node.portsOut ?? []) : (node.portsIn ?? []);
      const index = ports.findIndex((p) => p.id === portId);
      const portElement = typeof document !== "undefined"
        ? document.querySelector<HTMLElement>(`[data-synoptic-node="${nodeId}"][data-synoptic-port="${portId}"]`)
        : null;
      const boardRect = containerRef.current?.getBoundingClientRect();
      if (portElement && boardRect) {
        const portRect = portElement.getBoundingClientRect();
        return {
          x: isOut ? node.x + width : node.x,
          y: (portRect.top + portRect.height / 2 - boardRect.top - pan.y) / zoom,
        };
      }
      // Cartouche 52 px + contenu padding 8 px + en-tête 16 px.
      // Chaque ligne de port mesure 24 px : le point tombe au centre du texte.
      const portOffset = index >= 0 ? 76 + index * 24 : 60;

      return {
        x: isOut ? node.x + width : node.x,
        y: node.y + portOffset,
      };
    },
    [nodeMap, pan, zoom]
  );

  const addPresetDevice = (deviceType: SynopticDeviceType, title: string, subtitle: string, inputCount: number, outputCount: number, needsPower: boolean) => {
    const stamp = Date.now();
    addSynopticNode({
      deviceType,
      title,
      subtitle,
      needsPower,
      portsIn: Array.from({ length: inputCount }, (_, index) => ({ id: `${stamp}-in-${index}`, name: `IN ${index + 1}`, type: (deviceType === "mic" ? "xlr" : "hdmi") as CableType })),
      portsOut: Array.from({ length: outputCount }, (_, index) => ({ id: `${stamp}-out-${index}`, name: `OUT ${index + 1}`, type: (deviceType === "mic" ? "xlr" : "hdmi") as CableType })),
    });
    setShowAddMenu(false);
  };

  // Dépôt d'un élément depuis la sidebar
  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const catalogId = event.dataTransfer.getData("application/shotboard");
      if (!catalogId) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const worldX = (event.clientX - rect.left - pan.x) / zoom;
      const worldY = (event.clientY - rect.top - pan.y) / zoom;

      // On utilise un template générique ou on cherche un template spécifique si possible
      // Pour l'instant, on ajoute un nœud générique basé sur le catalogId
      addSynopticNode({
        title: "Nouvel appareil",
        subtitle: "Équipement ajouté",
        x: worldX,
        y: worldY,
        // On pourrait ici mapper catalogId -> templateId
      });
      setToast("Appareil ajouté au synoptique ✓");
    },
    [pan, zoom, addSynopticNode, setToast]
  );


  return (
    <section className="relative min-w-0 flex-1 overflow-hidden select-none bg-[#f8fafc] text-slate-800">
      {/* Barre d'outils supérieure */}
      <div className="synoptic-ui absolute left-4 top-3 z-30 flex items-center gap-3">
        <div className="rounded-xl border border-slate-300 bg-white/95 px-3 py-1.5 shadow-md backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-violet-600 animate-pulse" />
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-800">Mode Synoptique</p>
          </div>
          <p className="text-[10px] text-slate-500">Câblage technique (hors mobilier et personnes)</p>
        </div>

        <button
          type="button"
          onClick={generateSynoptic}
          className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 active:scale-95"
          title="Regénérer le synoptique à partir des caméras et équipements du plan"
        >
          <RefreshCw size={13} className="text-violet-600" />
          Regénérer depuis le plan
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-700 active:scale-95"
          >
            <Plus size={14} />
            Ajouter un appareil
          </button>

          {showAddMenu && (
            <div className="absolute left-0 top-full mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl z-40">
              <p className="px-2 py-1 text-[10px] font-bold uppercase text-slate-400">Équipements types</p>
              <button
                type="button"
                onClick={() => addPresetDevice("camera", "Caméra XA45", "Sortie HDMI / SDI", 0, 1, true)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                <Video size={14} className="text-cyan-600" /> Caméra vidéo
              </button>
              <button
                type="button"
                onClick={() => addPresetDevice("mic", "Micro HF / Cravate", "Émetteur sans fil", 0, 1, false)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                <Mic size={14} className="text-blue-600" /> Microphone
              </button>
              <button
                type="button"
                onClick={() => addPresetDevice("screen", "Moniteur vidéo", "Écran de contrôle", 1, 0, true)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                <Tv size={14} className="text-amber-600" /> Écran / Moniteur
              </button>
              <button
                type="button"
                onClick={() => addPresetDevice("computer", "PC / Laptop", "Diffusion / Encodage", 1, 1, true)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                <Laptop size={14} className="text-emerald-600" /> Ordinateur portable
              </button>
              <button
                type="button"
                onClick={() => addPresetDevice("converter", "Convertisseur SDI/HDMI", "Boîtier micro convert", 1, 1, true)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                <Layers size={14} className="text-purple-600" /> Convertisseur vidéo
              </button>
              <button
                type="button"
                onClick={() => addPresetDevice("recorder", "HyperDeck Enregistreur", "Master recording", 1, 1, true)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                <Disc size={14} className="text-rose-600" /> Enregistreur Master
              </button>
            </div>
          )}
        </div>
        <button type="button" onClick={() => setShowValidation((open) => !open)} className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50" title="Afficher les erreurs techniques">
          <AlertTriangle size={13} className="text-amber-600" /> Validation
        </button>
        <button type="button" onClick={autoLayoutSynoptic} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50" title="Aligner automatiquement les équipements">Auto-layout</button>
        {highlightedNodeIds.length > 0 && <button type="button" onClick={clearSignalTrace} className="rounded-xl border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700 shadow-sm">Effacer le flux</button>}
      </div>
      {showValidation && <ValidationPanel onClose={() => setShowValidation(false)} />}

      {/* Légende en haut à droite (fidele à l'image fournie) */}
      <div className="synoptic-ui absolute right-4 top-3 z-30 rounded-2xl border border-slate-300 bg-white/95 p-3 shadow-lg backdrop-blur">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Légende Câbles & Signaux</p>
        <div className="space-y-1.5 text-[11px] font-medium text-slate-700">
          <div className="flex items-center justify-between gap-6">
            <span>Jack / Mini-jack</span>
            <span className="h-3 w-6 rounded bg-[#ec4899] shadow-sm" />
          </div>
          <div className="flex items-center justify-between gap-6">
            <span>USB</span>
            <span className="h-3 w-6 rounded bg-[#06b6d4] shadow-sm" />
          </div>
          <div className="flex items-center justify-between gap-6">
            <span>HDMI</span>
            <span className="h-3 w-6 rounded bg-[#f97316] shadow-sm" />
          </div>
          <div className="flex items-center justify-between gap-6">
            <span>SDI</span>
            <span className="h-3 w-6 rounded bg-[#ef4444] shadow-sm" />
          </div>
          <div className="flex items-center justify-between gap-6">
            <span>XLR</span>
            <span className="h-3 w-6 rounded bg-[#3b82f6] shadow-sm" />
          </div>
          <div className="mt-2 flex items-center justify-between gap-6 pt-1.5 border-t border-slate-200 text-red-600 font-semibold text-[10px]">
            <span>Besoin d'une alim</span>
            <div className="flex items-center justify-center h-4 w-4 rounded-full bg-red-100 text-red-600">
              <Zap size={11} fill="currentColor" />
            </div>
          </div>
        </div>
      </div>

      {/* Contrôles de Zoom */}
      <div className="synoptic-ui absolute bottom-4 right-4 z-30 flex items-center gap-1 rounded-xl border border-slate-300 bg-white p-1 shadow-md">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))}
          className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
          title="Zoom arrière"
        >
          <ZoomOut size={16} />
        </button>
        <span className="w-12 text-center text-xs font-mono font-medium text-slate-600">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(1.8, z + 0.1))}
          className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
          title="Zoom avant"
        >
          <ZoomIn size={16} />
        </button>
        <button
          type="button"
          onClick={() => {
            setZoom(0.85);
            setPan({ x: 40, y: 30 });
          }}
          className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
          title="Recentrer"
        >
          <Maximize2 size={16} />
        </button>
      </div>

      {/* Zone du tableau de dessin exportable */}
      <div
        id="board-export"
        ref={containerRef}
        onPointerDown={onCanvasPointerDown}
        onPointerMove={onCanvasPointerMove}
        onPointerUp={onCanvasPointerUp}
        onPointerCancel={onCanvasPointerUp}
        onLostPointerCapture={onCanvasPointerUp}
        onWheel={onWheel}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className={`absolute inset-0 overflow-hidden ${spacePan || isPanning ? "cursor-grab active:cursor-grabbing" : marquee ? "cursor-crosshair" : "cursor-default"}`}
        style={{
          backgroundColor: "#ffffff",
          backgroundImage:
            "radial-gradient(#cbd5e1 1px, transparent 1px), radial-gradient(#f1f5f9 1px, #ffffff 1px)",
          backgroundSize: "24px 24px",
          backgroundPosition: "0 0, 12px 12px",
        }}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
            width: "3200px",
            height: "2400px",
            position: "relative",
          }}
        >
          {/* Lignes de câblage SVG */}
          <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
            <defs>
              <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.15" />
              </filter>
            </defs>

            {links.map((link) => {
              const start = getPortCoordinates(link.fromNodeId, link.fromPortId, true);
              const end = getPortCoordinates(link.toNodeId, link.toPortId, false);
              if (!start || !end) return null;

              const cableCfg = CABLE_COLORS[link.cableType] || CABLE_COLORS.hdmi;
              const isSelected = selectedLinkId === link.id;

              // Trajectoire Bézier fluide horizontale
              const dx = Math.abs(end.x - start.x) * 0.5;
              const pathD = `M ${start.x} ${start.y} C ${start.x + Math.max(40, dx)} ${start.y}, ${end.x - Math.max(40, dx)
                } ${end.y}, ${end.x} ${end.y}`;

              return (
                <g key={link.id} className="pointer-events-auto cursor-pointer" onClick={() => setSelectedLinkId(link.id)} opacity={highlightedLinkIds.length === 0 || highlightedLinkIds.includes(link.id) ? 1 : 0.18}>
                  {/* Contour de sélection */}
                  {isSelected && (
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#8b5cf6"
                      strokeWidth="8"
                      strokeOpacity="0.4"
                      strokeLinecap="round"
                    />
                  )}
                  {/* Câble principal */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={cableCfg.color}
                    strokeWidth={isSelected ? "3.5" : "2.5"}
                    strokeLinecap="round"
                    filter="url(#shadow)"
                  />
                  {/* Point de connexion de départ */}
                  <circle cx={start.x} cy={start.y} r="4" fill={cableCfg.color} />
                  {/* Point de connexion d'arrivée */}
                  <circle cx={end.x} cy={end.y} r="4" fill={cableCfg.color} />
                </g>
              );
            })}

            {/* Câble en cours de tracé */}
            {linking && (
              <path
                d={`M ${linking.startX} ${linking.startY} C ${linking.startX + 60} ${linking.startY}, ${linking.currentX - 60
                  } ${linking.currentY}, ${linking.currentX} ${linking.currentY}`}
                fill="none"
                stroke={CABLE_COLORS[linking.cableType]?.color || "#f97316"}
                strokeWidth="2.5"
                strokeDasharray="6 4"
                strokeLinecap="round"
              />
            )}
          </svg>

          {/* Bouton de suppression de câble sélectionné */}
          {selectedLinkId && (
            <div className="absolute z-40">
              {(() => {
                const link = links.find((l) => l.id === selectedLinkId);
                if (!link) return null;
                const start = getPortCoordinates(link.fromNodeId, link.fromPortId, true);
                const end = getPortCoordinates(link.toNodeId, link.toPortId, false);
                if (!start || !end) return null;
                const midX = (start.x + end.x) / 2;
                const midY = (start.y + end.y) / 2;
                return (
                  <button
                    type="button"
                    style={{ left: midX - 12, top: midY - 12 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSynopticLink(link.id);
                      setSelectedLinkId(null);
                      setToast("Câble supprimé");
                    }}
                    className="absolute flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition hover:scale-110"
                    title="Supprimer ce câble"
                  >
                    <X size={12} />
                  </button>
                );
              })()}
            </div>
          )}

          {/* Rendu des boîtiers d'équipements */}
          {nodes.map((node) => (
            <DeviceNodeCard
              key={node.id}
              node={node}
              selected={selectedNodeIds.includes(node.id)}
              onPointerDown={onNodePointerDown}
              onPointerMove={onNodePointerMove}
              onPointerUp={finishNodeDrag}
              onUpdate={updateSynopticNode}
              onRemove={removeSynopticNode}
              onTogglePower={toggleSynopticPower}
              onStartLinking={startLinking}
              onCompleteLinking={completeLinking}
              onTrace={() => traceSignal(node.id)}
              error={getNodeError(node.id)}
            />
          ))}

        </div>
        {marquee && (
          <div
            className="pointer-events-none absolute z-50 border-2 border-violet-500 bg-violet-300/20"
            style={{
              left: Math.min(marquee.startX, marquee.x),
              top: Math.min(marquee.startY, marquee.y),
              width: Math.abs(marquee.x - marquee.startX),
              height: Math.abs(marquee.y - marquee.startY),
            }}
          />
        )}
      </div>
    </section>
  );
}

export const DeviceNodeCard = memo(function DeviceNodeCard({
  node,
  selected,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onUpdate,
  onRemove,
  onTogglePower,
  onStartLinking,
  onCompleteLinking,
  onTrace,
  error,
}: {
  node: SynopticNode;
  selected: boolean;
  onPointerDown: (node: SynopticNode, event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onUpdate: (id: string, patch: Partial<SynopticNode>) => void;
  onRemove: (id: string) => void;
  onTogglePower: (id: string) => void;
  onStartLinking: (node: SynopticNode, port: SynopticPort, e: ReactPointerEvent) => void;
  onCompleteLinking: (node: SynopticNode, port: SynopticPort, e: ReactPointerEvent) => void;
  onTrace: () => void;
  error?: { message: string; severity: "error" | "warning" };
}) {
  const isMixer = node.deviceType === "mixer";
  const isAudioMixer = node.deviceType === "audio";
  const width = node.width || (isMixer ? 280 : isAudioMixer ? 250 : 200);
  const portsIn = node.portsIn ?? [];
  const portsOut = node.portsOut ?? [];

  const onTitleChange = (e: ChangeEvent<HTMLInputElement>) => onUpdate(node.id, { title: e.target.value });
  const onSubtitleChange = (e: ChangeEvent<HTMLInputElement>) => onUpdate(node.id, { subtitle: e.target.value });

  return (
    <div
      role="group"
      tabIndex={0}
      onPointerDown={(event) => onPointerDown(node, event)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={`synoptic-card group absolute flex cursor-move flex-col rounded-lg border-2 bg-white text-slate-800 shadow-md transition-shadow hover:shadow-xl ${selected ? "border-violet-600 ring-4 ring-violet-300/40" : "border-slate-700"}`}
      style={{
        left: node.x,
        top: node.y,
        width: `${width}px`,
        minHeight: node.height ? `${node.height}px` : "100px",
      }}
    >
      {/* Indicateur de besoin d'alimentation (Prise rouge) */}
      {node.needsPower && (
        <div
          onClick={() => onTogglePower(node.id)}
          className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[9px] font-bold text-white shadow-md cursor-pointer hover:bg-red-700"
          title="Nécessite une alimentation secteur (cliquez pour basculer)"
        >
          <Zap size={10} fill="currentColor" />
          <span>Alim</span>
        </div>
      )}

      {/* Cartouche supérieur : Nom & Sous-titre */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-2.5 py-1.5 rounded-t-md">
        <div className="min-w-0 flex-1">
          <input
            value={node.title ?? ""}
            onChange={onTitleChange}
            className="w-full truncate bg-transparent text-[11px] font-bold text-slate-900 outline-none hover:bg-white focus:bg-white focus:ring-1 focus:ring-violet-500 rounded px-0.5"
            placeholder="Nom de l'appareil"
          />
          {node.subtitle !== undefined && (
            <input
              value={node.subtitle}
              onChange={onSubtitleChange}
              className="w-full truncate bg-transparent text-[9.5px] font-medium text-slate-500 outline-none hover:bg-white focus:bg-white focus:ring-1 focus:ring-violet-500 rounded px-0.5"
              placeholder="Détail / Référence"
            />
          )}
        </div>

        {/* Bouton supprimer */}
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); onTrace(); }}
          className="ml-1 opacity-0 group-hover:opacity-100 p-1 text-cyan-600 hover:text-cyan-800 transition"
          title="Tracer le flux du signal"
        >
          <Zap size={12} />
        </button>
        <button
          type="button"
          onClick={() => onRemove(node.id)}
          className="ml-1 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 transition"
          title="Supprimer cet appareil"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Colonnes IN / Centre (Visuel) / OUT */}
      <div className="relative flex flex-1 items-stretch justify-between p-2">
        {/* Colonne IN (Gauche) */}
        <div className="flex flex-col text-[10px]">
          {portsIn.length > 0 && (
            <span className="flex h-4 items-center text-[8px] font-bold uppercase tracking-wider text-slate-400">IN</span>
          )}
          {portsIn.map((port) => {
            const cableCfg = CABLE_COLORS[port.type] || CABLE_COLORS.hdmi;
            return (
              <div
                key={port.id}
                data-synoptic-node={node.id}
                data-synoptic-port={port.id}
                onPointerUp={(e) => onCompleteLinking(node, port, e)}
                className="port-handle flex h-6 items-center gap-1.5 cursor-pointer rounded px-1 hover:bg-slate-100 transition"
                title={`Entrée ${port.name} (${cableCfg.label}) - Déposer un câble ici`}
              >
                <div
                  className="h-3 w-3 rounded-full border border-slate-600 flex items-center justify-center bg-white shadow-xs"
                  style={{ borderColor: cableCfg.color }}
                >
                  <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cableCfg.color }} />
                </div>
                <span className="whitespace-nowrap font-semibold text-slate-700">{port.name}</span>
              </div>
            );
          })}
        </div>

        {/* Visuel central de l'équipement */}
        <div className="flex flex-1 flex-col items-center justify-center p-2 text-slate-400">
          <VisualAsset
            visualKey={node.visualKey ?? node.deviceType ?? "generic"}
            image={node.image}
            alt={node.title}
            fallback={<DeviceIllustration deviceType={node.deviceType ?? "generic"} />}
          />
          {node.warningBadge && (
            <div className="mt-2 flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-[8.5px] font-bold text-red-700">
              <AlertTriangle size={10} />
              <span>{node.warningBadge}</span>
            </div>
          )}
          {error && (
            <div className={`mt-2 flex items-center gap-1 rounded px-1.5 py-0.5 text-[8.5px] font-bold ${error.severity === "error" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
              <AlertTriangle size={10} />
              <span className="truncate">{error.message}</span>
            </div>
          )}
        </div>

        {/* Colonne OUT (Droite) */}
        <div className="flex flex-col items-end text-[10px]">
          {portsOut.length > 0 && (
            <span className="flex h-4 items-center text-[8px] font-bold uppercase tracking-wider text-slate-400">OUT</span>
          )}
          {portsOut.map((port) => {
            const cableCfg = CABLE_COLORS[port.type] || CABLE_COLORS.hdmi;
            return (
              <div
                key={port.id}
                data-synoptic-node={node.id}
                data-synoptic-port={port.id}
                onPointerDown={(e) => onStartLinking(node, port, e)}
                className="port-handle flex h-6 items-center gap-1.5 cursor-pointer rounded px-1 hover:bg-slate-100 transition"
                title={`Sortie ${port.name} (${cableCfg.label}) - Glisser pour relier`}
              >
                <span className="whitespace-nowrap font-semibold text-slate-700">{port.name}</span>
                <div
                  className="h-3 w-3 rounded-full border border-slate-600 flex items-center justify-center bg-white shadow-xs"
                  style={{ borderColor: cableCfg.color }}
                >
                  <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cableCfg.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
)

function DeviceIllustration({ deviceType }: { deviceType: SynopticDeviceType }) {
  switch (deviceType) {
    case "mixer":
      return (
        <div className="flex flex-col items-center gap-1">
          <div className="flex h-16 w-28 items-center justify-center rounded border border-slate-400 bg-slate-800 p-1 text-slate-300 shadow-inner">
            <div className="grid grid-cols-4 gap-1 w-full">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={`h-2.5 rounded-xs ${i === 0 ? "bg-red-500" : "bg-slate-600"}`} />
              ))}
            </div>
          </div>
          <span className="text-[9px] font-bold text-slate-500">ATEM Mini</span>
        </div>
      );
    case "audio":
      return (
        <div className="flex flex-col items-center gap-1">
          <div className="flex h-20 w-24 flex-col justify-between rounded border border-slate-400 bg-blue-950 p-1 text-blue-200 shadow-inner">
            <div className="flex justify-around">
              <span className="h-2 w-2 rounded-full bg-blue-400" />
              <span className="h-2 w-2 rounded-full bg-blue-400" />
              <span className="h-2 w-2 rounded-full bg-blue-400" />
            </div>
            <div className="flex justify-around">
              <div className="h-8 w-1.5 rounded-full bg-slate-600 flex items-end">
                <div className="h-3 w-full bg-red-400" />
              </div>
              <div className="h-8 w-1.5 rounded-full bg-slate-600 flex items-end">
                <div className="h-4 w-full bg-white" />
              </div>
              <div className="h-8 w-1.5 rounded-full bg-slate-600 flex items-end">
                <div className="h-5 w-full bg-white" />
              </div>
            </div>
          </div>
          <span className="text-[9px] font-bold text-slate-500">Mixer Audio</span>
        </div>
      );
    case "camera":
      return <Video size={28} className="text-cyan-600" />;
    case "mic":
      return <Mic size={24} className="text-blue-600" />;
    case "screen":
      return <Tv size={28} className="text-amber-600" />;
    case "computer":
      return <Laptop size={28} className="text-emerald-600" />;
    case "recorder":
      return <Disc size={28} className="text-rose-600" />;
    case "headphone":
      return <Headphones size={26} className="text-pink-600" />;
    case "di":
      return (
        <div className="flex h-8 w-12 items-center justify-center rounded border border-slate-500 bg-slate-700 text-[8px] font-bold text-white shadow-xs">
          DI BOX
        </div>
      );
    case "converter":
      return <Layers size={24} className="text-purple-600" />;
    default:
      return <Radio size={24} className="text-slate-400" />;
  }
}
