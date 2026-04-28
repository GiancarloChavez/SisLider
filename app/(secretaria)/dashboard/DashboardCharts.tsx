"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

export type IngresosMesData    = { mes: string; total: number };
export type EstadoPagoData     = { estado: string; label: string; count: number };
export type MatriculasCursoData = { nombre: string; matriculas: number };
export type MesPendienteData   = {
  id: string; anio: number; mes: number; estado: string;
  montoTotal: number; montoPagado: number;
  alumno: { nombre: string; apellido: string };
};

interface Props {
  ingresosPorMes:    IngresosMesData[];
  estadosPago:       EstadoPagoData[];
  matriculasPorCurso: MatriculasCursoData[];
  mesesPendientes:   MesPendienteData[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ESTADO_COLORS: Record<string, string> = {
  pagado:    "#10b981",
  parcial:   "#f59e0b",
  pendiente: "#ef4444",
};

const MESES_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

// ─── Custom tooltips ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TooltipIngresos({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const value = Number(payload[0]?.value ?? 0);
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-lg text-xs">
      <p className="font-medium text-zinc-500 mb-1">{label}</p>
      <p className="text-indigo-600 font-bold text-sm">S/{value.toFixed(2)}</p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TooltipBar({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-lg text-xs">
      <p className="font-medium text-zinc-700 mb-1">{label}</p>
      <p className="text-indigo-600 font-semibold">{payload[0]?.value} matrículas</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DashboardCharts({
  ingresosPorMes,
  estadosPago,
  matriculasPorCurso,
  mesesPendientes,
}: Props) {
  const totalPagos = estadosPago.reduce((s, e) => s + e.count, 0);

  return (
    <div className="space-y-4">

      {/* ── Row 1: Area + Donut ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Area chart — ingresos por mes */}
        <div className="lg:col-span-2 rounded-xl bg-white border border-zinc-200 shadow-sm p-5">
          <div className="mb-5">
            <p className="text-sm font-semibold text-zinc-900">Ingresos por mes</p>
            <p className="text-xs text-zinc-400 mt-0.5">Abonos registrados en los últimos 6 meses</p>
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={ingresosPorMes} margin={{ left: 4, right: 8, top: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
              <XAxis
                dataKey="mes"
                tick={{ fontSize: 11, fill: "#a1a1aa" }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#a1a1aa" }}
                axisLine={false} tickLine={false}
                tickFormatter={(v) => `S/${v}`}
                width={54}
              />
              <Tooltip content={<TooltipIngresos />} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#gradIngresos)"
                dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#6366f1", stroke: "#e0e7ff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Donut chart — estado de pagos */}
        <div className="rounded-xl bg-white border border-zinc-200 shadow-sm p-5 flex flex-col">
          <div className="mb-3">
            <p className="text-sm font-semibold text-zinc-900">Estado de pagos</p>
            <p className="text-xs text-zinc-400 mt-0.5">{totalPagos} meses en total</p>
          </div>
          <div className="flex-1 flex items-center justify-center min-h-[140px]">
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie
                  data={estadosPago}
                  dataKey="count"
                  nameKey="label"
                  cx="50%" cy="50%"
                  innerRadius={42} outerRadius={62}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {estadosPago.map((entry) => (
                    <Cell
                      key={entry.estado}
                      fill={ESTADO_COLORS[entry.estado] ?? "#94a3b8"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v, name) => [v, name]}
                  contentStyle={{ borderRadius: 8, border: "1px solid #e4e4e7", fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2.5 mt-2">
            {estadosPago.map((e) => {
              const pct = totalPagos > 0 ? Math.round((e.count / totalPagos) * 100) : 0;
              return (
                <div key={e.estado} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: ESTADO_COLORS[e.estado] ?? "#94a3b8" }}
                    />
                    <span className="text-zinc-600">{e.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5 tabular-nums">
                    <span className="font-semibold text-zinc-900">{e.count}</span>
                    <span className="text-zinc-400 text-[11px]">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Row 2: Bar chart + Deudores ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Bar chart — matrículas por curso */}
        <div className="rounded-xl bg-white border border-zinc-200 shadow-sm p-5">
          <div className="mb-5">
            <p className="text-sm font-semibold text-zinc-900">Matrículas por curso</p>
            <p className="text-xs text-zinc-400 mt-0.5">Alumnos activos por curso</p>
          </div>
          {matriculasPorCurso.length === 0 ? (
            <div className="flex items-center justify-center h-[190px] text-sm text-zinc-400">
              Sin datos de matrículas
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={matriculasPorCurso} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                <XAxis
                  dataKey="nombre"
                  tick={{ fontSize: 10, fill: "#a1a1aa" }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#a1a1aa" }}
                  axisLine={false} tickLine={false}
                  allowDecimals={false}
                  width={24}
                />
                <Tooltip content={<TooltipBar />} cursor={{ fill: "#f4f4f5" }} />
                <Bar
                  dataKey="matriculas"
                  fill="#6366f1"
                  radius={[5, 5, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Deudores table */}
        <div className="rounded-xl bg-white border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-zinc-100 shrink-0">
            <p className="text-sm font-semibold text-zinc-900">Pagos pendientes</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              {mesesPendientes.length === 0
                ? "Todo al día"
                : `${mesesPendientes.length} mes${mesesPendientes.length !== 1 ? "es" : ""} sin pago completo`}
            </p>
          </div>

          {mesesPendientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-10 gap-1">
              <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-zinc-400">Sin pagos pendientes</p>
            </div>
          ) : (
            <div className="overflow-y-auto" style={{ maxHeight: 238 }}>
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-zinc-50/90 backdrop-blur-sm border-b border-zinc-100">
                  <tr className="text-left text-zinc-500">
                    <th className="px-4 py-2.5 font-medium uppercase tracking-wide text-[10px]">Alumno</th>
                    <th className="px-4 py-2.5 font-medium uppercase tracking-wide text-[10px]">Período</th>
                    <th className="px-4 py-2.5 font-medium uppercase tracking-wide text-[10px] text-right">Debe</th>
                    <th className="px-4 py-2.5 font-medium uppercase tracking-wide text-[10px]">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {mesesPendientes.map((mes) => {
                    const debe = mes.montoTotal - mes.montoPagado;
                    return (
                      <tr key={mes.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-zinc-900 whitespace-nowrap">
                          {mes.alumno.apellido}, {mes.alumno.nombre}
                        </td>
                        <td className="px-4 py-2.5 text-zinc-500 whitespace-nowrap">
                          {MESES_ES[mes.mes - 1]} {mes.anio}
                        </td>
                        <td className="px-4 py-2.5 font-mono font-semibold text-red-600 text-right whitespace-nowrap">
                          S/{debe.toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            mes.estado === "parcial"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                          }`}>
                            {mes.estado === "parcial" ? "Parcial" : "Pendiente"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
