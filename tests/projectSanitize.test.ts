import test from "node:test";
import assert from "node:assert/strict";

import { safeColor, safeImage, safeNumber, sanitizePlaced } from "../src/lib/projectSanitize.ts";

test("seules les couleurs hexadécimales sont acceptées", () => {
    assert.equal(safeColor("#5eead4"), "#5eead4");
    assert.equal(safeColor("#FFF"), "#FFF");
    assert.equal(safeColor("red; background:url(https://pisteur.example)"), "#94a3b8");
    assert.equal(safeColor(undefined, "#000000"), "#000000");
});

test("les images doivent être des données d'image, du https ou un chemin local", () => {
    assert.ok(safeImage("data:image/png;base64,AAAA"));
    assert.ok(safeImage("https://exemple.fr/camera.webp"));
    assert.ok(safeImage("/visuals/atem.webp"));
    assert.equal(safeImage("javascript:alert(1)"), undefined);
    assert.equal(safeImage("http://exemple.fr/non-chiffre.png"), undefined);
    assert.equal(safeImage("//autre-domaine.example/x.png"), undefined);
    assert.equal(safeImage("data:text/html;base64,AAAA"), undefined);
});

test("les positions invalides retombent sur une valeur finie", () => {
    assert.equal(safeNumber("12", 0), 12);
    assert.equal(safeNumber("abc", 7), 7);
    assert.equal(safeNumber(Infinity, 3), 3);

    const placed = sanitizePlaced({ x: "NaN", y: 40, color: "url(x)", image: "javascript:void(0)" } as any);
    assert.deepEqual([placed.x, placed.y, placed.color, placed.image], [0, 40, "#94a3b8", undefined]);
});
