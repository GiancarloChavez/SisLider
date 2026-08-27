"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft, Pencil, Phone, User, Calendar, BookOpen,
  Users, Wallet, GraduationCap, Clock, UserMinus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AlumnoDialog } from "../AlumnoDialog";
import { WhatsAppButton } from "@/components/sislider/WhatsAppButton";
import { desmatricularAlumno } from "@/lib/actions/matriculas";
import { DIA_TO_DOW, DIA_ABREV } from "@/lib/horario-periodos";
import type { AlumnoPerfilData, MatriculaParaAlumno } from "./page";
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

function formatDateShort(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${d} ${MESES_CORTO[m - 1]}. ${y}`;
}

function formatDateLong(isoOrYmd: string): string {
  const parts = isoOrYmd.slice(0, 10).split("-").map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  const dia = DIAS_NOMBRE[d.getDay()];
  return `${dia.charAt(0).toUpperCase() + dia.slice(1)} ${parts[2]} de ${MESES_CORTO[parts[1] - 1]}. ${parts[0]}`;
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
  culminado: "Pasado",
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

// ─── Desmatricular Dialog ─────────────────────────────────────────────────────

function DesmatricularDialog({
  matricula,
  onClose,
  onConfirm,
  loading,
}: {
  matricula: MatriculaParaAlumno | null;
  onClose: () => void;
  onConfirm: (monto: number) => void;
  loading: boolean;
}) {
  const [monto, setMonto] = useState("");

  if (!matricula) return null;

  function handleConfirm() {
    const parsed = parseFloat(monto.replace(",", ".")) || 0;
    onConfirm(parsed);
  }

  return (
    <Dialog open={!!matricula} onOpenChange={(v) => !v && !loading && onClose()}>
      <DialogContent className="sm:max-w-sm p-0 gap-0 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-red-100 bg-red-50">
          <div className="rounded-full bg-red-100 p-2 shrink-0">
            <UserMinus className="h-4 w-4 text-red-600" />
          </div>
          <DialogTitle className="text-sm font-semibold text-red-900">
            Desmatricular alumno
          </DialogTitle>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3">
            <p className="text-sm font-semibold text-zinc-800">
              {matricula.horario.curso.nombre}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Grupo {matricula.horario.numeroGrupo} · {matricula.horario.horaInicio}–{matricula.horario.horaFin}
            </p>
          </div>

          <p className="text-sm text-zinc-600">
            El alumno será removido de este grupo y su matrícula quedará inactiva.
          </p>

          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-500">
              Monto a devolver (S/) — opcional
            </Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="h-9 text-sm"
              disabled={loading}
            />
            <p className="text-[11px] text-zinc-400">
              Deja en blanco si no se realizará devolución.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-zinc-100">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? "Procesando..." : "Desmatricular"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Matrícula card ───────────────────────────────────────────────────────────

function MatriculaCard({
  m,
  canDesmatricular,
  onDesmatricular,
}: {
  m: MatriculaParaAlumno;
  canDesmatricular: boolean;
  onDesmatricular: (m: MatriculaParaAlumno) => void;
}) {
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
  const mesActual    = mesPendiente ?? m.mesesPago[m.mesesPago.length - 1];

  return (
    <div className="px-5 py-4 hover:bg-zinc-50/60 transition-colors">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          {/* Course + group + badges */}
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
          </div>

          {/* Docente + schedule + days */}
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

          {/* Period */}
          {(m.horario.fechaInicio || m.horario.fechaFin) && (
            <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {m.horario.fechaInicio ? formatDateShort(m.horario.fechaInicio) : "—"}
              {" → "}
              {m.horario.fechaFin ? formatDateShort(m.horario.fechaFin) : "—"}
              {m.horario.cantidadMeses && (
                <span className="text-zinc-300 ml-0.5">· {m.horario.cantidadMeses} meses</span>
              )}
            </p>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className="font-mono text-sm font-semibold text-zinc-700">
            S/{m.precioFinalMensual.toFixed(2)}/mes
          </span>

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

          {canDesmatricular && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDesmatricular(m)}
              className="h-7 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 gap-1.5"
            >
              <UserMinus className="h-3.5 w-3.5" />
              Desmatricular
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type MatriculaTab = "vigentes" | "proximos" | "pasados";

const MATRICULA_TABS: { id: MatriculaTab; label: string }[] = [
  { id: "vigentes", label: "Vigentes" },
  { id: "proximos", label: "Próximos" },
  { id: "pasados",  label: "Pasados"  },
];

export function AlumnoPerfilView({ alumno }: { alumno: AlumnoPerfilData }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [editKey, setEditKey]   = useState(0);
  const [matriculaTab, setMatriculaTab] = useState<MatriculaTab>("vigentes");
  const [desmatricularTarget, setDesmatricularTarget] = useState<MatriculaParaAlumno | null>(null);
  const [desmatriculating, setDesmatriculating] = useState(false);

  const edad = calcularEdad(alumno.fechaNacimiento);
  const tutorPrincipal = alumno.tutores.find((t) => t.esPrincipal) ?? null;

  // ── Matriculas por tab ───────────────────────────────────────────────────────
  const matriculasByTab = useMemo(() => {
    const vigentes: MatriculaParaAlumno[] = [];
    const proximos: MatriculaParaAlumno[] = [];
    const pasados:  MatriculaParaAlumno[] = [];

    for (const m of alumno.matriculas) {
      const ge = getGrupoEstado(m.horario.fechaInicio, m.horario.fechaFin);
      if (m.estado === "activa" && ge === "vigente")       vigentes.push(m);
      else if (m.estado === "activa" && ge === "proximo")  proximos.push(m);
      else                                                  pasados.push(m);
    }
    return { vigentes, proximos, pasados };
  }, [alumno.matriculas]);

  const tabCounts = {
    vigentes: matriculasByTab.vigentes.length,
    proximos: matriculasByTab.proximos.length,
    pasados:  matriculasByTab.pasados.length,
  };

  const currentMatriculas = matriculasByTab[matriculaTab];
  const canDesmatricular  = matriculaTab === "vigentes" || matriculaTab === "proximos";

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

  // ── Desmatricular ────────────────────────────────────────────────────────────
  async function handleDesmatricular(monto: number) {
    if (!desmatricularTarget) return;
    setDesmatriculating(true);
    const result = await desmatricularAlumno(desmatricularTarget.id);
    setDesmatriculating(false);

    if (!result.success) {
      toast.error(result.error ?? "Error al desmatricular");
      return;
    }

    const msg = monto > 0
      ? `Alumno desmatriculado. Devolver S/${monto.toFixed(2)} al apoderado.`
      : "Alumno desmatriculado correctamente.";
    toast.success(msg);
    setDesmatricularTarget(null);
    router.refresh();
  }

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
      ? { nombre: tutorPrincipal.nombre, apellido: tutorPrincipal.apellido, celular: tutorPrincipal.celular, relacion: tutorPrincipal.relacion }
      : null,
  };

  function openEdit() { setEditKey((k) => k + 1); setEditOpen(true); }
  function handleEditClose() { setEditOpen(false); router.refresh(); }

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

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">
              {alumno.apellido}, {alumno.nombre}
            </h1>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {alumno.dni && (
                <span className="text-sm text-zinc-500 font-mono">DNI {alumno.dni}</span>
              )}
              {edad !== null && (
                <span className="text-sm text-zinc-400">{edad} años</span>
              )}
              {alumno.celular && (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="text-sm font-mono text-zinc-500">{alumno.celular}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {alumno.celular && (
              <WhatsAppButton phone={alumno.celular} variant="button" />
            )}
            <Button onClick={openEdit} variant="outline" className="gap-2">
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
          </div>
        </div>
      </div>

      {/* ── Info cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {alumno.fechaNacimiento && (
          <div className="rounded-lg border border-zinc-100 bg-white px-4 py-3">
            <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
              <Calendar className="h-3.5 w-3.5" />
              <span className="text-[11px] font-semibold uppercase tracking-wide">Fecha de nacimiento</span>
            </div>
            <p className="text-sm font-semibold text-zinc-800">{formatDateLong(alumno.fechaNacimiento)}</p>
            {edad !== null && <p className="text-xs text-zinc-400 mt-0.5">{edad} años</p>}
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
            <p className="text-sm font-semibold text-zinc-800">{t.apellido}, {t.nombre}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs font-mono text-zinc-400">{t.celular}</span>
              <WhatsAppButton phone={t.celular} variant="button" />
            </div>
            {t.celularAdicional && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-mono text-zinc-400">{t.celularAdicional}</span>
                <WhatsAppButton phone={t.celularAdicional} variant="button" />
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

      {/* ── Pagos aggregate ─────────────────────────────────────────────────── */}
      {alumno.matriculas.some((m) => m.mesesPago.length > 0) && (
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-zinc-100">
            <Wallet className="h-4 w-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-700">Resumen de pagos</h2>
          </div>
          <div className="grid grid-cols-3 divide-x divide-zinc-100">
            <div className="px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 mb-1">Facturado</p>
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

      {/* ── Matrículas con tabs ──────────────────────────────────────────────── */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-zinc-100">
          <GraduationCap className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-700">Cursos</h2>
          <span className="ml-auto text-xs text-zinc-400">
            {alumno.matriculas.length} matrícula{alumno.matriculas.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-zinc-100">
          {MATRICULA_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMatriculaTab(tab.id)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                matriculaTab === tab.id
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100"
              )}
            >
              {tab.label}
              {tabCounts[tab.id] > 0 && (
                <span className="ml-1.5 text-xs opacity-60">{tabCounts[tab.id]}</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {currentMatriculas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="rounded-full bg-zinc-100 p-3">
              <BookOpen className="h-6 w-6 text-zinc-300" />
            </div>
            <p className="text-sm text-zinc-400">
              {matriculaTab === "vigentes" ? "Sin cursos vigentes" :
               matriculaTab === "proximos" ? "Sin cursos próximos" :
               "Sin cursos pasados"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {currentMatriculas.map((m) => (
              <MatriculaCard
                key={m.id}
                m={m}
                canDesmatricular={canDesmatricular}
                onDesmatricular={setDesmatricularTarget}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Dialogs ─────────────────────────────────────────────────────────── */}
      <AlumnoDialog
        key={editKey}
        open={editOpen}
        onClose={handleEditClose}
        alumno={alumnoForDialog}
      />

      <DesmatricularDialog
        matricula={desmatricularTarget}
        onClose={() => setDesmatricularTarget(null)}
        onConfirm={handleDesmatricular}
        loading={desmatriculating}
      />
    </div>
  );
}
