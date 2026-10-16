import { useEffect, useMemo, useRef, useState } from "react";
import { ClipboardCopy, Download, FileText, FolderOpen, History, Plus, Save, Trash2, Upload, X } from "lucide-react";
import { useStudio } from "../store/studioStore";
import { buildEquipmentList } from "../lib/equipmentList";
import { backupProject, deleteProject, projectStats, readProjects, saveProject, type SavedProject } from "../lib/projectLibrary";

function downloadFile(name: string, data: string, extension: "json" | "txt") {
    const blob = new Blob([data], { type: extension === "json" ? "application/json" : "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${name.replace(/[\\/:*?"<>|]+/g, "-") || "shotboard"}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
}

const formatDate = (iso: string) => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
};

export function ProjectManagerModal({ onClose }: { onClose: () => void }) {
    const title = useStudio((state) => state.title);
    const items = useStudio((state) => state.items);
    const synopticNodes = useStudio((state) => state.synopticNodes);
    const synopticLinks = useStudio((state) => state.synopticLinks);
    const exportProject = useStudio((state) => state.exportProject);
    const importProject = useStudio((state) => state.importProject);
    const importEquipmentList = useStudio((state) => state.importEquipmentList);
    const resetBoard = useStudio((state) => state.resetBoard);
    const setToast = useStudio((state) => state.setToast);
    const fileRef = useRef<HTMLInputElement>(null);
    const [projects, setProjects] = useState<SavedProject[]>(() => readProjects());
    const projectName = title.trim() || "Projet sans titre";
    const alreadySaved = useMemo(() => projects.some((project) => !project.autoBackup && project.name === projectName), [projects, projectName]);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const equipmentText = () => buildEquipmentList({ title: projectName, items, nodes: synopticNodes, links: synopticLinks });
    const downloadEquipment = () => downloadFile(`${projectName} - materiel`, equipmentText(), "txt");
    const copyEquipment = async () => {
        try {
            await navigator.clipboard.writeText(equipmentText());
            setToast("Liste du matériel copiée ✓");
        } catch {
            setToast("Copie impossible : utilisez le téléchargement");
        }
    };

    /** Avant de remplacer le projet en cours, on le met de côté dans la sauvegarde automatique. */
    const backupCurrent = () => backupProject(projectName, exportProject());

    const save = () => {
        const result = saveProject(projectName, exportProject());
        setProjects(result.projects);
        setToast(!result.ok ? "Stockage du navigateur plein : exportez le projet en JSON" : result.replaced ? `« ${projectName} » mis à jour ✓` : `« ${projectName} » enregistré ✓`);
    };
    const create = () => {
        if (!window.confirm("Créer un nouveau projet ? Le projet actuel sera conservé dans la sauvegarde automatique.")) return;
        backupCurrent();
        resetBoard();
        onClose();
    };
    const load = (project: SavedProject) => {
        backupCurrent();
        importProject(project.data);
        onClose();
    };
    const remove = (project: SavedProject) => {
        if (!window.confirm(`Supprimer définitivement « ${project.name} » de la liste ?`)) return;
        setProjects(deleteProject(project.id));
    };
    const onFile = (file?: File) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result !== "string") return;
            const content = reader.result.trim();
            // Un fichier CSV (ou une liste JSON) ajoute des équipements ; un projet JSON remplace le projet en cours.
            if (file.name.toLowerCase().endsWith(".csv") || content.startsWith("[")) {
                importEquipmentList(content);
            } else {
                backupCurrent();
                importProject(content);
            }
            onClose();
        };
        reader.readAsText(file);
    };

    return (
        <div
            className="animate-fade-in fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
        >
            <div role="dialog" aria-modal="true" aria-label="Bibliothèque de projets" className="modal-card flex max-h-[min(720px,calc(100vh-2rem))] w-full max-w-2xl flex-col rounded-3xl border border-white/10 bg-gradient-to-b from-ink-800 to-surface p-6 shadow-2xl">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/70">Projets</p>
                        <h2 className="mt-1 text-lg font-semibold text-white">Bibliothèque de projets</h2>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"><X size={18} /></button>
                </div>

                <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <p className="section-title">Projet en cours</p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">{projectName}</p>
                            <p className="mt-0.5 text-[11px] text-slate-400">{items.length} objet{items.length !== 1 ? "s" : ""} · {synopticNodes.length} appareil{synopticNodes.length !== 1 ? "s" : ""} · {synopticLinks.length} liaison{synopticLinks.length !== 1 ? "s" : ""}</p>
                        </div>
                        <button type="button" onClick={save} className="btn btn-primary"><Save size={14} /> {alreadySaved ? "Mettre à jour" : "Enregistrer"}</button>
                    </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={create} className="btn"><Plus size={14} /> Nouveau</button>
                    <button type="button" onClick={() => downloadFile(projectName, exportProject(), "json")} className="btn"><Download size={14} /> Exporter JSON</button>
                    <button type="button" onClick={() => fileRef.current?.click()} className="btn"><Upload size={14} /> Importer JSON / CSV</button>
                    <button type="button" onClick={downloadEquipment} className="btn" title="Télécharger la liste du matériel (texte)"><FileText size={14} /> Liste du matériel (.txt)</button>
                    <button type="button" onClick={() => void copyEquipment()} className="btn px-2.5" title="Copier la liste du matériel" aria-label="Copier la liste du matériel"><ClipboardCopy size={14} /></button>
                    <input ref={fileRef} type="file" accept="application/json,.json,.csv,text/csv" className="hidden" onChange={(event) => { onFile(event.target.files?.[0]); event.target.value = ""; }} />
                </div>

                <div className="scrollbar-thin mt-5 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                    {projects.length === 0 && (
                        <p className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">
                            Aucun projet enregistré. « Enregistrer » garde une copie du projet en cours dans ce navigateur.
                        </p>
                    )}
                    {projects.map((project) => {
                        const stats = projectStats(project.data);
                        return (
                            <div key={project.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3 transition hover:border-white/15 hover:bg-white/[0.05]">
                                <div className="min-w-0">
                                    <p className="flex items-center gap-2 truncate text-sm font-medium text-white">
                                        {project.autoBackup && <History size={13} className="shrink-0 text-amber-300" />}
                                        <span className="truncate">{project.name}</span>
                                    </p>
                                    <p className="mt-1 text-[11px] text-slate-500">
                                        {formatDate(project.savedAt)}
                                        {stats && ` · ${stats.items} objet${stats.items !== 1 ? "s" : ""} · ${stats.devices} appareil${stats.devices !== 1 ? "s" : ""}`}
                                    </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                    <button type="button" onClick={() => load(project)} title="Ouvrir" aria-label={`Ouvrir ${project.name}`} className="btn px-2.5 py-1.5"><FolderOpen size={14} /> Ouvrir</button>
                                    <button type="button" onClick={() => downloadFile(project.name, project.data, "json")} title="Télécharger en JSON" aria-label={`Télécharger ${project.name}`} className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"><Download size={15} /></button>
                                    <button type="button" onClick={() => remove(project)} title="Supprimer" aria-label={`Supprimer ${project.name}`} className="rounded-lg p-2 text-rose-300 transition hover:bg-white/10"><Trash2 size={15} /></button>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <p className="mt-3 text-[10px] text-slate-500">Ouvrir, importer ou créer un projet met d'abord le projet en cours dans la sauvegarde automatique.</p>
            </div>
        </div>
    );
}
