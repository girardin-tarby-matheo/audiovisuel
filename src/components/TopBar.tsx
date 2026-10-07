import { useState, useCallback, useEffect } from "react";
import { Download, Share2, Clapperboard, RotateCcw, Loader2, Check, LayoutDashboard, Network, FolderOpen, Undo2, Redo2, Sun, Moon, PanelLeft, PanelRight, Keyboard } from "lucide-react";
import { toPng } from "html-to-image";
import { useStudio } from "../store/studioStore";
import { encodeShare } from "../lib/shareImport";
import { useHistory, undo, redo } from "../store/history";

type ActionState = "idle" | "busy" | "done";

type PanelControls = { library: boolean; properties: boolean; onToggleLibrary: () => void; onToggleProperties: () => void };

export function TopBar({ onOpenProjects, onOpenShortcuts, panels }: { onOpenProjects: () => void; onOpenShortcuts?: () => void; panels?: PanelControls }) {
  const title = useStudio((s) => s.title);
  const viewMode = useStudio((s) => s.viewMode);
  const synopticNodes = useStudio((s) => s.synopticNodes);
  const items = useStudio((s) => s.items);
  const setTitle = useStudio((s) => s.setTitle);
  const setViewMode = useStudio((s) => s.setViewMode);
  const generateSynoptic = useStudio((s) => s.generateSynoptic);
  const setToast = useStudio((s) => s.setToast);
  const resetBoard = useStudio((s) => s.resetBoard);
  const exportProject = useStudio((s) => s.exportProject);

  const canUndo = useHistory((s) => s.canUndo);
  const canRedo = useHistory((s) => s.canRedo);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    if (document.documentElement.dataset.theme === "light") setTheme("light");
  }, []);
  const toggleTheme = useCallback(() => {
    const next = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try { window.localStorage.setItem("shotboard-theme", next); } catch { /* stockage indisponible */ }
    setTheme(next);
  }, [theme]);
  const [shareState, setShareState] = useState<ActionState>("idle");
  const [exportState, setExportState] = useState<ActionState>("idle");
  const totalPower = items.reduce((total, item) => total + (item.specs?.powerWatts ?? 0), 0);
  const totalWeight = items.reduce((total, item) => total + (item.specs?.weightKg ?? 0), 0);

  const share = useCallback(async () => {
    if (shareState !== "idle") return;
    setShareState("busy");
    // Contenu allégé : sans image de fond ni catalogue d'usine (seuls les objets personnalisés sont conservés).
    const full = JSON.parse(exportProject());
    const shared = {
      title: full.title,
      status: full.status,
      items: full.items,
      synopticNodes: full.synopticNodes,
      synopticLinks: full.synopticLinks,
      visibleLayers: full.visibleLayers,
      catalog: Array.isArray(full.catalog) ? full.catalog.filter((entry: { isCustom?: boolean }) => entry.isCustom) : [],
    };
    const url = `${window.location.origin}/share/preview#${await encodeShare(JSON.stringify(shared))}`;
    if (url.length > 200000) {
      setToast("Projet trop volumineux pour un lien partageable · Exportez le JSON");
      setShareState("idle");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setToast("Lien de partage copié ✓");
    } catch {
      window.prompt("Copiez le lien de partage :", url);
    }
    setShareState("done");
    window.setTimeout(() => {
      setShareState("idle");
      setToast(null);
    }, 2600);
  }, [shareState, exportProject, setToast]);

  const exportPng = useCallback(async () => {
    if (exportState !== "idle") return;
    setExportState("busy");
    const node = document.getElementById("board-export");
    if (!node) {
      setExportState("idle");
      return;
    }
    try {
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue("--color-canvas").trim() || "#0b0e15",
        filter: (element) => !(element instanceof HTMLElement && element.classList.contains("no-export")),
      });
      const link = document.createElement("a");
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      link.download = `${slug || "shotboard"}-${viewMode}.png`;
      link.href = dataUrl;
      link.click();
      setToast("Export PNG téléchargé ✓");
      setExportState("done");
    } catch {
      setToast("Export impossible — réessayez");
      setExportState("idle");
    }
    window.setTimeout(() => {
      setExportState("idle");
      setToast(null);
    }, 2600);
  }, [exportState, title, viewMode, setToast]);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 whitespace-nowrap border-b border-white/6 bg-chrome/95 px-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {panels && (
          <button type="button" onClick={panels.onToggleLibrary} aria-pressed={panels.library} title="Afficher / masquer la bibliothèque" aria-label="Afficher ou masquer la bibliothèque" className={`rounded-xl border border-white/8 p-2 transition hover:bg-white/8 hover:text-white ${panels.library ? "text-amber-200" : "text-slate-400"}`}>
            <PanelLeft size={16} />
          </button>
        )}
        <div className="hidden h-9 w-9 shrink-0 items-center md:flex justify-center rounded-xl bg-gradient-to-br from-amber-300/20 to-cyan-300/10 text-amber-200 transition-transform hover:scale-105">
          <Clapperboard size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Shotboard Studio</p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full max-w-[420px] min-w-[6rem] truncate bg-transparent text-[15px] font-semibold text-white outline-none transition-colors focus:text-amber-100"
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="tooltip-trigger">
          <span className="hidden cursor-default text-[11px] text-slate-500 md:inline">
            {items.length} objet{items.length !== 1 ? "s" : ""}
          </span>
          <span className="tooltip-text">Éléments sur le plateau</span>
        </div>
        <div className="hidden text-[10px] text-slate-500 lg:block" title="Charge calculée à partir des fiches techniques">
          {totalPower > 0 ? `${totalPower} W` : "— W"} · {totalWeight > 0 ? `${totalWeight.toFixed(1)} kg` : "— kg"}
        </div>

        <div className="flex rounded-xl border border-white/8 bg-white/[0.03] p-0.5" aria-label="Mode de travail">
          <button type="button" onClick={() => setViewMode("plan")} aria-pressed={viewMode === "plan"} className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] transition-all ${viewMode === "plan" ? "bg-amber-400/15 text-amber-200 shadow-sm" : "text-slate-500 hover:text-slate-300"}`}>
            <LayoutDashboard size={13} /> Plan
          </button>
          <button type="button" onClick={() => { if (!synopticNodes.length) generateSynoptic(); else setViewMode("synoptic"); }} aria-pressed={viewMode === "synoptic"} className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] transition-all ${viewMode === "synoptic" ? "bg-violet-400/15 text-violet-200 shadow-sm" : "text-slate-500 hover:text-slate-300"}`}>
            <Network size={13} /> Synoptique
          </button>
        </div>

        <div className="flex rounded-xl border border-white/8 p-0.5">
          <button type="button" onClick={undo} disabled={!canUndo} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/8 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent" title="Annuler (Ctrl+Z)" aria-label="Annuler">
            <Undo2 size={15} />
          </button>
          <button type="button" onClick={redo} disabled={!canRedo} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/8 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent" title="Rétablir (Ctrl+Y)" aria-label="Rétablir">
            <Redo2 size={15} />
          </button>
        </div>

        {panels && (
          <button type="button" onClick={panels.onToggleProperties} aria-pressed={panels.properties} title="Afficher / masquer les propriétés" aria-label="Afficher ou masquer les propriétés" className={`rounded-xl border border-white/8 p-2 transition hover:bg-white/8 hover:text-white ${panels.properties ? "text-amber-200" : "text-slate-400"}`}>
            <PanelRight size={16} />
          </button>
        )}

        {onOpenShortcuts && (
          <button type="button" onClick={onOpenShortcuts} title="Raccourcis clavier (?)" aria-label="Raccourcis clavier" className="hidden rounded-xl border border-white/8 p-2 text-slate-400 transition hover:bg-white/8 hover:text-white lg:block">
            <Keyboard size={16} />
          </button>
        )}

        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-xl border border-white/8 p-2 text-slate-400 transition hover:bg-white/8 hover:text-white"
          title={theme === "light" ? "Passer en thème sombre" : "Passer en thème clair"}
          aria-label={theme === "light" ? "Passer en thème sombre" : "Passer en thème clair"}
        >
          {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        <button
          type="button"
          onClick={onOpenProjects}
          className="rounded-xl border border-white/8 p-2 text-slate-400 transition hover:bg-white/8 hover:text-white"
          title="Gérer les projets"
          aria-label="Gérer les projets"
        >
          <FolderOpen size={16} />
        </button>

        <button
          type="button"
          onClick={() => {
            useStudio.getState().setEditingCatalogItemId(null);
            useStudio.getState().setCatalogModalOpen(true);
          }}
          className="flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/5 px-2.5 py-2 text-xs text-amber-200 hover:bg-white/10 hover:border-amber-400/30 transition"
          title="Personnaliser les objets & la bibliothèque"
        >
          <span className="text-amber-300">✨</span>
          <span className="hidden sm:inline">Objets</span>
        </button>

        <button
          type="button"
          onClick={resetBoard}
          className="rounded-xl border border-white/8 p-2 text-slate-400 transition-all hover:rotate-[-45deg] hover:text-white"
          title="Réinitialiser le plateau"
        >
          <RotateCcw size={16} />
        </button>

        <button
          type="button"
          onClick={share}
          disabled={shareState !== "idle"}
          className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all duration-200 ${shareState === "done"
            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
            : "border-white/10 bg-white/5 text-slate-100 hover:bg-white/8"
            }`}
        >
          {shareState === "busy" ? (
            <Loader2 size={15} className="animate-spin" />
          ) : shareState === "done" ? (
            <Check size={15} />
          ) : (
            <Share2 size={15} />
          )}
          <span className="hidden xl:inline">{shareState === "done" ? "Copié !" : "Partager"}</span>
        </button>

        <button
          type="button"
          onClick={exportPng}
          disabled={exportState !== "idle"}
          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 ${exportState === "done"
            ? "bg-emerald-400/90 text-ink-950"
            : exportState === "busy"
              ? "bg-amber-300/60 text-ink-950"
              : "bg-amber-300/90 text-ink-950 hover:bg-[#fde68a] hover:shadow-lg hover:shadow-amber-300/20"
            }`}
        >
          {exportState === "busy" ? (
            <Loader2 size={15} className="animate-spin" />
          ) : exportState === "done" ? (
            <Check size={15} />
          ) : (
            <Download size={15} />
          )}
          <span className="hidden lg:inline">{exportState === "done" ? "Téléchargé !" : "Export PNG"}</span>
        </button>
      </div>
    </header>
  );
}
