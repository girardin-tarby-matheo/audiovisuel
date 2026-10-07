import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { useMemo } from "react";
import { useStudio } from "../store/studioStore";
import { validateSynoptic } from "../lib/validation";

export function ValidationPanel({ onClose }: { onClose: () => void }) {
    const nodes = useStudio((state) => state.synopticNodes);
    const links = useStudio((state) => state.synopticLinks);
    const errors = useMemo(() => validateSynoptic(nodes, links), [nodes, links]);
    const nodeNames = new Map(nodes.map((node) => [node.id, node.title]));

    return (
        <aside className="no-export absolute right-4 top-[4.75rem] z-40 w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-surface/95 p-4 shadow-2xl backdrop-blur-md">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-amber-200/70">Contrôle technique</p>
                    <h2 className="mt-1 text-sm font-semibold text-white">Validation du synoptique</h2>
                </div>
                <button type="button" onClick={onClose} aria-label="Fermer le panneau de validation" className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"><X size={15} /></button>
            </div>
            {errors.length === 0 ? (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-200"><CheckCircle2 size={16} /> Aucun problème détecté</div>
            ) : (
                <div className="mt-4 space-y-2">
                    {errors.map((error, index) => (
                        <div key={`${error.nodeId}-${error.type}-${index}`} className={`rounded-xl border p-3 ${error.severity === "error" ? "border-rose-400/20 bg-rose-400/10" : "border-amber-400/20 bg-amber-400/10"}`}>
                            <div className="flex items-start gap-2"><AlertTriangle size={15} className={error.severity === "error" ? "text-rose-300" : "text-amber-300"} /><div><p className="text-xs font-semibold text-slate-100">{nodeNames.get(error.nodeId) ?? "Équipement"}</p><p className="mt-0.5 text-[11px] text-slate-300">{error.message}</p></div></div>
                        </div>
                    ))}
                </div>
            )}
            <p className="mt-3 text-[10px] text-slate-500">{errors.length} anomalie{errors.length !== 1 ? "s" : ""} · recalcul en direct</p>
        </aside>
    );
}
