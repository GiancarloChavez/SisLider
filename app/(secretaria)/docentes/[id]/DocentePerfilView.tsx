"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft, Pencil, Phone, KeyRound, BookOpen,
  GraduationCap, Clock, Users, Calendar, Trash2, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DocenteDialog } from "../DocenteDialog";
import { CredencialesDialog } from "../CredencialesDialog";
import { WhatsAppButton } from "@/components/sislider/WhatsAppButton";
import { deleteDocente } from "@/lib/actions/docentes";
import { DIA_ABREV } from "@/lib/horario-periodos";
import type { DocentePerfilAdmin, DocenteSerialized } from "@/lib/actions/docentes";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MESES_CORTO = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

function fmt(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${d} ${MESES_CORTO[m - 1]}. ${y}`;
}

const DIA_COLORS: Record<string, string> = {
  Lunes:     "bg-blue-50 text-blue-700 border-blue-200",
  Martes:    "bg-violet-50 text-violet-700 border-violet-200",
  Miércoles: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Jueves:    "bg-orange-50 text-orange-700 border-orange-200",
  Viernes:   "bg-pink-50 text-pink-700 border-pink-200",
  Sábado:    "bg-teal-50 text-teal-700 border-teal-200",
  Domingo:   "bg-zinc-50 text-zinc-600 border-zinc-200",
};

function grupoEstado(fi: string | null, ff: string | null) {
  if (!fi || !ff) return null;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const [sy, sm, sd] = fi.split("-").map(Number);
  const [ey, em, ed] = ff.split("-").map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end   = new Date(ey, em - 1, ed);
  if (hoy < start) return "proximo";
  if (hoy > end)   return "culminado";
  return "vigente";
}

const ESTADO_STYLES: Record<string, string> = {
  vigente:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  proximo:   "bg-blue-50 text-blue-700 border-blue-200",
  culminado: "bg-zinc-100 text-zinc-500 border-zinc-200",
};
const ESTADO_LABELS: Record<string, string> = {
  vigente: "Vigente", proximo: "Próximo", culminado: "Pasado",
};

// ─── Grupo card ───────────────────────────────────────────────────────────────

function GrupoCard({ g }: { g: DocentePerfilAdmin["grupos"][number] }) {
  const estado = grupoEstado(g.fechaInicio, g.fechaFin);
  return (
    <div className="px-5 py-4 hover:bg-zinc-50/60 transition-colors">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-zinc-800">{g.curso.nombre}</span>
            <Link
              href={`/grupos/${g.id}`}
              className="text-sm text-zinc-500 hover:text-blue-600 hover:underline transition-colors"
            >
              Grupo {g.numeroGrupo}
            </Link>
            {estado && (
              <span className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                ESTADO_STYLES[estado]
              )}>
                {ESTADO_LABELS[estado]}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {g.horaInicio}–{g.horaFin}
            </span>
            <span className="text-xs text-zinc-400">{g.aula.nombre}</span>
            <span className="flex gap-0.5">
              {g.dias.map((dia) => (
                <span key={dia} className={cn(
                  "inline-flex rounded border px-1.5 py-0 text-[10px] font-medium",
                  DIA_COLORS[dia] ?? "bg-zinc-50 text-zinc-600 border-zinc-200"
                )}>
                  {DIA_ABREV[dia] ?? dia}
                </span>
              ))}
            </span>
          </div>
          {(g.fechaInicio || g.fechaFin) && (
            <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {g.fechaInicio ? fmt(g.fechaInicio) : "—"} → {g.fechaFin ? fmt(g.fechaFin) : "—"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 shrink-0">
          <Users className="h-3.5 w-3.5 text-zinc-400" />
          {g.alumnosCount} alumno{g.alumnosCount !== 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
}

// ─── Delete dialog ────────────────────────────────────────────────────────────

type GrupoActivo = DocentePerfilAdmin["grupos"][number];

function EliminarDocenteDialog({
  docente,
  gruposActivos,
  reemplazos,
  open,
  onClose,
  onConfirm,
  loading,
}: {
  docente: DocentePerfilAdmin;
  gruposActivos: GrupoActivo[];
  reemplazos: { id: string; nombre: string; apellido: string }[];
  open: boolean;
  onClose: () => void;
  onConfirm: (replacementId?: string) => void;
  loading: boolean;
}) {
  const [replacementId, setReplacementId] = useState<string | null>(null);
  const needsReplacement = gruposActivos.length > 0;
  const canConfirm = !needsReplacement || !!replacementId;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !loading && onClose()}>
      <DialogContent className="sm:max-w-sm p-0 gap-0 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-red-100 bg-red-50">
          <div className="rounded-full bg-red-100 p-2 shrink-0">
            <Trash2 className="h-4 w-4 text-red-600" />
          </div>
          <DialogTitle className="text-sm font-semibold text-red-900">
            Eliminar docente
          </DialogTitle>
        </div>

        <div className="px-5 py-4 space-y-4">
          {needsReplacement ? (
            <>
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  Este docente tiene grupos activos o próximos. Selecciona un reemplazo antes de continuar.
                </p>
              </div>

              <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 space-y-1">
                {gruposActivos.map((g) => (
                  <p key={g.id} className="text-xs text-zinc-600">
                    · {g.curso.nombre} Grupo {g.numeroGrupo} · {g.horaInicio}–{g.horaFin}
                  </p>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-500">Docente de reemplazo</Label>
                {reemplazos.length === 0 ? (
                  <p className="text-xs text-red-500">No hay otros docentes activos disponibles.</p>
                ) : (
                  <Select value={replacementId ?? ""} onValueChange={(v) => setReplacementId(v || null)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Seleccionar docente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {reemplazos.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.apellido}, {r.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-zinc-600">
              ¿Estás seguro de eliminar a{" "}
              <span className="font-semibold text-zinc-800">{docente.apellido}, {docente.nombre}</span>?
              Esta acción no se puede deshacer.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-zinc-100">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={loading || !canConfirm || (needsReplacement && reemplazos.length === 0)}
            onClick={() => onConfirm(replacementId ?? undefined)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? "Eliminando..." : "Eliminar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type GrupoTab = "vigentes" | "proximos" | "pasados";

const GRUPO_TABS: { id: GrupoTab; label: string }[] = [
  { id: "vigentes", label: "Vigentes" },
  { id: "proximos", label: "Próximos" },
  { id: "pasados",  label: "Pasados"  },
];

export function DocentePerfilView({
  docente,
  reemplazos,
}: {
  docente: DocentePerfilAdmin;
  reemplazos: { id: string; nombre: string; apellido: string }[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen]         = useState(false);
  const [editKey, setEditKey]           = useState(0);
  const [credOpen, setCredOpen]         = useState(false);
  const [grupoTab, setGrupoTab]         = useState<GrupoTab>("vigentes");
  const [deleteOpen, setDeleteOpen]     = useState(false);
  const [deleting, setDeleting]         = useState(false);

  const gruposByTab = useMemo(() => {
    const vigentes: typeof docente.grupos = [];
    const proximos: typeof docente.grupos = [];
    const pasados:  typeof docente.grupos = [];
    for (const g of docente.grupos) {
      const ge = grupoEstado(g.fechaInicio, g.fechaFin);
      if (ge === "vigente")    vigentes.push(g);
      else if (ge === "proximo") proximos.push(g);
      else                      pasados.push(g);
    }
    return { vigentes, proximos, pasados };
  }, [docente.grupos]);

  const tabCounts = {
    vigentes: gruposByTab.vigentes.length,
    proximos: gruposByTab.proximos.length,
    pasados:  gruposByTab.pasados.length,
  };

  const currentGrupos = gruposByTab[grupoTab];
  const gruposActivos = [...gruposByTab.vigentes, ...gruposByTab.proximos];

  const docenteForDialog: DocenteSerialized = {
    id: docente.id,
    nombre: docente.nombre,
    apellido: docente.apellido,
    celular: docente.celular,
    dni: docente.dni,
    email: docente.email,
    activo: docente.activo,
    createdAt: docente.createdAt,
  };

  async function handleDelete(replacementId?: string) {
    setDeleting(true);
    const result = await deleteDocente(docente.id, replacementId);
    setDeleting(false);
    if (!result.success) {
      toast.error(result.error ?? "Error al eliminar");
      return;
    }
    toast.success("Docente eliminado correctamente");
    router.push("/docentes");
  }

  function openEdit() { setEditKey((k) => k + 1); setEditOpen(true); }

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Nav */}
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
              {docente.apellido}, {docente.nombre}
            </h1>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {docente.dni && (
                <span className="text-sm text-zinc-500 font-mono">DNI {docente.dni}</span>
              )}
              {docente.celular && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="text-sm font-mono text-zinc-500">{docente.celular}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {docente.celular && <WhatsAppButton phone={docente.celular} variant="button" />}
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setCredOpen(true)}
            >
              <KeyRound className="h-4 w-4" />
              {docente.email ? "Credenciales" : "Crear cuenta"}
            </Button>
            <Button onClick={openEdit} variant="outline" className="gap-2">
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
          </div>
        </div>
      </div>

      {/* Credenciales info card */}
      <div className="rounded-lg border border-zinc-100 bg-white px-4 py-3">
        <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
          <KeyRound className="h-3.5 w-3.5" />
          <span className="text-[11px] font-semibold uppercase tracking-wide">Acceso al sistema</span>
        </div>
        {docente.email ? (
          <p className="text-sm font-mono text-zinc-700">{docente.email}</p>
        ) : (
          <p className="text-sm text-zinc-400 italic">Sin cuenta de acceso</p>
        )}
      </div>

      {/* Grupos section */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-zinc-100">
          <GraduationCap className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-700">Grupos asignados</h2>
          <span className="ml-auto text-xs text-zinc-400">
            {docente.grupos.length} grupo{docente.grupos.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex items-center gap-1 px-3 py-2 border-b border-zinc-100">
          {GRUPO_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setGrupoTab(t.id)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                grupoTab === t.id
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100"
              )}
            >
              {t.label}
              {tabCounts[t.id] > 0 && (
                <span className="ml-1.5 text-xs opacity-60">{tabCounts[t.id]}</span>
              )}
            </button>
          ))}
        </div>

        {currentGrupos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="rounded-full bg-zinc-100 p-3">
              <BookOpen className="h-6 w-6 text-zinc-300" />
            </div>
            <p className="text-sm text-zinc-400">
              {grupoTab === "vigentes" ? "Sin grupos vigentes"
                : grupoTab === "proximos" ? "Sin grupos próximos"
                : "Sin grupos pasados"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {currentGrupos.map((g) => <GrupoCard key={g.id} g={g} />)}
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="rounded-xl border border-red-100 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-zinc-800">Eliminar docente</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              Esta acción es permanente y no se puede deshacer.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteOpen(true)}
            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 gap-2 shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Eliminar docente
          </Button>
        </div>
      </div>

      {/* Dialogs */}
      <DocenteDialog
        key={editKey}
        open={editOpen}
        onClose={() => { setEditOpen(false); router.refresh(); }}
        docente={docenteForDialog}
      />

      <CredencialesDialog
        open={credOpen}
        onClose={() => setCredOpen(false)}
        docente={docenteForDialog}
      />

      <EliminarDocenteDialog
        docente={docente}
        gruposActivos={gruposActivos}
        reemplazos={reemplazos}
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
