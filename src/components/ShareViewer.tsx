import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Clapperboard, Network, PackageOpen, FolderInput, Lightbulb } from "lucide-react";
import { ItemGlyph } from "./ItemGlyph";
import { PENDING_IMPORT_KEY, decodeShare } from "../lib/shareImport";
import type { BoardObject } from "../lib/types";

type SharedProject = { title?: string; items?: BoardObject[]; synopticNodes?: unknown[]; synopticLinks?: unknown[] };

export function ShareViewer() {
    const [project, setProject] = useState<SharedProject | null>(null);
    const [raw, setRaw] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        void decodeShare(window.location.hash, window.location.search).then((data) => {
            if (cancelled || !data) return;
            try {
                const parsed = JSON.parse(data);
                if (parsed && typeof parsed === "object") {
                    setProject(parsed);
                    setRaw(data);
                }
            } catch {
                setProject(null);
            }
        });
        return () => { cancelled = true; };
    }, []);

    const openInEditor = () => {
        if (!raw) return;
        try { window.sessionStorage.setItem(PENDING_IMPORT_KEY, raw); } catch { /* stockage indisponible */ }
        window.location.href = "/";
    };

    const items = useMemo(
        () => (Array.isArray(project?.items) ? project.items : []).filter((item): item is BoardObject => Boolean(item) && typeof item === "object" && typeof item.x === "number" && typeof item.y === "number"),
        [project],
    );

    return <main className="grid-floor h-screen overflow-y-auto px-4 py-8 text-slate-200">
        <div className="mx-auto w-full max-w-3xl rounded-3xl border border-white/10 bg-gradient-to-b from-ink-800 to-ink-900 p-6 shadow-2xl sm:p-8" style={{ animation: "modal-in 350ms cubic-bezier(0.16, 1, 0.3, 1) both" }}>
            <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300/20 to-cyan-300/10 text-amber-200"><Clapperboard size={24} /></div>
                <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-amber-200/80">Shotboard Studio · Lecture seule</p>
                    <h1 className="truncate text-2xl font-semibold text-white">{project?.title || "Projet partagé"}</h1>
                </div>
            </div>

            {project ? (
                <>
                    {items.length > 0 && <PlanPreview items={items} />}
                    <div className="mt-5 grid grid-cols-2 gap-3">
                        <Stat icon={<PackageOpen size={16} />} label="Équipements" value={project.items?.length ?? 0} />
                        <Stat icon={<Network size={16} />} label="Connexions" value={project.synopticLinks?.length ?? 0} />
                    </div>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <button type="button" onClick={openInEditor} className="btn btn-primary px-4 py-2.5 text-sm"><FolderInput size={16} /> Ouvrir dans l'éditeur</button>
                        <a href="/" className="btn px-4 py-2.5 text-sm">Retour à mon projet</a>
                    </div>
                    <p className="mt-3 text-[11px] text-slate-500">Votre projet actuel est sauvegardé automatiquement dans « Projets » avant l'import.</p>
                </>
            ) : (
                <>
                    <p className="mt-6 text-sm text-slate-400">Ce lien ne contient pas de projet lisible.</p>
                    <a href="/" className="btn btn-primary mt-6 px-4 py-2.5 text-sm">Ouvrir Shotboard Studio</a>
                </>
            )}
        </div>
    </main>;
}

/** Aperçu du plan, en lecture seule : objets, cônes de caméra et faisceaux, adaptés à la zone. */
function PlanPreview({ items }: { items: BoardObject[] }) {
    const bounds = useMemo(() => {
        const pad = 90;
        const xs = items.map((item) => item.x);
        const ys = items.map((item) => item.y);
        const minX = Math.min(...xs) - pad;
        const maxX = Math.max(...xs) + pad;
        const minY = Math.min(...ys) - pad;
        const maxY = Math.max(...ys) + pad;
        return { minX, minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
    }, [items]);

    const sets = items.filter((item) => item.category === "set");
    const others = items.filter((item) => item.category !== "set");

    return (
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/8 bg-canvas">
            <svg viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`} className="block max-h-[420px] w-full" role="img" aria-label="Aperçu du plan de tournage">
                {sets.map((item) => {
                    const w = item.width ?? 120;
                    const h = item.height ?? 60;
                    return (
                        <g key={item.id} transform={`translate(${item.x} ${item.y}) rotate(${item.rotation ?? 0})`}>
                            <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={10} fill={`${item.color}18`} stroke={`${item.color}66`} strokeWidth={1.5} />
                        </g>
                    );
                })}
                {others.map((item) => (
                    <g key={`cone-${item.id}`} transform={`translate(${item.x} ${item.y}) rotate(${item.rotation ?? 0})`}>
                        {item.category === "camera" && <path d={cone((item.fov ?? 50) / 2, 190 * (item.scale ?? 1))} fill={`${item.color}26`} stroke={`${item.color}66`} strokeWidth={1} strokeDasharray="4 3" />}
                        {item.category === "light" && <path d={cone((item.beamSpread ?? 80) / 2, (item.beamRadius ?? 160) * (item.scale ?? 1))} fill={`${item.color}33`} stroke={`${item.color}77`} strokeWidth={1} strokeDasharray="4 3" />}
                    </g>
                ))}
                {others.map((item) => {
                    const size = 52 * (item.scale ?? 1);
                    return (
                        <g key={item.id} transform={`translate(${item.x} ${item.y})`}>
                            <circle r={size / 2} fill="var(--color-surface)" stroke={`${item.color}99`} strokeWidth={2} />
                            <g transform={`translate(${-size * 0.32} ${-size * 0.32})`}>
                                <ItemGlyph category={item.category} catalogId={item.catalogId} color={item.color} size={size * 0.64} />
                            </g>
                        </g>
                    );
                })}
                {items.map((item) => (
                    <text
                        key={`t-${item.id}`}
                        x={item.x}
                        y={item.y + (item.category === "set" ? (item.height ?? 60) / 2 + 18 : (52 * (item.scale ?? 1)) / 2 + 18)}
                        textAnchor="middle"
                        fontSize={13}
                        fontWeight={600}
                        fill="currentColor"
                        className="text-slate-200"
                        style={{ paintOrder: "stroke", stroke: "var(--color-canvas)", strokeWidth: 4 }}
                    >
                        {item.name}
                    </text>
                ))}
            </svg>
            <p className="flex items-center gap-1.5 border-t border-white/6 px-4 py-2 text-[11px] text-slate-500"><Lightbulb size={12} /> Aperçu simplifié du plan</p>
        </div>
    );
}

function cone(halfDegrees: number, range: number) {
    const half = (halfDegrees * Math.PI) / 180;
    return `M 0 0 L ${Math.sin(-half) * range} ${-Math.cos(-half) * range} A ${range} ${range} 0 0 1 ${Math.sin(half) * range} ${-Math.cos(half) * range} Z`;
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
    return <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4"><div className="flex items-center gap-2 text-cyan-200">{icon}<span className="text-xs text-slate-400">{label}</span></div><p className="mt-2 text-2xl font-semibold text-white">{value}</p></div>;
}
