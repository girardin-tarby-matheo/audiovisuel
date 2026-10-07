import { useState, useRef, useCallback, useEffect, useLayoutEffect, memo, useMemo, type ChangeEvent, type PointerEvent as ReactPointerEvent } from "react";
import {
  RefreshCw,
  Plus,
  Trash2,
  Zap,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  AlertTriangle,
  Search,
  Network,
} from "lucide-react";
import { useStudio } from "../store/studioStore";
import { VisualAsset } from "./VisualAsset";
import { ItemGlyph } from "./ItemGlyph";
import { DeviceIllustration } from "./DeviceIllustration";
import { CATEGORIES } from "../lib/catalog";
import { ValidationPanel } from "./ValidationPanel";
import { CABLE_COLORS } from "../lib/constants";
import { validateSynoptic } from "../lib/validation";
import { synopticNodeWidth } from "../lib/synopticLayout";
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

const CABLE_TYPES: CableType[] = ["hdmi", "sdi", "xlr", "jack", "usb"];

export function SynopticBoard() {
  const nodesMap = useStudio((state) => state.synopticNodes);
  const catalog = useStudio((state) => state.catalog);
  const boardItems = useStudio((state) => state.items);
  const nodes = useMemo(() => Object.values(nodesMap).map((node) => {
    const sourceItem = boardItems.find((item) => item.id === node.sourceId);
    const catalogItem = catalog.find((item) => item.id === node.visualKey)
      ?? (sourceItem ? catalog.find((item) => item.id === sourceItem.catalogId) : undefined);
    if (!catalogItem) return node;
    return {
      ...node,
      image: node.image || sourceItem?.image || catalogItem.image,
      fit: node.fit || sourceItem?.fit || catalogItem.fit,
      background: node.background || sourceItem?.background || catalogItem.background,
      color: node.color || catalogItem.color,
    };
  }), [boardItems, catalog, nodesMap]);
  const links = useStudio((state) => state.synopticLinks);
  const generateSynoptic = useCallback(useStudio((state) => state.generateSynoptic), []);
  const addSynopticNode = useCallback(useStudio((state) => state.addSynopticNode), []);
  const addSynopticNodeFromCatalog = useCallback(useStudio((state) => state.addSynopticNodeFromCatalog), []);
  const updateSynopticNode = useCallback(useStudio((state) => state.updateSynopticNode), []);
  const moveSynopticNode = useCallback(useStudio((state) => state.moveSynopticNode), []);
  const moveSynopticNodes = useCallback(useStudio((state) => state.moveSynopticNodes), []);
  const removeSynopticNode = useCallback(useStudio((state) => state.removeSynopticNode), []);
  const toggleSynopticPower = useCallback(useStudio((state) => state.toggleSynopticPower), []);
  const addSynopticLink = useCallback(useStudio((state) => state.addSynopticLink), []);
  const removeSynopticLink = useCallback(useStudio((state) => state.removeSynopticLink), []);
  const updateSynopticLink = useCallback(useStudio((state) => state.updateSynopticLink), []);
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
  const [catalogSearch, setCatalogSearch] = useState("");
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [portCoordinates, setPortCoordinates] = useState<Map<string, { x: number; y: number }>>(new Map());
  const repairedCanonicalLinksRef = useRef(false);
  const [marquee, setMarquee] = useState<{ startX: number; startY: number; x: number; y: number } | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  // La légende masque la barre d'outils sur les écrans moyens : ouverte seulement sur grand écran.
  const [showLegend, setShowLegend] = useState(false);
  useEffect(() => {
    setShowLegend(window.matchMedia("(min-width: 1500px)").matches);
  }, []);
  const selectedLink = useMemo(() => links.find((link) => link.id === selectedLinkId) ?? null, [links, selectedLinkId]);
  const isBoardEmpty = nodes.length === 0;
  const selectedNodeCount = selectedNodeIds.length;
  const stats = useMemo(() => ({
    devices: nodes.length,
    links: links.length,
    issues: validationErrors.length,
  }), [nodes.length, links.length, validationErrors.length]);
  const filteredCatalog = useMemo(() => {
    const query = catalogSearch.trim().toLowerCase();
    if (!query) return catalog;
    return catalog.filter((item) =>
      [item.name, item.short, item.description].some((value) => value.toLowerCase().includes(query)),
    );
  }, [catalog, catalogSearch]);

  const removeSelected = useCallback(() => {
    if (selectedLinkId) {
      removeSynopticLink(selectedLinkId);
      setSelectedLinkId(null);
      return;
    }

    if (!selectedNodeIds.length) return;
    selectedNodeIds.forEach((nodeId) => removeSynopticNode(nodeId));
    setSelectedNodeIds([]);
  }, [removeSynopticLink, removeSynopticNode, selectedLinkId, selectedNodeIds]);

  useEffect(() => {
    if (!selectedLinkId) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest(".link-editor-popup, .synoptic-link")) return;
      setSelectedLinkId(null);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [selectedLinkId]);

  useEffect(() => {
    if (repairedCanonicalLinksRef.current) return;
    if (!nodes.length) return;
    const hyperDeck = nodes.find((node) => node.sourceId === null && node.deviceType === "recorder" && node.title.startsWith("HyperDeck"));
    const masterScreen = nodes.find((node) => node.sourceId === null && node.deviceType === "screen" && node.title === "Ecran Moniteur");
    const hasHyperDeckLink = hyperDeck && masterScreen && links.some((link) => link.fromNodeId === hyperDeck.id && link.toNodeId === masterScreen.id);
    if (hyperDeck && masterScreen && !hasHyperDeckLink) {
      const fromPort = hyperDeck.portsOut.find((port) => port.id === "hdmi-out") ?? hyperDeck.portsOut.find((port) => port.type === "hdmi");
      const toPort = masterScreen.portsIn.find((port) => port.id === "hdmi-in") ?? masterScreen.portsIn.find((port) => port.type === "hdmi");
      if (fromPort && toPort) {
        addSynopticLink(hyperDeck.id, masterScreen.id, fromPort.id, toPort.id, "hdmi");
      }
    }
    repairedCanonicalLinksRef.current = true;
  }, [addSynopticLink, links, nodes]);

  useEffect(() => {
    const closeAddMenu = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest(".synoptic-ui")) return;
      setShowAddMenu(false);
    };

    document.addEventListener("pointerdown", closeAddMenu);
    return () => document.removeEventListener("pointerdown", closeAddMenu);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable;
      if (isTyping) return;

      if ((event.key === "Delete" || event.key === "Backspace") && (selectedLinkId || selectedNodeIds.length)) {
        event.preventDefault();
        removeSelected();
      }

      if (event.key === "Escape") {
        setSelectedLinkId(null);
        setSelectedNodeIds([]);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [removeSelected, selectedLinkId, selectedNodeIds]);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const marqueeRef = useRef<MarqueeState | null>(null);

  // Position verticale de chaque port, en coordonnées du tableau. Elle est mesurée par rapport à sa carte
  // et divisée par l'échelle réelle affichée : indépendante du pan, du zoom et des animations en cours.
  // On re-mesure quand une carte change de taille (retour à la ligne, police chargée…).
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  useLayoutEffect(() => {
    const board = containerRef.current;
    if (!board) return;

    const measure = () => {
      const measured = new Map<string, { x: number; y: number }>();
      nodesRef.current.forEach((node) => {
        const width = synopticNodeWidth(node);
        [...(node.portsIn ?? []).map((port) => ({ port, isOut: false })), ...(node.portsOut ?? []).map((port) => ({ port, isOut: true }))].forEach(({ port, isOut }) => {
          const direction = isOut ? "out" : "in";
          const element = board.querySelector<HTMLElement>(`[data-synoptic-node="${node.id}"][data-synoptic-port="${port.id}"][data-synoptic-direction="${direction}"]`);
          const card = element?.closest<HTMLElement>(".synoptic-card");
          if (!element || !card || !card.offsetWidth) return;
          const cardRect = card.getBoundingClientRect();
          const scale = cardRect.width / card.offsetWidth || 1;
          const rect = element.getBoundingClientRect();
          measured.set(`${node.id}:${direction}:${port.id}`, {
            x: isOut ? node.x + width : node.x,
            y: node.y + (rect.top + rect.height / 2 - cardRect.top) / scale,
          });
        });
      });
      setPortCoordinates((previous) => {
        if (previous.size === measured.size && [...measured].every(([key, value]) => previous.get(key)?.y === value.y && previous.get(key)?.x === value.x)) return previous;
        return measured;
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    board.querySelectorAll(".synoptic-card").forEach((card) => observer.observe(card));
    void document.fonts?.ready.then(measure);
    return () => observer.disconnect();
  }, [nodes]);

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
    const nextSelected = additive
      ? selectedNodeIds.includes(node.id)
        ? selectedNodeIds.filter((id) => id !== node.id)
        : [...selectedNodeIds, node.id]
      : [node.id];

    setSelectedNodeIds(nextSelected);
    event.currentTarget.setPointerCapture(event.pointerId);

    const groupOrigins = nextSelected.includes(node.id)
      ? nodes.filter((candidate) => nextSelected.includes(candidate.id)).map(({ id, x, y }) => ({ id, x, y }))
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
    setSelectedLinkId(null);
    setSelectedNodeIds([]);
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
          const width = synopticNodeWidth(node);
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
    (nodeId: string, portId?: string, isOut?: boolean, cableType?: CableType) => {
      const node = nodeMap.get(nodeId);
      if (!node) return null;

      const width = synopticNodeWidth(node);

      if (!portId) {
        return {
          x: isOut ? node.x + width : node.x,
          y: node.y + (node.height ? node.height / 2 : 50),
        };
      }

      const ports = isOut ? (node.portsOut ?? []) : (node.portsIn ?? []);
      const requestedIndex = ports.findIndex((p) => p.id === portId);
      const index = requestedIndex >= 0
        ? requestedIndex
        : ports.findIndex((port) => port.type === cableType);
      const measured = portId ? portCoordinates.get(`${nodeId}:${isOut ? "out" : "in"}:${portId}`) : undefined;
      if (measured) return measured;
      // Cartouche 52 px + padding haut 8 px + titre de colonne 16 px.
      // Chaque ligne de port occupe 32 px : le centre reste stable après un layout.
      const portOffset = index >= 0 ? 76 + index * 32 : 60;

      return {
        x: isOut ? node.x + width : node.x,
        y: node.y + portOffset,
      };
    },
    [nodeMap, portCoordinates]
  );

  const addCatalogDevice = (catalogId: string) => {
    addSynopticNodeFromCatalog(catalogId);
    setShowAddMenu(false);
    setCatalogSearch("");
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

  // Cadre la vue sur les cartes données (sans les déplacer).
  const fitToNodes = (layoutNodes: SynopticNode[]) => {
    if (!layoutNodes.length) return;
    const viewportWidth = containerRef.current?.clientWidth ?? 1200;
    // Marge haute : la barre d'outils flotte au-dessus du tableau.
    const topInset = 84;
    const bottomInset = 24;
    const viewportHeight = (containerRef.current?.clientHeight ?? 800) - topInset - bottomInset;
    const bounds = layoutNodes.reduce(
      (current, node) => {
        const width = synopticNodeWidth(node);
        const height = node.height || 150;
        return {
          minX: Math.min(current.minX, node.x),
          minY: Math.min(current.minY, node.y),
          maxX: Math.max(current.maxX, node.x + width),
          maxY: Math.max(current.maxY, node.y + height),
        };
      },
      { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
    );
    const contentWidth = Math.max(bounds.maxX - bounds.minX, 400);
    const contentHeight = Math.max(bounds.maxY - bounds.minY, 300);
    const nextZoom = Math.min(1.2, Math.max(0.45, Math.min(viewportWidth / contentWidth, viewportHeight / contentHeight) * 0.86));
    setZoom(nextZoom);
    setPan({
      x: (viewportWidth - contentWidth * nextZoom) / 2 - bounds.minX * nextZoom,
      y: topInset + (viewportHeight - contentHeight * nextZoom) / 2 - bounds.minY * nextZoom,
    });
  };

  const autoLayoutAndFit = () => {
    fitToNodes(autoLayoutSynoptic());
  };

  // À l'ouverture et dès que le synoptique passe de vide à rempli (génération, import), on cadre la vue.
  const previousNodeCount = useRef(0);
  useEffect(() => {
    if (previousNodeCount.current === 0 && nodes.length > 0) {
      const frame = window.requestAnimationFrame(() => fitToNodes(nodes));
      previousNodeCount.current = nodes.length;
      return () => window.cancelAnimationFrame(frame);
    }
    previousNodeCount.current = nodes.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length]);


  return (
    <section className="relative min-w-0 flex-1 overflow-hidden select-none bg-canvas text-slate-100">
      {/* Barre d'outils supérieure */}
      <div className="synoptic-ui absolute left-4 top-3 z-30 flex flex-wrap items-center gap-2.5">
        <div className="rounded-xl border border-white/10 bg-ink-850/95 px-3 py-1.5 shadow-md backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-violet-600 animate-pulse" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-100">Mode Synoptique</p>
          </div>
          <p className="text-[10px] text-slate-400">Câblage technique · {stats.devices} appareils · {stats.links} liaisons</p>
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-ink-850/90 px-1.5 py-1 shadow-sm backdrop-blur">
          <span className="rounded-lg bg-violet-400/15 px-2 py-1 text-[10px] font-semibold text-violet-200">{stats.devices}</span>
          <span className="text-[10px] font-medium text-slate-400">Appareils</span>
          <span className="mx-1 h-3 w-px bg-white/10" />
          <span className="rounded-lg bg-cyan-400/15 px-2 py-1 text-[10px] font-semibold text-cyan-200">{stats.links}</span>
          <span className="text-[10px] font-medium text-slate-400">Liens</span>
          {stats.issues > 0 && (
            <>
              <span className="mx-1 h-3 w-px bg-white/10" />
              <span className="rounded-lg bg-amber-400/15 px-2 py-1 text-[10px] font-semibold text-amber-200">{stats.issues}</span>
              <span className="text-[10px] font-medium text-slate-400">Alerte</span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => generateSynoptic()}
          className="btn"
          title="Regénérer le synoptique à partir des caméras et équipements du plan"
        >
          <RefreshCw size={13} className="text-violet-300" />
          Regénérer
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-700 active:scale-95"
          >
            <Plus size={14} />
            Ajouter
          </button>

          {showAddMenu && (
            <div className="absolute left-0 top-full z-40 mt-2 w-80 rounded-2xl border border-white/8 bg-ink-850 p-2 shadow-2xl">
              <div className="relative mb-2">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={catalogSearch}
                  onChange={(event) => setCatalogSearch(event.target.value)}
                  onPointerDown={(event) => event.stopPropagation()}
                  placeholder="Rechercher dans la bibliothèque..."
                  aria-label="Rechercher un équipement à ajouter"
                  className="w-full rounded-lg border border-white/8 bg-white/[0.04] py-2 pl-8 pr-2 text-xs text-slate-200 outline-none focus:border-violet-400"
                />
              </div>
              <div className="max-h-[min(60vh,420px)] space-y-3 overflow-y-auto pr-1">
                {CATEGORIES.map((category) => {
                  const categoryItems = filteredCatalog.filter((item) => item.category === category.id);
                  if (!categoryItems.length) return null;
                  return (
                    <section key={category.id}>
                      <p className="px-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{category.label}</p>
                      <div className="grid grid-cols-2 gap-1">
                        {categoryItems.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => addCatalogDevice(item.id)}
                            className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-medium text-slate-200 hover:bg-violet-400/10 hover:text-violet-200"
                            title={item.description}
                          >
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white/[0.06]">
                              <VisualAsset
                                visualKey={item.visualKey ?? item.id}
                                image={item.image}
                                fit="contain"
                                background={item.background}
                                className="h-7 w-7"
                                alt=""
                                fallback={<ItemGlyph category={item.category} catalogId={item.id} color={item.color} size={22} />}
                              />
                            </span>
                            <span className="min-w-0 truncate">{item.name}</span>
                          </button>
                        ))}
                      </div>
                    </section>
                  );
                })}
                {!filteredCatalog.length && <p className="px-2 py-5 text-center text-xs text-slate-400">Aucun équipement trouvé.</p>}
              </div>
            </div>
          )}
        </div>
        <button type="button" onClick={() => setShowValidation((open) => !open)} className="btn" title="Afficher les erreurs techniques">
          <AlertTriangle size={13} className="text-amber-300" /> Validation
        </button>
        <button type="button" onClick={autoLayoutAndFit} className="btn" title="Aligner automatiquement les équipements">Auto-layout</button>
        {highlightedNodeIds.length > 0 && <button type="button" onClick={clearSignalTrace} className="rounded-xl border border-[#67e8f9] bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-200 shadow-sm">Effacer le flux</button>}
      </div>
      {showValidation && <ValidationPanel onClose={() => setShowValidation(false)} />}
      {!isBoardEmpty && (selectedLink || selectedNodeCount > 0) && (
        <div className="synoptic-ui absolute bottom-4 left-4 z-40 flex items-center gap-2 rounded-2xl border border-white/10 bg-ink-850/95 p-2 shadow-xl backdrop-blur">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            <span className="rounded-lg bg-violet-400/15 px-2 py-1 text-violet-200">{selectedLink ? "Lien" : `${selectedNodeCount} sel.`}</span>
            <span className="text-slate-400">{selectedLink ? "Câble sélectionné" : "Appareils sélectionnés"}</span>
          </div>
          <button
            type="button"
            onClick={removeSelected}
            className="flex items-center gap-1 rounded-lg border border-rose-400/30 bg-rose-400/10 px-2 py-1 text-[10px] font-semibold text-rose-200 transition hover:bg-rose-400/20"
          >
            <Trash2 size={12} />
            Supprimer
          </button>
        </div>
      )}
      {selectedLink && (
        <div className="link-editor-popup synoptic-ui absolute bottom-4 left-4 z-40 w-64 rounded-xl border border-white/10 bg-ink-850 p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lien sélectionné</p>
            <button type="button" onClick={() => setSelectedLinkId(null)} className="text-xs text-slate-400 hover:text-white" aria-label="Fermer l’édition du lien">Fermer</button>
          </div>
          <label className="mb-2 block text-[10px] font-semibold uppercase text-slate-400">
            Type de prise
            <select value={selectedLink.cableType} onChange={(event) => updateSynopticLink(selectedLink.id, { cableType: event.target.value as CableType })} className="mt-1 w-full rounded-lg border border-white/10 bg-ink-850 px-2 py-1.5 text-xs text-slate-200">
              {CABLE_TYPES.map((type) => <option key={type} value={type}>{CABLE_COLORS[type].label}</option>)}
            </select>
          </label>
          <label className="block text-[10px] font-semibold uppercase text-slate-400">
            Libellé
            <input value={selectedLink.label ?? ""} onChange={(event) => updateSynopticLink(selectedLink.id, { label: event.target.value || undefined })} placeholder="Ex. Caméra 1 → ATEM" className="mt-1 w-full rounded-lg border border-white/10 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-violet-500" />
          </label>
          <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.preventDefault(); event.stopPropagation(); removeSynopticLink(selectedLink.id); setSelectedLinkId(null); }} className="mt-3 flex w-full items-center justify-center rounded-lg bg-red-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-red-700">Supprimer le lien</button>
        </div>
      )}

      {/* Légende des câbles : repliable */}
      {!showLegend && (
        <button type="button" onClick={() => setShowLegend(true)} className="synoptic-ui btn absolute right-4 top-3 z-30" title="Afficher la légende des câbles">
          <Layers size={13} /> Légende
        </button>
      )}
      {showLegend && <div className="synoptic-ui absolute right-4 top-3 z-30 rounded-2xl border border-white/10 bg-ink-850/95 p-3 shadow-lg backdrop-blur">
        <div className="mb-2 flex items-center justify-between gap-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Légende Câbles & Signaux</p>
          <button type="button" onClick={() => setShowLegend(false)} aria-label="Masquer la légende" className="rounded p-0.5 text-slate-400 hover:bg-white/10 hover:text-white"><X size={12} /></button>
        </div>
        <div className="space-y-1.5 text-[11px] font-medium text-slate-200">
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
          <div className="mt-2 flex items-center justify-between gap-6 pt-1.5 border-t border-white/8 text-red-400 font-semibold text-[10px]">
            <span>Besoin d'une alim</span>
            <div className="flex items-center justify-center h-4 w-4 rounded-full bg-rose-400/15 text-red-400">
              <Zap size={11} fill="currentColor" />
            </div>
          </div>
        </div>
      </div>}

      {/* Contrôles de Zoom */}
      <div className="synoptic-ui absolute bottom-4 right-4 z-30 flex items-center gap-1 rounded-xl border border-white/10 bg-ink-850 p-1 shadow-md">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))}
          className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10"
          title="Zoom arrière"
        >
          <ZoomOut size={16} />
        </button>
        <span className="w-12 text-center text-xs font-mono font-medium text-slate-300">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(1.8, z + 0.1))}
          className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10"
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
          className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10"
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
        className={`synoptic-dots absolute inset-0 overflow-hidden ${spacePan || isPanning ? "cursor-grab active:cursor-grabbing" : marquee ? "cursor-crosshair" : "cursor-default"}`}
      >
        {isBoardEmpty && (
          <div className="synoptic-ui absolute left-1/2 top-1/2 z-10 w-[min(520px,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-violet-400/30 bg-ink-850/90 p-6 text-center shadow-2xl backdrop-blur-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-400/15 text-violet-200">
              <Network size={28} />
            </div>
            <h3 className="mt-4 text-xl font-bold text-slate-100">Le synoptique est vide</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Génère une structure depuis le plan ou ajoute un premier équipement pour commencer le câblage technique.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => generateSynoptic()}
                className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-700"
              >
                Générer depuis le plan
              </button>
              <button
                type="button"
                onClick={() => setShowAddMenu(true)}
                className="rounded-xl border border-white/10 bg-ink-850 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
              >
                Ajouter un appareil
              </button>
            </div>
          </div>
        )}
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
          <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible" aria-hidden="true">
            <defs>
              <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.15" />
              </filter>
            </defs>

            {links.map((link) => {
              const start = getPortCoordinates(link.fromNodeId, link.fromPortId, true, link.cableType);
              const end = getPortCoordinates(link.toNodeId, link.toPortId, false, link.cableType);
              if (!start || !end) return null;

              const cableCfg = CABLE_COLORS[link.cableType] || CABLE_COLORS.hdmi;
              const isSelected = selectedLinkId === link.id;
              const label = link.label?.trim();

              // Trajectoire Bézier fluide horizontale
              const dx = Math.abs(end.x - start.x) * 0.5;
              const pathD = `M ${start.x} ${start.y} C ${start.x + Math.max(40, dx)} ${start.y}, ${end.x - Math.max(40, dx)
                } ${end.y}, ${end.x} ${end.y}`;

              return (
                <g
                  key={link.id}
                  className="synoptic-link pointer-events-auto cursor-pointer"
                  onPointerDown={(event) => { event.stopPropagation(); setSelectedLinkId(link.id); }}
                  onClick={(event) => { event.stopPropagation(); setSelectedLinkId(link.id); }}
                  opacity={highlightedLinkIds.length === 0 || highlightedLinkIds.includes(link.id) ? 1 : 0.18}
                >
                  <path d={pathD} fill="none" stroke="transparent" strokeWidth="18" strokeLinecap="round" pointerEvents="stroke" />
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
                    strokeWidth={isSelected ? "4.5" : "3.5"}
                    strokeLinecap="round"
                    filter="url(#shadow)"
                  />
                  {/* Point de connexion de départ */}
                  <circle cx={start.x} cy={start.y} r="4" fill={cableCfg.color} />
                  {/* Point de connexion d'arrivée */}
                  <circle cx={end.x} cy={end.y} r="4" fill={cableCfg.color} />
                  {label && (
                    <g pointerEvents="none">
                      <rect x={(start.x + end.x) / 2 - Math.min(label.length * 3.2, 90)} y={(start.y + end.y) / 2 - 12} width={Math.min(label.length * 6.4 + 12, 192)} height="18" rx="5" fill="white" fillOpacity="0.94" stroke={cableCfg.color} strokeOpacity="0.35" />
                      <text x={(start.x + end.x) / 2} y={(start.y + end.y) / 2 + 1} textAnchor="middle" fontSize="10" fontWeight="600" fill="#334155">{label.slice(0, 28)}</text>
                    </g>
                  )}
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
                const start = getPortCoordinates(link.fromNodeId, link.fromPortId, true, link.cableType);
                const end = getPortCoordinates(link.toNodeId, link.toPortId, false, link.cableType);
                if (!start || !end) return null;
                const midX = (start.x + end.x) / 2;
                const midY = (start.y + end.y) / 2;
                return (
                  <button
                    type="button"
                    style={{ left: midX - 12, top: midY - 12 }}
                    onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onClick={(e) => {
                      e.preventDefault();
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
  const width = synopticNodeWidth(node);
  const portsIn = node.portsIn ?? [];
  const portsOut = node.portsOut ?? [];
  const portCount = Math.max(portsIn.length, portsOut.length, 1);
  const cardHeight = node.height ?? Math.max(156, 61 + portCount * 32);

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
      className={`synoptic-card group absolute z-20 flex cursor-move flex-col rounded-xl border bg-gradient-to-b from-ink-800 to-ink-850 text-slate-100 shadow-[0_8px_28px_rgb(0_0_0/0.35)] transition-shadow hover:shadow-[0_12px_36px_rgb(0_0_0/0.5)] ${selected ? "border-violet-400 ring-4 ring-violet-400/25" : "border-white/12"}`}
      style={{
        left: node.x,
        top: node.y,
        width: `${width}px`,
        height: `${cardHeight}px`,
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
      <div className="flex items-center justify-between border-b border-white/8 bg-white/[0.04] px-2.5 py-1.5 rounded-t-xl">
        <div className="min-w-0 flex-1">
          <input
            value={node.title ?? ""}
            onChange={onTitleChange}
            className="w-full truncate bg-transparent text-[11px] font-bold text-slate-100 outline-none hover:bg-white/10 focus:bg-white/10 focus:ring-1 focus:ring-violet-500 rounded px-0.5"
            placeholder="Nom de l'appareil"
          />
          {node.subtitle !== undefined && (
            <input
              value={node.subtitle}
              onChange={onSubtitleChange}
              className="w-full truncate bg-transparent text-[9.5px] font-medium text-slate-400 outline-none hover:bg-white/10 focus:bg-white/10 focus:ring-1 focus:ring-violet-500 rounded px-0.5"
              placeholder="Détail / Référence"
            />
          )}
        </div>

        {/* Bouton supprimer */}
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); onTrace(); }}
          className="ml-1 opacity-0 group-hover:opacity-100 p-1 text-cyan-400 hover:text-cyan-800 transition"
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
      <div className="relative grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)] items-stretch gap-1 p-2">
        {/* Colonne IN (Gauche) */}
        <div className="min-w-0 flex flex-col text-[10px]">
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
                data-synoptic-direction="in"
                onPointerUp={(e) => onCompleteLinking(node, port, e)}
                className="port-handle flex h-8 min-w-0 max-w-full items-center gap-1.5 cursor-pointer rounded px-1 py-1 hover:bg-white/10 transition"
                title={`Entrée ${port.name} (${cableCfg.label}) - Déposer un câble ici`}
              >
                <div
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 bg-ink-850 shadow-sm"
                  style={{ borderColor: cableCfg.color }}
                >
                  <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cableCfg.color }} />
                </div>
                <span className="min-w-0 whitespace-normal break-words text-[10px] font-semibold leading-tight text-slate-200">{port.name} <span className="font-mono text-[8px] text-slate-400">({cableCfg.label})</span></span>
              </div>
            );
          })}
        </div>

        {/* Visuel central de l'équipement */}
        <div className="flex min-w-0 flex-col items-center justify-center overflow-visible p-2 text-slate-400">
          <VisualAsset
            visualKey={node.visualKey ?? node.deviceType ?? "generic"}
            image={node.image}
            fit="contain"
            background={node.background}
            className="h-[5.6rem] w-[7.5rem] shrink-0"
            alt={node.title}
            fallback={node.category
              ? <ItemGlyph category={node.category} catalogId={node.visualKey ?? ""} color={node.color} size={42} />
              : <DeviceIllustration deviceType={node.deviceType ?? "generic"} title={node.title} color={node.color} />}
          />
          {node.warningBadge && (
            <div className="mt-2 flex items-center gap-1 rounded bg-rose-400/15 px-1.5 py-0.5 text-[8.5px] font-bold text-rose-200">
              <AlertTriangle size={10} />
              <span>{node.warningBadge}</span>
            </div>
          )}
          {error && (
            <div className={`mt-2 flex items-center gap-1 rounded px-1.5 py-0.5 text-[8.5px] font-bold ${error.severity === "error" ? "bg-rose-400/15 text-rose-200" : "bg-amber-400/15 text-amber-200"}`}>
              <AlertTriangle size={10} />
              <span className="truncate">{error.message}</span>
            </div>
          )}
        </div>

        {/* Colonne OUT (Droite) */}
        <div className="min-w-0 flex flex-col items-end text-[10px]">
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
                data-synoptic-direction="out"
                onPointerDown={(e) => onStartLinking(node, port, e)}
                className="port-handle flex h-8 min-w-0 max-w-full items-center justify-end gap-1.5 cursor-pointer rounded px-1 py-1 hover:bg-white/10 transition"
                title={`Sortie ${port.name} (${cableCfg.label}) - Glisser pour relier`}
              >
                <span className="min-w-0 whitespace-normal break-words text-right text-[10px] font-semibold leading-tight text-slate-200">{port.name} <span className="font-mono text-[8px] text-slate-400">({cableCfg.label})</span></span>
                <div
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 bg-ink-850 shadow-sm"
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
