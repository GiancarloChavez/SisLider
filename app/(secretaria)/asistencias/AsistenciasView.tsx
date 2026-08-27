"use client";

import { useState, useTransition, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock,
  CalendarDays, History, Loader2,
} from "lucide-react";
import {
  getClasesDelDia,
  getHistorialAsistenciasDocente,
  registrarAsistenciaDocente,
  type ClaseDelDia,
  type RegistroHistorial,
} from "@/lib/actions/asistencias-docente";

// ─── Date helpers ─────────────────────────────────────────────────────────────

const DIAS_ES  = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MESES_ES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d + n);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatFechaLarga(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${DIAS_ES[date.getDay()]}, ${d} de ${MESES_ES[m - 1]} de ${y}`;
}

function formatFechaCorta(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MESES_ES[m - 1]}. ${y}`;
}

function currentTimeHHMM(): string {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
}

// ─── Estado badge ─────────────────────────────────────────────────────────────

function EstadoBadge({ estado }: { estado: string }) {
  if (estado === "presente") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Asistió
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
      <XCircle className="h-3.5 w-3.5" />
      Ausente
    </span>
  );
}

// ─── Clase card (daily view) ──────────────────────────────────────────────────

function ClaseCard({
  clase,
  esHoy,
  nowHHMM,
  isLast,
  onRegistrar,
  loading,
}: {
  clase: ClaseDelDia;
  esHoy: boolean;
  nowHHMM: string;
  isLast: boolean;
  onRegistrar: (idHorario: string, estado: "presente" | "ausente") => void;
  loading: boolean;
}) {
  const isActive = esHoy && nowHHMM >= clase.horaInicio && nowHHMM < clase.horaFin;
  const isPast   = !esHoy || nowHHMM >= clase.horaFin;
  const estado   = clase.asistencia?.estado ?? null;

  return (
    <div className="flex items-stretch gap-0">
      {/* Time column */}
      <div className="w-20 shrink-0 flex flex-col items-end pt-4 pr-4 text-right">
        <span className="text-sm font-mono font-semibold text-zinc-800 leading-none">{clase.horaInicio}</span>
        <span className="text-xs font-mono text-zinc-400 mt-1">{clase.horaFin}</span>
      </div>

      {/* Timeline track */}
      <div className="flex flex-col items-center shrink-0 w-5">
        <div className={cn(
          "mt-4 h-2.5 w-2.5 rounded-full ring-2 shrink-0",
          isActive
            ? "bg-emerald-500 ring-emerald-200"
            : estado === "presente"
            ? "bg-emerald-400 ring-emerald-100"
            : estado === "ausente"
            ? "bg-red-400 ring-red-100"
            : "bg-zinc-300 ring-zinc-100"
        )} />
        {!isLast && <div className="flex-1 w-px bg-zinc-200 mt-1" />}
      </div>

      {/* Card */}
      <div className={cn(
        "flex-1 rounded-xl border mx-2 mb-3 mt-2 transition-colors",
        isActive
          ? "border-emerald-200 bg-emerald-50/60 shadow-sm"
          : "border-zinc-200 bg-white hover:bg-zinc-50/60"
      )}>
        <div className="flex items-start justify-between gap-4 px-4 py-3 flex-wrap">
          {/* Left: class info */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-zinc-900">{clase.curso.nombre}</span>
              <span className="text-xs text-zinc-400 font-mono">Gp. {clase.numeroGrupo}</span>
              {isActive && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  En curso
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-600 mt-0.5 font-medium">
              {clase.docente.apellido}, {clase.docente.nombre}
            </p>
            <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {clase.horaInicio}–{clase.horaFin} · {clase.aula.nombre}
            </p>
          </div>

          {/* Right: action or status */}
          <div className="flex items-center gap-2 shrink-0">
            {estado ? (
              <>
                <EstadoBadge estado={estado} />
                {esHoy && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-zinc-400 hover:text-zinc-700 px-2"
                    disabled={loading}
                    onClick={() => onRegistrar(clase.idHorario, estado === "presente" ? "ausente" : "presente")}
                  >
                    Cambiar
                  </Button>
                )}
              </>
            ) : esHoy ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={loading}
                  onClick={() => onRegistrar(clase.idHorario, "presente")}
                  className="h-8 gap-1.5 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Confirmar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={loading}
                  onClick={() => onRegistrar(clase.idHorario, "ausente")}
                  className="h-8 gap-1.5 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Ausente
                </Button>
              </>
            ) : (
              <span className="text-xs text-zinc-400 italic">Sin registrar</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Historial view ───────────────────────────────────────────────────────────

function HistorialView({ registros }: { registros: RegistroHistorial[] }) {
  const grouped = useMemo(() => {
    const map = new Map<string, RegistroHistorial[]>();
    for (const r of registros) {
      const list = map.get(r.fecha) ?? [];
      list.push(r);
      map.set(r.fecha, list);
    }
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [registros]);

  if (grouped.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-400">
        <History className="h-10 w-10 opacity-20" />
        <p className="text-sm">No hay registros de asistencia aún</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map(([fecha, items]) => (
        <div key={fecha}>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2 px-1">
            {formatFechaCorta(fecha)}
          </p>
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden divide-y divide-zinc-100">
            {items.map((r) => (
              <div key={r.id} className="flex items-center gap-4 px-4 py-3">
                <span className="text-xs font-mono text-zinc-400 w-24 shrink-0">
                  {r.horario.horaInicio}–{r.horario.horaFin}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">
                    {r.horario.curso.nombre}
                    <span className="ml-1.5 text-xs text-zinc-400 font-mono font-normal">Gp. {r.horario.numeroGrupo}</span>
                  </p>
                  <p className="text-xs text-zinc-500 truncate">
                    {r.horario.docente.apellido}, {r.horario.docente.nombre}
                  </p>
                </div>
                <EstadoBadge estado={r.estado} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

type Tab = "diario" | "historial";

type Props = {
  initialClases: ClaseDelDia[];
};

export function AsistenciasView({ initialClases }: Props) {
  const [tab, setTab] = useState<Tab>("diario");
  const [fecha, setFecha] = useState(todayISO);
  const [clases, setClases] = useState<ClaseDelDia[]>(initialClases);
  const [historial, setHistorial] = useState<RegistroHistorial[] | null>(null);
  const [loadingFecha, setLoadingFecha] = useState(false);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [isPending, startTransition] = useTransition();
  const nowHHMM = useMemo(() => currentTimeHHMM(), []);
  const esHoy = fecha === todayISO();

  // Change date
  async function cambiarFecha(newFecha: string) {
    setFecha(newFecha);
    setLoadingFecha(true);
    const data = await getClasesDelDia(newFecha);
    setClases(data);
    setLoadingFecha(false);
  }

  // Switch to historial tab — lazy load
  async function openHistorial() {
    setTab("historial");
    if (historial !== null) return;
    setLoadingHistorial(true);
    const data = await getHistorialAsistenciasDocente();
    setHistorial(data);
    setLoadingHistorial(false);
  }

  // Register attendance (optimistic)
  const handleRegistrar = useCallback((idHorario: string, estado: "presente" | "ausente") => {
    // Optimistic update
    setClases((prev) =>
      prev.map((c) =>
        c.idHorario === idHorario
          ? { ...c, asistencia: { id: "optimistic", estado } }
          : c
      )
    );

    startTransition(async () => {
      const result = await registrarAsistenciaDocente(idHorario, fecha, estado);
      if (result.error) {
        toast.error(result.error);
        // Revert on error
        const fresh = await getClasesDelDia(fecha);
        setClases(fresh);
      } else {
        toast.success(estado === "presente" ? "Asistencia confirmada" : "Ausencia registrada");
        // Invalidate historial cache so it reloads next time
        setHistorial(null);
      }
    });
  }, [fecha]);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Asistencias</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Control de asistencia de docentes</p>
        </div>

        {/* Date navigator — only visible in diario tab */}
        {tab === "diario" && (
          <div className="flex items-center rounded-lg border border-zinc-200 bg-white overflow-hidden shadow-sm">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => cambiarFecha(addDays(fecha, -1))}
              className="rounded-none border-r border-zinc-200 h-9 w-9"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <input
              type="date"
              value={fecha}
              max={todayISO()}
              onChange={(e) => e.target.value && cambiarFecha(e.target.value)}
              className="px-3 text-sm font-medium text-zinc-700 bg-white border-none outline-none cursor-pointer h-9"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => cambiarFecha(addDays(fecha, 1))}
              disabled={esHoy}
              className="rounded-none border-l border-zinc-200 h-9 w-9 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 border-b border-zinc-200 pb-0">
        <button
          type="button"
          onClick={() => setTab("diario")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            tab === "diario"
              ? "border-zinc-900 text-zinc-900"
              : "border-transparent text-zinc-500 hover:text-zinc-700"
          )}
        >
          <CalendarDays className="h-4 w-4" />
          Diario
        </button>
        <button
          type="button"
          onClick={openHistorial}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            tab === "historial"
              ? "border-zinc-900 text-zinc-900"
              : "border-transparent text-zinc-500 hover:text-zinc-700"
          )}
        >
          <History className="h-4 w-4" />
          Historial
        </button>
      </div>

      {/* ── Diario tab ── */}
      {tab === "diario" && (
        <div>
          {/* Date label */}
          <p className="text-sm font-medium text-zinc-500 capitalize mb-4">
            {formatFechaLarga(fecha)}
            {esHoy && (
              <span className="ml-2 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                Hoy
              </span>
            )}
          </p>

          {loadingFecha ? (
            <div className="flex items-center justify-center py-20 gap-2 text-zinc-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Cargando clases…</span>
            </div>
          ) : clases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-400">
              <CalendarDays className="h-10 w-10 opacity-20" />
              <p className="text-sm">No hay clases programadas este día</p>
            </div>
          ) : (
            <div>
              {/* Stats strip */}
              {esHoy && (
                <div className="flex items-center gap-3 mb-4 px-1">
                  <span className="text-xs text-zinc-500">{clases.length} clase{clases.length !== 1 ? "s" : ""} hoy</span>
                  {clases.filter(c => c.asistencia?.estado === "presente").length > 0 && (
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                      {clases.filter(c => c.asistencia?.estado === "presente").length} confirmada{clases.filter(c => c.asistencia?.estado === "presente").length !== 1 ? "s" : ""}
                    </span>
                  )}
                  {clases.filter(c => c.asistencia?.estado === "ausente").length > 0 && (
                    <span className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                      {clases.filter(c => c.asistencia?.estado === "ausente").length} ausente{clases.filter(c => c.asistencia?.estado === "ausente").length !== 1 ? "s" : ""}
                    </span>
                  )}
                  {clases.filter(c => !c.asistencia).length > 0 && (
                    <span className="text-xs text-zinc-400">
                      {clases.filter(c => !c.asistencia).length} sin registrar
                    </span>
                  )}
                </div>
              )}

              {/* Timeline */}
              <div>
                {clases.map((clase, idx) => (
                  <ClaseCard
                    key={clase.idHorario}
                    clase={clase}
                    esHoy={esHoy}
                    nowHHMM={nowHHMM}
                    isLast={idx === clases.length - 1}
                    onRegistrar={handleRegistrar}
                    loading={isPending}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Historial tab ── */}
      {tab === "historial" && (
        <div>
          {loadingHistorial ? (
            <div className="flex items-center justify-center py-20 gap-2 text-zinc-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Cargando historial…</span>
            </div>
          ) : (
            <HistorialView registros={historial ?? []} />
          )}
        </div>
      )}
    </div>
  );
}
