import test from "node:test";
import assert from "node:assert/strict";

import { CATALOG, CATALOG_MAP } from "../src/lib/catalog.ts";
import { REGIE_LAYOUT, REGIE_TEMPLATES, buildSynoptic } from "../src/lib/synopticBuild.ts";
import { SYNOPTIC_TEMPLATES } from "../src/lib/synopticTemplates.ts";
import { validateSynoptic } from "../src/lib/validation.ts";

const itemFor = (catalogId: string, index = 0) => {
    const entry = CATALOG_MAP[catalogId];
    return { id: `item-${catalogId}-${index}`, catalogId, category: entry.category, name: entry.name, label: entry.short, color: entry.color, x: 0, y: 0 } as any;
};
const startItems = () => REGIE_LAYOUT.map(([catalogId]) => itemFor(catalogId));

test("tous les objets de la régie de départ existent dans le catalogue", () => {
    REGIE_LAYOUT.forEach(([catalogId]) => assert.ok(CATALOG_MAP[catalogId], `${catalogId} absent du catalogue`));
    assert.equal(new Set(CATALOG.map((entry) => entry.id)).size, CATALOG.length, "identifiants du catalogue uniques");
});

test("plan et synoptique correspondent : chaque équipement de régie du plan a son appareil, et inversement", () => {
    const planRegie = REGIE_LAYOUT.map(([catalogId]) => catalogId).filter((catalogId) => !catalogId.startsWith("talent-"));
    assert.deepEqual([...planRegie].sort(), Object.keys(REGIE_TEMPLATES).sort());

    const items = startItems();
    const { nodes } = buildSynoptic({ items, catalog: CATALOG });
    const regieItems = items.filter((item: any) => REGIE_TEMPLATES[item.catalogId]);

    assert.equal(nodes.length, regieItems.length);
    regieItems.forEach((item: any) => {
        const node = nodes.find((candidate) => candidate.sourceId === item.id);
        assert.ok(node, `${item.name} n'a pas d'appareil dans le synoptique`);
        assert.equal(node!.title, item.name, "même nom sur le plan et dans le synoptique");
        assert.equal(node!.deviceType, SYNOPTIC_TEMPLATES[REGIE_TEMPLATES[item.catalogId]].deviceType);
    });
});

test("le câblage standard est complet, sans doublon, et sans anomalie de câble", () => {
    const { nodes, links } = buildSynoptic({ items: startItems(), catalog: CATALOG });

    assert.equal(links.length, 7);
    assert.equal(new Set(links.map((link) => `${link.toNodeId}:${link.toPortId}`)).size, links.length, "une source par entrée");
    const errors = validateSynoptic(nodes, links).filter((error) => error.severity === "error");
    assert.deepEqual(errors, []);
});

test("retirer un équipement du plan retire son appareil et ses câbles, pas le reste", () => {
    const items = startItems().filter((item: any) => item.catalogId !== "set-hyperdeck");
    const { nodes, links } = buildSynoptic({ items, catalog: CATALOG });
    const hyperdeck = nodes.find((node) => node.deviceType === "recorder");

    assert.equal(hyperdeck, undefined);
    assert.equal(links.length, 5, "les deux liaisons du HyperDeck disparaissent");
    assert.equal(nodes.length, 8);
});

test("les caméras et micros du plan se câblent sur le mélangeur et la console", () => {
    const items = [...startItems(), itemFor("cam-main"), itemFor("cam-b"), itemFor("audio-lav")];
    const { nodes, links } = buildSynoptic({ items, catalog: CATALOG });
    const atem = nodes.find((node) => node.deviceType === "mixer")!;
    const yamaha = nodes.find((node) => node.deviceType === "audio")!;

    assert.equal(links.filter((link) => link.toNodeId === atem.id && link.cableType === "hdmi").length, 2);
    assert.equal(links.filter((link) => link.toNodeId === yamaha.id && link.cableType === "xlr").length, 1);
});

test("sans mélangeur sur le plan, les caméras restent des appareils sans câble (pas de lien orphelin)", () => {
    const items = [itemFor("cam-main"), itemFor("set-monitor")];
    const { nodes, links } = buildSynoptic({ items, catalog: CATALOG });

    assert.equal(nodes.length, 2);
    assert.equal(links.length, 0);
});
