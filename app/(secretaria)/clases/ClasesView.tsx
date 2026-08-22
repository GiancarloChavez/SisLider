"use client";

import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Search, Users, ChevronRight, GraduationCap, Clock, MapPin } from "lucide-react";
import {
  getAlumnosDelHorario,
  type CursoConHorarios,
  type HorarioResumen,
  type AlumnoDelHorario,
} from "@/lib/actions/clases";

const DIA_ORDER = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const DIA_ABREV: Record<string, string> = {
  Lunes: "Lu", Martes: "Ma", Miércoles: "Mi",
  Jueves: "Ju", Viernes: "Vi", Sábado: "Sa", Domingo: "Do",
};

const MESES_ABREV = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

function formatFecha(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MESES_ABREV[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Horario pill ─────────────────────────────────────────────────────────────

function DiasBadges({ dias }: { dias: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {[...dias]
        .sort((a, b) => DIA_ORDER.indexOf(a) - DIA_ORDER.indexOf(b))
        .map((d) => (
          <span
            key={d}
            className="inline-flex rounded border bg-zinc-100 border-zinc-200 px-1.5 py-0 text-[11px] font-medium text-zinc-600"
          >
            {DIA_ABREV[d] ?? d}
          </span>
        ))}
    </div>
  );
}

// ─── Student list ─────────────────────────────────────────────────────────────

function AlumnosList({
  horario,
  curso,
}: {
  horario: HorarioResumen;
  curso: CursoConHorarios;
}) {
  const [alumnos, setAlumnos] = useState<AlumnoDelHorario[] | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setAlumnos(null);
    getAlumnosDelHorario(horario.id).then(setAlumnos);
  }, [horario.id]);
  const filtered = useMemo(() => {
    if (!alumnos) return [];
    const q = search.trim().toLowerCase();
    if (!q) return alumnos;
    return alumnos.filter(
      (a) =>
        a.alumno.nombre.toLowerCase().includes(q) ||
        a.alumno.apellido.toLowerCase().includes(q) ||
        (a.alumno.dni ?? "").includes(q)
    );
  }, [alumnos, search]);

  const diasLabel = [...horario.dias]
    .sort((a, b) => DIA_ORDER.indexOf(a) - DIA_ORDER.indexOf(b))
    .map((d) => DIA_ABREV[d] ?? d)
    .join(" / ");

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50/60 shrink-0">
        <p className="text-sm font-semibold text-zinc-900">{curso.nombre}</p>
        <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {diasLabel} · {horario.horaInicio}–{horario.horaFin}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {horario.aula.nombre}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {horario.alumnosHabilitados} alumno{horario.alumnosHabilitados !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-zinc-100 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
          <Input
            placeholder="Buscar por nombre o DNI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm bg-zinc-50 border-zinc-200"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {alumnos === null ? (
          <div className="flex items-center justify-center py-16 text-sm text-zinc-400">
            Cargando alumnos…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-zinc-400">
            <Users className="h-8 w-8 opacity-20" />
            <p className="text-sm">
              {search ? "Sin resultados para esa búsqueda" : "No hay alumnos habilitados en este horario"}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide w-8">#</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Alumno</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide hidden md:table-cell">Días</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide hidden lg:table-cell">Desde</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Mensual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map((a, idx) => (
                <tr key={a.idMatricula} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 text-xs font-mono text-zinc-300">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900">
                      {a.alumno.apellido}, {a.alumno.nombre}
                    </p>
                    {a.alumno.dni && (
                      <p className="text-xs font-mono text-zinc-400 mt-0.5">DNI {a.alumno.dni}</p>
                    )}
                    {a.descuento && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-0.5 text-emerald-600 border-emerald-200 bg-emerald-50">
                        {a.descuento.nombre}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <DiasBadges dias={a.diasMatricula} />
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400 hidden lg:table-cell">
                    {formatFecha(a.fechaInicio)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-zinc-800">
                    S/{a.precioFinalMensual.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Main ClasesView ──────────────────────────────────────────────────────────

type Props = {
  cursos: CursoConHorarios[];
  initialCursoId?: string;
  initialHorarioId?: string;
};

export function ClasesView({ cursos, initialCursoId, initialHorarioId }: Props) {
  const [selectedCursoId, setSelectedCursoId] = useState<string | null>(
    initialCursoId ?? (cursos.length > 0 ? cursos[0].id : null)
  );
  const [selectedHorarioId, setSelectedHorarioId] = useState<string | null>(
    initialHorarioId ?? null
  );
  const [alumnosKey, setAlumnosKey] = useState(0);

  const cursoActivo = cursos.find((c) => c.id === selectedCursoId) ?? null;
  const horarioActivo = cursoActivo?.horarios.find((h) => h.id === selectedHorarioId) ?? null;

  function selectCurso(id: string) {
    setSelectedCursoId(id);
    setSelectedHorarioId(null);
  }

  function selectHorario(id: string) {
    setSelectedHorarioId(id);
    setAlumnosKey((k) => k + 1);
  }

  return (
    <div className="flex gap-0 rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden" style={{ minHeight: "560px" }}>

      {/* ── Col 1: Cursos ─────────────────────────────────── */}
      <div className="w-52 shrink-0 border-r border-zinc-200 flex flex-col">
        <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Cursos</p>
        </div>
        <ul className="flex-1 overflow-y-auto divide-y divide-zinc-100">
          {cursos.map((c) => {
            const active = c.id === selectedCursoId;
            const totalAlumnos = c.horarios.reduce((s, h) => s + h.alumnosHabilitados, 0);
            return (
              <li key={c.id}>
                <button
                  onClick={() => selectCurso(c.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 flex items-center justify-between gap-2 transition-colors",
                    active ? "bg-zinc-900 text-white" : "hover:bg-zinc-50 text-zinc-700"
                  )}
                >
                  <div className="min-w-0">
                    <p className={cn("text-sm font-medium leading-tight truncate", active ? "text-white" : "text-zinc-900")}>
                      {c.nombre}
                    </p>
                    <p className={cn("text-xs mt-0.5", active ? "text-zinc-400" : "text-zinc-400")}>
                      {c.horarios.length} horario{c.horarios.length !== 1 ? "s" : ""} · {totalAlumnos} alumnos
                    </p>
                  </div>
                  <ChevronRight className={cn("h-3.5 w-3.5 shrink-0", active ? "text-zinc-400" : "text-zinc-300")} />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ── Col 2: Horarios ───────────────────────────────── */}
      <div className="w-64 shrink-0 border-r border-zinc-200 flex flex-col">
        <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            {cursoActivo ? `Horarios · ${cursoActivo.nombre}` : "Horarios"}
          </p>
        </div>

        {!cursoActivo ? (
          <div className="flex flex-col items-center justify-center flex-1 py-16 gap-2 text-zinc-300">
            <GraduationCap className="h-8 w-8 opacity-40" />
            <p className="text-xs">Selecciona un curso</p>
          </div>
        ) : cursoActivo.horarios.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 py-16 gap-2 text-zinc-300">
            <p className="text-xs text-center px-4">No hay horarios activos para este curso</p>
          </div>
        ) : (
          <ul className="flex-1 overflow-y-auto divide-y divide-zinc-100">
            {cursoActivo.horarios.map((h) => {
              const active = h.id === selectedHorarioId;
              const diasLabel = [...h.dias]
                .sort((a, b) => DIA_ORDER.indexOf(a) - DIA_ORDER.indexOf(b))
                .map((d) => DIA_ABREV[d] ?? d)
                .join("/");
              const libre = h.aula.capacidad - h.alumnosTotales;
              return (
                <li key={h.id}>
                  <button
                    onClick={() => selectHorario(h.id)}
                    className={cn(
                      "w-full text-left px-4 py-3.5 transition-colors",
                      active ? "bg-zinc-900 text-white" : "hover:bg-zinc-50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className={cn("text-sm font-semibold leading-tight", active ? "text-white" : "text-zinc-900")}>
                        {diasLabel}
                      </p>
                      <span className={cn(
                        "text-[11px] font-medium px-1.5 py-0.5 rounded-full border shrink-0",
                        active
                          ? "bg-zinc-800 text-zinc-300 border-zinc-700"
                          : "bg-zinc-50 text-zinc-500 border-zinc-200"
                      )}>
                        {h.alumnosHabilitados} / {h.aula.capacidad}
                      </span>
                    </div>
                    <p className={cn("text-xs", active ? "text-zinc-300" : "text-zinc-500")}>
                      {h.horaInicio}–{h.horaFin}
                    </p>
                    <p className={cn("text-xs mt-0.5", active ? "text-zinc-400" : "text-zinc-400")}>
                      {h.docente.apellido}, {h.docente.nombre[0]}. · {h.aula.nombre}
                    </p>
                    {libre > 0 && (
                      <p className={cn("text-[11px] mt-1", active ? "text-zinc-400" : "text-zinc-300")}>
                        {libre} cupo{libre !== 1 ? "s" : ""} libre{libre !== 1 ? "s" : ""}
                      </p>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── Col 3: Alumnos ────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {!horarioActivo || !cursoActivo ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 text-zinc-300">
            <Users className="h-10 w-10 opacity-20" />
            <p className="text-sm">Selecciona un horario para ver la lista de alumnos</p>
          </div>
        ) : (
          <AlumnosList
            key={`${selectedHorarioId}-${alumnosKey}`}
            horario={horarioActivo}
            curso={cursoActivo}
          />
        )}
      </div>
    </div>
  );
}
