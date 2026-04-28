"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, Clock, FileText, Save, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import {
  getEstudiantesDelHorario,
  guardarAsistencias,
  type HorarioAsistenciaOption,
  type EstudianteAsistencia,
} from "@/lib/actions/asistencias";

// ─── Constants ────────────────────────────────────────────────────────────────

const DIAS_ES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"] as const;

const ESTADOS = [
  { value: "presente",    label: "Presente",    icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  { value: "tarde",       label: "Tarde",       icon: Clock,       color: "text-amber-500",   bg: "bg-amber-50 border-amber-200 text-amber-700" },
  { value: "ausente",     label: "Ausente",     icon: XCircle,     color: "text-red-500",     bg: "bg-red-50 border-red-200 text-red-700" },
  { value: "justificado", label: "Justificado", icon: FileText,    color: "text-blue-500",    bg: "bg-blue-50 border-blue-200 text-blue-700" },
] as const;

type EstadoValue = "presente" | "tarde" | "ausente" | "justificado";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d + n);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dayOfWeekName(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return DIAS_ES[date.getDay()];
}

// ─── Main view ────────────────────────────────────────────────────────────────

type Props = { horarios: HorarioAsistenciaOption[] };

export function AsistenciasView({ horarios }: Props) {
  const [fecha, setFecha] = useState(todayISO);
  const [selectedHorarioId, setSelectedHorarioId] = useState<string | null>(null);
  const [estudiantes, setEstudiantes] = useState<EstudianteAsistencia[]>([]);
  const [estadoMap, setEstadoMap] = useState<Record<string, EstadoValue>>({});
  const [loadingEstudiantes, setLoadingEstudiantes] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Filter horarios that meet on the selected day
  const horariosDia = useMemo(() => {
    const dia = dayOfWeekName(fecha);
    return horarios.filter((h) => h.dias.includes(dia));
  }, [horarios, fecha]);

  // Auto-deselect horario when it doesn't meet on new date
  useEffect(() => {
    if (selectedHorarioId && !horariosDia.find((h) => h.id === selectedHorarioId)) {
      setSelectedHorarioId(null);
      setEstudiantes([]);
      setEstadoMap({});
    }
  }, [horariosDia, selectedHorarioId]);

  // Load students when horario or date changes
  useEffect(() => {
    if (!selectedHorarioId) return;
    setLoadingEstudiantes(true);
    getEstudiantesDelHorario(selectedHorarioId, fecha).then((data) => {
      setEstudiantes(data);
      const initial: Record<string, EstadoValue> = {};
      data.forEach((e) => {
        initial[e.idMatricula] = (e.asistencia?.estado ?? "presente") as EstadoValue;
      });
      setEstadoMap(initial);
      setLoadingEstudiantes(false);
    });
  }, [selectedHorarioId, fecha]);

  function toggleEstado(idMatricula: string, estado: EstadoValue) {
    setEstadoMap((prev) => ({ ...prev, [idMatricula]: estado }));
  }

  function handleGuardar() {
    if (!selectedHorarioId || !estudiantes.length) return;
    const registros = estudiantes.map((e) => ({
      idMatricula: e.idMatricula,
      estado: estadoMap[e.idMatricula] ?? "presente",
    }));
    startTransition(async () => {
      const result = await guardarAsistencias(fecha, registros);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Asistencias guardadas");
      }
    });
  }

  function markAll(estado: EstadoValue) {
    const next: Record<string, EstadoValue> = {};
    estudiantes.forEach((e) => { next[e.idMatricula] = estado; });
    setEstadoMap(next);
  }

  const presentes = Object.values(estadoMap).filter((v) => v === "presente").length;
  const ausentes  = Object.values(estadoMap).filter((v) => v === "ausente").length;
  const tardes    = Object.values(estadoMap).filter((v) => v === "tarde").length;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Asistencias</h1>
          <p className="text-sm text-zinc-500 capitalize">{formatDateLabel(fecha)}</p>
        </div>

        {/* Date navigator */}
        <div className="flex items-center rounded-lg border border-zinc-200 bg-white overflow-hidden shadow-sm">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setFecha((f) => addDays(f, -1))}
            className="rounded-none border-r border-zinc-200 h-9 w-9"
            aria-label="Día anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="px-3 text-sm font-medium text-zinc-700 bg-white border-none outline-none cursor-pointer h-9"
          />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setFecha((f) => addDays(f, 1))}
            className="rounded-none border-l border-zinc-200 h-9 w-9"
            aria-label="Día siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[260px_1fr] gap-4 items-start">
        {/* ── Horario list ─────────────────────────────────────── */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Clases del {dayOfWeekName(fecha)}
            </p>
          </div>

          {horariosDia.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-400">
              No hay clases este día
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {horariosDia.map((h) => {
                const active = h.id === selectedHorarioId;
                return (
                  <li key={h.id}>
                    <button
                      onClick={() => setSelectedHorarioId(h.id)}
                      className={cn(
                        "w-full text-left px-4 py-3 transition-colors",
                        active ? "bg-zinc-900 text-white" : "hover:bg-zinc-50 text-zinc-700"
                      )}
                    >
                      <p className={cn("text-sm font-semibold leading-tight", active ? "text-white" : "text-zinc-900")}>
                        {h.curso.nombre}
                        {h.curso.nivel && (
                          <span className={cn("ml-1.5 text-xs font-normal", active ? "text-zinc-300" : "text-zinc-400")}>
                            {h.curso.nivel}
                          </span>
                        )}
                      </p>
                      <p className={cn("text-xs mt-0.5", active ? "text-zinc-300" : "text-zinc-500")}>
                        {h.horaInicio}–{h.horaFin} · {h.aula.nombre}
                      </p>
                      <p className={cn("text-xs mt-0.5", active ? "text-zinc-400" : "text-zinc-400")}>
                        {h.docente.apellido}, {h.docente.nombre[0]}.
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ── Attendance sheet ─────────────────────────────────── */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          {!selectedHorarioId ? (
            <div className="flex flex-col items-center justify-center py-24 text-zinc-400 gap-2">
              <CheckCircle className="h-10 w-10 opacity-20" />
              <p className="text-sm">Selecciona una clase para registrar asistencia</p>
            </div>
          ) : loadingEstudiantes ? (
            <div className="flex items-center justify-center py-24 text-zinc-400 gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p className="text-sm">Cargando estudiantes…</p>
            </div>
          ) : estudiantes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-zinc-400 gap-2">
              <p className="text-sm">No hay alumnos matriculados en esta clase</p>
            </div>
          ) : (
            <>
              {/* Action bar */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100 bg-zinc-50">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-zinc-700">{estudiantes.length} alumno{estudiantes.length !== 1 ? "s" : ""}</span>
                  <div className="flex items-center gap-1.5">
                    <Badge className="bg-emerald-100 text-emerald-700 border-0">{presentes} P</Badge>
                    <Badge className="bg-amber-100 text-amber-700 border-0">{tardes} T</Badge>
                    <Badge className="bg-red-100 text-red-700 border-0">{ausentes} A</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">Marcar todos:</span>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => markAll("presente")}>Presente</Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => markAll("ausente")}>Ausente</Button>
                  <Button
                    size="sm"
                    className="h-7 gap-1.5"
                    onClick={handleGuardar}
                    disabled={isPending}
                  >
                    {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Guardar
                  </Button>
                </div>
              </div>

              {/* Student rows */}
              <div className="divide-y divide-zinc-100">
                {estudiantes.map((est, idx) => {
                  const estadoActual = estadoMap[est.idMatricula] ?? "presente";
                  const estadoInfo = ESTADOS.find((e) => e.value === estadoActual)!;
                  return (
                    <div key={est.idMatricula} className="flex items-center px-5 py-3 gap-4 hover:bg-zinc-50 transition-colors">
                      {/* Index + name */}
                      <span className="text-xs font-mono text-zinc-300 w-5 shrink-0 text-right">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 truncate">
                          {est.alumno.apellido}, {est.alumno.nombre}
                        </p>
                      </div>

                      {/* Estado buttons */}
                      <div className="flex items-center gap-1">
                        {ESTADOS.map((e) => {
                          const Icon = e.icon;
                          const selected = estadoActual === e.value;
                          return (
                            <button
                              key={e.value}
                              onClick={() => toggleEstado(est.idMatricula, e.value)}
                              className={cn(
                                "flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all",
                                selected
                                  ? e.bg
                                  : "border-zinc-200 text-zinc-400 hover:border-zinc-300 hover:text-zinc-600"
                              )}
                              title={e.label}
                            >
                              <Icon className="h-3.5 w-3.5 shrink-0" />
                              <span className="hidden sm:inline">{e.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
