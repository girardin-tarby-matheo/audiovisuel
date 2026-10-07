import type { SynopticNode, SynopticLink } from "./types.ts";
import { findPort, portKey } from "./synopticLinks.ts";

export type ValidationError = {
  nodeId: string;
  type: "unconnected_port" | "mismatched_cable" | "dangling_link" | "signal_loop";
  message: string;
  severity: "error" | "warning";
};

/**
 * Contrôle de cohérence du synoptique. Les ports sont identifiés par (appareil, port) : plusieurs
 * appareils portent des identifiants de port identiques (« hdmi-in »…) et ne doivent pas se « prêter »
 * leurs connexions.
 */
export function validateSynoptic(nodes: SynopticNode[], links: SynopticLink[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const nodeIds = new Set(nodes.map((node) => node.id));

  const connectedInputs = new Set<string>();
  links.forEach((link) => {
    if (link.toPortId) connectedInputs.add(portKey(link.toNodeId, link.toPortId));
  });

  // 1. Entrées libres des appareils de commutation et d'enregistrement
  nodes.forEach((node) => {
    if (node.deviceType !== "mixer" && node.deviceType !== "recorder") return;
    const free = node.portsIn.filter((port) => !connectedInputs.has(portKey(node.id, port.id)));
    if (free.length > 0) {
      errors.push({
        nodeId: node.id,
        type: "unconnected_port",
        message: `${free.length} entrée(s) non connectée(s)`,
        severity: "warning",
      });
    }
  });

  // 2. Liens cassés ou de types incompatibles
  links.forEach((link) => {
    if (!nodeIds.has(link.fromNodeId) || !nodeIds.has(link.toNodeId)) return;
    const fromPort = findPort(nodes, link.fromNodeId, link.fromPortId, "out");
    const toPort = findPort(nodes, link.toNodeId, link.toPortId, "in");

    if (!fromPort || !toPort) {
      errors.push({
        nodeId: link.fromNodeId,
        type: "dangling_link",
        message: "Liaison vers un port qui n'existe plus",
        severity: "error",
      });
      return;
    }
    if (fromPort.type !== toPort.type) {
      errors.push({
        nodeId: link.fromNodeId,
        type: "mismatched_cable",
        message: `Incompatibilité : ${fromPort.type.toUpperCase()} → ${toPort.type.toUpperCase()}`,
        severity: "error",
      });
    }
  });

  // 3. Boucles de signal (un appareil qui se renvoie son propre signal)
  const next = new Map<string, string[]>();
  links.forEach((link) => {
    if (!nodeIds.has(link.fromNodeId) || !nodeIds.has(link.toNodeId)) return;
    next.set(link.fromNodeId, [...(next.get(link.fromNodeId) ?? []), link.toNodeId]);
  });
  const state = new Map<string, "visiting" | "done">();
  const inLoop = new Set<string>();
  const visit = (id: string, path: string[]) => {
    state.set(id, "visiting");
    path.push(id);
    (next.get(id) ?? []).forEach((target) => {
      if (state.get(target) === "visiting") {
        path.slice(path.indexOf(target)).forEach((member) => inLoop.add(member));
      } else if (!state.has(target)) {
        visit(target, path);
      }
    });
    path.pop();
    state.set(id, "done");
  };
  nodes.forEach((node) => {
    if (!state.has(node.id)) visit(node.id, []);
  });
  nodes.filter((node) => inLoop.has(node.id)).forEach((node) => {
    errors.push({
      nodeId: node.id,
      type: "signal_loop",
      message: "Boucle de signal : l'appareil se renvoie son propre signal",
      severity: "error",
    });
  });

  return errors;
}
