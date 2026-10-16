import { CATEGORIES } from "./catalog.ts";
import type { BoardObject, SynopticLink, SynopticNode } from "./types.ts";

const number = (value: number) => value.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

/**
 * Liste du matériel en texte brut : objets du plan regroupés par catégorie (quantités cumulées),
 * totaux de consommation et de poids issus des fiches techniques, puis câblage du synoptique.
 */
export function buildEquipmentList(input: {
  title: string;
  items: BoardObject[];
  nodes: SynopticNode[];
  links: SynopticLink[];
  date?: Date;
}): string {
  const { title, items, nodes, links } = input;
  const date = (input.date ?? new Date()).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const lines: string[] = [`LISTE DU MATÉRIEL — ${title.trim() || "Projet sans titre"}`, `Établie le ${date}`, ""];

  let totalWatts = 0;
  let totalKg = 0;
  let totalCount = 0;

  CATEGORIES.forEach((category) => {
    const inCategory = items.filter((item) => item.category === category.id);
    if (!inCategory.length) return;

    // Même nom = même ligne, quantités cumulées.
    const grouped = new Map<string, { name: string; label: string; count: number; watts: number; kg: number }>();
    inCategory.forEach((item) => {
      const key = item.name.trim().toLowerCase();
      const entry = grouped.get(key) ?? { name: item.name.trim(), label: item.label, count: 0, watts: 0, kg: 0 };
      entry.count += 1;
      entry.watts += item.specs?.powerWatts ?? 0;
      entry.kg += item.specs?.weightKg ?? 0;
      grouped.set(key, entry);
    });

    lines.push(category.label.toUpperCase());
    [...grouped.values()]
      .sort((a, b) => a.name.localeCompare(b.name, "fr"))
      .forEach((entry) => {
        const details = [entry.label && !entry.name.toLowerCase().includes(entry.label.toLowerCase()) ? entry.label : "", entry.watts ? `${number(entry.watts)} W` : "", entry.kg ? `${number(entry.kg)} kg` : ""].filter(Boolean);
        lines.push(`  ${entry.count} × ${entry.name}${details.length ? ` (${details.join(" · ")})` : ""}`);
        totalWatts += entry.watts;
        totalKg += entry.kg;
        totalCount += entry.count;
      });
    lines.push("");
  });

  if (!totalCount) lines.push("Aucun élément sur le plan.", "");
  else {
    const totals = [`${totalCount} élément${totalCount > 1 ? "s" : ""}`, totalWatts ? `${number(totalWatts)} W` : "", totalKg ? `${number(totalKg)} kg` : ""].filter(Boolean);
    lines.push(`TOTAL : ${totals.join(" · ")}`, "");
  }

  if (links.length) {
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const portName = (node: SynopticNode | undefined, portId: string | undefined, direction: "in" | "out") =>
      (direction === "in" ? node?.portsIn : node?.portsOut)?.find((port) => port.id === portId)?.name ?? "";
    lines.push(`CÂBLAGE (${links.length} liaison${links.length > 1 ? "s" : ""})`);
    links
      .map((link) => {
        const from = byId.get(link.fromNodeId);
        const to = byId.get(link.toNodeId);
        const left = `${from?.title ?? "?"} [${portName(from, link.fromPortId, "out")}]`;
        const right = `${to?.title ?? "?"} [${portName(to, link.toPortId, "in")}]`;
        return `  ${left} → ${right} · ${link.cableType.toUpperCase()}${link.label ? ` · ${link.label}` : ""}`;
      })
      .sort((a, b) => a.localeCompare(b, "fr"))
      .forEach((line) => lines.push(line));
    lines.push("");
  }

  return lines.join("\n");
}
