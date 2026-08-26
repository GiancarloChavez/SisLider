"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Pencil, Clock, MapPin, User, CalendarDays,
  BookOpen, Users, TrendingUp, Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { HorarioDialog } from "../../horarios/HorarioDialog";
import { DIA_TO_DOW, DIA_ABREV } from "@/lib/horario-periodos";
import type { GrupoPerfilData } from "./page";
import type { HorarioSerialized, HorarioSelectData } from "@/lib/actions/horarios";

// ─── Constants ────────────────────────────────────────────────────────────────

const MESES_NOMBRE = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const MESES_CORTO = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const DIAS_NOMBRE = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];

const DIA_COLORS: Record<string, string> = {
  Lunes:     "bg-blue-50 text-blue-700 border-blue-200",
  Martes:    "bg-violet-50 text-violet-700 border-violet-200",
  Miércoles: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Jueves:    "bg-orange-50 text-orange-700 border-orange-200",
  Viernes:   "bg-pink-50 text-pink-700 border-pink-200",
  Sábado:    "bg-teal-50 text-teal-700 border-teal-200",
  Domingo:   "bg-zinc-50 text-zinc-600 border-zinc-200",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

type GrupoEstado = "vigente" | "proximo" | "culminado" | null;

function getEstado(fechaInicio: string | null, fechaFin: string | null): GrupoEstado {
  if (!fechaInicio || !fechaFin) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [sy, sm, sd] = fechaInicio.split("-").map(Number);
  const [ey, em, ed] = fechaFin.split("-").map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end   = new Date(ey, em - 1, ed);
  if (today < start) return "proximo";
  if (today > end)   return "culminado";
  return "vigente";
}

function countClassDays(start: Date, end: Date, dias: string[]): number {
  const dows = new Set(
    dias.map((d) => DIA_TO_DOW[d]).filter((v): v is number => v !== undefined)
  );
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    if (dows.has(cur.getDay())) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function formatDateLong(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dia = DIAS_NOMBRE[date.getDay()];
  return `${dia.charAt(0).toUpperCase() + dia.slice(1)} ${d} de ${MESES_CORTO[m - 1]}. ${y}`;
}

function formatMes(anio: number, mes: number): string {
  return `${MESES_NOMBRE[mes - 1]} ${anio}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const ESTADO_STYLES: Record<string, string> = {
  vigente:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  proximo:   "bg-blue-50 text-blue-700 border-blue-200",
  culminado: "bg-zinc-100 text-zinc-500 border-zinc-200",
};
const ESTADO_LABELS: Record<string, string> = {
  vigente:   "Vigente",
  proximo:   "Próximo",
  culminado: "Culminado",
};

function EstadoBadge({ estado }: { estado: GrupoEstado }) {
  if (!estado) return null;
  return (
    <span className={cn(
      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
      ESTADO_STYLES[estado]
    )}>
      {ESTADO_LABELS[estado]}
    </span>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-100 bg-white px-4 py-3 space-y-1">
      <div className="flex items-center gap-1.5 text-zinc-400">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-sm font-semibold text-zinc-800">{value}</p>
      {sub && <p className="text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  horario: GrupoPerfilData;
  selectData: HorarioSelectData;
};

export function GrupoPerfilView({ horario, selectData }: Props) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [editKey, setEditKey] = useState(0);

  const estado = getEstado(horario.fechaInicio, horario.fechaFin);

  // ── Clases hasta hoy ─────────────────────────────────────────────────────────
  const clasesHastaHoy: number = (() => {
    if (!horario.fechaInicio || (estado === "proximo")) return 0;
    const [sy, sm, sd] = horario.fechaInicio.split("-").map(Number);
    const start = new Date(sy, sm - 1, sd);
    let end: Date;
    if (estado === "culminado" && horario.fechaFin) {
      const [ey, em, ed] = horario.fechaFin.split("-").map(Number);
      end = new Date(ey, em - 1, ed);
    } else {
      end = new Date(); end.setHours(0, 0, 0, 0);
    }
    return countClassDays(start, end, horario.dias);
  })();

  // ── Pagos aggregate ──────────────────────────────────────────────────────────
  const pagosAggregate = horario.matriculas.reduce(
    (acc, m) => {
      for (const mp of m.mesesPago) {
        acc.facturado += mp.montoTotal;
        acc.cobrado   += mp.montoPagado;
      }
      return acc;
    },
    { facturado: 0, cobrado: 0 }
  );
  const pendiente = pagosAggregate.facturado - pagosAggregate.cobrado;

  const activas   = horario.matriculas.filter((m) => m.estado === "activa").length;
  const inactivas = horario.matriculas.filter((m) => m.estado !== "activa").length;

  // ── HorarioSerialized for dialog ─────────────────────────────────────────────
  const horarioForDialog: HorarioSerialized = {
    id: horario.id,
    idCurso: horario.idCurso,
    idDocente: horario.idDocente,
    idAula: horario.idAula,
    numeroGrupo: horario.numeroGrupo,
    precioMensual: horario.precioMensual,
    cantidadMeses: horario.cantidadMeses,
    fechaInicio: horario.fechaInicio ?? undefined,
    fechaFin: horario.fechaFin ?? undefined,
    horaInicio: horario.horaInicio,
    horaFin: horario.horaFin,
    activo: horario.activo,
    createdAt: horario.createdAt,
    curso: horario.curso,
    docente: horario.docente,
    aula: horario.aula,
    dias: horario.dias,
    periodos: horario.periodos,
    cantidadMatriculados: horario.matriculas.length,
  };

  function openEdit() {
    setEditKey((k) => k + 1);
    setEditOpen(true);
  }

  function handleEditClose() {
    setEditOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-6 max-w-5xl">

      {/* ── Nav + header ────────────────────────────────────────────────────── */}
      <div>
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-700 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold text-zinc-900">
                Grupo {horario.numeroGrupo}
              </h1>
              <EstadoBadge estado={estado} />
            </div>
            <p className="text-zinc-500 mt-0.5">{horario.curso.nombre}</p>
          </div>

          <Button onClick={openEdit} variant="outline" className="gap-2 shrink-0">
            <Pencil className="h-4 w-4" />
            Editar grupo
          </Button>
        </div>
      </div>

      {/* ── Info cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <InfoCard
          icon={User}
          label="Docente"
          value={`${horario.docente.apellido}, ${horario.docente.nombre}`}
        />
        <InfoCard
          icon={MapPin}
          label="Aula"
          value={horario.aula.nombre}
          sub={`Cap. ${horario.aula.capacidad} alumnos`}
        />
        <InfoCard
          icon={Clock}
          label="Horario"
          value={`${horario.horaInicio} – ${horario.horaFin}`}
          sub={
            <span className="flex gap-0.5 flex-wrap mt-0.5">
              {horario.dias.map((dia) => (
                <span
                  key={dia}
                  className={cn(
                    "inline-flex rounded border px-1.5 py-0 text-[11px] font-medium",
                    DIA_COLORS[dia] ?? "bg-zinc-50 text-zinc-600 border-zinc-200"
                  )}
                >
                  {DIA_ABREV[dia] ?? dia}
                </span>
              ))}
            </span>
          }
        />
        <InfoCard
          icon={BookOpen}
          label="Precio mensual"
          value={`S/${horario.precioMensual.toFixed(2)}`}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <InfoCard
          icon={CalendarDays}
          label="Fecha de inicio"
          value={horario.fechaInicio ? formatDateLong(horario.fechaInicio) : "—"}
        />
        <InfoCard
          icon={CalendarDays}
          label="Fecha de fin"
          value={horario.fechaFin ? formatDateLong(horario.fechaFin) : "—"}
        />
        <InfoCard
          icon={TrendingUp}
          label="Duración"
          value={
            horario.cantidadMeses
              ? `${horario.cantidadMeses} mes${horario.cantidadMeses !== 1 ? "es" : ""}`
              : "—"
          }
          sub={
            clasesHastaHoy > 0
              ? `${clasesHastaHoy} clase${clasesHastaHoy !== 1 ? "s" : ""} ${estado === "culminado" ? "en total" : "hasta hoy"}`
              : undefined
          }
        />
      </div>

      {/* ── Pagos vinculados ────────────────────────────────────────────────── */}
      {horario.matriculas.some((m) => m.mesesPago.length > 0) && (
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-zinc-100">
            <Wallet className="h-4 w-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-700">Pagos vinculados</h2>
          </div>
          <div className="grid grid-cols-3 divide-x divide-zinc-100 px-0">
            <div className="px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 mb-1">
                Facturado
              </p>
              <p className="text-lg font-bold text-zinc-800">
                S/{pagosAggregate.facturado.toFixed(2)}
              </p>
            </div>
            <div className="px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 mb-1">
                Cobrado
              </p>
              <p className="text-lg font-bold text-emerald-700">
                S/{pagosAggregate.cobrado.toFixed(2)}
              </p>
            </div>
            <div className="px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 mb-1">
                Pendiente
              </p>
              <p className={cn(
                "text-lg font-bold",
                pendiente > 0 ? "text-amber-600" : "text-zinc-400"
              )}>
                S/{pendiente.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Alumnos inscritos ────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-zinc-100">
          <Users className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-700">
            Alumnos inscritos
          </h2>
          <span className="ml-auto text-xs text-zinc-400">
            {activas > 0 && `${activas} activo${activas !== 1 ? "s" : ""}`}
            {activas > 0 && inactivas > 0 && " · "}
            {inactivas > 0 && `${inactivas} inactivo${inactivas !== 1 ? "s" : ""}`}
            {horario.matriculas.length === 0 && "Sin alumnos"}
          </span>
        </div>

        {horario.matriculas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="rounded-full bg-zinc-100 p-3">
              <Users className="h-6 w-6 text-zinc-300" />
            </div>
            <p className="text-sm text-zinc-400">No hay alumnos matriculados en este grupo</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400 px-5 py-2.5">
                    Alumno
                  </th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400 px-3 py-2.5 w-24">
                    Estado
                  </th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400 px-3 py-2.5 w-28">
                    Precio/mes
                  </th>
                  {estado !== "proximo" && (
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400 px-3 py-2.5 w-36">
                      Asistencia
                    </th>
                  )}
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400 px-3 py-2.5 w-36">
                    Pago actual
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {horario.matriculas.map((m) => {
                  const presentes  = m.asistencias.filter((a) => a.estado === "presente").length;
                  const ausentes   = m.asistencias.filter((a) => a.estado === "ausente").length;
                  const porcentaje = clasesHastaHoy > 0
                    ? Math.round((presentes / clasesHastaHoy) * 100)
                    : null;

                  // Latest unpaid mes
                  const mesPendiente = [...m.mesesPago]
                    .reverse()
                    .find((mp) => mp.estado !== "pagado");
                  const mesActual = mesPendiente ?? m.mesesPago[m.mesesPago.length - 1];

                  return (
                    <tr
                      key={m.id}
                      className={cn(
                        "hover:bg-zinc-50/60 transition-colors",
                        m.estado !== "activa" && "opacity-60"
                      )}
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/alumnos/${m.alumno.id}`}
                          className="font-medium text-zinc-800 hover:text-blue-600 hover:underline transition-colors"
                        >
                          {m.alumno.apellido}, {m.alumno.nombre}
                        </Link>
                        {m.alumno.dni && (
                          <p className="text-xs text-zinc-400 mt-0.5">DNI {m.alumno.dni}</p>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                          m.estado === "activa"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-zinc-100 text-zinc-500 border-zinc-200"
                        )}>
                          {m.estado === "activa" ? "Activa" : "Inactiva"}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-mono text-zinc-700">
                        S/{m.precioFinalMensual.toFixed(2)}
                      </td>
                      {estado !== "proximo" && (
                        <td className="px-3 py-3">
                          {clasesHastaHoy > 0 ? (
                            <div>
                              <span className="font-medium text-zinc-700">
                                {presentes}/{clasesHastaHoy}
                              </span>
                              {porcentaje !== null && (
                                <span className={cn(
                                  "ml-1.5 text-xs font-medium",
                                  porcentaje >= 80 ? "text-emerald-600"
                                    : porcentaje >= 60 ? "text-amber-600"
                                    : "text-red-500"
                                )}>
                                  {porcentaje}%
                                </span>
                              )}
                              {ausentes > 0 && (
                                <p className="text-[11px] text-zinc-400 mt-0.5">
                                  {ausentes} ausencia{ausentes !== 1 ? "s" : ""}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-zinc-300">—</span>
                          )}
                        </td>
                      )}
                      <td className="px-3 py-3">
                        {mesActual ? (
                          <div>
                            <p className="text-xs text-zinc-500">{formatMes(mesActual.anio, mesActual.mes)}</p>
                            <p className={cn(
                              "text-sm font-medium",
                              mesActual.estado === "pagado" ? "text-emerald-700"
                                : mesActual.montoPagado > 0 ? "text-amber-600"
                                : "text-zinc-700"
                            )}>
                              {mesActual.estado === "pagado"
                                ? "Pagado"
                                : mesActual.montoPagado > 0
                                ? `S/${mesActual.montoPagado.toFixed(2)} / S/${mesActual.montoTotal.toFixed(2)}`
                                : `S/${mesActual.montoTotal.toFixed(2)} pendiente`}
                            </p>
                          </div>
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Edit dialog ─────────────────────────────────────────────────────── */}
      <HorarioDialog
        key={editKey}
        open={editOpen}
        onClose={handleEditClose}
        horario={horarioForDialog}
        selectData={selectData}
      />
    </div>
  );
}
