import test from "node:test";
import assert from "node:assert/strict";

import { computeSynopticAutoLayout, synopticNodeWidth } from "../src/lib/synopticLayout.ts";

const node = (id: string, deviceType: string, x: number, y: number, ports = 3) => ({
    id, sourceId: null, title: id, subtitle: "", deviceType, color: "#fff", x, y,
    portsIn: Array.from({ length: ports }, (_, index) => ({ id: `${id}-in-${index}`, name: `HDMI ${index + 1}`, type: "hdmi" })),
    portsOut: [{ id: `${id}-out`, name: "OUT", type: "hdmi" }],
});

test("la largeur d'une carte suit la longueur de ses ports sans passer sous le minimum", () => {
    const narrow = synopticNodeWidth(node("a", "camera", 0, 0) as any);
    const wide = synopticNodeWidth({ ...node("b", "camera", 0, 0), portsOut: [{ id: "o", name: "Sortie programme principale très longue", type: "hdmi" }] } as any);

    assert.ok(narrow >= 300);
    assert.ok(wide >= narrow);
    assert.ok(synopticNodeWidth(node("m", "mixer", 0, 0) as any) >= 380);
});

test("l'auto-layout ne fait chevaucher aucune carte, même départ tous superposés", () => {
    const nodes = [node("cam-a", "camera", 0, 0), node("cam-b", "camera", 0, 0), node("mix", "mixer", 0, 0, 8), node("rec", "recorder", 0, 0), node("scr", "screen", 0, 0)] as any;
    const links = [
        { id: "1", fromNodeId: "cam-a", fromPortId: "cam-a-out", toNodeId: "mix", toPortId: "mix-in-0", cableType: "hdmi" },
        { id: "2", fromNodeId: "cam-b", fromPortId: "cam-b-out", toNodeId: "mix", toPortId: "mix-in-1", cableType: "hdmi" },
        { id: "3", fromNodeId: "mix", fromPortId: "mix-out", toNodeId: "rec", toPortId: "rec-in-0", cableType: "hdmi" },
        { id: "4", fromNodeId: "rec", fromPortId: "rec-out", toNodeId: "scr", toPortId: "scr-in-0", cableType: "hdmi" },
    ] as any;

    const placed = computeSynopticAutoLayout(nodes, links);
    const box = (n: any) => ({ left: n.x, right: n.x + synopticNodeWidth(n), top: n.y, bottom: n.y + (n.height ?? Math.max(156, 61 + Math.max(n.portsIn.length, n.portsOut.length, 1) * 32)) });

    for (let a = 0; a < placed.length; a += 1) {
        for (let b = a + 1; b < placed.length; b += 1) {
            const p = box(placed[a]);
            const q = box(placed[b]);
            const overlap = p.left < q.right && p.right > q.left && p.top < q.bottom && p.bottom > q.top;
            assert.equal(overlap, false, `${placed[a].id} chevauche ${placed[b].id}`);
        }
    }
});
