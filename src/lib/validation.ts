import type { SynopticNode, SynopticLink, CableType } from "./types";

export type ValidationError = {
  nodeId: string;
  type: "missing_power" | "unconnected_port" | "mismatched_cable";
  message: string;
  severity: "error" | "warning";
};

/**
 * Validates the technical consistency of a synoptic diagram.
 */
export function validateSynoptic(nodes: SynopticNode[], links: SynopticLink[]): ValidationError[] {
  const errors: ValidationError[] = [];

  // Map for quick link lookup: portId -> link
  const portToLinkMap = new Map<string, SynopticLink>();
  links.forEach((link) => {
    if (link.fromPortId) portToLinkMap.set(link.fromPortId, link);
    if (link.toPortId) portToLinkMap.set(link.toPortId, link);
  });

  nodes.forEach((node) => {
    // 1. Power Validation
    if (node.needsPower) {
      const hasPowerLink = links.some((link) =>
        (link.toNodeId === node.id && link.cableType === "usb") || // Simplified: assume USB or specific power cables
        (link.fromNodeId === node.id && link.cableType === "usb")
      );

      // In a real scenario, we might check if there's a node of type 'power_supply'
      // For now, we'll flag it if it doesn't have at least one connection that could be power
      // or if we want a more explicit 'power' cable type.
      // Let's assume for the prototype that if it needs power, it needs a link to a power source.
      // Since we don't have a dedicated power source node yet, let's check if it's linked at all.
      if (!hasPowerLink) {
        errors.push({
          nodeId: node.id,
          type: "missing_power",
          message: "L'appareil nécessite une alimentation secteur",
          severity: "error",
        });
      }
    }

    // 2. Port Validation
    // Check for critical inputs that are empty
    if (node.deviceType === "mixer" || node.deviceType === "recorder") {
      const criticalPorts = node.portsIn.filter(p => {
        const link = portToLinkMap.get(p.id);
        return !link;
      });

      if (criticalPorts.length > 0) {
        errors.push({
          nodeId: node.id,
          type: "unconnected_port",
          message: `${criticalPorts.length} entrée(s) non connectée(s)`,
          severity: "warning",
        });
      }
    }
  });

  // 3. Cable Type Consistency
  links.forEach((link) => {
    const fromNode = nodes.find(n => n.id === link.fromNodeId);
    const toNode = nodes.find(n => n.id === link.toNodeId);

    if (fromNode && toNode) {
      const fromPort = fromNode.portsOut.find(p => p.id === link.fromPortId);
      const toPort = toNode.portsIn.find(p => p.id === link.toPortId);

      if (fromPort && toPort && fromPort.type !== toPort.type) {
        errors.push({
          nodeId: link.fromNodeId,
          type: "mismatched_cable",
          message: `Incompatibilité: ${fromPort.type.toUpperCase()} -> ${toPort.type.toUpperCase()}`,
          severity: "error",
        });
      }
    }
  });

  return errors;
}
