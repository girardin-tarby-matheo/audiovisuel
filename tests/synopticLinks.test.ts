import test from "node:test";
import assert from "node:assert/strict";

import { connectPorts, evaluateConnection, linkGeometry, orient, pickPortOnNode, sanitizeLinks, validTargets } from "../src/lib/synopticLinks.ts";
import { validateSynoptic } from "../src/lib/validation.ts";

const node = (id: string, portsIn: Array<[string, string]> = [], portsOut: Array<[string, string]> = [], deviceType = "generic") => ({
    id, sourceId: null, title: id, subtitle: "", deviceType, color: "#fff", x: 0, y: 0, needsPower: false,
    portsIn: portsIn.map(([portId, type]) => ({ id: portId, name: portId, type })),
    portsOut: portsOut.map(([portId, type]) => ({ id: portId, name: portId, type })),
}) as any;

let counter = 0;
const makeId = () => `link-${(counter += 1)}`;

// Plusieurs appareils partagent volontairement les mêmes identifiants de port, comme les modèles réels.
const camera = node("cam", [], [["hdmi-out", "hdmi"]]);
const camera2 = node("cam2", [], [["hdmi-out", "hdmi"]]);
const mixer = node("mix", [["hdmi-in-1", "hdmi"], ["hdmi-in-2", "hdmi"], ["xlr-1", "xlr"]], [["pgm", "hdmi"]], "mixer");
const screen = node("screen", [["hdmi-in-1", "hdmi"]], []);

test("un lien HDMI entre une sortie et une entrée HDMI est accepté", () => {
    const result = connectPorts([camera, mixer], [], { nodeId: "cam", portId: "hdmi-out" }, { nodeId: "mix", portId: "hdmi-in-1" }, makeId);
    assert.equal(result.ok, true);
    if (result.ok) {
        assert.equal(result.links.length, 1);
        assert.equal(result.link.cableType, "hdmi");
        assert.equal(result.replaced, null);
    }
});

test("des types de câbles différents sont refusés avec une raison lisible", () => {
    const result = evaluateConnection([camera, mixer], [], { nodeId: "cam", portId: "hdmi-out" }, { nodeId: "mix", portId: "xlr-1" });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.reason, /HDMI → XLR/);
});

test("on ne peut pas relier un appareil à lui-même ni utiliser un port inexistant", () => {
    assert.equal(evaluateConnection([mixer], [], { nodeId: "mix", portId: "pgm" }, { nodeId: "mix", portId: "hdmi-in-1" }).ok, false);
    assert.equal(evaluateConnection([camera, mixer], [], { nodeId: "cam", portId: "nope" }, { nodeId: "mix", portId: "hdmi-in-1" }).ok, false);
});

test("une entrée n'a qu'une source : la nouvelle remplace l'ancienne", () => {
    const first = connectPorts([camera, camera2, mixer], [], { nodeId: "cam", portId: "hdmi-out" }, { nodeId: "mix", portId: "hdmi-in-1" }, makeId);
    assert.ok(first.ok);
    const second = connectPorts([camera, camera2, mixer], first.ok ? first.links : [], { nodeId: "cam2", portId: "hdmi-out" }, { nodeId: "mix", portId: "hdmi-in-1" }, makeId);
    assert.ok(second.ok);
    if (second.ok && first.ok) {
        assert.equal(second.links.length, 1);
        assert.equal(second.replaced?.id, first.link.id);
        assert.equal(second.links[0].fromNodeId, "cam2");
    }
});

test("une sortie peut alimenter plusieurs entrées, mais pas deux fois la même", () => {
    const first = connectPorts([mixer, screen, camera], [], { nodeId: "mix", portId: "pgm" }, { nodeId: "screen", portId: "hdmi-in-1" }, makeId);
    assert.ok(first.ok);
    const sameAgain = evaluateConnection([mixer, screen], first.ok ? first.links : [], { nodeId: "mix", portId: "pgm" }, { nodeId: "screen", portId: "hdmi-in-1" });
    assert.equal(sameAgain.ok, false);
});

test("orient permet de tirer un câble depuis une entrée", () => {
    const { from, to } = orient({ nodeId: "mix", portId: "hdmi-in-1", direction: "in" }, { nodeId: "cam", portId: "hdmi-out" });
    assert.deepEqual(from, { nodeId: "cam", portId: "hdmi-out" });
    assert.deepEqual(to, { nodeId: "mix", portId: "hdmi-in-1" });
});

test("validTargets ne propose que les ports compatibles, et pickPortOnNode préfère une entrée libre", () => {
    const links = [{ id: "l1", fromNodeId: "cam", fromPortId: "hdmi-out", toNodeId: "mix", toPortId: "hdmi-in-1", cableType: "hdmi" }] as any;
    const source = { nodeId: "cam2", portId: "hdmi-out", direction: "out" as const };
    const targets = validTargets([camera, camera2, mixer, screen], links, source);

    assert.ok(targets.has("mix:in:hdmi-in-1"), "une entrée occupée reste cible (elle serait remplacée)");
    assert.ok(targets.has("mix:in:hdmi-in-2"));
    assert.ok(targets.has("screen:in:hdmi-in-1"));
    assert.equal(targets.has("mix:in:xlr-1"), false, "XLR n'accepte pas du HDMI");
    assert.equal(pickPortOnNode([camera, camera2, mixer, screen], links, source, "mix"), "hdmi-in-2");
});

test("sanitizeLinks retire les liens orphelins, doublons et types incohérents, et rattache les liens sans port", () => {
    const links = [
        { id: "ok", fromNodeId: "cam", fromPortId: "hdmi-out", toNodeId: "mix", toPortId: "hdmi-in-1", cableType: "hdmi" },
        { id: "ghost-node", fromNodeId: "gone", fromPortId: "x", toNodeId: "mix", toPortId: "hdmi-in-2", cableType: "hdmi" },
        { id: "ghost-port", fromNodeId: "cam", fromPortId: "removed", toNodeId: "mix", toPortId: "hdmi-in-2", cableType: "hdmi" },
        { id: "wrong-type", fromNodeId: "cam", fromPortId: "hdmi-out", toNodeId: "mix", toPortId: "xlr-1", cableType: "hdmi" },
        { id: "dup-input", fromNodeId: "cam2", fromPortId: "hdmi-out", toNodeId: "mix", toPortId: "hdmi-in-1", cableType: "hdmi" },
        { id: "legacy", fromNodeId: "mix", toNodeId: "screen", cableType: "hdmi" },
    ] as any;
    const { links: clean, removed } = sanitizeLinks([camera, camera2, mixer, screen], links);

    assert.deepEqual(clean.map((link) => link.id), ["dup-input", "legacy"], "le plus récent l'emporte sur une même entrée");
    assert.equal(removed, 4);
    const legacy = clean.find((link) => link.id === "legacy")!;
    assert.equal(legacy.fromPortId, "pgm");
    assert.equal(legacy.toPortId, "hdmi-in-1");
});

test("la validation distingue les ports de même identifiant sur des appareils différents", () => {
    // « hdmi-in-1 » existe sur le mélangeur ET sur l'écran : relier l'écran ne doit pas « connecter » le mélangeur.
    const links = [{ id: "l", fromNodeId: "cam", fromPortId: "hdmi-out", toNodeId: "screen", toPortId: "hdmi-in-1", cableType: "hdmi" }] as any;
    const errors = validateSynoptic([camera, mixer, screen], links);
    const mixerWarning = errors.find((error) => error.nodeId === "mix" && error.type === "unconnected_port");

    assert.ok(mixerWarning, "le mélangeur a toujours ses entrées libres");
    assert.match(mixerWarning!.message, /^3 entrée/);
});

test("la validation détecte une boucle de signal", () => {
    const a = node("a", [["in", "hdmi"]], [["out", "hdmi"]]);
    const b = node("b", [["in", "hdmi"]], [["out", "hdmi"]]);
    const links = [
        { id: "1", fromNodeId: "a", fromPortId: "out", toNodeId: "b", toPortId: "in", cableType: "hdmi" },
        { id: "2", fromNodeId: "b", fromPortId: "out", toNodeId: "a", toPortId: "in", cableType: "hdmi" },
    ] as any;
    const loops = validateSynoptic([a, b], links).filter((error) => error.type === "signal_loop");

    assert.equal(loops.length, 2);
});

test("le tracé d'un câble passe par ses extrémités, y compris en retour arrière", () => {
    const forward = linkGeometry({ x: 0, y: 0 }, { x: 300, y: 100 });
    assert.match(forward.d, /^M 0 0 C /);
    assert.equal(forward.mid.x, 150);

    const backward = linkGeometry({ x: 400, y: 0 }, { x: 100, y: 200 });
    assert.ok(backward.d.includes("100 200"));
    assert.ok(Number.isFinite(backward.mid.x) && Number.isFinite(backward.mid.y));
});
