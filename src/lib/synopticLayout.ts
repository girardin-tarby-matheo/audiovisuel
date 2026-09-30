import type { SynopticLink, SynopticNode } from "./types.ts";

export function computeSynopticAutoLayout(nodes: SynopticNode[], links: SynopticLink[]): SynopticNode[] {
    if (!nodes.length) return [];

    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const incoming = new Map<string, string[]>();
    const outgoing = new Map<string, string[]>();
    const indegree = new Map(nodes.map((node) => [node.id, 0]));

    nodes.forEach((node) => {
        incoming.set(node.id, []);
        outgoing.set(node.id, []);
    });

    links.forEach((link) => {
        if (!nodeById.has(link.fromNodeId) || !nodeById.has(link.toNodeId)) return;
        incoming.get(link.toNodeId)!.push(link.fromNodeId);
        outgoing.get(link.fromNodeId)!.push(link.toNodeId);
        indegree.set(link.toNodeId, (indegree.get(link.toNodeId) ?? 0) + 1);
    });

    const rank = new Map<string, number>();
    const queue = nodes.filter((node) => (indegree.get(node.id) ?? 0) === 0).map((node) => node.id);
    queue.forEach((id) => rank.set(id, 0));

    for (let index = 0; index < queue.length; index += 1) {
        const currentId = queue[index];
        (outgoing.get(currentId) ?? []).forEach((nextId) => {
            rank.set(nextId, Math.max(rank.get(nextId) ?? 0, (rank.get(currentId) ?? 0) + 1));
            const nextDegree = (indegree.get(nextId) ?? 1) - 1;
            indegree.set(nextId, nextDegree);
            if (nextDegree === 0) queue.push(nextId);
        });
    }

    nodes.forEach((node) => {
        if (!rank.has(node.id)) rank.set(node.id, 0);
    });

    const nodeWidth = (node: SynopticNode) => node.width ?? (node.deviceType === "mixer" ? 280 : node.deviceType === "audio" ? 250 : 200);
    const nodeHeight = (node: SynopticNode) => node.height ?? 150;
    const columns = new Map<number, SynopticNode[]>();

    nodes.forEach((node) => {
        const column = rank.get(node.id) ?? 0;
        columns.set(column, [...(columns.get(column) ?? []), node]);
    });

    const orderedColumns = [...columns.entries()].sort(([left], [right]) => left - right);
    const nodeOrder = new Map<string, number>();
    orderedColumns.forEach(([, columnNodes]) => {
        [...columnNodes]
            .sort((left, right) => left.y - right.y || left.id.localeCompare(right.id))
            .forEach((node, index) => nodeOrder.set(node.id, index));
    });

    // Minimise les croisements en alignant chaque colonne sur l'ordre de ses voisins.
    // Deux passes dans chaque direction suffisent pour les graphes de câblage usuels.
    const reorderColumn = (columnNodes: SynopticNode[], neighborMap: Map<string, string[]>) => {
        const ordered = [...columnNodes].sort((left, right) => {
            const leftNeighbors = neighborMap.get(left.id) ?? [];
            const rightNeighbors = neighborMap.get(right.id) ?? [];
            const leftBarycenter = leftNeighbors.length
                ? leftNeighbors.reduce((sum, id) => sum + (nodeOrder.get(id) ?? 0), 0) / leftNeighbors.length
                : Number.POSITIVE_INFINITY;
            const rightBarycenter = rightNeighbors.length
                ? rightNeighbors.reduce((sum, id) => sum + (nodeOrder.get(id) ?? 0), 0) / rightNeighbors.length
                : Number.POSITIVE_INFINITY;
            return leftBarycenter - rightBarycenter || (nodeOrder.get(left.id) ?? 0) - (nodeOrder.get(right.id) ?? 0);
        });
        ordered.forEach((node, index) => nodeOrder.set(node.id, index));
        return ordered;
    };

    for (let pass = 0; pass < 2; pass += 1) {
        orderedColumns.forEach(([, columnNodes], index) => {
            if (index > 0) reorderColumn(columnNodes, incoming);
        });
        [...orderedColumns].reverse().forEach(([, columnNodes], index) => {
            if (index > 0) reorderColumn(columnNodes, outgoing);
        });
    }

    let x = 100;
    const gapX = 180;
    const gapY = 60;
    const next = new Map<string, { x: number; y: number }>();

    orderedColumns.forEach(([, columnNodes]) => {
        const ordered = [...columnNodes].sort((left, right) => (nodeOrder.get(left.id) ?? 0) - (nodeOrder.get(right.id) ?? 0));
        let y = 100;
        let maxWidth = 0;
        ordered.forEach((node) => {
            next.set(node.id, { x, y });
            y += nodeHeight(node) + gapY;
            maxWidth = Math.max(maxWidth, nodeWidth(node));
        });
        x += maxWidth + gapX;
    });

    return nodes.map((node) => ({ ...node, ...(next.get(node.id) ?? { x: node.x, y: node.y }) }));
}
