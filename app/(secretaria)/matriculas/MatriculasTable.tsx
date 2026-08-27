"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, ClipboardList, History, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MatriculaReciente } from "@/lib/actions/matriculas";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MESES_CORTO = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

function fmtIso(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${MESES_CORTO[d.getMonth()]}. ${d.getFullYear()}`;
}

type EstadoMatricula = "vigente" | "completado" | "desmatriculado";

function getEstadoMatricula(m: MatriculaReciente): EstadoMatricula {
  if (m.estado === "inactiva") return "desmatriculado";
  if (m.horario.fechaFin) {
    const [y, mo, d] = m.horario.fechaFin.split("-").map(Number);
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    if (new Date(y, mo - 1, d) < hoy) return "completado";
  }
  return "vigente";
}

// ─── Shared pieces ────────────────────────────────────────────────────────────

function PagoBadge({ pago }: { pago: MatriculaReciente["primerPago"] }) {
  if (!pago) return <span className="text-xs text-zinc-400">—</span>;
  if (pago.estado === "pagado") {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
        Pagado
      </span>
    );
  }
  if (pago.estado === "parcial") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-medium text-amber-700">
        Parcial · S/{pago.montoPagado.toFixed(2)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-zinc-100 border border-zinc-200 px-2 py-0.5 text-[11px] font-medium text-zinc-500">
      Pendiente
    </span>
  );
}

function MatriculaRow({ m }: { m: MatriculaReciente }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-zinc-100 last:border-0">
      <div className="min-w-0">
        <Link
          href={`/alumnos/${m.alumno.id}`}
          className="text-sm font-medium text-zinc-800 hover:text-blue-600 hover:underline transition-colors"
        >
          {m.alumno.apellido}, {m.alumno.nombre}
        </Link>
        <p className="text-xs text-zinc-400 mt-0.5">
          {m.horario.curso.nombre} · Grupo {m.horario.numeroGrupo} · {m.horario.horaInicio}–{m.horario.horaFin}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-zinc-400">{fmtIso(m.createdAt)}</span>
        <PagoBadge pago={m.primerPago} />
      </div>
    </div>
  );
}

function ColumnHeaders() {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-4 px-5 py-2.5 border-b border-zinc-100 bg-zinc-50">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Alumno · Curso</span>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Fecha · Pago</span>
    </div>
  );
}

function EmptyState({ search }: { search?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-2">
      <ClipboardList className="h-6 w-6 text-zinc-300" />
      <p className="text-sm text-zinc-400">
        {search ? "Sin resultados para los filtros aplicados" : "No hay matrículas registradas"}
      </p>
    </div>
  );
}

// ─── Recientes (últimas 15) ───────────────────────────────────────────────────

export function MatriculasTable({ matriculas }: { matriculas: MatriculaReciente[] }) {
  const router = useRouter();

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Matrículas</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Últimas matrículas realizadas</p>
        </div>
        <Button onClick={() => router.push("/matriculas/nueva")} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          Nueva matrícula
        </Button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <ColumnHeaders />
        {matriculas.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {matriculas.map((m) => <MatriculaRow key={m.id} m={m} />)}
            <div className="flex items-center justify-center px-5 py-3 border-t border-zinc-100 bg-zinc-50/50">
              <Link
                href="/matriculas?historial=true"
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
              >
                <History className="h-3.5 w-3.5" />
                Mostrar historial completo
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ─── Historial (todas las matrículas con filtros) ─────────────────────────────

const ESTADO_PAGO_OPTIONS = [
  { value: "pagado",    label: "Pagado"    },
  { value: "parcial",   label: "Parcial"   },
  { value: "pendiente", label: "Pendiente" },
];

const ESTADO_MATRICULA_OPTIONS = [
  { value: "vigente",        label: "Vigente"        },
  { value: "completado",     label: "Completado"     },
  { value: "desmatriculado", label: "Desmatriculado" },
];

type Filters = {
  search: string;
  fechaDesde: string;
  fechaHasta: string;
  estadoPago: string;
  estadoMatricula: string;
  cursoId: string;
};

const EMPTY_FILTERS: Filters = {
  search: "",
  fechaDesde: "",
  fechaHasta: "",
  estadoPago: "todos",
  estadoMatricula: "todos",
  cursoId: "todos",
};

function isActive(f: Filters) {
  return (
    f.search !== "" ||
    f.fechaDesde !== "" ||
    f.fechaHasta !== "" ||
    f.estadoPago !== "todos" ||
    f.estadoMatricula !== "todos" ||
    f.cursoId !== "todos"
  );
}

export function MatriculasHistorial({ matriculas }: { matriculas: MatriculaReciente[] }) {
  const router = useRouter();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  function setFilter(key: keyof Filters, value: string | null) {
    setFilters((prev) => ({ ...prev, [key]: value ?? EMPTY_FILTERS[key] }));
  }

  const cursos = useMemo(() => {
    const seen = new Set<string>();
    const list: { id: string; nombre: string }[] = [];
    for (const m of matriculas) {
      if (!seen.has(m.horario.curso.id)) {
        seen.add(m.horario.curso.id);
        list.push(m.horario.curso);
      }
    }
    return list.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [matriculas]);

  const filtered = useMemo(() => {
    return matriculas.filter((m) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const nameMatch = `${m.alumno.apellido} ${m.alumno.nombre}`.toLowerCase().includes(q);
        const dniMatch  = (m.alumno.dni ?? "").includes(q);
        if (!nameMatch && !dniMatch) return false;
      }
      if (filters.estadoPago !== "todos") {
        if ((m.primerPago?.estado ?? "pendiente") !== filters.estadoPago) return false;
      }
      if (filters.estadoMatricula !== "todos") {
        if (getEstadoMatricula(m) !== filters.estadoMatricula) return false;
      }
      if (filters.cursoId !== "todos") {
        if (m.horario.curso.id !== filters.cursoId) return false;
      }
      if (filters.fechaDesde) {
        const desde = new Date(filters.fechaDesde);
        if (new Date(m.createdAt) < desde) return false;
      }
      if (filters.fechaHasta) {
        const hasta = new Date(filters.fechaHasta);
        hasta.setHours(23, 59, 59, 999);
        if (new Date(m.createdAt) > hasta) return false;
      }
      return true;
    });
  }, [matriculas, filters]);

  const active = isActive(filters);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Historial de matrículas</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {matriculas.length} matrícula{matriculas.length !== 1 ? "s" : ""} en total
          </p>
        </div>
        <Button onClick={() => router.push("/matriculas/nueva")} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          Nueva matrícula
        </Button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        {/* Filter panel */}
        <div className="px-4 py-3 border-b border-zinc-100 space-y-2 bg-zinc-50/60">
          {/* Row 1: search + dates */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
              <Input
                placeholder="Buscar nombre o DNI..."
                value={filters.search}
                onChange={(e) => setFilter("search", e.target.value)}
                className="pl-8 h-8 text-sm bg-white"
              />
            </div>
            <Input
              type="date"
              value={filters.fechaDesde}
              onChange={(e) => setFilter("fechaDesde", e.target.value)}
              className="h-8 text-sm w-36 bg-white"
            />
            <span className="text-xs text-zinc-400">→</span>
            <Input
              type="date"
              value={filters.fechaHasta}
              onChange={(e) => setFilter("fechaHasta", e.target.value)}
              className="h-8 text-sm w-36 bg-white"
            />
          </div>

          {/* Row 2: dropdowns + clear */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filters.estadoPago} onValueChange={(v) => setFilter("estadoPago", v)}>
              <SelectTrigger className="h-8 text-sm w-36 bg-white">
                <SelectValue placeholder="Estado pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los pagos</SelectItem>
                {ESTADO_PAGO_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.estadoMatricula} onValueChange={(v) => setFilter("estadoMatricula", v)}>
              <SelectTrigger className="h-8 text-sm w-40 bg-white">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                {ESTADO_MATRICULA_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.cursoId} onValueChange={(v) => setFilter("cursoId", v)}>
              <SelectTrigger className="h-8 text-sm w-40 bg-white">
                <SelectValue placeholder="Curso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los cursos</SelectItem>
                {cursos.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-3 ml-auto">
              {active && (
                <button
                  type="button"
                  onClick={() => setFilters(EMPTY_FILTERS)}
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
                >
                  <X className="h-3 w-3" />
                  Limpiar
                </button>
              )}
              <span className={cn("text-xs", active ? "text-zinc-700 font-medium" : "text-zinc-400")}>
                {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        <ColumnHeaders />

        {filtered.length === 0 ? (
          <EmptyState search={active} />
        ) : (
          filtered.map((m) => <MatriculaRow key={m.id} m={m} />)
        )}
      </div>

      <div className="mt-4">
        <Link
          href="/matriculas"
          className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          ← Volver a recientes
        </Link>
      </div>
    </>
  );
}
