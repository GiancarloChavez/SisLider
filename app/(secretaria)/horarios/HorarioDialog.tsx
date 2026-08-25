"use client";

import { useEffect, useActionState, useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowLeftRight, RefreshCw, CalendarDays, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createHorario,
  updateHorario,
  getNextNumeroGrupo,
  type HorarioFormState,
  type HorarioSerialized,
  type HorarioSelectData,
} from "@/lib/actions/horarios";
import {
  calcularPeriodos,
  dateToYmd,
  isFreqDay,
  ymdToDisplay,
  ymdToDayName,
  DIA_ABREV,
} from "@/lib/horario-periodos";

// ─── Time picker helpers ────────────────────────────────────────────────────

type TimeFormat = "12" | "24";
type AMPM = "AM" | "PM";

interface TimeParts {
  hour: string;
  minute: string;
  ampm: AMPM;
}

const HOURS_24 = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const HOURS_12 = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];
const FMT_KEY = "horario-time-fmt";

function readStoredFmt(): TimeFormat {
  if (typeof window === "undefined") return "24";
  const v = localStorage.getItem(FMT_KEY);
  return v === "12" || v === "24" ? v : "24";
}

function parseTimeParts(hhmm: string | undefined, fmt: TimeFormat): TimeParts {
  if (!hhmm) return { hour: fmt === "24" ? "07" : "7", minute: "00", ampm: "AM" };
  const [hStr = "7", mStr = "00"] = hhmm.split(":");
  const h24 = parseInt(hStr, 10);
  if (fmt === "24") {
    return { hour: String(h24).padStart(2, "0"), minute: mStr, ampm: "AM" };
  }
  const ampm: AMPM = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 || 12;
  return { hour: String(h12), minute: mStr, ampm };
}

function partsToHHmm(parts: TimeParts, fmt: TimeFormat): string {
  if (fmt === "24") {
    return `${parts.hour.padStart(2, "0")}:${parts.minute}`;
  }
  let h = parseInt(parts.hour, 10);
  if (parts.ampm === "PM" && h !== 12) h += 12;
  if (parts.ampm === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${parts.minute}`;
}

// ─── TimeField ──────────────────────────────────────────────────────────────

const SEL = "h-9 rounded-md border border-input bg-transparent px-2 py-1 text-sm text-center shadow-sm focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer";

function TimeField({
  label, name, parts, onChange, fmt, error,
}: {
  label: string; name: string; parts: TimeParts;
  onChange: (p: TimeParts) => void; fmt: TimeFormat; error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-zinc-500 uppercase tracking-wide">{label}</Label>
      <input type="hidden" name={name} value={partsToHHmm(parts, fmt)} />
      <div className="flex items-center gap-1.5">
        <select value={parts.hour} onChange={(e) => onChange({ ...parts, hour: e.target.value })} className={`${SEL} w-16`}>
          {(fmt === "24" ? HOURS_24 : HOURS_12).map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
        <span className="text-base font-bold text-zinc-400 select-none leading-none">:</span>
        <select value={parts.minute} onChange={(e) => onChange({ ...parts, minute: e.target.value })} className={`${SEL} w-16`}>
          {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        {fmt === "12" && (
          <div className="flex rounded-md overflow-hidden border border-input h-9">
            {(["AM", "PM"] as const).map((ap) => (
              <button key={ap} type="button" onClick={() => onChange({ ...parts, ampm: ap })}
                className={`w-10 text-xs font-semibold transition-colors ${parts.ampm === ap ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-50"}`}>
                {ap}
              </button>
            ))}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const SELECT_CLASS =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

const DATE_CLASS =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-40 disabled:cursor-not-allowed";

type PeriodoEdit = { inicio: string; fin: string };

type Props = {
  open: boolean;
  onClose: () => void;
  horario?: HorarioSerialized | null;
  selectData: HorarioSelectData;
};

const initialState: HorarioFormState = {};

// ─── Dialog ─────────────────────────────────────────────────────────────────

export function HorarioDialog({ open, onClose, horario, selectData }: Props) {
  const action = horario ? updateHorario.bind(null, horario.id) : createHorario;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [handled, setHandled] = useState(false);

  const [autoNumero, setAutoNumero] = useState(true);
  const [nextNumero, setNextNumero] = useState<number | null>(null);
  const [selectedCurso, setSelectedCurso] = useState(horario?.idCurso ?? "");
  const [, startFetch] = useTransition();

  // Días controlados
  const [diasSeleccionados, setDiasSeleccionados] = useState<string[]>(horario?.dias ?? []);

  // Duración en meses
  const [cantidadMeses, setCantidadMeses] = useState<string>(
    horario?.cantidadMeses ? String(horario.cantidadMeses) : ""
  );

  // Fecha inicio
  const [fechaInicioVal, setFechaInicioVal] = useState(horario?.fechaInicio ?? "");
  const [fechaInicioError, setFechaInicioError] = useState<string | null>(null);

  // Períodos editables
  const [periodos, setPeriodos] = useState<PeriodoEdit[]>(
    horario?.periodos.map((p) => ({ inicio: p.fechaInicio, fin: p.fechaFin })) ?? []
  );
  const [periodosModificados, setPeriodosModificados] = useState(false);

  // Time picker
  const [fmt, setFmt] = useState<TimeFormat>(readStoredFmt);
  const [inicio, setInicio] = useState<TimeParts>(() =>
    parseTimeParts(horario?.horaInicio, readStoredFmt())
  );
  const [fin, setFin] = useState<TimeParts>(() =>
    parseTimeParts(horario?.horaFin, readStoredFmt())
  );

  // ── Reset al abrir ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setHandled(false);
    if (!horario) {
      setAutoNumero(true);
      setSelectedCurso("");
      setNextNumero(null);
      setDiasSeleccionados([]);
      setCantidadMeses("");
      setFechaInicioVal("");
      setFechaInicioError(null);
      setPeriodos([]);
      setPeriodosModificados(false);
    } else {
      setSelectedCurso(horario.idCurso);
      setDiasSeleccionados(horario.dias);
      setCantidadMeses(horario.cantidadMeses ? String(horario.cantidadMeses) : "");
      setFechaInicioVal(horario.fechaInicio ?? "");
      setFechaInicioError(null);
      setPeriodos(horario.periodos.map((p) => ({ inicio: p.fechaInicio, fin: p.fechaFin })));
      setPeriodosModificados(false);
    }
  }, [open, horario]);

  // ── Auto-fetch número de grupo ──────────────────────────────────────────
  useEffect(() => {
    if (!horario && autoNumero && selectedCurso) {
      startFetch(async () => {
        const n = await getNextNumeroGrupo(selectedCurso);
        setNextNumero(n);
      });
    }
  }, [selectedCurso, autoNumero, horario]);

  // ── Cerrar al éxito ─────────────────────────────────────────────────────
  useEffect(() => {
    if (state.message === "ok" && !handled) {
      setHandled(true);
      toast.success(horario ? "Grupo actualizado" : "Grupo creado");
      onClose();
    }
  }, [state.message, handled, horario, onClose]);

  function toggleFmt() {
    const next: TimeFormat = fmt === "24" ? "12" : "24";
    setInicio(parseTimeParts(partsToHHmm(inicio, fmt), next));
    setFin(parseTimeParts(partsToHHmm(fin, fmt), next));
    setFmt(next);
    localStorage.setItem(FMT_KEY, next);
  }

  // ── Togglear un día ─────────────────────────────────────────────────────
  function toggleDia(dia: string) {
    setDiasSeleccionados((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia]
    );
    // Si cambian los días y hay una fecha de inicio inválida, re-validar
    setFechaInicioError(null);
  }

  // ── Manejar cambio de fecha inicio ──────────────────────────────────────
  function handleFechaInicioChange(val: string) {
    setFechaInicioVal(val);
    setFechaInicioError(null);

    if (!val || diasSeleccionados.length === 0) return;

    const [y, m, d] = val.split("-").map(Number);
    const fecha = new Date(y, m - 1, d);

    if (!isFreqDay(fecha, diasSeleccionados)) {
      const validos = diasSeleccionados.map((d) => DIA_ABREV[d] ?? d).join(", ");
      setFechaInicioError(
        `"${ymdToDayName(val)}" no es un día de clase. Días válidos: ${validos}`
      );
      // Si no hay períodos todavía, limpiarlos
      if (!periodosModificados) setPeriodos([]);
      return;
    }

    // Auto-calcular períodos solo si no hay períodos o si el usuario no los ha modificado
    const meses = parseInt(cantidadMeses, 10);
    if (!periodosModificados && meses >= 1) {
      recalcularPeriodos(fecha, meses, diasSeleccionados);
    }
  }

  // ── Recalcular períodos desde el algoritmo ──────────────────────────────
  function recalcularPeriodos(
    fecha?: Date,
    meses?: number,
    dias?: string[]
  ) {
    const f = fecha ?? (() => {
      if (!fechaInicioVal) return null;
      const [y, m, d] = fechaInicioVal.split("-").map(Number);
      return new Date(y, m - 1, d);
    })();
    const m = meses ?? parseInt(cantidadMeses, 10);
    const d = dias ?? diasSeleccionados;

    if (!f || isNaN(m) || m < 1 || d.length === 0) return;

    const result = calcularPeriodos(f, m, d);
    setPeriodos(result.map((p) => ({ inicio: dateToYmd(p.fechaInicio), fin: dateToYmd(p.fechaFin) })));
    setPeriodosModificados(false);
  }

  function handleCantidadMesesChange(val: string) {
    setCantidadMeses(val);
    const meses = parseInt(val, 10);
    if (meses >= 1 && fechaInicioVal && diasSeleccionados.length > 0 && !periodosModificados) {
      const [y, m, d] = fechaInicioVal.split("-").map(Number);
      const fecha = new Date(y, m - 1, d);
      if (isFreqDay(fecha, diasSeleccionados)) {
        recalcularPeriodos(fecha, meses, diasSeleccionados);
      }
    }
  }

  function updatePeriodo(idx: number, field: "inicio" | "fin", val: string) {
    setPeriodos((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
    setPeriodosModificados(true);
  }

  const e = state.errors ?? {};
  const mesesNum = parseInt(cantidadMeses, 10);
  const puedeCalcular =
    fechaInicioVal &&
    diasSeleccionados.length > 0 &&
    mesesNum >= 1 &&
    !fechaInicioError;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{horario ? "Editar grupo" : "Nuevo grupo"}</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="space-y-5">
          {e._ && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{e._[0]}</p>
          )}

          {/* ── 1. Curso ─────────────────────────────────────────────── */}
          <div className="space-y-1">
            <Label htmlFor="idCurso">Curso *</Label>
            <select
              id="idCurso" name="idCurso"
              defaultValue={horario?.idCurso ?? ""}
              className={SELECT_CLASS}
              onChange={(e) => setSelectedCurso(e.target.value)}
            >
              <option value="">Selecciona un curso</option>
              {selectData.cursos.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            {e.idCurso && <p className="text-xs text-destructive">{e.idCurso[0]}</p>}
          </div>

          {/* ── 2. Docente | Aula ────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="idDocente">Docente *</Label>
              <select id="idDocente" name="idDocente" defaultValue={horario?.idDocente ?? ""} className={SELECT_CLASS}>
                <option value="">Selecciona un docente</option>
                {selectData.docentes.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>
              {e.idDocente && <p className="text-xs text-destructive">{e.idDocente[0]}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="idAula">Aula *</Label>
              <select id="idAula" name="idAula" defaultValue={horario?.idAula ?? ""} className={SELECT_CLASS}>
                <option value="">Selecciona un aula</option>
                {selectData.aulas.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
              {e.idAula && <p className="text-xs text-destructive">{e.idAula[0]}</p>}
            </div>
          </div>

          {/* ── 3. Número de grupo | Precio mensual ──────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              {!horario && (
                <label className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors select-none",
                  autoNumero ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 hover:border-zinc-300"
                )}>
                  <input
                    type="checkbox" name="autoNumero" value="true"
                    checked={autoNumero} onChange={(e) => setAutoNumero(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-zinc-300 accent-zinc-900 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 leading-tight">
                      Número automático
                      {autoNumero && nextNumero !== null && selectedCurso && (
                        <span className="ml-1.5 font-mono text-zinc-500">→ {nextNumero}</span>
                      )}
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5 leading-snug">
                      {selectedCurso ? "Siguiente disponible para este curso." : "Selecciona primero un curso."}
                    </p>
                  </div>
                </label>
              )}
              {(!autoNumero || horario) && (
                <div className="space-y-1">
                  <Label htmlFor="numeroGrupo">{horario ? "Número de grupo" : "Número manual *"}</Label>
                  <Input
                    id="numeroGrupo" name="numeroGrupo" type="number" min="1" step="1"
                    defaultValue={horario?.numeroGrupo ?? ""} placeholder="Ej: 15"
                  />
                  {e.numeroGrupo && <p className="text-xs text-destructive">{e.numeroGrupo[0]}</p>}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="precioMensual">Precio mensual (S/) *</Label>
              <Input
                id="precioMensual" name="precioMensual" type="number" step="0.01" min="0.01"
                defaultValue={horario?.precioMensual ?? ""} placeholder="0.00"
              />
              {e.precioMensual && <p className="text-xs text-destructive">{e.precioMensual[0]}</p>}
            </div>
          </div>

          {/* ── 4. Horario (hora inicio | hora fin) ──────────────────── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Horario *</Label>
              <button type="button" onClick={toggleFmt} title="Cambiar formato de hora"
                className="flex items-center gap-1.5 rounded-full border border-zinc-200 px-2.5 py-0.5 text-xs font-medium text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition-colors">
                <ArrowLeftRight className="h-3 w-3" />
                {fmt === "24" ? "24 h" : "12 h"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-6 rounded-lg border border-zinc-100 bg-zinc-50 p-3">
              <TimeField label="Inicio" name="horaInicio" parts={inicio} onChange={setInicio} fmt={fmt} error={e.horaInicio?.[0]} />
              <TimeField label="Fin" name="horaFin" parts={fin} onChange={setFin} fmt={fmt} error={e.horaFin?.[0]} />
            </div>
          </div>

          {/* ── 5. Días de clase ─────────────────────────────────────── */}
          <div className="space-y-2">
            <Label>Días de clase *</Label>
            <div className="flex flex-wrap gap-2">
              {DIAS.map((dia) => {
                const active = diasSeleccionados.includes(dia);
                return (
                  <label
                    key={dia}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm cursor-pointer select-none transition-colors",
                      active
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 text-zinc-600 hover:border-zinc-400"
                    )}
                  >
                    <input
                      type="checkbox" name="dia" value={dia}
                      checked={active}
                      onChange={() => toggleDia(dia)}
                      className="sr-only"
                    />
                    {dia}
                  </label>
                );
              })}
            </div>
            {e.dias && <p className="text-xs text-destructive">{e.dias[0]}</p>}
          </div>

          {/* ── 6. Duración | Fecha inicio ───────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="cantidadMeses">Duración (meses)</Label>
              <input
                id="cantidadMeses" name="cantidadMeses" type="number" min="1" max="24" step="1"
                value={cantidadMeses}
                onChange={(e) => handleCantidadMesesChange(e.target.value)}
                placeholder="Ej: 3"
                className={DATE_CLASS}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="fechaInicio">
                Fecha de inicio
                {diasSeleccionados.length === 0 && (
                  <span className="ml-1.5 text-xs font-normal text-zinc-400">(selecciona días primero)</span>
                )}
              </Label>
              <input
                id="fechaInicio" name="fechaInicio" type="date"
                value={fechaInicioVal}
                onChange={(e) => handleFechaInicioChange(e.target.value)}
                disabled={diasSeleccionados.length === 0}
                className={cn(DATE_CLASS, fechaInicioError && "border-red-400 focus:ring-red-400")}
              />
              {fechaInicioError && (
                <p className="text-xs text-red-500">{fechaInicioError}</p>
              )}
              {!fechaInicioError && fechaInicioVal && diasSeleccionados.length > 0 && (
                <p className="text-xs text-zinc-400">
                  {ymdToDayName(fechaInicioVal)} · {ymdToDisplay(fechaInicioVal)}
                </p>
              )}
            </div>
          </div>

          {/* ── 7. Editor de períodos ─────────────────────────────────── */}
          <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-800">
                  Períodos del grupo
                  {periodos.length > 0 && (
                    <span className="ml-2 text-xs font-normal text-zinc-400">
                      {periodos.length} mes{periodos.length !== 1 ? "es" : ""}
                    </span>
                  )}
                </p>
                {periodosModificados && (
                  <p className="text-xs text-amber-600 mt-0.5">Períodos con ediciones manuales</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => recalcularPeriodos()}
                disabled={!puedeCalcular}
                title="Recalcular períodos desde el algoritmo"
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  puedeCalcular
                    ? "border-zinc-300 text-zinc-600 hover:border-zinc-500 hover:text-zinc-800"
                    : "border-zinc-200 text-zinc-300 cursor-not-allowed"
                )}
              >
                <RefreshCw className="h-3 w-3" />
                Recalcular
              </button>
            </div>

            <input type="hidden" name="numPeriodos" value={periodos.length} />

            {periodos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2">
                <CalendarDays className="h-7 w-7 text-zinc-300" />
                <p className="text-sm text-zinc-400 text-center">
                  {!puedeCalcular
                    ? "Completa los días, duración y fecha de inicio para calcular los períodos"
                    : "Presiona Recalcular para generar los períodos"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {periodos.map((p, idx) => {
                  const isLast = idx === periodos.length - 1;
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      {/* Badge mes */}
                      <div className={cn(
                        "flex items-center justify-center rounded-full text-xs font-bold shrink-0 w-8 h-8 border",
                        isLast
                          ? "bg-zinc-900 text-white border-zinc-900"
                          : "bg-white text-zinc-600 border-zinc-200"
                      )}>
                        {idx + 1}
                      </div>

                      {/* Fecha inicio */}
                      <input
                        name={`periodo_${idx + 1}_inicio`}
                        type="date"
                        value={p.inicio}
                        onChange={(e) => updatePeriodo(idx, "inicio", e.target.value)}
                        className={cn(DATE_CLASS, "flex-1 bg-white text-sm")}
                      />

                      <ChevronRight className="h-3.5 w-3.5 text-zinc-300 shrink-0" />

                      {/* Fecha fin */}
                      <div className="flex-1 flex items-center gap-1.5">
                        <input
                          name={`periodo_${idx + 1}_fin`}
                          type="date"
                          value={p.fin}
                          onChange={(e) => updatePeriodo(idx, "fin", e.target.value)}
                          className={cn(DATE_CLASS, "flex-1 bg-white text-sm")}
                        />
                        {isLast && (
                          <span className="text-xs text-zinc-400 whitespace-nowrap font-medium">Fin</span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Resumen de fechas en texto */}
                <div className="pt-1 border-t border-zinc-100 mt-2">
                  <p className="text-xs text-zinc-400">
                    <span className="font-medium text-zinc-600">Inicio: </span>
                    {ymdToDisplay(periodos[0].inicio)}
                    {" · "}
                    <span className="font-medium text-zinc-600">Fin: </span>
                    {ymdToDisplay(periodos[periodos.length - 1].fin)}
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
