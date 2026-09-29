import { useEffect, useState, type ReactNode } from "react";
import { Clapperboard, Network, PackageOpen } from "lucide-react";

type SharedProject = { title?: string; items?: unknown[]; synopticNodes?: unknown[]; synopticLinks?: unknown[] };

export function ShareViewer() {
    const [project, setProject] = useState<SharedProject | null>(null);
    useEffect(() => {
        const raw = new URLSearchParams(window.location.search).get("data");
        if (!raw) return;
        try { setProject(JSON.parse(raw)); } catch { setProject(null); }
    }, []);

    return <main className="flex min-h-screen flex-col items-center justify-center bg-ink-950 px-6 text-slate-200">
        <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-300/15 text-amber-200"><Clapperboard size={24} /></div>
            <p className="mt-6 text-[10px] uppercase tracking-[0.24em] text-amber-200/80">Shotboard Studio · Lecture seule</p>
            <h1 className="mt-2 text-2xl font-semibold text-white">{project?.title || "Projet partagé"}</h1>
            {project ? <div className="mt-6 grid grid-cols-2 gap-3"><Stat icon={<PackageOpen size={16} />} label="Équipements" value={project.items?.length ?? 0} /><Stat icon={<Network size={16} />} label="Connexions" value={project.synopticLinks?.length ?? 0} /></div> : <p className="mt-4 text-sm text-slate-400">Ce lien ne contient pas de projet lisible.</p>}
            <a href="/" className="mt-8 inline-flex rounded-lg bg-amber-300 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-amber-200">Ouvrir Shotboard Studio</a>
        </div>
    </main>;
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
    return <div className="rounded-xl border border-white/8 bg-black/15 p-4"><div className="flex items-center gap-2 text-cyan-200">{icon}<span className="text-xs text-slate-400">{label}</span></div><p className="mt-2 text-2xl font-semibold text-white">{value}</p></div>;
}
