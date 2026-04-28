"use client";

import { useState, useEffect, useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Plus, CreditCard, Banknote, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  registrarAbono,
  generarMesPago,
  anularMesPago,
  type AlumnoPagoDetalle,
  type MesPagoRow,
  type MatriculaRow,
  type AbonoFormState,
} from "@/lib/actions/pagos";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DIA_ORDER = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const DIA_ABREV: Record<string, string> = {
  Lunes: "Lu", Martes: "Ma", Miércoles: "Mi",
  Jueves: "Ju", Viernes: "Vi", Sábado: "Sa", Domingo: "Do",
};

function estadoBadge(estado: string) {
  if (estado === "pagado")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 border-emerald-200">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Pagado
      </span>
    );
  if (estado === "parcial")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 border-amber-200">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />Parcial
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium bg-red-50 text-red-600 border-red-200">
      <span className="h-1.5 w-1.5 rounded-full bg-red-400" />Pendiente
    </span>
  );
}

// Calcula el mes siguiente al último registrado, o el mes actual si no hay registros
function nextMes(mesesPago: MesPagoRow[]): { anio: number; mes: number } {
  const now = new Date();
  if (mesesPago.length === 0) return { anio: now.getFullYear(), mes: now.getMonth() + 1 };
  const latest = mesesPago.reduce((max, mp) =>
    mp.anio * 12 + mp.mes > max.anio * 12 + max.mes ? mp : max
  );
  if (latest.mes === 12) return { anio: latest.anio + 1, mes: 1 };
  return { anio: latest.anio, mes: latest.mes + 1 };
}

// ─── Abono dialog ─────────────────────────────────────────────────────────────

const initialAbonoState: AbonoFormState = {};

function AbonoDialog({
  open,
  mesPago,
  onClose,
}: {
  open: boolean;
  mesPago: MesPagoRow | null;
  onClose: () => void;
}) {
  const [state, formAction, submitting] = useActionState(registrarAbono, initialAbonoState);
  const [monto, setMonto] = useState("");

  useEffect(() => {
    if (mesPago) setMonto(mesPago.saldo.toFixed(2));
  }, [mesPago]);

  useEffect(() => {
    if (state.message === "ok") {
      toast.success("Abono registrado correctamente");
      onClose();
    }
    const generalError = (state.errors as Record<string, string[]> | undefined)?.["_"]?.[0];
    if (generalError) toast.error(generalError);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!mesPago) return null;

  const e = state.errors ?? {};
  const label = `${MESES[mesPago.mes - 1]} ${mesPago.anio}`;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar abono — {label}</DialogTitle>
        </DialogHeader>

        {/* Resumen del mes */}
        <div className="grid grid-cols-3 gap-2 rounded-lg bg-zinc-50 border border-zinc-200 p-3 text-center text-sm">
          <div>
            <p className="text-xs text-zinc-400 mb-0.5">Total</p>
            <p className="font-mono font-semibold text-zinc-800">S/{mesPago.montoTotal.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-400 mb-0.5">Pagado</p>
            <p className="font-mono font-semibold text-green-700">S/{mesPago.montoPagado.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-400 mb-0.5">Saldo</p>
            <p className="font-mono font-bold text-red-600">S/{mesPago.saldo.toFixed(2)}</p>
          </div>
        </div>

        {/* Historial de abonos */}
        {mesPago.abonos.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Abonos anteriores</p>
            <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 overflow-hidden">
              {mesPago.abonos.map((ab) => (
                <li key={ab.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    {ab.metodoPago === "efectivo"
                      ? <Banknote className="h-3.5 w-3.5 text-zinc-400" />
                      : <CreditCard className="h-3.5 w-3.5 text-zinc-400" />}
                    <span className="text-zinc-600 capitalize">{ab.metodoPago}</span>
                    {ab.observacion && (
                      <span className="text-zinc-400 text-xs">· {ab.observacion}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-400">
                      {new Date(ab.fechaPago).toLocaleDateString("es-PE", { day: "2-digit", month: "short" })}
                    </span>
                    <span className="font-mono font-semibold text-zinc-800">S/{ab.monto.toFixed(2)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="idMesPago" value={mesPago.id} />

          <div className="space-y-1.5">
            <Label htmlFor="monto">Monto *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400 pointer-events-none">S/</span>
              <Input
                id="monto"
                name="monto"
                type="number"
                step="0.01"
                min="0.01"
                max={mesPago.saldo}
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="pl-8"
              />
            </div>
            {e.monto && <p className="text-xs text-destructive">{e.monto[0]}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Método de pago *</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["efectivo", "transferencia"] as const).map((m) => (
                <label
                  key={m}
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2.5 cursor-pointer has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-50 transition-colors"
                >
                  <input type="radio" name="metodoPago" value={m} defaultChecked={m === "efectivo"} className="sr-only" />
                  {m === "efectivo" ? <Banknote className="h-4 w-4 text-zinc-500" /> : <CreditCard className="h-4 w-4 text-zinc-500" />}
                  <span className="text-sm font-medium capitalize text-zinc-800">{m}</span>
                </label>
              ))}
            </div>
            {e.metodoPago && <p className="text-xs text-destructive">{e.metodoPago[0]}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="observacion">
              Observación <span className="text-zinc-400 font-normal">(opcional)</span>
            </Label>
            <Input id="observacion" name="observacion" placeholder="Ej: pago en 2 partes..." />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Registrando..." : "Registrar abono"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Confirmar generar mes dialog ─────────────────────────────────────────────

function ConfirmarGenerarDialog({
  open,
  matricula,
  mes,
  onClose,
}: {
  open: boolean;
  matricula: MatriculaRow | null;
  mes: { anio: number; mes: number } | null;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleConfirmar() {
    if (!matricula || !mes) return;
    startTransition(async () => {
      const result = await generarMesPago(matricula.id, mes.anio, mes.mes);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${MESES[mes.mes - 1]} ${mes.anio} generado correctamente`);
        onClose();
      }
    });
  }

  if (!matricula || !mes) return null;
  const label = `${MESES[mes.mes - 1]} ${mes.anio}`;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Agregar mes de pago</DialogTitle>
          <DialogDescription>
            Se creará el registro de cobro de <strong>{label}</strong> para el curso de{" "}
            <strong>{matricula.horario.curso.nombre}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-zinc-50 border border-zinc-200 px-4 py-3 flex items-center justify-between text-sm">
          <span className="text-zinc-500">{label}</span>
          <span className="font-mono font-bold text-zinc-900">
            S/{matricula.precioFinalMensual.toFixed(2)}
          </span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmar} disabled={pending}>
            {pending ? "Generando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Anular deuda dialog ──────────────────────────────────────────────────────

function AnularDialog({
  open,
  mesPago,
  onClose,
}: {
  open: boolean;
  mesPago: MesPagoRow | null;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleConfirmar() {
    if (!mesPago) return;
    startTransition(async () => {
      const result = await anularMesPago(mesPago.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Deuda anulada correctamente");
        onClose();
      }
    });
  }

  if (!mesPago) return null;
  const label = `${MESES[mesPago.mes - 1]} ${mesPago.anio}`;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>¿Eliminar este registro de pago?</DialogTitle>
          <DialogDescription>
            Esta acción no se puede deshacer. El registro y todos sus abonos serán eliminados permanentemente.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-600">Mes</span>
            <span className="font-medium text-zinc-900">{label}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-600">Saldo pendiente</span>
            <span className="font-mono font-bold text-red-600">S/{mesPago.saldo.toFixed(2)}</span>
          </div>
          {mesPago.montoPagado > 0 && (
            <p className="text-xs text-zinc-400 pt-1">
              Se eliminarán también los abonos registrados (S/{mesPago.montoPagado.toFixed(2)}).
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirmar} disabled={pending}>
            {pending ? "Eliminando..." : "Sí, eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Matrícula card ───────────────────────────────────────────────────────────

function MatriculaCard({
  matricula,
  onAbonar,
  onGenerarMes,
  onAnular,
}: {
  matricula: MatriculaRow;
  onAbonar: (mp: MesPagoRow) => void;
  onGenerarMes: (m: MatriculaRow, mes: { anio: number; mes: number }) => void;
  onAnular: (mp: MesPagoRow) => void;
}) {
  const { horario, mesesPago } = matricula;
  const siguiente = nextMes(mesesPago);
  const totalDeuda = mesesPago.reduce((s, mp) => s + mp.saldo, 0);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-zinc-100 bg-zinc-50/60">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-zinc-900">{horario.curso.nombre}</span>
            {horario.curso.nivel && (
              <span className="text-xs text-zinc-400 bg-zinc-200/60 rounded px-1.5 py-0.5">{horario.curso.nivel}</span>
            )}
            <span className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
              matricula.estado === "activa"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-zinc-100 text-zinc-500 border-zinc-200"
            )}>
              <span className={cn("h-1.5 w-1.5 rounded-full", matricula.estado === "activa" ? "bg-emerald-500" : "bg-zinc-400")} />
              {matricula.estado === "activa" ? "Activa" : "Inactiva"}
            </span>
          </div>
          <div className="flex flex-wrap gap-1 mt-1.5 items-center">
            {[...horario.dias]
              .sort((a, b) => DIA_ORDER.indexOf(a) - DIA_ORDER.indexOf(b))
              .map((d) => (
                <span key={d} className="inline-flex rounded border bg-white border-zinc-200 px-1.5 py-0 text-[11px] font-medium text-zinc-600">
                  {DIA_ABREV[d] ?? d}
                </span>
              ))}
            <span className="text-xs text-zinc-400 font-mono ml-1">
              {horario.horaInicio}–{horario.horaFin}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {totalDeuda > 0 && (
            <div className="text-right">
              <p className="text-xs text-zinc-400">Pendiente</p>
              <p className="text-sm font-mono font-bold text-red-600">S/{totalDeuda.toFixed(2)}</p>
            </div>
          )}
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 shadow-sm"
            onClick={() => onGenerarMes(matricula, siguiente)}
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar {MESES[siguiente.mes - 1]} {siguiente.anio}
          </Button>
        </div>
      </div>

      {/* Tabla de meses */}
      {mesesPago.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-zinc-400">
          <p className="text-sm">No hay meses de pago registrados.</p>
          <p className="text-xs">Usa el botón &quot;Agregar mes&quot; para crear el primero.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50/40 hover:bg-zinc-50/40">
              <TableHead className="font-semibold text-zinc-500 text-xs uppercase tracking-wide">Mes</TableHead>
              <TableHead className="text-right font-semibold text-zinc-500 text-xs uppercase tracking-wide">Total</TableHead>
              <TableHead className="text-right font-semibold text-zinc-500 text-xs uppercase tracking-wide">Pagado</TableHead>
              <TableHead className="text-right font-semibold text-zinc-500 text-xs uppercase tracking-wide">Saldo</TableHead>
              <TableHead className="font-semibold text-zinc-500 text-xs uppercase tracking-wide">Estado</TableHead>
              <TableHead className="text-right font-semibold text-zinc-500 text-xs uppercase tracking-wide">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mesesPago.map((mp) => {
              const pagado = mp.estado === "pagado";
              return (
                <TableRow
                  key={mp.id}
                  className={cn(
                    "transition-colors duration-100",
                    pagado ? "opacity-50" : "hover:bg-zinc-50/60"
                  )}
                >
                  <TableCell className="font-medium text-zinc-800">
                    {MESES[mp.mes - 1]} {mp.anio}
                    {mp.abonos.length > 0 && (
                      <span className="ml-1.5 text-xs text-zinc-400 font-normal">
                        ({mp.abonos.length} abono{mp.abonos.length !== 1 ? "s" : ""})
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-zinc-500">
                    S/{mp.montoTotal.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-medium text-emerald-700">
                    S/{mp.montoPagado.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-bold">
                    <span className={mp.saldo > 0 ? "text-red-600" : "text-zinc-300"}>
                      S/{mp.saldo.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell>{estadoBadge(mp.estado)}</TableCell>
                  <TableCell className="text-right">
                    {!pagado ? (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm" variant="outline"
                          onClick={() => onAbonar(mp)}
                          className="text-xs h-7 px-2.5 shadow-sm"
                        >
                          Abonar
                        </Button>
                        <Button
                          size="icon-sm" variant="ghost"
                          onClick={() => onAnular(mp)}
                          title="Eliminar registro"
                          className="text-zinc-300 hover:text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-200">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

type Props = { alumno: AlumnoPagoDetalle };

export function PagoAlumnoView({ alumno }: Props) {
  const router = useRouter();

  // Abono dialog
  const [abonoOpen, setAbonoOpen] = useState(false);
  const [abonoKey, setAbonoKey] = useState(0);
  const [selectedMes, setSelectedMes] = useState<MesPagoRow | null>(null);

  // Generar mes dialog
  const [generarOpen, setGenerarOpen] = useState(false);
  const [generarKey, setGenerarKey] = useState(0);
  const [selectedMatricula, setSelectedMatricula] = useState<MatriculaRow | null>(null);
  const [selectedSiguiente, setSelectedSiguiente] = useState<{ anio: number; mes: number } | null>(null);

  // Anular dialog
  const [anularOpen, setAnularOpen] = useState(false);
  const [anularKey, setAnularKey] = useState(0);
  const [selectedMesAnular, setSelectedMesAnular] = useState<MesPagoRow | null>(null);

  function openAbonar(mp: MesPagoRow) {
    setSelectedMes(mp);
    setAbonoKey((k) => k + 1);
    setAbonoOpen(true);
  }

  function openGenerarMes(m: MatriculaRow, siguiente: { anio: number; mes: number }) {
    setSelectedMatricula(m);
    setSelectedSiguiente(siguiente);
    setGenerarKey((k) => k + 1);
    setGenerarOpen(true);
  }

  function openAnular(mp: MesPagoRow) {
    setSelectedMesAnular(mp);
    setAnularKey((k) => k + 1);
    setAnularOpen(true);
  }

  const totalDeuda = alumno.matriculas.reduce(
    (s, m) => s + m.mesesPago.reduce((ss, mp) => ss + mp.saldo, 0),
    0
  );

  return (
    <>
      {/* Breadcrumb */}
      <button
        onClick={() => router.push("/pagos")}
        className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-700 transition-colors mb-5"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a Pagos
      </button>

      {/* Header card */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm px-6 py-5 mb-6">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            {/* Avatar inicial */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white text-lg font-bold select-none">
              {alumno.apellido[0]}
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900">
                {alumno.apellido}, {alumno.nombre}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-zinc-500">
                {alumno.dni && (
                  <span className="font-mono text-xs bg-zinc-100 rounded px-1.5 py-0.5 text-zinc-600">
                    DNI {alumno.dni}
                  </span>
                )}
                {alumno.celular && <span>{alumno.celular}</span>}
              </div>
              {alumno.tutor && (
                <p className="text-xs text-zinc-400 mt-1.5">
                  Apoderado: {alumno.tutor.apellido}, {alumno.tutor.nombre}
                  <span className="text-zinc-300 mx-1">·</span>
                  <span className="text-zinc-400">{alumno.tutor.relacion}</span>
                  <span className="text-zinc-300 mx-1">·</span>
                  <span className="font-mono">{alumno.tutor.celular}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {totalDeuda > 0 ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-right">
                <p className="text-xs font-medium text-red-400 uppercase tracking-wide">Deuda total</p>
                <p className="font-mono font-bold text-red-600 text-xl mt-0.5">S/{totalDeuda.toFixed(2)}</p>
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-right">
                <p className="text-xs font-medium text-emerald-500 uppercase tracking-wide">Saldo</p>
                <p className="font-semibold text-emerald-600 text-sm mt-0.5">Al día</p>
              </div>
            )}
            <span className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium",
              alumno.habilitado
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            )}>
              <span className={cn("h-2 w-2 rounded-full", alumno.habilitado ? "bg-emerald-500" : "bg-amber-400")} />
              {alumno.habilitado ? "Habilitado" : "Sin habilitar"}
            </span>
          </div>
        </div>
      </div>

      {/* Matrículas */}
      {alumno.matriculas.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center text-zinc-400">
          Este alumno no tiene matrículas registradas.
        </div>
      ) : (
        <div className="space-y-4">
          {alumno.matriculas.map((m) => (
            <MatriculaCard
              key={m.id}
              matricula={m}
              onAbonar={openAbonar}
              onGenerarMes={openGenerarMes}
              onAnular={openAnular}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <AbonoDialog
        key={`abono-${abonoKey}`}
        open={abonoOpen}
        mesPago={selectedMes}
        onClose={() => setAbonoOpen(false)}
      />
      <ConfirmarGenerarDialog
        key={`generar-${generarKey}`}
        open={generarOpen}
        matricula={selectedMatricula}
        mes={selectedSiguiente}
        onClose={() => setGenerarOpen(false)}
      />
      <AnularDialog
        key={`anular-${anularKey}`}
        open={anularOpen}
        mesPago={selectedMesAnular}
        onClose={() => setAnularOpen(false)}
      />
    </>
  );
}
