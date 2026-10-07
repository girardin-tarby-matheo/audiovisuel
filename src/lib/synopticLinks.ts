import type { SynopticLink, SynopticNode, SynopticPort } from "./types.ts";

/**
 * Règles du câblage du synoptique, sans dépendance à React ni au store (testable seule).
 *
 * Modèle : un lien relie un port de SORTIE d'un appareil à un port d'ENTRÉE d'un autre.
 *  - les deux ports doivent être du même type de câble ;
 *  - une entrée ne reçoit qu'une seule source (la nouvelle remplace l'ancienne) ;
 *  - une sortie peut alimenter plusieurs entrées ;
 *  - deux ports ne sont reliés qu'une fois, et jamais d'un appareil à lui-même.
 * Les ports ne sont identifiés que par le couple (appareil, port) : plusieurs appareils partagent
 * des identifiants de port identiques (« hdmi-in »…).
 */

export type PortDirection = "in" | "out";
export type PortRef = { nodeId: string; portId: string };
export type Point = { x: number; y: number };

export const portKey = (nodeId: string, portId: string) => `${nodeId}:${portId}`;
export const directedKey = (nodeId: string, direction: PortDirection, portId: string) => `${nodeId}:${direction}:${portId}`;

export function findPort(nodes: SynopticNode[], nodeId: string, portId: string | undefined, direction: PortDirection): SynopticPort | undefined {
    if (!portId) return undefined;
    const node = nodes.find((candidate) => candidate.id === nodeId);
    return (direction === "out" ? node?.portsOut : node?.portsIn)?.find((port) => port.id === portId);
}

export type Evaluation = { ok: true; replaces: SynopticLink | null } | { ok: false; reason: string };

/** Dit si `from` (sortie) peut être reliée à `to` (entrée), et quel lien existant elle remplacerait. */
export function evaluateConnection(nodes: SynopticNode[], links: SynopticLink[], from: PortRef, to: PortRef): Evaluation {
    if (from.nodeId === to.nodeId) return { ok: false, reason: "Impossible de relier un appareil à lui-même" };
    const fromPort = findPort(nodes, from.nodeId, from.portId, "out");
    const toPort = findPort(nodes, to.nodeId, to.portId, "in");
    if (!fromPort || !toPort) return { ok: false, reason: "Port introuvable : une sortie se relie à une entrée" };
    if (fromPort.type !== toPort.type) {
        return { ok: false, reason: `Câbles incompatibles : ${fromPort.type.toUpperCase()} → ${toPort.type.toUpperCase()}` };
    }
    const onSameInput = links.find((link) => link.toNodeId === to.nodeId && link.toPortId === to.portId);
    if (onSameInput && onSameInput.fromNodeId === from.nodeId && onSameInput.fromPortId === from.portId) {
        return { ok: false, reason: "Ces deux ports sont déjà reliés" };
    }
    return { ok: true, replaces: onSameInput ?? null };
}

export type ConnectResult =
    | { ok: true; links: SynopticLink[]; link: SynopticLink; replaced: SynopticLink | null }
    | { ok: false; reason: string };

export function connectPorts(nodes: SynopticNode[], links: SynopticLink[], from: PortRef, to: PortRef, makeId: () => string): ConnectResult {
    const evaluation = evaluateConnection(nodes, links, from, to);
    if (!evaluation.ok) return evaluation;
    const fromPort = findPort(nodes, from.nodeId, from.portId, "out")!;
    const link: SynopticLink = {
        id: makeId(),
        fromNodeId: from.nodeId,
        fromPortId: from.portId,
        toNodeId: to.nodeId,
        toPortId: to.portId,
        cableType: fromPort.type,
    };
    const kept = evaluation.replaces ? links.filter((existing) => existing.id !== evaluation.replaces!.id) : links;
    return { ok: true, links: [...kept, link], link, replaced: evaluation.replaces };
}

/** Oriente deux extrémités quelconques en (sortie, entrée), selon le sens dans lequel elles ont été choisies. */
export function orient(source: PortRef & { direction: PortDirection }, target: PortRef): { from: PortRef; to: PortRef } {
    return source.direction === "out"
        ? { from: { nodeId: source.nodeId, portId: source.portId }, to: target }
        : { from: target, to: { nodeId: source.nodeId, portId: source.portId } };
}

/** Ports pouvant recevoir le câble en cours de tracé (clés `appareil:sens:port`). */
export function validTargets(nodes: SynopticNode[], links: SynopticLink[], source: PortRef & { direction: PortDirection }): Set<string> {
    const targets = new Set<string>();
    const targetDirection: PortDirection = source.direction === "out" ? "in" : "out";
    nodes.forEach((node) => {
        if (node.id === source.nodeId) return;
        (targetDirection === "in" ? node.portsIn : node.portsOut ?? []).forEach((port) => {
            const { from, to } = orient(source, { nodeId: node.id, portId: port.id });
            if (evaluateConnection(nodes, links, from, to).ok) targets.add(directedKey(node.id, targetDirection, port.id));
        });
    });
    return targets;
}

/**
 * Premier port compatible d'un appareil, pour un dépôt « n'importe où sur la carte » : on préfère
 * une entrée libre à une entrée déjà occupée.
 */
export function pickPortOnNode(nodes: SynopticNode[], links: SynopticLink[], source: PortRef & { direction: PortDirection }, nodeId: string): string | null {
    const node = nodes.find((candidate) => candidate.id === nodeId);
    if (!node || node.id === source.nodeId) return null;
    const targetDirection: PortDirection = source.direction === "out" ? "in" : "out";
    const ports = targetDirection === "in" ? node.portsIn : node.portsOut;
    const usable = ports.filter((port) => {
        const { from, to } = orient(source, { nodeId, portId: port.id });
        return evaluateConnection(nodes, links, from, to).ok;
    });
    const isFree = (port: SynopticPort) =>
        !links.some((link) => (targetDirection === "in" ? link.toNodeId === nodeId && link.toPortId === port.id : link.fromNodeId === nodeId && link.fromPortId === port.id));
    return (usable.find(isFree) ?? usable[0])?.id ?? null;
}

/**
 * Remet les liens d'un projet en cohérence : appareils et ports existants, type de câble = type du port,
 * une seule source par entrée, aucun doublon. Un lien sans port (anciens projets) est rattaché au premier
 * port libre du bon type s'il y en a un, sinon retiré.
 */
export function sanitizeLinks(nodes: SynopticNode[], links: SynopticLink[]): { links: SynopticLink[]; removed: number } {
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const usedInputs = new Set<string>();
    const result: SynopticLink[] = [];

    // On parcourt à l'envers pour que, sur une même entrée, le lien le plus récent l'emporte.
    [...links].reverse().forEach((link) => {
        const fromNode = byId.get(link.fromNodeId);
        const toNode = byId.get(link.toNodeId);
        if (!fromNode || !toNode || fromNode.id === toNode.id) return;

        let fromPort = fromNode.portsOut.find((port) => port.id === link.fromPortId);
        let toPort = toNode.portsIn.find((port) => port.id === link.toPortId);

        if (!fromPort && !link.fromPortId) fromPort = fromNode.portsOut.find((port) => port.type === link.cableType);
        if (!toPort && !link.toPortId) {
            toPort = toNode.portsIn.find((port) => port.type === (fromPort?.type ?? link.cableType) && !usedInputs.has(portKey(toNode.id, port.id)))
                ?? toNode.portsIn.find((port) => port.type === (fromPort?.type ?? link.cableType));
        }
        if (!fromPort || !toPort || fromPort.type !== toPort.type) return;

        const inputKey = portKey(toNode.id, toPort.id);
        if (usedInputs.has(inputKey)) return;
        usedInputs.add(inputKey);
        result.push({ ...link, fromPortId: fromPort.id, toPortId: toPort.id, cableType: fromPort.type });
    });

    result.reverse();
    return { links: result, removed: links.length - result.length };
}

/** Tracé d'un câble entre deux points : courbe de Bézier, avec un détour plus ample quand la cible est en arrière. */
export function linkGeometry(start: Point, end: Point): { d: string; mid: Point } {
    const dx = end.x - start.x;
    const reach = dx >= 60
        ? Math.min(220, Math.max(60, dx * 0.5))
        : Math.min(280, 90 + Math.abs(dx) * 0.35 + Math.abs(end.y - start.y) * 0.1);
    const c1 = { x: start.x + reach, y: start.y };
    const c2 = { x: end.x - reach, y: end.y };
    return {
        d: `M ${start.x} ${start.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${end.x} ${end.y}`,
        mid: { x: (start.x + 3 * c1.x + 3 * c2.x + end.x) / 8, y: (start.y + 3 * c1.y + 3 * c2.y + end.y) / 8 },
    };
}
