"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Pencil, Phone, User, Calendar, BookOpen,
  Users, Wallet, GraduationCap, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AlumnoDialog } from "../AlumnoDialog";
import { WhatsAppButton } from "@/components/sislider/WhatsAppButton";
import { DIA_TO_DOW, DIA_ABREV } from "@/lib/horario-periodos";
import type { AlumnoPerfilData } from "./page";
import type { AlumnoSerialized } from "@/lib/actions/alumnos";

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

function getGrupoEstado(fi: string | null, ff: string | null): GrupoEstado {
  if (!fi || !ff) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [sy, sm, sd] = fi.split("-").map(Number);
  const [ey, em, ed] = ff.split("-").map(Number);
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

function calcularEdad(fechaNacimiento: string | null): number | null {
  if (!fechaNacimiento) return null;
  const hoy = new Date();
  const nac = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nac.getUTCFullYear();
  const dm = hoy.getMonth() - nac.getUTCMonth();
  if (dm < 0 || (dm === 0 && hoy.getDate() < nac.getUTCDate())) edad--;
  return edad >= 0 ? edad : null;
}

function formatDateShort(isoOrYmd: string): string {
  const d = new Date(isoOrYmd.slice(0, 10) + "T12:00:00");
  return `${d.getDate()} ${MESES_CORTO[d.getMonth()]}. ${d.getFullYear()}`;
}

function formatDateLong(isoOrYmd: string): string {
  const parts = isoOrYmd.slice(0, 10).split("-").map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return `${DIAS_NOMBRE[d.getDay()].charAt(0).toUpperCase() + DIAS_NOMBRE[d.getDay()].slice(1)} ${parts[2]} de ${MESES_CORTO[parts[1] - 1]}. ${parts[0]}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const GRUPO_ESTADO_STYLES: Record<string, string> = {
  vigente:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  proximo:   "bg-blue-50 text-blue-700 border-blue-200",
  culminado: "bg-zinc-100 text-zinc-500 border-zinc-200",
};
const GRUPO_ESTADO_LABELS: Record<string, string> = {
  vigente:   "Vigente",
  proximo:   "Próximo",
  culminado: "Culminado",
};

function GrupoEstadoBadge({ estado }: { estado: GrupoEstado }) {
  if (!estado) return null;
  return (
    <span className={cn(
      "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
      GRUPO_ESTADO_STYLES[estado]
    )}>
      {GRUPO_ESTADO_LABELS[estado]}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AlumnoPerfilView({ alumno }: { alumno: AlumnoPerfilData }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [editKey, setEditKey] = useState(0);

  const edad = calcularEdad(alumno.fechaNacimiento);
  const tutorPrincipal = alumno.tutores.find((t) => t.esPrincipal) ?? null;
  const tutoresAdicionales = alumno.tutores.filter((t) => !t.esPrincipal);

  const matriculasActivas   = alumno.matriculas.filter((m) => m.estado === "activa");
  const matriculasConcluidas = alumno.matriculas.filter((m) => m.estado !== "activa");

  // ── Pagos aggregate ──────────────────────────────────────────────────────────
  const { facturado, cobrado } = alumno.matriculas.reduce(
    (acc, m) => {
      for (const mp of m.mesesPago) {
        acc.facturado += mp.montoTotal;
        acc.cobrado   += mp.montoPagado;
      }
      return acc;
    },
    { facturado: 0, cobrado: 0 }
  );
  const pendiente = facturado - cobrado;

  // ── AlumnoSerialized for dialog ──────────────────────────────────────────────
  const alumnoForDialog: AlumnoSerialized = {
    id: alumno.id,
    nombre: alumno.nombre,
    apellido: alumno.apellido,
    dni: alumno.dni,
    celular: alumno.celular,
    fechaNacimiento: alumno.fechaNacimiento,
    habilitado: alumno.habilitado,
    createdAt: alumno.createdAt,
    tutor: tutorPrincipal
      ? {
          nombre: tutorPrincipal.nombre,
          apellido: tutorPrincipal.apellido,
          celular: tutorPrincipal.celular,
          relacion: tutorPrincipal.relacion,
        }
      : null,
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
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-zinc-900">
                {alumno.apellido}, {alumno.nombre}
              </h1>
              <span className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                alumno.habilitado
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              )}>
                <span className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  alumno.habilitado ? "bg-emerald-500" : "bg-amber-400"
                )} />
                {alumno.habilitado ? "Habilitado" : "Sin habilitar"}
              </span>
            </div>

            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {alumno.dni && (
                <span className="text-sm text-zinc-500 font-mono">DNI {alumno.dni}</span>
              )}
              {edad !== null && (
                <span className="text-sm text-zinc-400">{edad} años</span>
              )}
              {alumno.celular && (
                <div className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="text-sm font-mono text-zinc-500">{alumno.celular}</span>
                  <WhatsAppButton phone={alumno.celular} variant="icon" />
                </div>
              )}
            </div>
          </div>

          <Button onClick={openEdit} variant="outline" className="gap-2 shrink-0">
            <Pencil className="h-4 w-4" />
            Editar
          </Button>
        </div>
      </div>

      {/* ── Info: nacimiento + apoderados ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {alumno.fechaNacimiento && (
          <div className="rounded-lg border border-zinc-100 bg-white px-4 py-3">
            <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
              <Calendar className="h-3.5 w-3.5" />
              <span className="text-[11px] font-semibold uppercase tracking-wide">Fecha de nacimiento</span>
            </div>
            <p className="text-sm font-semibold text-zinc-800">
              {formatDateLong(alumno.fechaNacimiento)}
            </p>
            {edad !== null && (
              <p className="text-xs text-zinc-400 mt-0.5">{edad} años</p>
            )}
          </div>
        )}

        {alumno.tutores.map((t) => (
          <div key={t.id} className="rounded-lg border border-zinc-100 bg-white px-4 py-3">
            <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
              <User className="h-3.5 w-3.5" />
              <span className="text-[11px] font-semibold uppercase tracking-wide">
                {t.esPrincipal ? "Apoderado principal" : "Apoderado adicional"}
                <span className="ml-1.5 normal-case font-normal text-zinc-400">({t.relacion})</span>
              </span>
            </div>
            <p className="text-sm font-semibold text-zinc-800">
              {t.apellido}, {t.nombre}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-xs font-mono text-zinc-400">{t.celular}</span>
              <WhatsAppButton phone={t.celular} variant="icon" />
            </div>
            {t.celularAdicional && (
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xs font-mono text-zinc-400">{t.celularAdicional}</span>
                <WhatsAppButton phone={t.celularAdicional} variant="icon" />
              </div>
            )}
          </div>
        ))}

        {alumno.tutores.length === 0 && (
          <div className="rounded-lg border border-zinc-100 bg-white px-4 py-3">
            <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
              <User className="h-3.5 w-3.5" />
              <span className="text-[11px] font-semibold uppercase tracking-wide">Apoderado</span>
            </div>
            <p className="text-sm text-zinc-400 italic">Sin apoderado registrado</p>
          </div>
        )}
      </div>

      {/* ── Resumen de pagos ────────────────────────────────────────────────── */}
      {alumno.matriculas.some((m) => m.mesesPago.length > 0) && (
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-zinc-100">
            <Wallet className="h-4 w-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-700">Resumen de pagos</h2>
          </div>
          <div className="grid grid-cols-3 divide-x divide-zinc-100">
            <div className="px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 mb-1">Facturado total</p>
              <p className="text-lg font-bold text-zinc-800">S/{facturado.toFixed(2)}</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 mb-1">Cobrado</p>
              <p className="text-lg font-bold text-emerald-700">S/{cobrado.toFixed(2)}</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 mb-1">Pendiente</p>
              <p className={cn("text-lg font-bold", pendiente > 0 ? "text-amber-600" : "text-zinc-400")}>
                S/{pendiente.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Cursos actuales ─────────────────────────────────────────────────── */}
      {matriculasActivas.length > 0 && (
        <MatriculasSection
          title="Cursos actuales"
          icon={GraduationCap}
          matriculas={matriculasActivas}
        />
      )}

      {/* ── Historial ───────────────────────────────────────────────────────── */}
      {matriculasConcluidas.length > 0 && (
        <MatriculasSection
          title="Historial"
          icon={BookOpen}
          matriculas={matriculasConcluidas}
          muted
        />
      )}

      {alumno.matriculas.length === 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex flex-col items-center justify-center py-14 gap-3">
            <div className="rounded-full bg-zinc-100 p-4">
              <GraduationCap className="h-7 w-7 text-zinc-300" />
            </div>
            <p className="text-sm text-zinc-400">Sin matrículas registradas</p>
          </div>
        </div>
      )}

      {/* ── Edit dialog ─────────────────────────────────────────────────────── */}
      <AlumnoDialog
        key={editKey}
        open={editOpen}
        onClose={handleEditClose}
        alumno={alumnoForDialog}
      />
    </div>
  );
}

// ─── MatriculasSection ────────────────────────────────────────────────────────

function MatriculasSection({
  title,
  icon: Icon,
  matriculas,
  muted = false,
}: {
  title: string;
  icon: React.ElementType;
  matriculas: AlumnoPerfilData["matriculas"];
  muted?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-zinc-100">
        <Icon className="h-4 w-4 text-zinc-400" />
        <h2 className="text-sm font-semibold text-zinc-700">{title}</h2>
        <span className="ml-auto text-xs text-zinc-400">{matriculas.length}</span>
      </div>

      <div className="divide-y divide-zinc-100">
        {matriculas.map((m) => {
          const grupoEstado = getGrupoEstado(m.horario.fechaInicio, m.horario.fechaFin);
          const today = new Date(); today.setHours(0, 0, 0, 0);

          const clasesHastaHoy = (() => {
            if (!m.horario.fechaInicio || grupoEstado === "proximo") return 0;
            const [sy, sm, sd] = m.horario.fechaInicio.split("-").map(Number);
            const start = new Date(sy, sm - 1, sd);
            let end: Date;
            if (grupoEstado === "culminado" && m.horario.fechaFin) {
              const [ey, em, ed] = m.horario.fechaFin.split("-").map(Number);
              end = new Date(ey, em - 1, ed);
            } else {
              end = new Date(today);
            }
            return countClassDays(start, end, m.horario.dias);
          })();

          const presentes  = m.asistencias.filter((a) => a.estado === "presente").length;
          const ausentes   = m.asistencias.filter((a) => a.estado === "ausente").length;
          const porcentaje = clasesHastaHoy > 0 ? Math.round((presentes / clasesHastaHoy) * 100) : null;

          const mesPendiente = [...m.mesesPago].reverse().find((mp) => mp.estado !== "pagado");
          const mesActual = mesPendiente ?? m.mesesPago[m.mesesPago.length - 1];

          return (
            <div
              key={m.id}
              className={cn(
                "px-5 py-4 hover:bg-zinc-50/60 transition-colors",
                muted && "opacity-70"
              )}
            >
              {/* Row: course + group link + estado badges */}
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-zinc-800">
                      {m.horario.curso.nombre}
                    </span>
                    <Link
                      href={`/grupos/${m.horario.id}`}
                      className="text-sm text-zinc-500 hover:text-blue-600 hover:underline transition-colors"
                    >
                      Grupo {m.horario.numeroGrupo}
                    </Link>
                    <GrupoEstadoBadge estado={grupoEstado} />
                    {m.estado !== "activa" && (
                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium bg-zinc-100 text-zinc-500 border-zinc-200">
                        Inactiva
                      </span>
                    )}
                  </div>

                  {/* Docente + Horario */}
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-xs text-zinc-400 flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {m.horario.docente.apellido}, {m.horario.docente.nombre}
                    </span>
                    <span className="text-xs text-zinc-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {m.horario.horaInicio}–{m.horario.horaFin}
                    </span>
                    <span className="flex gap-0.5">
                      {m.horario.dias.map((dia) => (
                        <span
                          key={dia}
                          className={cn(
                            "inline-flex rounded border px-1.5 py-0 text-[10px] font-medium",
                            DIA_COLORS[dia] ?? "bg-zinc-50 text-zinc-600 border-zinc-200"
                          )}
                        >
                          {DIA_ABREV[dia] ?? dia}
                        </span>
                      ))}
                    </span>
                  </div>

                  {/* Período */}
                  {(m.horario.fechaInicio || m.horario.fechaFin) && (
                    <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {m.horario.fechaInicio ? formatDateShort(m.horario.fechaInicio) : "—"}
                      {" → "}
                      {m.horario.fechaFin ? formatDateShort(m.horario.fechaFin) : "—"}
                      {m.horario.cantidadMeses && (
                        <span className="text-zinc-300">· {m.horario.cantidadMeses} meses</span>
                      )}
                    </p>
                  )}
                </div>

                {/* Right: asistencia + pago */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {/* Precio */}
                  <span className="font-mono text-sm font-semibold text-zinc-700">
                    S/{m.precioFinalMensual.toFixed(2)}/mes
                  </span>

                  {/* Asistencia */}
                  {clasesHastaHoy > 0 && (
                    <div className="text-right">
                      <span className="text-sm font-medium text-zinc-700">
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
                        <p className="text-[11px] text-zinc-400">{ausentes} ausencia{ausentes !== 1 ? "s" : ""}</p>
                      )}
                    </div>
                  )}

                  {/* Último pago */}
                  {mesActual && (
                    <p className={cn(
                      "text-xs",
                      mesActual.estado === "pagado" ? "text-emerald-600"
                        : mesActual.montoPagado > 0 ? "text-amber-600"
                        : "text-zinc-400"
                    )}>
                      {MESES_NOMBRE[mesActual.mes - 1].slice(0, 3)} {mesActual.anio}:{" "}
                      {mesActual.estado === "pagado"
                        ? "Pagado"
                        : mesActual.montoPagado > 0
                        ? `S/${mesActual.montoPagado.toFixed(2)} / S/${mesActual.montoTotal.toFixed(2)}`
                        : `S/${mesActual.montoTotal.toFixed(2)} pendiente`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
