import { useState, useMemo, useRef, type ChangeEvent, type DragEvent } from "react";
import {
  X,
  Plus,
  Search,
  Upload,
  Image as ImageIcon,
  Trash2,
  Copy,
  RotateCcw,
  Check,
  Sparkles,
  Sliders,
  Eye,
  Info,
  Zap,
  Network,
  AlertTriangle,
} from "lucide-react";
import { useStudio } from "../store/studioStore";
import { CATEGORIES } from "../lib/catalog";
import { ItemGlyph } from "./ItemGlyph";
import { VisualAsset } from "./VisualAsset";
import { CABLE_COLORS } from "./SynopticBoard";
import type { Category, CatalogItem, CableType, SynopticPort, SynopticDeviceType } from "../lib/types";

const COLOR_PRESETS = [
  "#5eead4", // Cyan
  "#2dd4bf", // Teal
  "#4ade80", // Green
  "#fcd34d", // Amber/Yellow
  "#fb923c", // Orange
  "#f87171", // Red
  "#f472b6", // Pink
  "#c084fc", // Purple
  "#818cf8", // Indigo
  "#60a5fa", // Blue
  "#94a3b8", // Slate
  "#e2e8f0", // Light
];

const CABLE_TYPES: { id: CableType; label: string; color: string }[] = [
  { id: "hdmi", label: "HDMI", color: "#f97316" },
  { id: "sdi", label: "SDI", color: "#ef4444" },
  { id: "xlr", label: "XLR", color: "#3b82f6" },
  { id: "jack", label: "Jack / Mini-jack", color: "#ec4899" },
  { id: "usb", label: "USB", color: "#06b6d4" },
];

const DEVICE_TYPES: { id: SynopticDeviceType; label: string }[] = [
  { id: "camera", label: "Caméra" },
  { id: "mixer", label: "Mélangeur vidéo (ATEM)" },
  { id: "audio", label: "Console / Mixeur audio" },
  { id: "mic", label: "Microphone" },
  { id: "screen", label: "Écran / Moniteur" },
  { id: "computer", label: "Ordinateur / PC Live" },
  { id: "recorder", label: "Enregistreur Master" },
  { id: "converter", label: "Convertisseur" },
  { id: "di", label: "Boîtier d'injection (DI)" },
  { id: "headphone", label: "Casque d'écoute" },
  { id: "generic", label: "Équipement générique" },
];

export function CatalogManagerModal() {
  const isOpen = useStudio((s) => s.isCatalogModalOpen);
  const setIsOpen = useStudio((s) => s.setCatalogModalOpen);
  const catalog = useStudio((s) => s.catalog);
  const editingId = useStudio((s) => s.editingCatalogItemId);
  const setEditingId = useStudio((s) => s.setEditingCatalogItemId);
  const addCatalogItem = useStudio((s) => s.addCatalogItem);
  const updateCatalogItem = useStudio((s) => s.updateCatalogItem);
  const duplicateCatalogItem = useStudio((s) => s.duplicateCatalogItem);
  const removeCatalogItem = useStudio((s) => s.removeCatalogItem);
  const resetCatalog = useStudio((s) => s.resetCatalog);

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Form state for current edited item
  const selectedItem = useMemo(() => {
    return catalog.find((c) => c.id === editingId) ?? (catalog[0] || null);
  }, [catalog, editingId]);

  const [formState, setFormState] = useState<CatalogItem | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync form state when selection changes
  const currentActiveId = isCreatingNew ? "new" : selectedItem?.id;
  const lastActiveIdRef = useRef<string | null>(null);

  if (lastActiveIdRef.current !== currentActiveId && !isCreatingNew && selectedItem) {
    lastActiveIdRef.current = currentActiveId;
    setFormState({
      ...selectedItem,
      portsIn: selectedItem.portsIn ? [...selectedItem.portsIn] : [],
      portsOut: selectedItem.portsOut ? [...selectedItem.portsOut] : [],
    });
  }

  // Filter items
  const query = search.toLowerCase().trim();
  const filteredCatalog = useMemo(() => {
    return catalog.filter((item) => {
      const matchCat =
        selectedCategory === "all" ||
        selectedCategory === item.category ||
        (selectedCategory === "custom" && item.isCustom);
      if (!matchCat) return false;
      if (!query) return true;
      return (
        item.name.toLowerCase().includes(query) ||
        item.short.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      );
    });
  }, [catalog, selectedCategory, query]);

  if (!isOpen) return null;

  const startCreateNew = () => {
    setIsCreatingNew(true);
    lastActiveIdRef.current = "new";
    setFormState({
      id: `custom-${Date.now()}`,
      name: "Nouvel objet personnalisé",
      short: "OBJ",
      category: "set",
      description: "Description de l'objet",
      color: "#f5b942",
      isCustom: true,
      portsIn: [],
      portsOut: [{ id: crypto.randomUUID(), name: "OUT 1", type: "hdmi" }],
      needsPower: false,
      defaults: {
        rotation: 0,
        scale: 1,
        width: 120,
        height: 80,
      },
    });
  };

  const handleFileUpload = (file: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result && formState) {
        setFormState({ ...formState, image: result });
      }
    };
    reader.readAsDataURL(file);
  };

  const onDropFile = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSave = () => {
    if (!formState) return;
    if (isCreatingNew) {
      const newId = addCatalogItem(formState);
      setIsCreatingNew(false);
      setEditingId(newId);
    } else {
      updateCatalogItem(formState.id, formState, true);
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  // Port management helpers
  const addPort = (direction: "in" | "out", type: CableType = "hdmi") => {
    if (!formState) return;
    const currentPorts = direction === "in" ? (formState.portsIn ?? []) : (formState.portsOut ?? []);
    const portCount = currentPorts.length + 1;
    const defaultName =
      type === "hdmi"
        ? `HDMI ${direction === "out" ? "OUT" : portCount}`
        : type === "sdi"
          ? `SDI ${direction === "out" ? "OUT" : portCount}`
          : type === "xlr"
            ? `XLR ${portCount}`
            : type === "jack"
              ? `Jack ${portCount}`
              : `USB ${portCount}`;

    const newPort: SynopticPort = {
      id: crypto.randomUUID(),
      name: defaultName,
      type,
    };

    if (direction === "in") {
      setFormState({ ...formState, portsIn: [...currentPorts, newPort] });
    } else {
      setFormState({ ...formState, portsOut: [...currentPorts, newPort] });
    }
  };

  const updatePort = (direction: "in" | "out", portId: string, patch: Partial<SynopticPort>) => {
    if (!formState) return;
    const currentPorts = direction === "in" ? (formState.portsIn ?? []) : (formState.portsOut ?? []);
    const updated = currentPorts.map((p) => (p.id === portId ? { ...p, ...patch } : p));
    if (direction === "in") {
      setFormState({ ...formState, portsIn: updated });
    } else {
      setFormState({ ...formState, portsOut: updated });
    }
  };

  const removePort = (direction: "in" | "out", portId: string) => {
    if (!formState) return;
    const currentPorts = direction === "in" ? (formState.portsIn ?? []) : (formState.portsOut ?? []);
    const filtered = currentPorts.filter((p) => p.id !== portId);
    if (direction === "in") {
      setFormState({ ...formState, portsIn: filtered });
    } else {
      setFormState({ ...formState, portsOut: filtered });
    }
  };

  const portsIn = formState?.portsIn ?? [];
  const portsOut = formState?.portsOut ?? [];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 backdrop-blur-md animate-fade-in p-4">
      <div
        className="flex h-[90vh] max-h-[860px] w-full max-w-5xl flex-col rounded-3xl border border-white/10 bg-[#0e1118] shadow-2xl overflow-hidden"
        style={{ animation: "modal-in 260ms cubic-bezier(0.16, 1, 0.3, 1) both" }}
      >
        {/* Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/8 px-6 bg-[#121620]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400/20 to-violet-400/20 text-amber-300">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Personnalisation des Objets & Connectiques</h2>
              <p className="text-xs text-slate-400">
                Configurez les photos, couleurs, dimensions et toutes les entrées / sorties (HDMI, SDI, XLR, Jack, USB).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={startCreateNew}
              className="flex items-center gap-1.5 rounded-xl bg-amber-400 px-3.5 py-2 text-xs font-semibold text-ink-950 transition hover:bg-amber-300 active:scale-95 shadow-md"
            >
              <Plus size={15} />
              Créer un nouvel objet
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-xl border border-white/10 p-2 text-slate-400 hover:bg-white/5 hover:text-white transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content body : Left list / Right editor */}
        <div className="flex min-h-0 flex-1">
          {/* Left Column : Catalog items list */}
          <div className="flex w-[320px] shrink-0 flex-col border-r border-white/8 bg-[#0b0d13]">
            {/* Search & Category filter */}
            <div className="border-b border-white/6 p-3 space-y-2.5">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un objet…"
                  className="field pl-8 text-xs py-1.5"
                />
              </div>

              {/* Filter pills */}
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedCategory("all")}
                  className={`rounded-lg px-2 py-1 text-[10px] font-semibold transition ${selectedCategory === "all"
                      ? "bg-amber-400/20 text-amber-200 border border-amber-400/40"
                      : "bg-white/[0.03] text-slate-400 hover:text-white"
                    }`}
                >
                  Tous ({catalog.length})
                </button>
                {CATEGORIES.map((cat) => {
                  const count = catalog.filter((i) => i.category === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`rounded-lg px-2 py-1 text-[10px] font-semibold transition ${selectedCategory === cat.id
                          ? "bg-amber-400/20 text-amber-200 border border-amber-400/40"
                          : "bg-white/[0.03] text-slate-400 hover:text-white"
                        }`}
                    >
                      {cat.label.split(" ")[0]} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Items list */}
            <div className="scrollbar-thin flex-1 overflow-y-auto p-2 space-y-1">
              {filteredCatalog.map((item) => {
                const isSelected =
                  !isCreatingNew && (editingId === item.id || (!editingId && selectedItem?.id === item.id));
                const inCount = item.portsIn?.length ?? 0;
                const outCount = item.portsOut?.length ?? 0;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setIsCreatingNew(false);
                      setEditingId(item.id);
                      setFormState({
                        ...item,
                        portsIn: item.portsIn ? [...item.portsIn] : [],
                        portsOut: item.portsOut ? [...item.portsOut] : [],
                      });
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-xl p-2 text-left transition-all ${isSelected
                        ? "bg-amber-400/15 border border-amber-400/40 shadow-sm"
                        : "border border-transparent hover:bg-white/[0.04]"
                      }`}
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/40 relative overflow-hidden"
                      style={{ borderColor: `${item.color}44` }}
                    >
                      <VisualAsset
                        visualKey={item.visualKey ?? item.id}
                        image={item.image}
                        fit={item.fit}
                        background={item.background}
                        alt={item.name}
                        fallback={
                          <ItemGlyph category={item.category} catalogId={item.id} color={item.color} size={20} />
                        }
                      />
                      {item.image && (
                        <span className="absolute -bottom-0.5 -right-0.5 rounded-tl bg-emerald-500 px-1 text-[7px] font-bold text-black uppercase">
                          Photo
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-semibold text-slate-200">{item.name}</span>
                        {item.isCustom && (
                          <span className="rounded bg-violet-400/20 px-1 py-0.2 text-[8px] font-mono text-violet-300">
                            Perso
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[9px] text-slate-400">{item.short}</span>
                        {(inCount > 0 || outCount > 0) && (
                          <span className="font-mono text-[9px] text-cyan-300/80">
                            {inCount} IN · {outCount} OUT
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}

              {filteredCatalog.length === 0 && (
                <div className="py-12 text-center text-xs text-slate-500">Aucun objet trouvé</div>
              )}
            </div>

            {/* Footer reset button */}
            <div className="border-t border-white/6 p-3 bg-[#0a0c10]">
              <button
                type="button"
                onClick={() => {
                  if (confirm("Réinitialiser tous les objets du catalogue aux valeurs par défaut ?")) {
                    resetCatalog();
                  }
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-2 text-xs text-slate-400 hover:bg-white/5 hover:text-white transition"
              >
                <RotateCcw size={13} />
                Réinitialiser la bibliothèque d'usine
              </button>
            </div>
          </div>

          {/* Right Column : Item Editor */}
          {formState ? (
            <div className="scrollbar-thin flex-1 overflow-y-auto p-6 space-y-6">
              {/* Header preview banner */}
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-gradient-to-r from-white/[0.04] to-transparent p-4">
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 shadow-xl overflow-hidden bg-black/50"
                    style={{ borderColor: formState.color }}
                  >
                    <VisualAsset
                      visualKey={formState.visualKey ?? formState.id}
                      image={formState.image}
                      fit={formState.fit}
                      background={formState.background}
                      alt={formState.name}
                      fallback={
                        <ItemGlyph
                          category={formState.category}
                          catalogId={formState.id}
                          color={formState.color}
                          size={30}
                        />
                      }
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                      {isCreatingNew ? "Nouvel équipement" : `Édition : ${formState.id}`}
                    </span>
                    <h3 className="text-lg font-bold text-white">{formState.name || "Sans titre"}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="font-mono text-xs text-slate-400">Code : {formState.short || "---"}</p>
                      <span className="text-slate-600">·</span>
                      <span className="text-xs font-semibold text-cyan-300">
                        {portsIn.length} entrée(s) IN · {portsOut.length} sortie(s) OUT
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isCreatingNew && (
                    <button
                      type="button"
                      onClick={() => duplicateCatalogItem(formState.id)}
                      className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 hover:bg-white/10 transition"
                      title="Dupliquer cet objet"
                    >
                      <Copy size={13} />
                      Dupliquer
                    </button>
                  )}
                  {!isCreatingNew && formState.isCustom && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Supprimer « ${formState.name} » ?`)) {
                          removeCatalogItem(formState.id);
                        }
                      }}
                      className="flex items-center gap-1.5 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-300 hover:bg-rose-400/20 transition"
                      title="Supprimer cet objet personnalisé"
                    >
                      <Trash2 size={13} />
                      Supprimer
                    </button>
                  )}
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. Informations Générales */}
                <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 space-y-3.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300/80">
                    1. Informations Générales
                  </p>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Nom de l'objet</label>
                    <input
                      value={formState.name}
                      onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                      className="field text-sm"
                      placeholder="Ex: Caméra Sony FX3"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Code court (étiquette)</label>
                      <input
                        value={formState.short}
                        onChange={(e) => setFormState({ ...formState, short: e.target.value.toUpperCase() })}
                        className="field font-mono text-sm uppercase"
                        placeholder="Ex: FX3"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Catégorie</label>
                      <select
                        value={formState.category}
                        onChange={(e) => setFormState({ ...formState, category: e.target.value as Category })}
                        className="field text-xs"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat.id} value={cat.id} className="bg-[#121620] text-white">
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Description / Notes techniques</label>
                    <textarea
                      value={formState.description}
                      onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                      rows={2}
                      className="field text-xs resize-none"
                      placeholder="Détails techniques, rôle..."
                    />
                  </div>

                  {/* Couleur */}
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1.5">Couleur d'identification</label>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {COLOR_PRESETS.map((col) => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => setFormState({ ...formState, color: col })}
                          className={`h-6 w-6 rounded-full transition-transform ${formState.color === col
                              ? "scale-125 ring-2 ring-white ring-offset-2 ring-offset-[#0e1118]"
                              : "hover:scale-110"
                            }`}
                          style={{ backgroundColor: col }}
                        />
                      ))}
                      <input
                        type="color"
                        value={formState.color}
                        onChange={(e) => setFormState({ ...formState, color: e.target.value })}
                        className="h-6 w-8 cursor-pointer rounded border border-white/20 bg-transparent ml-2"
                        title="Couleur personnalisée"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Photo & Visuel Personnalisé */}
                <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-300/80">
                      2. Photo & Visuel
                    </p>
                    {formState.image && (
                      <button
                        type="button"
                        onClick={() => setFormState({ ...formState, image: undefined })}
                        className="text-[10px] text-rose-400 hover:text-rose-300 underline"
                      >
                        Retirer la photo
                      </button>
                    )}
                  </div>

                  {/* Drag and drop zone */}
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={onDropFile}
                    className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/15 bg-black/20 p-4 text-center hover:border-cyan-400/40 transition cursor-pointer relative"
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Upload size={22} className="text-cyan-300 mb-1.5" />
                    <p className="text-xs font-semibold text-slate-200">Téléversez une photo de l'appareil</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Glissez une image ici ou cliquez pour choisir (PNG, JPG, WebP)
                    </p>
                  </div>

                  {/* URL Input */}
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Ou saisir une URL d'image web :</label>
                    <div className="flex items-center gap-2">
                      <ImageIcon size={14} className="text-slate-500 shrink-0" />
                      <input
                        value={formState.image || ""}
                        onChange={(e) => setFormState({ ...formState, image: e.target.value || undefined })}
                        className="field text-xs py-1.5"
                        placeholder="https://exemple.com/camera.png ou /visuals/..."
                      />
                    </div>
                  </div>

                  {/* Image Fit & Background options */}
                  {formState.image && (
                    <div className="grid grid-cols-2 gap-3 pt-1 border-t border-white/6">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Cadrage image</label>
                        <select
                          value={formState.fit || "contain"}
                          onChange={(e) => setFormState({ ...formState, fit: e.target.value as any })}
                          className="field text-xs py-1"
                        >
                          <option value="contain" className="bg-[#121620]">
                            Contenir (Entier)
                          </option>
                          <option value="cover" className="bg-[#121620]">
                            Remplir (Cover)
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Fond du cadre</label>
                        <input
                          value={formState.background || ""}
                          onChange={(e) => setFormState({ ...formState, background: e.target.value })}
                          className="field text-xs py-1"
                          placeholder="transparent ou #000000"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Connectiques & Ports Synoptique (Entrées / Sorties) */}
              <div className="rounded-2xl border border-violet-400/20 bg-violet-400/[0.02] p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 pb-3">
                  <div className="flex items-center gap-2">
                    <Network size={16} className="text-violet-300" />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-violet-200">
                        3. Connectiques & Ports (Câblage Synoptique)
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Définissez les entrées/sorties audio et vidéo pour le câblage dans le synoptique.
                      </p>
                    </div>
                  </div>

                  {/* Power & Warning options */}
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300 hover:text-white">
                      <input
                        type="checkbox"
                        checked={formState.needsPower ?? false}
                        onChange={(e) => setFormState({ ...formState, needsPower: e.target.checked })}
                        className="rounded border-white/20 bg-black/40 text-red-500 focus:ring-red-500"
                      />
                      <span className="flex items-center gap-1 text-red-400 font-semibold">
                        <Zap size={13} fill="currentColor" /> Nécessite une alim secteur
                      </span>
                    </label>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400">Type de boîtier :</span>
                      <select
                        value={formState.deviceType ?? "generic"}
                        onChange={(e) => setFormState({ ...formState, deviceType: e.target.value as SynopticDeviceType })}
                        className="field text-xs py-1"
                      >
                        {DEVICE_TYPES.map((dt) => (
                          <option key={dt.id} value={dt.id} className="bg-[#121620]">
                            {dt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Ports Columns : IN (Left) and OUT (Right) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Entrées (IN) */}
                  <div className="rounded-xl border border-white/8 bg-black/20 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 font-bold text-[10px] text-cyan-300">
                          IN
                        </span>
                        <h4 className="text-xs font-bold text-slate-200">
                          Entrées ({portsIn.length})
                        </h4>
                      </div>

                      {/* Add port buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => addPort("in", "hdmi")}
                          className="flex items-center gap-1 rounded-lg border border-orange-500/30 bg-orange-500/10 px-2 py-1 text-[10px] font-semibold text-orange-200 hover:bg-orange-500/20 transition"
                        >
                          + HDMI
                        </button>
                        <button
                          type="button"
                          onClick={() => addPort("in", "sdi")}
                          className="flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] font-semibold text-red-200 hover:bg-red-500/20 transition"
                        >
                          + SDI
                        </button>
                        <button
                          type="button"
                          onClick={() => addPort("in", "xlr")}
                          className="flex items-center gap-1 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[10px] font-semibold text-blue-200 hover:bg-blue-500/20 transition"
                        >
                          + XLR
                        </button>
                        <button
                          type="button"
                          onClick={() => addPort("in", "jack")}
                          className="flex items-center gap-1 rounded-lg border border-pink-500/30 bg-pink-500/10 px-2 py-1 text-[10px] font-semibold text-pink-200 hover:bg-pink-500/20 transition"
                        >
                          + Jack
                        </button>
                      </div>
                    </div>

                    {/* Ports in list */}
                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                      {portsIn.map((port, idx) => {
                        const cableCfg = CABLE_COLORS[port.type] || CABLE_COLORS.hdmi;
                        return (
                          <div
                            key={port.id}
                            className="flex items-center gap-2 rounded-lg border border-white/6 bg-white/[0.02] p-1.5"
                          >
                            <span className="font-mono text-[9px] text-slate-500 w-4 text-center">
                              #{idx + 1}
                            </span>
                            <div
                              className="h-3 w-3 rounded-full shrink-0"
                              style={{ backgroundColor: cableCfg.color }}
                              title={cableCfg.label}
                            />
                            <input
                              value={port.name}
                              onChange={(e) => updatePort("in", port.id, { name: e.target.value })}
                              placeholder="Nom du port"
                              className="field text-xs py-1 flex-1 font-medium"
                            />
                            <select
                              value={port.type}
                              onChange={(e) => updatePort("in", port.id, { type: e.target.value as CableType })}
                              className="field text-[11px] py-1 w-28 shrink-0"
                            >
                              {CABLE_TYPES.map((ct) => (
                                <option key={ct.id} value={ct.id} className="bg-[#121620]">
                                  {ct.label}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => removePort("in", port.id)}
                              className="p-1 text-slate-500 hover:text-rose-400 transition"
                              title="Supprimer ce port"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        );
                      })}

                      {portsIn.length === 0 && (
                        <p className="py-4 text-center text-xs text-slate-500">
                          Aucune entrée configurée. Cliquez sur un bouton ci-dessus pour en ajouter.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Sorties (OUT) */}
                  <div className="rounded-xl border border-white/8 bg-black/20 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded bg-violet-500/20 px-1.5 py-0.5 font-bold text-[10px] text-violet-300">
                          OUT
                        </span>
                        <h4 className="text-xs font-bold text-slate-200">
                          Sorties ({portsOut.length})
                        </h4>
                      </div>

                      {/* Add port buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => addPort("out", "hdmi")}
                          className="flex items-center gap-1 rounded-lg border border-orange-500/30 bg-orange-500/10 px-2 py-1 text-[10px] font-semibold text-orange-200 hover:bg-orange-500/20 transition"
                        >
                          + HDMI
                        </button>
                        <button
                          type="button"
                          onClick={() => addPort("out", "sdi")}
                          className="flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] font-semibold text-red-200 hover:bg-red-500/20 transition"
                        >
                          + SDI
                        </button>
                        <button
                          type="button"
                          onClick={() => addPort("out", "xlr")}
                          className="flex items-center gap-1 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[10px] font-semibold text-blue-200 hover:bg-blue-500/20 transition"
                        >
                          + XLR
                        </button>
                        <button
                          type="button"
                          onClick={() => addPort("out", "jack")}
                          className="flex items-center gap-1 rounded-lg border border-pink-500/30 bg-pink-500/10 px-2 py-1 text-[10px] font-semibold text-pink-200 hover:bg-pink-500/20 transition"
                        >
                          + Jack
                        </button>
                        <button
                          type="button"
                          onClick={() => addPort("out", "usb")}
                          className="flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[10px] font-semibold text-cyan-200 hover:bg-cyan-500/20 transition"
                        >
                          + USB
                        </button>
                      </div>
                    </div>

                    {/* Ports out list */}
                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                      {portsOut.map((port, idx) => {
                        const cableCfg = CABLE_COLORS[port.type] || CABLE_COLORS.hdmi;
                        return (
                          <div
                            key={port.id}
                            className="flex items-center gap-2 rounded-lg border border-white/6 bg-white/[0.02] p-1.5"
                          >
                            <span className="font-mono text-[9px] text-slate-500 w-4 text-center">
                              #{idx + 1}
                            </span>
                            <div
                              className="h-3 w-3 rounded-full shrink-0"
                              style={{ backgroundColor: cableCfg.color }}
                              title={cableCfg.label}
                            />
                            <input
                              value={port.name}
                              onChange={(e) => updatePort("out", port.id, { name: e.target.value })}
                              placeholder="Nom du port"
                              className="field text-xs py-1 flex-1 font-medium"
                            />
                            <select
                              value={port.type}
                              onChange={(e) => updatePort("out", port.id, { type: e.target.value as CableType })}
                              className="field text-[11px] py-1 w-28 shrink-0"
                            >
                              {CABLE_TYPES.map((ct) => (
                                <option key={ct.id} value={ct.id} className="bg-[#121620]">
                                  {ct.label}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => removePort("out", port.id)}
                              className="p-1 text-slate-500 hover:text-rose-400 transition"
                              title="Supprimer ce port"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        );
                      })}

                      {portsOut.length === 0 && (
                        <p className="py-4 text-center text-xs text-slate-500">
                          Aucune sortie configurée. Cliquez sur un bouton ci-dessus pour en ajouter.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Dimensions & Géométrie */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 space-y-3.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-violet-300/80">
                    4. Dimensions par défaut
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>Largeur</span>
                        <span className="font-mono text-white">{formState.defaults.width ?? 96} px</span>
                      </div>
                      <input
                        type="range"
                        min={40}
                        max={600}
                        step={5}
                        value={formState.defaults.width ?? 96}
                        onChange={(e) =>
                          setFormState({
                            ...formState,
                            defaults: { ...formState.defaults, width: Number(e.target.value) },
                          })
                        }
                        className="w-full"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>Hauteur</span>
                        <span className="font-mono text-white">{formState.defaults.height ?? 96} px</span>
                      </div>
                      <input
                        type="range"
                        min={40}
                        max={600}
                        step={5}
                        value={formState.defaults.height ?? 96}
                        onChange={(e) =>
                          setFormState({
                            ...formState,
                            defaults: { ...formState.defaults, height: Number(e.target.value) },
                          })
                        }
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Échelle d'affichage</span>
                      <span className="font-mono text-white">{formState.defaults.scale.toFixed(2)}×</span>
                    </div>
                    <input
                      type="range"
                      min={0.6}
                      max={2.0}
                      step={0.05}
                      value={formState.defaults.scale}
                      onChange={(e) =>
                        setFormState({
                          ...formState,
                          defaults: { ...formState.defaults, scale: Number(e.target.value) },
                        })
                      }
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 space-y-3.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-300/80">
                    5. Optique / Éclairage
                  </p>

                  {formState.category === "camera" && (
                    <div>
                      <div className="flex justify-between text-[11px] text-cyan-200 mb-1">
                        <span>Champ de vision (FOV Caméra)</span>
                        <span className="font-mono text-white">{formState.defaults.fov ?? 50}°</span>
                      </div>
                      <input
                        type="range"
                        min={18}
                        max={120}
                        step={1}
                        value={formState.defaults.fov ?? 50}
                        onChange={(e) =>
                          setFormState({
                            ...formState,
                            defaults: { ...formState.defaults, fov: Number(e.target.value) },
                          })
                        }
                        className="w-full"
                      />
                    </div>
                  )}

                  {formState.category === "light" && (
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-[11px] text-amber-200 mb-1">
                          <span>Rayon du faisceau</span>
                          <span className="font-mono text-white">{formState.defaults.beamRadius ?? 180} px</span>
                        </div>
                        <input
                          type="range"
                          min={40}
                          max={400}
                          step={5}
                          value={formState.defaults.beamRadius ?? 180}
                          onChange={(e) =>
                            setFormState({
                              ...formState,
                              defaults: { ...formState.defaults, beamRadius: Number(e.target.value) },
                            })
                          }
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}

                  {formState.category !== "camera" && formState.category !== "light" && (
                    <div className="flex items-center gap-2 text-xs text-slate-400 py-3">
                      <Info size={16} className="text-slate-500 shrink-0" />
                      <span>Paramètres de plateau standard configurés.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Save actions bar */}
              <div className="flex items-center justify-between border-t border-white/8 pt-5">
                <div className="flex items-center gap-2">
                  {savedSuccess && (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-300 font-semibold bg-emerald-400/10 px-3 py-1.5 rounded-lg">
                      <Check size={14} /> Modifications enregistrées et synchronisées !
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/5 transition"
                  >
                    Fermer
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-xs font-bold text-ink-950 hover:bg-amber-300 active:scale-95 transition shadow-lg shadow-amber-400/20"
                  >
                    <Check size={16} />
                    {isCreatingNew ? "Créer l'objet" : "Enregistrer les modifications"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-slate-500">
              Sélectionnez un objet à gauche pour le personnaliser.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
