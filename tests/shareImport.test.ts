import test from "node:test";
import assert from "node:assert/strict";

import { encodeShare, decodeShare } from "../src/lib/shareImport.ts";

test("un projet encodé dans le fragment se relit à l'identique", async () => {
    const project = { title: "Interview — é à ü", items: Array.from({ length: 40 }, (_, index) => ({ id: `i-${index}`, name: "Caméra", x: index * 20, y: 40 })) };
    const json = JSON.stringify(project);
    const encoded = await encodeShare(json);

    assert.ok(encoded.startsWith("z="));
    assert.ok(encoded.length < json.length, "le lien doit être plus court que le JSON brut");
    assert.equal(await decodeShare(`#${encoded}`, ""), json);
});

test("l'ancien format ?data= reste lisible", async () => {
    const json = JSON.stringify({ title: "Ancien lien" });
    assert.equal(await decodeShare("", `?data=${encodeURIComponent(json)}`), json);
});

test("un fragment corrompu ne lève pas d'erreur", async () => {
    assert.equal(await decodeShare("#z=%%%pas-du-base64", ""), null);
});
