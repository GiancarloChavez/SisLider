"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronRight, ChevronDown, Plus, ChevronsDownUp, ChevronsUpDown,
  Pencil, Search, GraduationCap, CalendarDays, Users,
  Trash2, AlertTriangle, Lock, X, CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type CursoSerialized } from "@/lib/actions/cursos";
import {
  deleteBatch,
  type BlockedGrupo,
  type HorarioSerialized,
  type HorarioSelectData,
} from "@/lib/actions/horarios";
import { CursoDialog } from "./CursoDialog";
import { HorarioDialog } from "../horarios/HorarioDialog";

type Props = {
  cursos: CursoSerialized[];
  horarios: HorarioSerialized[];
  selectData: HorarioSelectData;
};

const DIA_ABREV: Record<string, string> = {
  Lunes: "Lu", Martes: "Ma", Miércoles: "Mi",
  Jueves: "Ju", Viernes: "Vi", Sábado: "Sa", Domingo: "Do",
};

const DIA_COLORS: Record<string, string> = {
  Lunes:     "bg-blue-50 text-blue-700 border-blue-200",
  Martes:    "bg-violet-50 text-violet-700 border-violet-200",
  Miércoles: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Jueves:    "bg-orange-50 text-orange-700 border-orange-200",
  Viernes:   "bg-pink-50 text-pink-700 border-pink-200",
  Sábado:    "bg-teal-50 text-teal-700 border-teal-200",
  Domingo:   "bg-zinc-50 text-zinc-600 border-zinc-200",
};

type GrupoEstado = "vigente" | "proximo" | "culminado" | null;

function getGrupoEstado(h: HorarioSerialized): GrupoEstado {
  if (!h.fechaInicio || !h.fechaFin) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [sy, sm, sd] = h.fechaInicio.split("-").map(Number);
  const [ey, em, ed] = h.fechaFin.split("-").map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end   = new Date(ey, em - 1, ed);
  if (today < start) return "proximo";
  if (today > end)   return "culminado";
  return "vigente";
}

const ESTADO_STYLES: Record<string, string> = {
  vigente:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  proximo:   "bg-blue-50 text-blue-700 border-blue-200",
  culminado: "bg-zinc-100 text-zinc-500 border-zinc-200",
};
const ESTADO_LABELS: Record<string, string> = {
  vigente:   "Vigente",
  proximo:   "Próximo",
  culminado: "Culminado",
};

function EstadoPill({ estado }: { estado: GrupoEstado }) {
  if (!estado) return null;
  return (
    <span className={cn(
      "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium shrink-0 whitespace-nowrap",
      ESTADO_STYLES[estado]
    )}>
      {ESTADO_LABELS[estado]}
    </span>
  );
}

type TabFilter = "todos" | "vigente" | "proximo" | "culminado";

const TABS: { id: TabFilter; label: string }[] = [
  { id: "todos",     label: "Todos" },
  { id: "vigente",   label: "Vigentes" },
  { id: "proximo",   label: "Próximos" },
  { id: "culminado", label: "Culminados" },
];

type TriState = "checked" | "indeterminate" | "unchecked";

function TriStateCheckbox({ state, onChange, onClick }: {
  state: TriState;
  onChange: () => void;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = state === "indeterminate";
  }, [state]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={state === "checked"}
      onChange={onChange}
      onClick={onClick}
      className="h-4 w-4 rounded border-zinc-300 accent-zinc-900 cursor-pointer shrink-0"
    />
  );
}

export function CursosGruposView({ cursos, horarios, selectData }: Props) {
  const router = useRouter();

  // ── Dialogs ──────────────────────────────────────────────────────────────────
  const [cursoDialogOpen, setCursoDialogOpen] = useState(false);
  const [selectedCurso, setSelectedCurso] = useState<CursoSerialized | null>(null);
  const [cursoDialogKey, setCursoDialogKey] = useState(0);

  const [grupoDialogOpen, setGrupoDialogOpen] = useState(false);
  const [grupoDialogKey, setGrupoDialogKey] = useState(0);

  // ── Accordion + search + tabs ────────────────────────────────────────────────
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabFilter>("todos");

  // ── Selection mode ───────────────────────────────────────────────────────────
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedGrupoIds, setSelectedGrupoIds] = useState<Set<string>>(new Set());
  const [selectedCursoIds, setSelectedCursoIds] = useState<Set<string>>(new Set());

  // ── Delete dialog ────────────────────────────────────────────────────────────
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [blockedGrupos, setBlockedGrupos] = useState<BlockedGrupo[]>([]);
  const [deleting, setDeleting] = useState(false);

  // ── Derived data ─────────────────────────────────────────────────────────────
  // All groups by course — used for selection logic (unfiltered)
  const horariosByCurso = useMemo(() => {
    const map = new Map<string, HorarioSerialized[]>();
    for (const h of horarios) {
      const list = map.get(h.idCurso) ?? [];
      list.push(h);
      map.set(h.idCurso, list);
    }
    return map;
  }, [horarios]);

  // Counts per estado (always across all horarios)
  const estadoCounts = useMemo(() => {
    const counts: Record<string, number> = { vigente: 0, proximo: 0, culminado: 0 };
    for (const h of horarios) {
      const e = getGrupoEstado(h);
      if (e) counts[e]++;
    }
    return counts;
  }, [horarios]);

  // Tab-filtered groups by course — used for display
  const filteredHorariosByCurso = useMemo(() => {
    const map = new Map<string, HorarioSerialized[]>();
    for (const h of horarios) {
      if (activeTab !== "todos" && getGrupoEstado(h) !== activeTab) continue;
      const list = map.get(h.idCurso) ?? [];
      list.push(h);
      map.set(h.idCurso, list);
    }
    return map;
  }, [horarios, activeTab]);

  const filteredCursos = useMemo(() => {
    const q = search.trim().toLowerCase();
    let base = cursos;
    if (activeTab !== "todos") {
      base = base.filter(c => (filteredHorariosByCurso.get(c.id) ?? []).length > 0);
    }
    if (!q) return base;
    return base.filter(c =>
      c.nombre.toLowerCase().includes(q) ||
      (filteredHorariosByCurso.get(c.id) ?? []).some(h =>
        h.docente.nombre.toLowerCase().includes(q) ||
        h.docente.apellido.toLowerCase().includes(q) ||
        h.aula.nombre.toLowerCase().includes(q)
      )
    );
  }, [cursos, search, filteredHorariosByCurso, activeTab]);

  const allAreExpanded =
    filteredCursos.length > 0 && filteredCursos.every(c => expandedIds.has(c.id));

  const totalSelected = selectedCursoIds.size + selectedGrupoIds.size;

  // ── Accordion handlers ────────────────────────────────────────────────────────
  function toggleAll() {
    if (allAreExpanded) setExpandedIds(new Set());
    else setExpandedIds(new Set(filteredCursos.map(c => c.id)));
  }

  function toggleExpanded(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // ── Dialog openers ────────────────────────────────────────────────────────────
  function openCreateCurso() {
    setSelectedCurso(null); setCursoDialogKey(k => k + 1); setCursoDialogOpen(true);
  }
  function openEditCurso(curso: CursoSerialized) {
    setSelectedCurso(curso); setCursoDialogKey(k => k + 1); setCursoDialogOpen(true);
  }
  function openCreateGrupo() {
    setGrupoDialogKey(k => k + 1); setGrupoDialogOpen(true);
  }

  // ── Selection helpers ─────────────────────────────────────────────────────────
  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedGrupoIds(new Set());
    setSelectedCursoIds(new Set());
  }

  function getCursoCheckState(cursoId: string): TriState {
    if (selectedCursoIds.has(cursoId)) return "checked";
    const grupos = horariosByCurso.get(cursoId) ?? [];
    if (grupos.some(g => selectedGrupoIds.has(g.id))) return "indeterminate";
    return "unchecked";
  }

  function isGrupoSelected(grupo: HorarioSerialized): boolean {
    return selectedCursoIds.has(grupo.idCurso) || selectedGrupoIds.has(grupo.id);
  }

  function toggleCursoSelection(curso: CursoSerialized) {
    const grupos = horariosByCurso.get(curso.id) ?? [];
    const isSelected = selectedCursoIds.has(curso.id);
    if (isSelected) {
      setSelectedCursoIds(prev => { const n = new Set(prev); n.delete(curso.id); return n; });
    } else {
      setSelectedCursoIds(prev => new Set([...prev, curso.id]));
      // Remove individual grupo selections covered by this curso
      setSelectedGrupoIds(prev => {
        const n = new Set(prev);
        grupos.forEach(g => n.delete(g.id));
        return n;
      });
    }
  }

  function toggleGrupoSelection(grupo: HorarioSerialized) {
    const cursoSelected = selectedCursoIds.has(grupo.idCurso);
    if (cursoSelected) {
      // Deselect the whole curso, individually select all OTHER grupos
      const grupos = horariosByCurso.get(grupo.idCurso) ?? [];
      setSelectedCursoIds(prev => { const n = new Set(prev); n.delete(grupo.idCurso); return n; });
      setSelectedGrupoIds(prev => {
        const n = new Set(prev);
        grupos.forEach(g => { if (g.id !== grupo.id) n.add(g.id); });
        return n;
      });
    } else {
      setSelectedGrupoIds(prev => {
        const n = new Set(prev);
        if (n.has(grupo.id)) n.delete(grupo.id); else n.add(grupo.id);
        return n;
      });
    }
  }

  // ── Delete flow ───────────────────────────────────────────────────────────────
  function handleDeleteClick() {
    // Client-side pre-validation using cached cantidadMatriculados
    const gruposAfectados = horarios.filter(
      h => selectedGrupoIds.has(h.id) || selectedCursoIds.has(h.idCurso)
    );
    const blocked = gruposAfectados
      .filter(h => h.cantidadMatriculados > 0)
      .map(h => ({
        id: h.id,
        numeroGrupo: h.numeroGrupo,
        nombreCurso: h.curso.nombre,
        cantidadMatriculados: h.cantidadMatriculados,
      }));
    setBlockedGrupos(blocked);
    setDeleteDialogOpen(true);
  }

  async function handleConfirmDelete() {
    setDeleting(true);
    const result = await deleteBatch([...selectedGrupoIds], [...selectedCursoIds]);
    setDeleting(false);
    if ("blocked" in result) {
      setBlockedGrupos(result.blocked);
      return;
    }
    const partes = [
      selectedGrupoIds.size > 0 && `${selectedGrupoIds.size} grupo${selectedGrupoIds.size !== 1 ? "s" : ""}`,
      selectedCursoIds.size > 0 && `${selectedCursoIds.size} curso${selectedCursoIds.size !== 1 ? "s" : ""}`,
    ].filter(Boolean).join(" y ");
    toast.success(`Eliminado: ${partes}`);
    setDeleteDialogOpen(false);
    exitSelectionMode();
  }

  const totalGrupos = horarios.length;

  return (
    <>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Cursos</h1>
          {selectionMode ? (
            <p className="text-sm text-zinc-500 mt-0.5">
              {totalSelected > 0
                ? `${totalSelected} elemento${totalSelected !== 1 ? "s" : ""} seleccionado${totalSelected !== 1 ? "s" : ""}`
                : "Selecciona cursos o grupos para eliminar"}
            </p>
          ) : (
            <p className="text-sm text-zinc-500 mt-0.5">
              {cursos.length} curso{cursos.length !== 1 ? "s" : ""}
              {" · "}
              {totalGrupos} grupo{totalGrupos !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {selectionMode ? (
            <>
              <Button variant="outline" size="sm" onClick={exitSelectionMode} className="gap-2">
                <X className="h-4 w-4" />
                Cerrar selección
              </Button>
              <Button
                size="sm"
                onClick={handleDeleteClick}
                disabled={totalSelected === 0}
                className="gap-2 bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar{totalSelected > 0 ? ` (${totalSelected})` : ""}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={toggleAll} className="gap-2">
                {allAreExpanded
                  ? <ChevronsDownUp className="h-4 w-4" />
                  : <ChevronsUpDown className="h-4 w-4" />}
                {allAreExpanded ? "Colapsar todos" : "Expandir todos"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectionMode(true)} className="gap-2">
                <CheckSquare className="h-4 w-4" />
                Seleccionar
              </Button>
              <Button onClick={openCreateCurso} variant="outline" className="gap-2 shadow-sm">
                <Plus className="h-4 w-4" />
                Nuevo curso
              </Button>
              <Button onClick={openCreateGrupo} className="gap-2 shadow-sm">
                <Plus className="h-4 w-4" />
                Nuevo grupo
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Main card ───────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">

        {/* Tabs */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-zinc-100">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100"
              )}
            >
              {tab.label}
              {tab.id !== "todos" && estadoCounts[tab.id] > 0 && (
                <span className="ml-1.5 text-xs opacity-60">
                  {estadoCounts[tab.id]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
            <Input
              placeholder="Buscar curso, docente o aula..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm bg-zinc-50 border-zinc-200"
            />
          </div>
          {search && (
            <span className="text-xs text-zinc-400 shrink-0">
              {filteredCursos.length} resultado{filteredCursos.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Accordion list */}
        {filteredCursos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3">
            <div className="rounded-full bg-zinc-100 p-4">
              <GraduationCap className="h-7 w-7 text-zinc-300" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-zinc-500">
                {search ? "Sin resultados" : "No hay cursos registrados"}
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                {search ? "Prueba con otro término" : "Crea el primero usando el botón de arriba"}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {filteredCursos.map(curso => {
              const grupos     = filteredHorariosByCurso.get(curso.id) ?? [];
              const isExpanded = expandedIds.has(curso.id);
              const checkState = getCursoCheckState(curso.id);

              return (
                <div key={curso.id}>
                  {/* ── Course row ──────────────────────────────────────────── */}
                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    onClick={() => toggleExpanded(curso.id)}
                    onKeyDown={e => e.key === "Enter" && toggleExpanded(curso.id)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 cursor-pointer select-none",
                      "hover:bg-zinc-50 transition-colors",
                    )}
                  >
                    {/* Checkbox (selection mode only) */}
                    {selectionMode && (
                      <div onClick={e => e.stopPropagation()}>
                        <TriStateCheckbox
                          state={checkState}
                          onChange={() => toggleCursoSelection(curso)}
                        />
                      </div>
                    )}

                    <div className="text-zinc-400 shrink-0">
                      {isExpanded
                        ? <ChevronDown className="h-4 w-4" />
                        : <ChevronRight className="h-4 w-4" />}
                    </div>

                    <span className="font-semibold text-zinc-900 flex-1 min-w-0 truncate">
                      {curso.nombre}
                    </span>

                    <span className="text-xs text-zinc-400 flex items-center gap-1 shrink-0">
                      <Users className="h-3.5 w-3.5" />
                      {grupos.length} grupo{grupos.length !== 1 ? "s" : ""}
                    </span>

                    {/* Actions — stop propagation so clicks don't toggle accordion */}
                    {!selectionMode && (
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <Button
                          size="icon-sm" variant="ghost"
                          onClick={() => openEditCurso(curso)}
                          title="Editar curso"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* ── Groups panel ────────────────────────────────────────── */}
                  {isExpanded && (
                    <div className="border-t border-zinc-100 bg-zinc-50/60">
                      {grupos.length === 0 ? (
                        <div className={cn(
                          "pr-4 py-4 flex items-center gap-2 text-sm text-zinc-400",
                          selectionMode ? "pl-10" : "pl-11"
                        )}>
                          <CalendarDays className="h-4 w-4 shrink-0" />
                          Sin grupos registrados para este curso.
                        </div>
                      ) : (
                        <div className="divide-y divide-zinc-100/80">
                          {/* Column headers */}
                          <div className={cn(
                            "flex items-center gap-3 pr-4 py-1.5",
                            selectionMode ? "pl-4" : "pl-11"
                          )}>
                            {selectionMode && <span className="w-4 shrink-0" />}
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 w-20 shrink-0">Grupo</span>
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 flex-1 min-w-0">Docente</span>
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 w-20 shrink-0">Aula</span>
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 w-24 shrink-0">Días</span>
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 w-20 shrink-0">Horario</span>
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 w-20 shrink-0">Precio/mes</span>
                            <span className="w-36 shrink-0" />
                          </div>

                          {grupos.map(h => {
                            const grupoSelected = isGrupoSelected(h);
                            return (
                              <div
                                key={h.id}
                                onClick={() => !selectionMode && router.push(`/grupos/${h.id}`)}
                              className={cn(
                                  "flex items-center gap-3 pr-4 py-2.5 transition-colors",
                                  selectionMode ? "pl-4" : "pl-11 cursor-pointer",
                                  selectionMode && grupoSelected
                                    ? "bg-blue-50/60 hover:bg-blue-50"
                                    : "hover:bg-zinc-100/60",
                                )}
                              >
                                {/* Checkbox (selection mode only) */}
                                {selectionMode && (
                                  <input
                                    type="checkbox"
                                    checked={grupoSelected}
                                    onChange={() => toggleGrupoSelection(h)}
                                    className="h-4 w-4 rounded border-zinc-300 accent-zinc-900 cursor-pointer shrink-0"
                                  />
                                )}

                                <span className="text-sm font-semibold text-zinc-700 w-20 shrink-0">
                                  Grupo {h.numeroGrupo}
                                </span>

                                <span className="text-sm text-zinc-600 flex-1 min-w-0 truncate">
                                  {h.docente.apellido}, {h.docente.nombre}
                                </span>

                                <span className="text-sm text-zinc-500 w-20 shrink-0 truncate">
                                  {h.aula.nombre}
                                </span>

                                <div className="flex gap-0.5 w-24 shrink-0 flex-wrap">
                                  {h.dias.map(dia => (
                                    <span
                                      key={dia}
                                      className={cn(
                                        "inline-flex rounded border px-1.5 py-0 text-[11px] font-medium",
                                        DIA_COLORS[dia] ?? "bg-zinc-50 text-zinc-600 border-zinc-200",
                                      )}
                                    >
                                      {DIA_ABREV[dia] ?? dia}
                                    </span>
                                  ))}
                                </div>

                                <span className="font-mono text-xs text-zinc-600 w-20 shrink-0">
                                  {h.horaInicio}–{h.horaFin}
                                </span>

                                <span className="font-mono text-sm font-semibold text-zinc-800 w-20 shrink-0">
                                  S/{h.precioMensual.toFixed(2)}
                                </span>

                                {!selectionMode && (
                                  <div className="flex items-center gap-2 w-36 shrink-0 justify-end">
                                    <EstadoPill estado={getGrupoEstado(h)} />
                                    <ChevronRight className="h-4 w-4 text-zinc-300 shrink-0" />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Sub-dialogs ─────────────────────────────────────────────────────── */}
      <CursoDialog
        key={cursoDialogKey}
        open={cursoDialogOpen}
        onClose={() => setCursoDialogOpen(false)}
        curso={selectedCurso}
      />
      <HorarioDialog
        key={grupoDialogKey}
        open={grupoDialogOpen}
        onClose={() => setGrupoDialogOpen(false)}
        horario={null}
        selectData={selectData}
      />

      {/* ── Batch delete dialog ──────────────────────────────────────────────── */}
      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(v) => { if (!v && !deleting) { setDeleteDialogOpen(false); } }}
      >
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
          {blockedGrupos.length > 0 ? (
            /* ── BLOCKED view ── */
            <>
              <div className="flex items-center gap-3 px-5 py-4 border-b border-amber-100 bg-amber-50">
                <div className="rounded-full bg-amber-100 p-2 shrink-0">
                  <Lock className="h-4 w-4 text-amber-600" />
                </div>
                <DialogTitle className="text-sm font-semibold text-amber-900">
                  No se puede eliminar la selección
                </DialogTitle>
              </div>

              <div className="px-5 py-4 space-y-3">
                <p className="text-sm text-zinc-700">
                  Los siguientes grupos tienen alumnos matriculados y no pueden eliminarse:
                </p>
                <ul className="space-y-2">
                  {blockedGrupos.map(g => (
                    <li key={g.id} className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-zinc-800">
                          Grupo {g.numeroGrupo} — {g.nombreCurso}
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {g.cantidadMatriculados} alumno{g.cantidadMatriculados !== 1 ? "s" : ""} matriculado{g.cantidadMatriculados !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Debes desmatricular a todos sus alumnos antes de poder eliminar estos grupos. Puedes deseleccionarlos y eliminar el resto de la selección.
                </p>
              </div>

              <div className="flex justify-end px-5 py-3 border-t border-zinc-100 bg-white">
                <Button variant="outline" size="sm" onClick={() => setDeleteDialogOpen(false)}>
                  Entendido
                </Button>
              </div>
            </>
          ) : (
            /* ── CONFIRMATION view ── */
            <>
              <div className="flex items-center gap-3 px-5 py-4 border-b border-red-100 bg-red-50">
                <div className="rounded-full bg-red-100 p-2 shrink-0">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </div>
                <DialogTitle className="text-sm font-semibold text-red-900">
                  Confirmar eliminación
                </DialogTitle>
              </div>

              <div className="px-5 py-4 space-y-3">
                {/* Summary */}
                <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 space-y-1.5">
                  {selectedGrupoIds.size > 0 && (
                    <p className="text-sm text-zinc-700">
                      <span className="font-semibold">{selectedGrupoIds.size}</span>{" "}
                      grupo{selectedGrupoIds.size !== 1 ? "s" : ""} seleccionado{selectedGrupoIds.size !== 1 ? "s" : ""}
                    </p>
                  )}
                  {selectedCursoIds.size > 0 && (
                    <p className="text-sm text-zinc-700">
                      <span className="font-semibold">{selectedCursoIds.size}</span>{" "}
                      curso{selectedCursoIds.size !== 1 ? "s" : ""} con todos sus grupos
                    </p>
                  )}
                </div>
                <p className="text-sm text-zinc-600">
                  Esta acción es{" "}
                  <span className="font-semibold text-red-600">permanente e irreversible</span>.
                  Los períodos y configuraciones de cada grupo también serán eliminados.
                </p>
              </div>

              <div className="flex justify-end gap-2 px-5 py-3 border-t border-zinc-100 bg-white">
                <Button
                  variant="outline" size="sm"
                  onClick={() => setDeleteDialogOpen(false)}
                  disabled={deleting}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {deleting ? "Eliminando..." : `Eliminar (${totalSelected})`}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
