import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  ClipboardList, CalendarDays, UserCheck, Users,
} from "lucide-react";
import { DashboardCharts } from "./DashboardCharts";
import type {
  IngresosMesData, EstadoPagoData, MatriculasCursoData, MesPendienteData,
} from "./DashboardCharts";
import { ClasesCalendar } from "../clases/ClasesCalendar";
import { ClasesView } from "../clases/ClasesView";
import { getHorariosCalendario, getCursosConHorarios } from "@/lib/actions/clases";

// ─── Data fetching ────────────────────────────────────────────────────────────

const MESES_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

const getDashboardData = unstable_cache(
  async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [
      alumnosActivos,
      matriculasActivas,
      totalPendientesCount,
      docentes,
      cursosActivos,
      mesesPendientes,
      abonosHistorial,
      estadosPagoRaw,
      horariosRaw,
      matriculasXHorario,
    ] = await Promise.all([
      prisma.alumno.count({ where: { habilitado: true } }),
      prisma.matricula.count({ where: { estado: "activa" } }),
      prisma.mesPago.count({ where: { estado: { in: ["pendiente", "parcial"] } } }),
      prisma.docente.count(),
      prisma.horario.count({ where: { activo: true } }),
      prisma.mesPago.findMany({
        where: { estado: { in: ["pendiente", "parcial"] } },
        include: { matricula: { include: { alumno: true } } },
        orderBy: [{ anio: "asc" }, { mes: "asc" }],
        take: 10,
      }),
      prisma.abono.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: { monto: true, createdAt: true },
      }),
      prisma.mesPago.groupBy({ by: ["estado"], _count: { _all: true } }),
      prisma.horario.findMany({
        where: { activo: true },
        include: { curso: { select: { id: true, nombre: true } } },
      }),
      prisma.matricula.groupBy({
        by: ["idHorario"],
        where: { estado: "activa" },
        _count: { _all: true },
      }),
    ]);

    const countMap: Record<string, number> = {};
    for (const r of matriculasXHorario) countMap[r.idHorario] = r._count._all;
    const horariosActivos = horariosRaw.map((h) => ({
      ...h,
      _count: { matriculas: countMap[h.id] ?? 0 },
    }));

    const byMonth: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      byMonth[`${d.getFullYear()}-${d.getMonth()}`] = 0;
    }
    for (const a of abonosHistorial) {
      const d = new Date(a.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (key in byMonth) byMonth[key] += Number(a.monto);
    }
    const ingresosPorMes: IngresosMesData[] = Object.entries(byMonth).map(([key, total]) => ({
      mes: MESES_ES[Number(key.split("-")[1])],
      total: Math.round(total * 100) / 100,
    }));

    const ESTADO_LABELS: Record<string, string> = {
      pagado: "Al día", parcial: "Parcial", pendiente: "Pendiente",
    };
    const estadosPago: EstadoPagoData[] = estadosPagoRaw.map((e) => ({
      estado: e.estado,
      label: ESTADO_LABELS[e.estado] ?? e.estado,
      count: e._count._all,
    }));

    const byCurso: Record<string, { nombre: string; matriculas: number }> = {};
    for (const h of horariosActivos) {
      const { id, nombre } = h.curso;
      if (!byCurso[id]) byCurso[id] = { nombre, matriculas: 0 };
      byCurso[id].matriculas += h._count.matriculas;
    }
    const matriculasPorCurso: MatriculasCursoData[] = Object.values(byCurso)
      .sort((a, b) => b.matriculas - a.matriculas)
      .slice(0, 7);

    const pendientesSerializados: MesPendienteData[] = mesesPendientes.map((m) => ({
      id: m.id,
      anio: m.anio,
      mes: m.mes,
      estado: m.estado,
      montoTotal: Number(m.montoTotal),
      montoPagado: Number(m.montoPagado),
      alumno: { nombre: m.matricula.alumno.nombre, apellido: m.matricula.alumno.apellido },
    }));

    return {
      kpis: { alumnosActivos, matriculasActivas, totalPendientesCount, docentes, cursosActivos },
      ingresosPorMes,
      estadosPago,
      matriculasPorCurso,
      mesesPendientes: pendientesSerializados,
    };
  },
  ["dashboard"],
  { tags: ["dashboard", "matriculas", "pagos", "alumnos"], revalidate: 60 },
);

export const dynamic = "force-dynamic";

type Tab = "dashboard" | "clases";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; curso?: string; horario?: string }>;
}) {
  if (process.env.NEXT_PHASE === "phase-production-build") return null;

  const params = await searchParams;
  const activeTab: Tab = params.tab === "clases" ? "clases" : "dashboard";

  const [data, horarios, cursosClases] = await Promise.all([
    getDashboardData(),
    getHorariosCalendario(),
    activeTab === "clases" ? getCursosConHorarios() : Promise.resolve(null),
  ]);

  const { kpis, ingresosPorMes, estadosPago, matriculasPorCurso, mesesPendientes } = data;

  const kpiCards = [
    { label: "Alumnos activos",  value: kpis.alumnosActivos,   icon: Users,          iconBg: "bg-blue-50",   iconColor: "text-blue-600" },
    { label: "Matrículas",       value: kpis.matriculasActivas, icon: ClipboardList,  iconBg: "bg-indigo-50", iconColor: "text-indigo-600" },
    { label: "Horarios activos", value: kpis.cursosActivos,     icon: CalendarDays,   iconBg: "bg-violet-50", iconColor: "text-violet-600" },
    { label: "Docentes",         value: kpis.docentes,          icon: UserCheck,      iconBg: "bg-rose-50",   iconColor: "text-rose-600" },
  ] as const;

  const totalAlumnos = cursosClases?.reduce(
    (s, c) => s + c.horarios.reduce((ss, h) => ss + h.alumnosHabilitados, 0), 0
  ) ?? 0;
  const totalHorarios = cursosClases?.reduce((s, c) => s + c.horarios.length, 0) ?? 0;

  return (
    <div className="space-y-6">

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <div className="border-b border-zinc-200 -mb-2">
        <div className="flex gap-0">
          {([
            { key: "dashboard", label: "Dashboard" },
            { key: "clases",    label: "Clases" },
          ] as { key: Tab; label: string }[]).map(({ key, label }) => (
            <a
              key={key}
              href={key === "dashboard" ? "/dashboard" : "/dashboard?tab=clases"}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === key
                  ? "border-zinc-900 text-zinc-900"
                  : "border-transparent text-zinc-400 hover:text-zinc-700 hover:border-zinc-300"
              }`}
            >
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* ── DASHBOARD TAB ────────────────────────────────────────────────────── */}
      {activeTab === "dashboard" && (
        <>
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {new Date().toLocaleDateString("es-PE", {
                weekday: "long", day: "numeric", month: "long", year: "numeric",
              })}
            </p>
          </div>

          {/* ── Calendario + KPI sidebar ──────────────────────────────────── */}
          <div className="flex gap-4 items-start">

            {/* Calendario — ocupa la mayor parte */}
            <div className="flex-1 min-w-0 rounded-xl bg-white border border-zinc-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-zinc-100">
                <p className="text-sm font-semibold text-zinc-900">Horario semanal</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {horarios.length === 0
                    ? "No hay horarios activos"
                    : `${horarios.length} horario${horarios.length !== 1 ? "s" : ""} activo${horarios.length !== 1 ? "s" : ""}`}
                </p>
              </div>
              <div className="p-3">
                <ClasesCalendar horarios={horarios} title="" subtitle="" />
              </div>
            </div>

            {/* KPI cards — columna lateral */}
            <div className="w-48 shrink-0 flex flex-col gap-3">
              {kpiCards.map(({ label, value, icon: Icon, iconBg, iconColor }) => (
                <div
                  key={label}
                  className="rounded-xl bg-white border border-zinc-200 p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-zinc-500 leading-tight">{label}</span>
                    <span className={`flex h-6 w-6 items-center justify-center rounded-md ${iconBg} ${iconColor}`}>
                      <Icon className="h-3 w-3" />
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-zinc-900 tabular-nums">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Charts ───────────────────────────────────────────────────────── */}
          <DashboardCharts
            ingresosPorMes={ingresosPorMes}
            estadosPago={estadosPago}
            matriculasPorCurso={matriculasPorCurso}
            mesesPendientes={mesesPendientes}
          />
        </>
      )}

      {/* ── CLASES TAB ───────────────────────────────────────────────────────── */}
      {activeTab === "clases" && cursosClases !== null && (
        <>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Clases</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {cursosClases.length} curso{cursosClases.length !== 1 ? "s" : ""} ·{" "}
              {totalHorarios} horario{totalHorarios !== 1 ? "s" : ""} ·{" "}
              {totalAlumnos} alumno{totalAlumnos !== 1 ? "s" : ""} habilitado{totalAlumnos !== 1 ? "s" : ""}
            </p>
          </div>

          {cursosClases.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-16 text-center text-zinc-400">
              <p className="text-sm">No hay cursos activos con horarios.</p>
              <p className="text-xs mt-1">Crea cursos y horarios desde las secciones correspondientes.</p>
            </div>
          ) : (
            <ClasesView
              cursos={cursosClases}
              initialCursoId={params.curso}
              initialHorarioId={params.horario}
            />
          )}
        </>
      )}
    </div>
  );
}
