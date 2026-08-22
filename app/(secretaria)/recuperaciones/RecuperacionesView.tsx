"use client";

import { useState, useTransition, useActionState, useEffect } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  CheckCircle, XCircle, Clock, RefreshCcw, Search, CalendarCheck, Loader2,
} from "lucide-react";
import {
  crearRecuperacion,
  completarRecuperacion,
  cancelarRecuperacion,
  type AusenciaSinRecuperacion,
  type RecuperacionRow,
  type HorarioRecuperacionOption,
  type RecuperacionFormState,
} from "@/lib/actions/recuperaciones";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtFecha(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-PE", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric",
  });
}

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, { label: string; cls: string; dot: string }> = {
    pendiente:  { label: "Pendiente",  cls: "bg-amber-50 text-amber-700 border-amber-200",  dot: "bg-amber-400" },
    completada: { label: "Completada", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
    cancelada:  { label: "Cancelada",  cls: "bg-zinc-100 text-zinc-500 border-zinc-200",    dot: "bg-zinc-400" },
  };
  const cfg = map[estado] ?? map["pendiente"];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", cfg.cls)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

function AusenciaBadge({ estado }: { estado: string }) {
  if (estado === "ausente")
    return <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700"><XCircle className="h-3 w-3" />Ausente</span>;
  return <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"><Clock className="h-3 w-3" />Justificado</span>;
}

// ─── Crear Recuperación Dialog ────────────────────────────────────────────────

const initialState: RecuperacionFormState = {};

function CrearRecuperacionDialog({
  ausencia,
  horarios,
  onClose,
}: {
  ausencia: AusenciaSinRecuperacion | null;
  horarios: HorarioRecuperacionOption[];
  onClose: () => void;
}) {
  const [state, formAction, submitting] = useActionState(crearRecuperacion, initialState);

  useEffect(() => {
    if (state.message === "ok") {
      toast.success("Recuperación creada correctamente");
      onClose();
    }
  }, [state, onClose]);

  if (!ausencia) return null;

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agendar recuperación</DialogTitle>
          <DialogDescription>
            Ausencia del {fmtFecha(ausencia.fecha)} — {ausencia.curso.nombre}
          </DialogDescription>
        </DialogHeader>

        {/* Alumno info */}
        <div className="rounded-lg bg-zinc-50 border border-zinc-200 px-4 py-3 text-sm">
          <p className="font-semibold text-zinc-900">
            {ausencia.alumno.apellido}, {ausencia.alumno.nombre}
          </p>
          <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
            {ausencia.alumno.dni && <span>DNI {ausencia.alumno.dni}</span>}
            <AusenciaBadge estado={ausencia.estadoAsistencia} />
            {ausencia.observacion && (
              <span className="text-zinc-400">· {ausencia.observacion}</span>
            )}
          </div>
        </div>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="idAsistencia" value={ausencia.idAsistencia} />

          <div className="space-y-1.5">
            <Label htmlFor="fechaRecuperacion">
              Fecha de recuperación <span className="text-zinc-400 font-normal">(opcional)</span>
            </Label>
            <Input
              id="fechaRecuperacion"
              name="fechaRecuperacion"
              type="date"
              min={new Date().toISOString().slice(0, 10)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="idHorarioRecuperacion">
              Horario donde recuperará <span className="text-zinc-400 font-normal">(opcional)</span>
            </Label>
            <select
              id="idHorarioRecuperacion"
              name="idHorarioRecuperacion"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            >
              <option value="">— Sin horario específico —</option>
              {horarios.map((h) => (
                <option key={h.id} value={h.id}>{h.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="observacion">
              Observación <span className="text-zinc-400 font-normal">(opcional)</span>
            </Label>
            <Input
              id="observacion"
              name="observacion"
              placeholder="Ej: Recupera el sábado siguiente..."
            />
            {state.errors?.observacion && (
              <p className="text-xs text-destructive">{state.errors.observacion[0]}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              {submitting ? "Guardando..." : "Agendar recuperación"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Confirmar completar / cancelar ──────────────────────────────────────────

function ConfirmarAccionDialog({
  tipo,
  recuperacion,
  onClose,
}: {
  tipo: "completar" | "cancelar";
  recuperacion: RecuperacionRow | null;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleConfirmar() {
    if (!recuperacion) return;
    startTransition(async () => {
      const fn = tipo === "completar" ? completarRecuperacion : cancelarRecuperacion;
      const result = await fn(recuperacion.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(tipo === "completar" ? "Recuperación completada" : "Recuperación cancelada");
        onClose();
      }
    });
  }

  if (!recuperacion) return null;
  const alumno = `${recuperacion.asistencia.alumno.apellido}, ${recuperacion.asistencia.alumno.nombre}`;

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {tipo === "completar" ? "¿Marcar como completada?" : "¿Cancelar recuperación?"}
          </DialogTitle>
          <DialogDescription>
            {alumno} — {recuperacion.asistencia.curso.nombre}
          </DialogDescription>
        </DialogHeader>

        <div className={cn(
          "rounded-lg border px-4 py-3 text-sm",
          tipo === "completar"
            ? "border-emerald-100 bg-emerald-50 text-emerald-800"
            : "border-red-100 bg-red-50 text-red-800"
        )}>
          {tipo === "completar"
            ? "El alumno asistió a su recuperación. Se marcará como completada."
            : "Esta acción marcará la recuperación como cancelada. No se puede deshacer."}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>Volver</Button>
          <Button
            variant={tipo === "cancelar" ? "destructive" : "default"}
            onClick={handleConfirmar}
            disabled={pending}
          >
            {pending
              ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              : tipo === "completar" ? <CheckCircle className="h-3.5 w-3.5 mr-1" /> : <XCircle className="h-3.5 w-3.5 mr-1" />}
            {pending
              ? "Procesando..."
              : tipo === "completar" ? "Confirmar" : "Cancelar recuperación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

type Props = {
  ausencias: AusenciaSinRecuperacion[];
  recuperaciones: RecuperacionRow[];
  horarios: HorarioRecuperacionOption[];
};

type Tab = "ausencias" | "recuperaciones";

export function RecuperacionesView({ ausencias, recuperaciones, horarios }: Props) {
  const [tab, setTab] = useState<Tab>("ausencias");
  const [search, setSearch] = useState("");

  // Crear dialog
  const [crearAusencia, setCrearAusencia] = useState<AusenciaSinRecuperacion | null>(null);

  // Acción dialog
  const [accionTipo, setAccionTipo] = useState<"completar" | "cancelar">("completar");
  const [accionRecuperacion, setAccionRecuperacion] = useState<RecuperacionRow | null>(null);

  function openAccion(tipo: "completar" | "cancelar", r: RecuperacionRow) {
    setAccionTipo(tipo);
    setAccionRecuperacion(r);
  }

  const pendientes   = recuperaciones.filter((r) => r.estado === "pendiente");
  const completadas  = recuperaciones.filter((r) => r.estado === "completada");
  const canceladas   = recuperaciones.filter((r) => r.estado === "cancelada");

  const q = search.trim().toLowerCase();

  const filteredAusencias = ausencias.filter((a) => {
    if (!q) return true;
    return (
      a.alumno.nombre.toLowerCase().includes(q) ||
      a.alumno.apellido.toLowerCase().includes(q) ||
      (a.alumno.dni ?? "").includes(q) ||
      a.curso.nombre.toLowerCase().includes(q)
    );
  });

  const filteredRecuperaciones = recuperaciones.filter((r) => {
    if (!q) return true;
    return (
      r.asistencia.alumno.nombre.toLowerCase().includes(q) ||
      r.asistencia.alumno.apellido.toLowerCase().includes(q) ||
      (r.asistencia.alumno.dni ?? "").includes(q) ||
      r.asistencia.curso.nombre.toLowerCase().includes(q)
    );
  });

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Recuperaciones</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {ausencias.length} ausencia{ausencias.length !== 1 ? "s" : ""} sin programar
            · {pendientes.length} recuperaci{pendientes.length !== 1 ? "ones" : "ón"} pendiente{pendientes.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-zinc-200">
        {(
          [
            { key: "ausencias", label: "Por programar", count: ausencias.length },
            { key: "recuperaciones", label: "Recuperaciones", count: recuperaciones.length },
          ] as const
        ).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === key
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-400 hover:text-zinc-700"
            )}
          >
            {label}
            {count > 0 && (
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                tab === key ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-500"
              )}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
        <Input
          placeholder="Buscar alumno o curso..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-8 text-sm bg-white"
        />
      </div>

      {/* ── Tab: Ausencias sin programar ──────────────────────────────── */}
      {tab === "ausencias" && (
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          {filteredAusencias.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400 gap-3">
              <CalendarCheck className="h-10 w-10 opacity-20" />
              <p className="text-sm">
                {search ? "Sin resultados para esa búsqueda" : "Todas las ausencias tienen recuperación programada"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-50 hover:bg-zinc-50">
                  <TableHead className="font-semibold text-zinc-600">Alumno</TableHead>
                  <TableHead className="font-semibold text-zinc-600">Curso</TableHead>
                  <TableHead className="font-semibold text-zinc-600">Fecha ausencia</TableHead>
                  <TableHead className="font-semibold text-zinc-600">Tipo</TableHead>
                  <TableHead className="font-semibold text-zinc-600">Observación</TableHead>
                  <TableHead className="text-right font-semibold text-zinc-600">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAusencias.map((a) => (
                  <TableRow key={a.idAsistencia} className="hover:bg-zinc-50/60">
                    <TableCell>
                      <p className="font-medium text-zinc-900 text-sm">
                        {a.alumno.apellido}, {a.alumno.nombre}
                      </p>
                      {a.alumno.dni && (
                        <p className="text-xs text-zinc-400 font-mono">{a.alumno.dni}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-zinc-800">{a.curso.nombre}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-zinc-700">{fmtFecha(a.fecha)}</p>
                      <p className="text-xs text-zinc-400 font-mono">
                        {a.horario.horaInicio}–{a.horario.horaFin}
                      </p>
                    </TableCell>
                    <TableCell>
                      <AusenciaBadge estado={a.estadoAsistencia} />
                    </TableCell>
                    <TableCell>
                      <p className="text-xs text-zinc-400 max-w-[160px] truncate">
                        {a.observacion ?? "—"}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 gap-1.5"
                        onClick={() => setCrearAusencia(a)}
                      >
                        <RefreshCcw className="h-3 w-3" />
                        Agendar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {/* ── Tab: Recuperaciones ────────────────────────────────────────── */}
      {tab === "recuperaciones" && (
        <div className="space-y-6">
          {filteredRecuperaciones.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white shadow-sm flex flex-col items-center justify-center py-16 text-zinc-400 gap-3">
              <RefreshCcw className="h-10 w-10 opacity-20" />
              <p className="text-sm">
                {search ? "Sin resultados" : "No hay recuperaciones registradas todavía"}
              </p>
            </div>
          ) : (
            <>
              {/* Pendientes */}
              {pendientes.length > 0 && (
                <RecuperacionesGroup
                  title="Pendientes"
                  rows={filteredRecuperaciones.filter((r) => r.estado === "pendiente")}
                  onCompletar={(r) => openAccion("completar", r)}
                  onCancelar={(r) => openAccion("cancelar", r)}
                />
              )}

              {/* Completadas */}
              {completadas.length > 0 && (
                <RecuperacionesGroup
                  title="Completadas"
                  rows={filteredRecuperaciones.filter((r) => r.estado === "completada")}
                  onCompletar={null}
                  onCancelar={null}
                />
              )}

              {/* Canceladas */}
              {canceladas.length > 0 && (
                <RecuperacionesGroup
                  title="Canceladas"
                  rows={filteredRecuperaciones.filter((r) => r.estado === "cancelada")}
                  onCompletar={null}
                  onCancelar={null}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* Dialogs */}
      {crearAusencia && (
        <CrearRecuperacionDialog
          ausencia={crearAusencia}
          horarios={horarios}
          onClose={() => setCrearAusencia(null)}
        />
      )}

      {accionRecuperacion && (
        <ConfirmarAccionDialog
          tipo={accionTipo}
          recuperacion={accionRecuperacion}
          onClose={() => setAccionRecuperacion(null)}
        />
      )}
    </>
  );
}

// ─── Sub-component: tabla de recuperaciones ───────────────────────────────────

function RecuperacionesGroup({
  title,
  rows,
  onCompletar,
  onCancelar,
}: {
  title: string;
  rows: RecuperacionRow[];
  onCompletar: ((r: RecuperacionRow) => void) | null;
  onCancelar:  ((r: RecuperacionRow) => void) | null;
}) {
  if (rows.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2 px-1">
        {title} ({rows.length})
      </p>
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 hover:bg-zinc-50">
              <TableHead className="font-semibold text-zinc-600">Alumno</TableHead>
              <TableHead className="font-semibold text-zinc-600">Curso</TableHead>
              <TableHead className="font-semibold text-zinc-600">Ausencia</TableHead>
              <TableHead className="font-semibold text-zinc-600">Fecha recuperación</TableHead>
              <TableHead className="font-semibold text-zinc-600">Horario</TableHead>
              <TableHead className="font-semibold text-zinc-600">Estado</TableHead>
              {(onCompletar || onCancelar) && (
                <TableHead className="text-right font-semibold text-zinc-600">Acciones</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} className="hover:bg-zinc-50/60">
                <TableCell>
                  <p className="font-medium text-zinc-900 text-sm">
                    {r.asistencia.alumno.apellido}, {r.asistencia.alumno.nombre}
                  </p>
                  {r.asistencia.alumno.dni && (
                    <p className="text-xs text-zinc-400 font-mono">{r.asistencia.alumno.dni}</p>
                  )}
                </TableCell>
                <TableCell>
                  <p className="text-sm text-zinc-800">{r.asistencia.curso.nombre}</p>
                </TableCell>
                <TableCell>
                  <p className="text-sm text-zinc-700">{fmtFecha(r.asistencia.fecha)}</p>
                  <AusenciaBadge estado={r.asistencia.estadoAsistencia} />
                </TableCell>
                <TableCell>
                  {r.fechaRecuperacion ? (
                    <p className="text-sm text-zinc-700">{fmtFecha(r.fechaRecuperacion)}</p>
                  ) : (
                    <span className="text-xs text-zinc-400">Sin fecha</span>
                  )}
                </TableCell>
                <TableCell>
                  {r.horarioRecuperacion ? (
                    <div>
                      <p className="text-sm text-zinc-800">{r.horarioRecuperacion.curso}</p>
                      <p className="text-xs text-zinc-400 font-mono">
                        {r.horarioRecuperacion.horaInicio}–{r.horarioRecuperacion.horaFin}
                      </p>
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-400">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <EstadoBadge estado={r.estado} />
                </TableCell>
                {(onCompletar || onCancelar) && (
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {onCompletar && (
                        <Button
                          size="sm" variant="outline"
                          className="text-xs h-7 gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                          onClick={() => onCompletar(r)}
                        >
                          <CheckCircle className="h-3 w-3" />
                          Completar
                        </Button>
                      )}
                      {onCancelar && (
                        <Button
                          size="sm" variant="ghost"
                          className="text-xs h-7 text-zinc-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => onCancelar(r)}
                        >
                          <XCircle className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
