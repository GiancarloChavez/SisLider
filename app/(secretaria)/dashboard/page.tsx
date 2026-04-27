import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Users, ClipboardList, AlertCircle, DollarSign } from "lucide-react";

const getDashboardData = unstable_cache(
  async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [alumnosActivos, matriculasActivas, mesesPendientes, ingresosMes] =
      await Promise.all([
        prisma.alumno.count({ where: { habilitado: true } }),
        prisma.matricula.count({ where: { estado: "activa" } }),
        prisma.mesPago.findMany({
          where: { estado: { in: ["pendiente", "parcial"] } },
          include: { matricula: { include: { alumno: true } } },
          orderBy: [{ anio: "asc" }, { mes: "asc" }],
          take: 10,
        }),
        prisma.abono.aggregate({
          _sum: { monto: true },
          where: { createdAt: { gte: startOfMonth } },
        }),
      ]);

    return {
      alumnosActivos,
      matriculasActivas,
      mesesPendientes: mesesPendientes.map((m) => ({
        id: m.id,
        anio: m.anio,
        mes: m.mes,
        estado: m.estado,
        montoTotal: Number(m.montoTotal),
        montoPagado: Number(m.montoPagado),
        alumno: {
          nombre: m.matricula.alumno.nombre,
          apellido: m.matricula.alumno.apellido,
        },
      })),
      ingresos: Number(ingresosMes._sum.monto ?? 0),
    };
  },
  ["dashboard"],
  { tags: ["dashboard"], revalidate: 60 }
);

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

export default async function DashboardPage() {
  const { alumnosActivos, matriculasActivas, mesesPendientes, ingresos } =
    await getDashboardData();

  const totalPendiente = mesesPendientes.reduce(
    (sum, m) => sum + (m.montoTotal - m.montoPagado),
    0
  );

  const kpis = [
    { label: "Alumnos activos",    value: alumnosActivos,              sub: null,                                   icon: Users,         color: "bg-blue-50 text-blue-600" },
    { label: "Matrículas activas", value: matriculasActivas,           sub: null,                                   icon: ClipboardList, color: "bg-indigo-50 text-indigo-600" },
    { label: "Pagos pendientes",   value: mesesPendientes.length,      sub: `S/${totalPendiente.toFixed(2)} por cobrar`, icon: AlertCircle,  color: "bg-amber-50 text-amber-600" },
    { label: "Ingresos del mes",   value: `S/${ingresos.toFixed(2)}`,  sub: null,                                   icon: DollarSign,    color: "bg-emerald-50 text-emerald-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
        <p className="text-sm text-zinc-500">Resumen del sistema</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="rounded-xl bg-white border border-zinc-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-zinc-500">{label}</span>
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p className="text-3xl font-bold text-zinc-900">{value}</p>
            {sub && <p className="mt-1 text-xs text-zinc-400">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Tabla pagos pendientes */}
      <div className="rounded-xl bg-white border border-zinc-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-900">Pagos pendientes</h2>
        </div>

        {mesesPendientes.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-zinc-400">Sin pagos pendientes</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">
                <th className="px-5 py-3">Alumno</th>
                <th className="px-5 py-3">Período</th>
                <th className="px-5 py-3">Total</th>
                <th className="px-5 py-3">Pagado</th>
                <th className="px-5 py-3">Debe</th>
                <th className="px-5 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {mesesPendientes.map((mes) => {
                const debe = mes.montoTotal - mes.montoPagado;
                return (
                  <tr key={mes.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-zinc-900">
                      {mes.alumno.apellido}, {mes.alumno.nombre}
                    </td>
                    <td className="px-5 py-3 text-zinc-500">
                      {MESES[mes.mes - 1]} {mes.anio}
                    </td>
                    <td className="px-5 py-3 font-mono text-zinc-700">S/{mes.montoTotal.toFixed(2)}</td>
                    <td className="px-5 py-3 font-mono text-zinc-700">S/{mes.montoPagado.toFixed(2)}</td>
                    <td className="px-5 py-3 font-mono font-semibold text-red-600">S/{debe.toFixed(2)}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
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
        )}
      </div>
    </div>
  );
}
