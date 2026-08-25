"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronRight, ChevronDown, Plus, ChevronsDownUp, ChevronsUpDown,
  Pencil, PowerOff, Power, Search, GraduationCap, CalendarDays, Users, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleCursoActivo, type CursoSerialized } from "@/lib/actions/cursos";
import { toggleHorarioActivo, type HorarioSerialized, type HorarioSelectData } from "@/lib/actions/horarios";
import { CursoDialog } from "./CursoDialog";
import { HorarioDialog } from "../horarios/HorarioDialog";
import { HorarioDetailModal } from "../horarios/HorarioDetailModal";

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
  Lunes: "bg-blue-50 text-blue-700 border-blue-200",
  Martes: "bg-violet-50 text-violet-700 border-violet-200",
  Miércoles: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Jueves: "bg-orange-50 text-orange-700 border-orange-200",
  Viernes: "bg-pink-50 text-pink-700 border-pink-200",
  Sábado: "bg-teal-50 text-teal-700 border-teal-200",
  Domingo: "bg-zinc-50 text-zinc-600 border-zinc-200",
};

function StatusPill({ active }: { active: boolean }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium shrink-0",
      active
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-zinc-100 text-zinc-500 border-zinc-200"
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-emerald-500" : "bg-zinc-400")} />
      {active ? "Activo" : "Inactivo"}
    </span>
  );
}

export function CursosGruposView({ cursos, horarios, selectData }: Props) {
  const [cursoDialogOpen, setCursoDialogOpen] = useState(false);
  const [selectedCurso, setSelectedCurso] = useState<CursoSerialized | null>(null);
  const [cursoDialogKey, setCursoDialogKey] = useState(0);

  const [grupoDialogOpen, setGrupoDialogOpen] = useState(false);
  const [selectedHorario, setSelectedHorario] = useState<HorarioSerialized | null>(null);
  const [grupoDialogKey, setGrupoDialogKey] = useState(0);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailHorario, setDetailHorario] = useState<HorarioSerialized | null>(null);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const horariosByCurso = useMemo(() => {
    const map = new Map<string, HorarioSerialized[]>();
    for (const h of horarios) {
      const list = map.get(h.idCurso) ?? [];
      list.push(h);
      map.set(h.idCurso, list);
    }
    return map;
  }, [horarios]);

  const filteredCursos = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cursos;
    return cursos.filter(c =>
      c.nombre.toLowerCase().includes(q) ||
      (horariosByCurso.get(c.id) ?? []).some(h =>
        h.docente.nombre.toLowerCase().includes(q) ||
        h.docente.apellido.toLowerCase().includes(q) ||
        h.aula.nombre.toLowerCase().includes(q)
      )
    );
  }, [cursos, search, horariosByCurso]);

  const allAreExpanded =
    filteredCursos.length > 0 && filteredCursos.every(c => expandedIds.has(c.id));

  function toggleAll() {
    if (allAreExpanded) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(filteredCursos.map(c => c.id)));
    }
  }

  function toggleExpanded(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openCreateCurso() {
    setSelectedCurso(null);
    setCursoDialogKey(k => k + 1);
    setCursoDialogOpen(true);
  }

  function openEditCurso(curso: CursoSerialized) {
    setSelectedCurso(curso);
    setCursoDialogKey(k => k + 1);
    setCursoDialogOpen(true);
  }

  function openCreateGrupo() {
    setSelectedHorario(null);
    setGrupoDialogKey(k => k + 1);
    setGrupoDialogOpen(true);
  }

  function openEditGrupo(horario: HorarioSerialized) {
    setSelectedHorario(horario);
    setGrupoDialogKey(k => k + 1);
    setGrupoDialogOpen(true);
  }

  function openDetail(horario: HorarioSerialized) {
    setDetailHorario(horario);
    setDetailOpen(true);
  }

  async function handleToggleCurso(curso: CursoSerialized) {
    await toggleCursoActivo(curso.id, curso.activo);
    toast.success(curso.activo ? "Curso desactivado" : "Curso activado");
  }

  async function handleToggleHorario(horario: HorarioSerialized) {
    await toggleHorarioActivo(horario.id, horario.activo);
    toast.success(horario.activo ? "Grupo desactivado" : "Grupo activado");
  }

  const activosCursos = cursos.filter(c => c.activo).length;
  const totalGrupos = horarios.length;

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Cursos</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {activosCursos} curso{activosCursos !== 1 ? "s" : ""} activo{activosCursos !== 1 ? "s" : ""}
            {" · "}
            {totalGrupos} grupo{totalGrupos !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={toggleAll} className="gap-2">
            {allAreExpanded
              ? <ChevronsDownUp className="h-4 w-4" />
              : <ChevronsUpDown className="h-4 w-4" />
            }
            {allAreExpanded ? "Colapsar todos" : "Expandir todos"}
          </Button>
          <Button onClick={openCreateCurso} variant="outline" className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            Nuevo curso
          </Button>
          <Button onClick={openCreateGrupo} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            Nuevo grupo
          </Button>
        </div>
      </div>

      {/* Main card */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">

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
              const grupos = horariosByCurso.get(curso.id) ?? [];
              const isExpanded = expandedIds.has(curso.id);

              return (
                <div key={curso.id}>
                  {/* Course row */}
                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    onClick={() => toggleExpanded(curso.id)}
                    onKeyDown={e => e.key === "Enter" && toggleExpanded(curso.id)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 cursor-pointer select-none",
                      "hover:bg-zinc-50 transition-colors",
                      !curso.activo && "opacity-55",
                    )}
                  >
                    <div className="text-zinc-400 shrink-0 transition-transform duration-150">
                      {isExpanded
                        ? <ChevronDown className="h-4 w-4" />
                        : <ChevronRight className="h-4 w-4" />
                      }
                    </div>

                    <span className="font-semibold text-zinc-900 flex-1 min-w-0 truncate">
                      {curso.nombre}
                    </span>

                    <span className="text-xs text-zinc-400 flex items-center gap-1 shrink-0">
                      <Users className="h-3.5 w-3.5" />
                      {grupos.length} grupo{grupos.length !== 1 ? "s" : ""}
                    </span>

                    <StatusPill active={curso.activo} />

                    {/* Stop propagation so clicks on buttons don't toggle accordion */}
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <Button
                        size="icon-sm" variant="ghost"
                        onClick={() => openEditCurso(curso)}
                        title="Editar curso"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon-sm" variant="ghost"
                        onClick={() => handleToggleCurso(curso)}
                        title={curso.activo ? "Desactivar" : "Activar"}
                        className={curso.activo
                          ? "text-red-400 hover:text-red-600 hover:bg-red-50"
                          : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        }
                      >
                        {curso.activo ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>

                  {/* Groups panel */}
                  {isExpanded && (
                    <div className="border-t border-zinc-100 bg-zinc-50/60">
                      {grupos.length === 0 ? (
                        <div className="pl-11 pr-4 py-4 flex items-center gap-2 text-sm text-zinc-400">
                          <CalendarDays className="h-4 w-4 shrink-0" />
                          Sin grupos registrados para este curso.
                        </div>
                      ) : (
                        <div className="divide-y divide-zinc-100/80">
                          {/* Column headers */}
                          <div className="flex items-center gap-3 pl-11 pr-4 py-1.5">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 w-20 shrink-0">Grupo</span>
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 flex-1 min-w-0">Docente</span>
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 w-20 shrink-0">Aula</span>
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 w-24 shrink-0">Días</span>
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 w-20 shrink-0">Horario</span>
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 w-20 shrink-0">Precio/mes</span>
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 w-16 shrink-0">Estado</span>
                            <span className="w-24 shrink-0" />
                          </div>

                          {grupos.map(h => (
                            <div
                              key={h.id}
                              className={cn(
                                "flex items-center gap-3 pl-11 pr-4 py-2.5",
                                "hover:bg-zinc-100/60 transition-colors",
                                !h.activo && "opacity-55",
                              )}
                            >
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

                              <div className="w-16 shrink-0">
                                <StatusPill active={h.activo} />
                              </div>

                              <div className="flex gap-1 w-24 shrink-0 justify-end">
                                <Button
                                  size="icon-sm" variant="ghost"
                                  onClick={() => openDetail(h)}
                                  title="Ver detalles del grupo"
                                  className="text-zinc-400 hover:text-blue-600 hover:bg-blue-50"
                                >
                                  <Info className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon-sm" variant="ghost"
                                  onClick={() => openEditGrupo(h)}
                                  title="Editar grupo"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon-sm" variant="ghost"
                                  onClick={() => handleToggleHorario(h)}
                                  title={h.activo ? "Desactivar" : "Activar"}
                                  className={h.activo
                                    ? "text-red-400 hover:text-red-600 hover:bg-red-50"
                                    : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                  }
                                >
                                  {h.activo ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                                </Button>
                              </div>
                            </div>
                          ))}
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
        horario={selectedHorario}
        selectData={selectData}
      />
      <HorarioDetailModal
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setDetailHorario(null); }}
        horario={detailHorario}
      />
    </>
  );
}
