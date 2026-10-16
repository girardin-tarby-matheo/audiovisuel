import type { BoardObject, CableType, CatalogItem, SynopticLink, SynopticNode } from "./types.ts";
import { SYNOPTIC_TEMPLATES } from "./synopticTemplates.ts";
import { sanitizeLinks } from "./synopticLinks.ts";

/**
 * Régie de base : une seule source de vérité pour le plan ET le synoptique.
 *
 * - REGIE_LAYOUT : les objets posés sur le plan au démarrage (identifiant du catalogue, position).
 * - REGIE_TEMPLATES : l'appareil du synoptique qui correspond à chaque objet de régie du plan.
 * - REGIE_LINKS : le câblage standard entre ces appareils.
 *
 * Le synoptique est construit à partir des objets du plan : un objet de régie présent sur le plan donne
 * un appareil (même nom, lié par `sourceId`), un objet absent n'en donne pas.
 */

/** Objets du plan au démarrage : [identifiant du catalogue, x, y]. */
export const REGIE_LAYOUT: Array<[string, number, number]> = [
  // Mur d'écrans
  ["set-monitor", 230, 200],
  ["set-multiview", 420, 200],
  ["set-hyperdeck", 610, 200],
  ["set-pc-stream", 800, 200],
  // Pupitre
  ["set-sound-desk", 230, 340],
  ["set-atem-mini", 420, 340],
  ["set-pc-atem", 610, 340],
  ["set-headphones", 800, 340],
  ["set-di-box", 230, 470],
  // Réalisation
  ["talent-director", 420, 500],
];

/** Objet de régie du plan (identifiant du catalogue) → modèle d'appareil du synoptique. */
export const REGIE_TEMPLATES: Record<string, string> = {
  "set-atem-mini": "atem-mini-expert",
  "set-sound-desk": "yamaha-mg12xu",
  "set-monitor": "master-screen",
  "set-multiview": "multiview-screen",
  "set-hyperdeck": "hyperdeck",
  "set-pc-stream": "pc-stream",
  "set-pc-atem": "pc-atem",
  "set-headphones": "headphone-monitor",
  "set-di-box": "di-box",
};

/** Câblage standard : modèle de départ, port de sortie, modèle d'arrivée, port d'entrée. */
const REGIE_LINKS: Array<{ from: string; fromPort: string; to: string; toPort: string; label?: string }> = [
  { from: "yamaha-mg12xu", fromPort: "stereo-out-1", to: "atem-mini-expert", toPort: "audio-in-1", label: "Audio Mix" },
  { from: "yamaha-mg12xu", fromPort: "stereo-out-2", to: "di-box", toPort: "jack-in" },
  { from: "atem-mini-expert", fromPort: "pgm-usb-1", to: "pc-stream", toPort: "usb-in" },
  { from: "atem-mini-expert", fromPort: "audio-out-jack", to: "headphone-monitor", toPort: "jack-in" },
  { from: "atem-mini-expert", fromPort: "pgm-hdmi", to: "hyperdeck", toPort: "hdmi-in" },
  { from: "atem-mini-expert", fromPort: "multiview-hdmi", to: "multiview-screen", toPort: "hdmi-in" },
  { from: "hyperdeck", fromPort: "hdmi-out", to: "master-screen", toPort: "hdmi-in" },
];

/** Positions de départ des appareils (l'auto-layout les range ensuite selon leurs largeurs réelles). */
const NODE_POSITION: Record<string, [number, number]> = {
  "atem-mini-expert": [620, 200],
  "yamaha-mg12xu": [480, 680],
  "pc-stream": [1040, 120],
  "pc-atem": [1160, 200],
  "headphone-monitor": [940, 280],
  hyperdeck: [940, 400],
  "master-screen": [1200, 380],
  "multiview-screen": [940, 530],
  "di-box": [790, 680],
};

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

/** Construit le synoptique (appareils de régie + caméras et micros du plan) sans toucher au store. */
export function buildSynoptic(state: { items: BoardObject[]; catalog: CatalogItem[] }): { nodes: SynopticNode[]; links: SynopticLink[] } {
  const nodes: SynopticNode[] = [];
  const links: SynopticLink[] = [];
  /** Premier appareil créé pour chaque modèle (cible des câblages standard). */
  const byTemplate = new Map<string, SynopticNode>();

  // 1. Appareils de régie : un par objet de régie présent sur le plan, nommé comme lui.
  state.items.forEach((item) => {
    const templateId = REGIE_TEMPLATES[item.catalogId];
    const template = templateId ? SYNOPTIC_TEMPLATES[templateId] : undefined;
    if (!template) return;
    const [x, y] = NODE_POSITION[template.id] ?? [600, 300];
    const node: SynopticNode = {
      id: uid(),
      sourceId: item.id,
      title: item.name || template.title,
      subtitle: template.subtitle,
      deviceType: template.deviceType,
      color: item.color || template.color,
      x,
      y,
      portsIn: structuredClone(template.portsIn),
      portsOut: structuredClone(template.portsOut),
      needsPower: template.needsPower,
      warningBadge: template.warningBadge,
    };
    nodes.push(node);
    if (!byTemplate.has(template.id)) byTemplate.set(template.id, node);
  });

  // 2. Câblage standard entre les appareils de régie présents
  REGIE_LINKS.forEach((link) => {
    const from = byTemplate.get(link.from);
    const to = byTemplate.get(link.to);
    if (!from || !to) return;
    const port = from.portsOut.find((candidate) => candidate.id === link.fromPort);
    links.push({
      id: uid(),
      fromNodeId: from.id,
      fromPortId: link.fromPort,
      toNodeId: to.id,
      toPortId: link.toPort,
      cableType: (port?.type ?? "hdmi") as CableType,
      ...(link.label ? { label: link.label } : {}),
    });
  });

  const atem = byTemplate.get("atem-mini-expert");
  const yamaha = byTemplate.get("yamaha-mg12xu");
  const atemHdmiInputs = atem?.portsIn.filter((port) => port.type === "hdmi") ?? [];
  const yamahaXlrInputs = yamaha?.portsIn.filter((port) => port.type === "xlr") ?? [];

  // 3. Caméras du plan → entrées HDMI du mélangeur
  const camTemplate = SYNOPTIC_TEMPLATES["generic-camera"];
  state.items.filter((item) => item.category === "camera").forEach((cam, index) => {
    const catalogItem = state.catalog.find((entry) => entry.id === cam.catalogId);
    const node: SynopticNode = {
      id: uid(),
      sourceId: cam.id,
      title: cam.name || `Caméra ${index + 1}`,
      subtitle: cam.label || "Sortie HDMI / SDI",
      category: cam.category,
      deviceType: camTemplate.deviceType,
      color: cam.color || catalogItem?.color || camTemplate.color,
      image: cam.image ?? catalogItem?.image,
      fit: cam.fit ?? catalogItem?.fit,
      background: cam.background ?? catalogItem?.background,
      visualKey: cam.visualKey ?? catalogItem?.visualKey ?? cam.catalogId,
      x: 160,
      y: 180 + index * 115,
      portsIn: [],
      portsOut: structuredClone(camTemplate.portsOut),
      needsPower: true,
    };
    nodes.push(node);
    const input = atemHdmiInputs[index];
    if (atem && input) {
      links.push({ id: uid(), fromNodeId: node.id, fromPortId: camTemplate.portsOut[0].id, toNodeId: atem.id, toPortId: input.id, cableType: "hdmi" });
    }
  });

  // 4. Micros du plan → entrées XLR de la console
  const micTemplate = SYNOPTIC_TEMPLATES["generic-mic"];
  state.items.filter((item) => item.category === "audio").slice(0, 4).forEach((mic, index) => {
    const catalogItem = state.catalog.find((entry) => entry.id === mic.catalogId);
    const node: SynopticNode = {
      id: uid(),
      sourceId: mic.id,
      title: mic.name || `Micro ${index + 1}`,
      subtitle: mic.label || "XLR",
      category: mic.category,
      deviceType: micTemplate.deviceType,
      color: mic.color || catalogItem?.color || micTemplate.color,
      image: mic.image ?? catalogItem?.image,
      fit: mic.fit ?? catalogItem?.fit,
      background: mic.background ?? catalogItem?.background,
      visualKey: mic.visualKey ?? catalogItem?.visualKey ?? mic.catalogId,
      x: 160,
      y: 670 + index * 95,
      portsIn: [],
      portsOut: structuredClone(micTemplate.portsOut),
      needsPower: false,
    };
    nodes.push(node);
    const input = yamahaXlrInputs[index];
    if (yamaha && input) {
      links.push({ id: uid(), fromNodeId: node.id, fromPortId: micTemplate.portsOut[0].id, toNodeId: yamaha.id, toPortId: input.id, cableType: "xlr" });
    }
  });

  // Liens sans port exact ou de types incompatibles : remis en cohérence dès la construction.
  return { nodes, links: sanitizeLinks(nodes, links).links };
}
