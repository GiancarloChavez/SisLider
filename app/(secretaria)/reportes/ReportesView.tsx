"use client";

import { useState } from "react";
import { FileText, TrendingUp, CalendarRange, GraduationCap, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AlumnoListItem } from "@/lib/pdf/queries";

const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

const currentYear  = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

// ── Generic open-in-tab helper ────────────────────────────────────────────────

function openPdf(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

// ── Card wrapper ─────────────────────────────────────────────────────────────

function ReportCard({
  icon: Icon,
  color,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  color: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
      <div className={cn("px-5 py-4 flex items-start gap-3 border-b border-zinc-100", color)}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/80 shadow-sm">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-900">{title}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ── Generate button ───────────────────────────────────────────────────────────

function GenerarBtn({ url, disabled = false }: { url: string; disabled?: boolean }) {
  const [loading, setLoading] = useState(false);

  function handleClick() {
    if (disabled) return;
    setLoading(true);
    openPdf(url);
    setTimeout(() => setLoading(false), 2000);
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className={cn(
        "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
        "bg-zinc-900 text-white hover:bg-zinc-700 active:scale-95",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100",
      )}
    >
      {loading
        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
        : <ExternalLink className="h-3.5 w-3.5" />
      }
      {loading ? "Generando…" : "Generar PDF"}
    </button>
  );
}

// ── Views ─────────────────────────────────────────────────────────────────────

function ReporteAlumnoCard({ alumnos }: { alumnos: AlumnoListItem[] }) {
  const [alumnoId, setAlumnoId] = useState("");
  const url = alumnoId ? `/api/reportes/alumno/${alumnoId}` : "";

  return (
    <ReportCard
      icon={FileText}
      color="bg-blue-50"
      title="Reporte de Alumno"
      description="Ficha completa: datos personales, apoderado, historial de matrículas, pagos y asistencias."
    >
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1.5">
            Selecciona el alumno
          </label>
          <select
            value={alumnoId}
            onChange={(e) => setAlumnoId(e.target.value)}
            className={cn(
              "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800",
              "focus:outline-none focus:ring-2 focus:ring-zinc-400",
            )}
          >
            <option value="">— Elige un alumno —</option>
            {alumnos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.apellido}, {a.nombre}{a.dni ? ` (${a.dni})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end">
          <GenerarBtn url={url} disabled={!alumnoId} />
        </div>
      </div>
    </ReportCard>
  );
}

function ReporteMensualCard() {
  const [mes, setMes]   = useState(currentMonth);
  const [anio, setAnio] = useState(currentYear);
  const url = `/api/reportes/ingresos?tipo=mensual&anio=${anio}&mes=${mes}`;

  return (
    <ReportCard
      icon={TrendingUp}
      color="bg-emerald-50"
      title="Ingresos Mensuales"
      description="Detalle de todos los cobros registrados en el mes: alumno, curso, método de pago y totales."
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">Mes</label>
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            >
              {MESES.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">Año</label>
            <select
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end">
          <GenerarBtn url={url} />
        </div>
      </div>
    </ReportCard>
  );
}

function ReporteAnualCard() {
  const [anio, setAnio] = useState(currentYear);
  const url = `/api/reportes/ingresos?tipo=anual&anio=${anio}`;

  return (
    <ReportCard
      icon={CalendarRange}
      color="bg-violet-50"
      title="Ingresos Anuales"
      description="Resumen mensual del año completo: cobrado vs. pendiente mes a mes, totales y tendencia."
    >
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1.5">Año</label>
          <select
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end">
          <GenerarBtn url={url} />
        </div>
      </div>
    </ReportCard>
  );
}

function ReporteCursosCard() {
  const url = "/api/reportes/cursos";

  return (
    <ReportCard
      icon={GraduationCap}
      color="bg-amber-50"
      title="Cursos y Horarios"
      description="Listado completo de cursos activos con sus horarios, docentes, aulas y alumnos matriculados."
    >
      <div className="space-y-3">
        <p className="text-xs text-zinc-500 bg-zinc-50 rounded-lg border border-zinc-100 px-3 py-2">
          Este reporte incluye todos los cursos y sus horarios activos con la nómina de alumnos
          por cada clase.
        </p>
        <div className="flex justify-end">
          <GenerarBtn url={url} />
        </div>
      </div>
    </ReportCard>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ReportesView({ alumnos }: { alumnos: AlumnoListItem[] }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Reportes</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Genera reportes PDF con la información actualizada del sistema.
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
        <ExternalLink className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-700">
          Los reportes se abren en una nueva pestaña del navegador como PDF. Puedes imprimirlos
          o guardarlos desde ahí.
        </p>
      </div>

      {/* Report cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReporteAlumnoCard alumnos={alumnos} />
        <ReporteMensualCard />
        <ReporteAnualCard />
        <ReporteCursosCard />
      </div>
    </div>
  );
}
