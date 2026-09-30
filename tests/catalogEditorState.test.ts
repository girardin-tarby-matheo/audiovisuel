import test from "node:test";
import assert from "node:assert/strict";

import { createCatalogEditorSnapshot, shouldSyncCatalogEditor } from "../src/lib/catalogEditorState.ts";
import { computeSynopticAutoLayout } from "../src/lib/synopticLayout.ts";

const catalogItem = {
    id: "cam-main",
    category: "camera",
    name: "Caméra principale",
    short: "CAM",
    description: "Caméra de plan",
    color: "#5eead4",
    portsIn: [{ id: "in-1", name: "HDMI 1", type: "hdmi" }],
    portsOut: [{ id: "out-1", name: "SDI 1", type: "sdi" }],
    defaults: {
        rotation: 0,
        scale: 1,
        width: 120,
        height: 80,
    },
} as const;

test("createCatalogEditorSnapshot clones ports without mutating the original item", () => {
    const snapshot = createCatalogEditorSnapshot(catalogItem as any);

    snapshot.portsIn[0].name = "Modifié";

    assert.equal(catalogItem.portsIn[0].name, "HDMI 1");
    assert.equal(snapshot.portsIn[0].name, "Modifié");
});

test("shouldSyncCatalogEditor ignores unchanged selections", () => {
    const snapshot = createCatalogEditorSnapshot(catalogItem as any);

    assert.equal(shouldSyncCatalogEditor(snapshot, catalogItem as any), false);
});

test("shouldSyncCatalogEditor triggers when the selected item changes", () => {
    const snapshot = createCatalogEditorSnapshot(catalogItem as any);

    assert.equal(
        shouldSyncCatalogEditor(snapshot, { ...catalogItem, name: "Caméra secondaire" } as any),
        true,
    );
});

test("autoLayoutSynoptic returns the computed layout to avoid stale fit calculations", () => {
    const nodes = [
        { id: "node-a", sourceId: null, title: "Caméra A", subtitle: "Source", deviceType: "camera", color: "#22c55e", x: 80, y: 80, portsIn: [], portsOut: [{ id: "out-a", name: "OUT 1", type: "hdmi" }], needsPower: true },
        { id: "node-b", sourceId: null, title: "ATEM", subtitle: "Mixer", deviceType: "mixer", color: "#3b82f6", x: 300, y: 180, portsIn: [{ id: "in-b", name: "IN 1", type: "hdmi" }], portsOut: [], needsPower: true },
    ] as any;
    const links = [
        { id: "link-1", fromNodeId: "node-a", fromPortId: "out-a", toNodeId: "node-b", toPortId: "in-b", cableType: "hdmi" },
    ] as any;

    const updated = computeSynopticAutoLayout(nodes, links);

    assert.ok(Array.isArray(updated));
    assert.equal(updated.length, 2);
    assert.ok(updated.some((node) => node.id === "node-a" && node.x !== 80));
});

test("auto layout preserves the vertical order of parallel signal branches", () => {
    const nodes = [
        { id: "source-top", sourceId: null, title: "Source haute", subtitle: "", deviceType: "camera", color: "#22c55e", x: 80, y: 80, portsIn: [], portsOut: [{ id: "out-top", name: "OUT", type: "hdmi" }], needsPower: false },
        { id: "source-bottom", sourceId: null, title: "Source basse", subtitle: "", deviceType: "camera", color: "#22c55e", x: 80, y: 420, portsIn: [], portsOut: [{ id: "out-bottom", name: "OUT", type: "hdmi" }], needsPower: false },
        { id: "target-top", sourceId: null, title: "Cible haute", subtitle: "", deviceType: "screen", color: "#3b82f6", x: 500, y: 420, portsIn: [{ id: "in-top", name: "IN", type: "hdmi" }], portsOut: [], needsPower: false },
        { id: "target-bottom", sourceId: null, title: "Cible basse", subtitle: "", deviceType: "screen", color: "#3b82f6", x: 500, y: 80, portsIn: [{ id: "in-bottom", name: "IN", type: "hdmi" }], portsOut: [], needsPower: false },
    ] as any;
    const links = [
        { id: "top-branch", fromNodeId: "source-top", fromPortId: "out-top", toNodeId: "target-top", toPortId: "in-top", cableType: "hdmi" },
        { id: "bottom-branch", fromNodeId: "source-bottom", fromPortId: "out-bottom", toNodeId: "target-bottom", toPortId: "in-bottom", cableType: "hdmi" },
    ] as any;

    const layout = computeSynopticAutoLayout(nodes, links);
    const sourceTop = layout.find((node) => node.id === "source-top")!;
    const sourceBottom = layout.find((node) => node.id === "source-bottom")!;
    const targetTop = layout.find((node) => node.id === "target-top")!;
    const targetBottom = layout.find((node) => node.id === "target-bottom")!;

    assert.ok(sourceTop.y < sourceBottom.y);
    assert.ok(targetTop.y < targetBottom.y);
});
