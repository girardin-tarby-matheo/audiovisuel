import { useRef, useState } from "react";
import { Download, FolderOpen, Plus, Save, Trash2, Upload, X } from "lucide-react";
import { useStudio } from "../store/studioStore";

type SavedProject = { id: string; name: string; savedAt: string; data: string };
const STORAGE_KEY = "shotboard-projects";

function readProjects(): SavedProject[] {
    try {
        const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        return Array.isArray(value) ? value : [];
    } catch {
        return [];
    }
}

function writeProjects(projects: SavedProject[]) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    } catch {
        // Storage may be unavailable in restrictive contexts.
    }
}

export function ProjectManagerModal({ onClose }: { onClose: () => void }) {
    const title = useStudio((state) => state.title);
    const exportProject = useStudio((state) => state.exportProject);
    const importProject = useStudio((state) => state.importProject);
    const importEquipmentList = useStudio((state) => state.importEquipmentList);
    const resetBoard = useStudio((state) => state.resetBoard);
    const fileRef = useRef<HTMLInputElement>(null);
    const [projects, setProjects] = useState<SavedProject[]>(() => readProjects());

    const persist = (next: SavedProject[]) => { setProjects(next); writeProjects(next); };
    const save = () => {
        const project: SavedProject = { id: crypto.randomUUID(), name: title || "Projet sans titre", savedAt: new Date().toISOString(), data: exportProject() };
        persist([project, ...projects]);
    };
    const download = () => {
        const blob = new Blob([exportProject()], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a"); link.href = url; link.download = `${title || "shotboard"}.json`; link.click(); URL.revokeObjectURL(url);
    };
    const load = (project: SavedProject) => { importProject(project.data); onClose(); };
    const create = () => { resetBoard(); onClose(); };
    return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
        <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-surface p-5 shadow-2xl">
            <div className="flex items-start justify-between"><div><p className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/70">Projets</p><h2 className="mt-1 text-lg font-semibold text-white">Bibliothèque de projets</h2></div><button type="button" onClick={onClose} aria-label="Fermer"><X size={18} /></button></div>
            <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" onClick={save} className="flex items-center gap-2 rounded-lg bg-amber-300 px-3 py-2 text-xs font-semibold text-black"><Save size={14} /> Enregistrer</button>
                <button type="button" onClick={create} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-200"><Plus size={14} /> Nouveau</button>
                <button type="button" onClick={download} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-200"><Download size={14} /> Exporter JSON</button>
                <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-200"><Upload size={14} /> Importer JSON / CSV</button>
                <input ref={fileRef} type="file" accept="application/json,.json,.csv,text/csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { if (typeof reader.result === "string") { const content = reader.result.trim(); if (file.name.toLowerCase().endsWith(".csv") || content.startsWith("[")) importEquipmentList(content); else importProject(content); onClose(); } }; reader.readAsText(file); }} />
            </div>
            <div className="mt-5 space-y-2">
                {projects.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">Aucun projet enregistré</p>}
                {projects.map((project) => <div key={project.id} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] p-3"><div><p className="text-sm font-medium text-white">{project.name}</p><p className="mt-1 text-[11px] text-slate-500">{new Date(project.savedAt).toLocaleString("fr-FR")}</p></div><div className="flex items-center gap-1"><button type="button" onClick={() => load(project)} title="Ouvrir" aria-label={`Ouvrir ${project.name}`} className="rounded-lg p-2 text-cyan-200 hover:bg-white/10"><FolderOpen size={15} /></button><button type="button" onClick={() => persist(projects.filter((item) => item.id !== project.id))} title="Supprimer" aria-label={`Supprimer ${project.name}`} className="rounded-lg p-2 text-rose-300 hover:bg-white/10"><Trash2 size={15} /></button></div></div>)}
            </div>
        </div>
    </div>;
}
