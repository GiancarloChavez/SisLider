import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  Users, ClipboardList, AlertCircle, DollarSign,
  CalendarDays, UserCheck,
} from "lucide-react";
import { DashboardCharts } from "./DashboardCharts";
import type {
  IngresosMesData, EstadoPagoData, MatriculasCursoData, MesPendienteData,
} from "./DashboardCharts";
import { ClasesCalendar } from "../clases/ClasesCalendar";
import { getHorariosCalendario } from "@/lib/actions/clases";

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

    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);

    const [
      alumnosActivos,
      matriculasActivas,
      totalPendientesCount,
      docentes,
      cursosActivos,
      asistenciasHoy,
      ingresosMes,
      mesesPendientes,
      abonosHistorial,
      estadosPagoRaw,
      horariosActivos,
    ] = await Promise.all([
      prisma.alumno.count({ where: { habilitado: true } }),
      prisma.matricula.count({ where: { estado: "activa" } }),
      prisma.mesPago.count({ where: { estado: { in: ["pendiente", "parcial"] } } }),
      prisma.docente.count(),
      prisma.horario.count({ where: { activo: true } }),
      prisma.asistencia.count({
        where: { fecha: { gte: todayStart, lte: todayEnd }, estado: "presente" },
      }),
      prisma.abono.aggregate({
        _sum: { monto: true },
        where: { createdAt: { gte: startOfMonth } },
      }),
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
      prisma.mesPago.groupBy({ by: ["estado"], _count: { id: true } }),
      prisma.horario.findMany({
        where: { activo: true },
        include: {
          curso: { select: { id: true, nombre: true } },
          _count: { select: { matriculas: { where: { estado: "activa" } } } },
        },
      }),
    ]);

    // Build last-6-months ingresos
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
    const ingresosPorMes: IngresosMesData[] = Object.entries(byMonth).map(([key, total]) => {
      const month = Number(key.split("-")[1]);
      return { mes: MESES_ES[month], total: Math.round(total * 100) / 100 };
    });

    // Estado de pagos distribution
    const ESTADO_LABELS: Record<string, string> = {
      pagado: "Al día", parcial: "Parcial", pendiente: "Pendiente",
    };
    const estadosPago: EstadoPagoData[] = estadosPagoRaw.map((e) => ({
      estado: e.estado,
      label: ESTADO_LABELS[e.estado] ?? e.estado,
      count: e._count.id,
    }));

    // Matrículas por curso
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
      kpis: {
        alumnosActivos,
        matriculasActivas,
        totalPendientesCount,
        ingresos: Number(ingresosMes._sum.monto ?? 0),
        docentes,
        cursosActivos,
        asistenciasHoy,
      },
      ingresosPorMes,
      estadosPago,
      matriculasPorCurso,
      mesesPendientes: pendientesSerializados,
    };
  },
  ["dashboard"],
  { tags: ["dashboard", "matriculas", "pagos", "alumnos"], revalidate: 60 },
);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const [data, horarios] = await Promise.all([
    getDashboardData(),
    getHorariosCalendario(),
  ]);

  const { kpis, ingresosPorMes, estadosPago, matriculasPorCurso, mesesPendientes } = data;

  const totalPendiente = mesesPendientes.reduce(
    (s, m) => s + (m.montoTotal - m.montoPagado),
    0,
  );

  const kpiCards = [
    {
      label: "Alumnos activos",
      value: kpis.alumnosActivos,
      sub: null,
      icon: Users,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      valueBg: "",
    },
    {
      label: "Matrículas activas",
      value: kpis.matriculasActivas,
      sub: null,
      icon: ClipboardList,
      iconBg: "bg-indigo-50",
      iconColor: "text-indigo-600",
    },
    {
      label: "Ingresos del mes",
      value: `S/${kpis.ingresos.toFixed(2)}`,
      sub: null,
      icon: DollarSign,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      label: "Por cobrar",
      value: kpis.totalPendientesCount,
      sub: `S/${totalPendiente.toFixed(2)} pendiente`,
      icon: AlertCircle,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
    {
      label: "Horarios activos",
      value: kpis.cursosActivos,
      sub: null,
      icon: CalendarDays,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
    },
    {
      label: "Docentes",
      value: kpis.docentes,
      sub: null,
      icon: UserCheck,
      iconBg: "bg-rose-50",
      iconColor: "text-rose-600",
    },
  ] as const;

  return (
    <div className="space-y-6">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Resumen general — {new Date().toLocaleDateString("es-PE", {
            weekday: "long", day: "numeric", month: "long", year: "numeric",
          })}
        </p>
      </div>

      {/* ── KPIs ─────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map(({ label, value, sub, icon: Icon, iconBg, iconColor }) => (
          <div
            key={label}
            className="rounded-xl bg-white border border-zinc-200 p-5 shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-zinc-500 leading-tight">{label}</span>
              <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconBg} ${iconColor}`}>
                <Icon className="h-3.5 w-3.5" />
              </span>
            </div>
            <p className="text-2xl font-bold text-zinc-900 tabular-nums">{value}</p>
            {sub && <p className="mt-1 text-[11px] text-zinc-400">{sub}</p>}
          </div>
        ))}
      </div>

      {/* ── Charts ───────────────────────────────────────────────────────────── */}
      <DashboardCharts
        ingresosPorMes={ingresosPorMes}
        estadosPago={estadosPago}
        matriculasPorCurso={matriculasPorCurso}
        mesesPendientes={mesesPendientes}
      />

      {/* ── Weekly schedule calendar ──────────────────────────────────────── */}
      <div className="rounded-xl bg-white border border-zinc-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100">
          <p className="text-sm font-semibold text-zinc-900">Horario semanal</p>
          <p className="text-xs text-zinc-400 mt-0.5">
            {horarios.length === 0
              ? "No hay horarios activos"
              : `${horarios.length} horario${horarios.length !== 1 ? "s" : ""} activo${horarios.length !== 1 ? "s" : ""} — navega con las flechas`}
          </p>
        </div>
        <div className="p-4">
          <ClasesCalendar horarios={horarios} title="" subtitle="" />
        </div>
      </div>
    </div>
  );
}
