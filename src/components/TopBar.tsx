import { useState, useCallback } from "react";
import { Download, Share2, Clapperboard, RotateCcw, Loader2, Check, LayoutDashboard, Network } from "lucide-react";
import { toPng } from "html-to-image";
import { useStudio } from "../store/studioStore";

type ActionState = "idle" | "busy" | "done";

export function TopBar() {
  const title = useStudio((s) => s.title);
  const viewMode = useStudio((s) => s.viewMode);
  const synopticNodes = useStudio((s) => s.synopticNodes);
  const items = useStudio((s) => s.items);
  const setTitle = useStudio((s) => s.setTitle);
  const setViewMode = useStudio((s) => s.setViewMode);
  const generateSynoptic = useStudio((s) => s.generateSynoptic);
  const setToast = useStudio((s) => s.setToast);
  const resetBoard = useStudio((s) => s.resetBoard);

  const [shareState, setShareState] = useState<ActionState>("idle");
  const [exportState, setExportState] = useState<ActionState>("idle");

  const share = useCallback(async () => {
    if (shareState !== "idle") return;
    setShareState("busy");
    const id = crypto.randomUUID().slice(0, 8);
    const url = `${window.location.origin}/share/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setToast(`Lien copié · ${url}`);
    } catch {
      setToast(url);
    }
    setShareState("done");
    window.setTimeout(() => {
      setShareState("idle");
      setToast(null);
    }, 2600);
  }, [shareState, setToast]);

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
        pixelRatio: 2,
        backgroundColor: viewMode === "synoptic" ? "#ffffff" : "#0b0e15",
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
  }, [exportState, title, setToast]);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/6 bg-[#0c0e14]/95 px-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300/20 to-cyan-300/10 text-amber-200 transition-transform hover:scale-105">
          <Clapperboard size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Shotboard Studio</p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-[min(420px,42vw)] truncate bg-transparent text-[15px] font-semibold text-white outline-none transition-colors focus:text-amber-100"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="tooltip-trigger">
          <span className="hidden cursor-default text-[11px] text-slate-500 md:inline">
            {items.length} objet{items.length !== 1 ? "s" : ""}
          </span>
          <span className="tooltip-text">Éléments sur le plateau</span>
        </div>

        <div className="flex rounded-xl border border-white/8 bg-white/[0.03] p-0.5" aria-label="Mode de travail">
          <button type="button" onClick={() => setViewMode("plan")} aria-pressed={viewMode === "plan"} className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] transition-all ${viewMode === "plan" ? "bg-amber-400/15 text-amber-200 shadow-sm" : "text-slate-500 hover:text-slate-300"}`}>
            <LayoutDashboard size={13} /> Plan
          </button>
          <button type="button" onClick={() => { if (!synopticNodes.length) generateSynoptic(); else setViewMode("synoptic"); }} aria-pressed={viewMode === "synoptic"} className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] transition-all ${viewMode === "synoptic" ? "bg-violet-400/15 text-violet-200 shadow-sm" : "text-slate-500 hover:text-slate-300"}`}>
            <Network size={13} /> Synoptique
          </button>
        </div>

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
          {shareState === "done" ? "Copié !" : "Partager"}
        </button>

        <button
          type="button"
          onClick={exportPng}
          disabled={exportState !== "idle"}
          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 ${exportState === "done"
            ? "bg-emerald-400/90 text-ink-950"
            : exportState === "busy"
              ? "bg-amber-300/60 text-ink-950"
              : "bg-amber-300/90 text-ink-950 hover:bg-amber-200 hover:shadow-lg hover:shadow-amber-300/20"
            }`}
        >
          {exportState === "busy" ? (
            <Loader2 size={15} className="animate-spin" />
          ) : exportState === "done" ? (
            <Check size={15} />
          ) : (
            <Download size={15} />
          )}
          {exportState === "done" ? "Téléchargé !" : "Export PNG"}
        </button>
      </div>
    </header>
  );
}
