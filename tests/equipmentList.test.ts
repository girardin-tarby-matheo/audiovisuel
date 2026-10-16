import test from "node:test";
import assert from "node:assert/strict";

import { buildEquipmentList } from "../src/lib/equipmentList.ts";

const item = (name: string, category: string, extra: Record<string, unknown> = {}) => ({ id: name + Math.random(), name, label: "", category, ...extra }) as any;

test("les objets de même nom sont regroupés, par catégorie, avec totaux", () => {
    const text = buildEquipmentList({
        title: "Interview",
        date: new Date(2026, 9, 16),
        items: [
            item("Caméra principale", "camera", { label: "CAM A", specs: { powerWatts: 40, weightKg: 4.5 } }),
            item("Caméra principale", "camera", { label: "CAM A", specs: { powerWatts: 40, weightKg: 4.5 } }),
            item("Fresnel", "light"),
        ],
        nodes: [],
        links: [],
    });

    assert.match(text, /^LISTE DU MATÉRIEL — Interview\nÉtablie le 16 octobre 2026/);
    assert.match(text, /CAMÉRAS & OPTIQUES\n {2}2 × Caméra principale \(CAM A · 80 W · 9 kg\)/);
    assert.match(text, /ÉCLAIRAGES\n {2}1 × Fresnel/);
    assert.match(text, /TOTAL : 3 éléments · 80 W · 9 kg/);
    assert.equal(text.includes("CÂBLAGE"), false);
});

test("le câblage du synoptique est listé avec les noms des ports", () => {
    const nodes = [
        { id: "a", title: "Caméra", portsIn: [], portsOut: [{ id: "o", name: "HDMI", type: "hdmi" }] },
        { id: "b", title: "ATEM", portsIn: [{ id: "i", name: "HDMI 1", type: "hdmi" }], portsOut: [] },
    ] as any;
    const links = [{ id: "l", fromNodeId: "a", fromPortId: "o", toNodeId: "b", toPortId: "i", cableType: "hdmi", label: "Plan large" }] as any;
    const text = buildEquipmentList({ title: "", items: [], nodes, links });

    assert.match(text, /Projet sans titre/);
    assert.match(text, /Aucun élément sur le plan\./);
    assert.match(text, /CÂBLAGE \(1 liaison\)\n {2}Caméra \[HDMI\] → ATEM \[HDMI 1\] · HDMI · Plan large/);
});
