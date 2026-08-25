"use client";

import { useEffect, useActionState, useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowLeftRight, RefreshCw, CalendarDays, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
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
  DIA_TO_DOW,
} from "@/lib/horario-periodos";

// ─── Time picker helpers ─────────────────────────────────────────────────────

type TimeFormat = "12" | "24";
type AMPM = "AM" | "PM";
interface TimeParts { hour: string; minute: string; ampm: AMPM; }

const HOURS_24 = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const HOURS_12 = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES  = ["00","05","10","15","20","25","30","35","40","45","50","55"];
const FMT_KEY  = "horario-time-fmt";

function readStoredFmt(): TimeFormat {
  if (typeof window === "undefined") return "24";
  const v = localStorage.getItem(FMT_KEY);
  return v === "12" || v === "24" ? v : "24";
}
function parseTimeParts(hhmm: string | undefined, fmt: TimeFormat): TimeParts {
  if (!hhmm) return { hour: fmt === "24" ? "07" : "7", minute: "00", ampm: "AM" };
  const [hStr = "7", mStr = "00"] = hhmm.split(":");
  const h24 = parseInt(hStr, 10);
  if (fmt === "24") return { hour: String(h24).padStart(2, "0"), minute: mStr, ampm: "AM" };
  const ampm: AMPM = h24 >= 12 ? "PM" : "AM";
  return { hour: String(h24 % 12 || 12), minute: mStr, ampm };
}
function partsToHHmm(parts: TimeParts, fmt: TimeFormat): string {
  if (fmt === "24") return `${parts.hour.padStart(2, "0")}:${parts.minute}`;
  let h = parseInt(parts.hour, 10);
  if (parts.ampm === "PM" && h !== 12) h += 12;
  if (parts.ampm === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${parts.minute}`;
}

const SEL = "h-9 rounded-md border border-input bg-transparent px-2 py-1 text-sm text-center shadow-sm focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer";

function TimeField({ label, name, parts, onChange, fmt, error }: {
  label: string; name: string; parts: TimeParts;
  onChange: (p: TimeParts) => void; fmt: TimeFormat; error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-zinc-500 uppercase tracking-wide">{label}</Label>
      <input type="hidden" name={name} value={partsToHHmm(parts, fmt)} />
      <div className="flex items-center gap-2">
        <select value={parts.hour} onChange={(e) => onChange({ ...parts, hour: e.target.value })} className={`${SEL} w-20`}>
          {(fmt === "24" ? HOURS_24 : HOURS_12).map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
        <span className="text-base font-bold text-zinc-400 select-none">:</span>
        <select value={parts.minute} onChange={(e) => onChange({ ...parts, minute: e.target.value })} className={`${SEL} w-20`}>
          {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        {fmt === "12" && (
          <div className="flex rounded-md overflow-hidden border border-input h-9">
            {(["AM","PM"] as const).map((ap) => (
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

// ─── Mini calendar ────────────────────────────────────────────────────────────

const MONTH_NAMES  = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const MESES_NOMBRE = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const DIAS_NOMBRE  = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];
const DAY_HDRS     = ["Lu","Ma","Mi","Ju","Vi","Sa","Do"];

function ymdToTextLong(ymd: string): string {
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dayName   = DIAS_NOMBRE[date.getDay()];
  const monthName = MESES_NOMBRE[m - 1];
  return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${d} de ${monthName} de ${y}`;
}

function countClassDays(start: Date, end: Date, freqDays: string[]): number {
  const freqDows = new Set(freqDays.map(d => DIA_TO_DOW[d]).filter((v): v is number => v !== undefined));
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    if (freqDows.has(cur.getDay())) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

type CalColor = {
  range:    string; // soft fill for all period days
  classDay: string; // prominent circle for class days in period
};

// Complete Tailwind class strings to avoid purge issues
const PERIOD_COLORS: CalColor[] = [
  { range: "bg-blue-100 text-blue-700",     classDay: "bg-blue-500 text-white" },
  { range: "bg-violet-100 text-violet-700", classDay: "bg-violet-500 text-white" },
  { range: "bg-emerald-100 text-emerald-700", classDay: "bg-emerald-500 text-white" },
  { range: "bg-orange-100 text-orange-700", classDay: "bg-orange-500 text-white" },
  { range: "bg-pink-100 text-pink-700",     classDay: "bg-pink-500 text-white" },
  { range: "bg-teal-100 text-teal-700",     classDay: "bg-teal-500 text-white" },
];

const BADGE_COLORS = [
  "bg-blue-500 text-white",
  "bg-violet-500 text-white",
  "bg-emerald-500 text-white",
  "bg-orange-500 text-white",
  "bg-pink-500 text-white",
  "bg-teal-500 text-white",
];

function buildCells(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const startCol = (first.getDay() + 6) % 7; // Mon=0 … Sun=6
  const cells: (number | null)[] = Array(startCol).fill(null);
  for (let d = 1; d <= last.getDate(); d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function MiniCalendar({ year, month, pStart, pEnd, freqDays, col }: {
  year: number; month: number;
  pStart: Date | null; pEnd: Date | null;
  freqDays: string[]; col: CalColor;
}) {
  const cells    = buildCells(year, month);
  const freqDows = new Set(freqDays.map(d => DIA_TO_DOW[d]).filter(Boolean));

  return (
    <div className="select-none">
      <p className="text-[10px] font-bold text-center text-zinc-500 uppercase tracking-wider mb-1">
        {MONTH_NAMES[month]} {year}
      </p>
      <div className="grid grid-cols-7">
        {DAY_HDRS.map(d => (
          <div key={d} className="h-5 flex items-center justify-center">
            <span className="text-[9px] font-semibold text-zinc-400">{d}</span>
          </div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="h-7 w-full" />;
          const date    = new Date(year, month, day);
          const inRng   = !!(pStart && pEnd && date >= pStart && date <= pEnd);
          const isClass = inRng && freqDows.has(date.getDay());
          return (
            <div key={i} className="h-7 flex items-center justify-center">
              <span className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium leading-none",
                isClass ? col.classDay :
                inRng   ? col.range    :
                "text-zinc-400"
              )}>
                {day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Período card ─────────────────────────────────────────────────────────────

type PeriodoEdit = { inicio: string; fin: string };

const DATE_CLASS =
  "h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-40 disabled:cursor-not-allowed";

function PeriodoCard({ periodo, idx, total, freqDays, onUpdate }: {
  periodo: PeriodoEdit; idx: number; total: number;
  freqDays: string[]; onUpdate: (idx: number, field: "inicio" | "fin", val: string) => void;
}) {
  const col    = PERIOD_COLORS[idx % PERIOD_COLORS.length];
  const badge  = BADGE_COLORS[idx % BADGE_COLORS.length];
  const isLast = idx === total - 1;

  let startDate: Date | null = null;
  let endDate:   Date | null = null;
  if (periodo.inicio) { const [y,m,d] = periodo.inicio.split("-").map(Number); startDate = new Date(y, m-1, d); }
  if (periodo.fin)    { const [y,m,d] = periodo.fin.split("-").map(Number);    endDate   = new Date(y, m-1, d); }

  const sameMonth = !!(startDate && endDate &&
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth()    === endDate.getMonth());

  const classDayCount = startDate && endDate ? countClassDays(startDate, endDate, freqDays) : 0;

  return (
    <div className={cn(
      "rounded-xl border p-3 space-y-3 transition-shadow",
      isLast ? "border-zinc-300 bg-zinc-50/50" : "border-zinc-100 bg-white"
    )}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0",
          badge
        )}>
          {idx + 1}
        </span>
        <span className="text-sm font-semibold text-zinc-800">Mes {idx + 1}</span>
        {startDate && endDate && (
          <span className="text-[10px] text-zinc-400 font-medium">
            · {classDayCount} clase{classDayCount !== 1 ? "s" : ""}
          </span>
        )}
        {isLast && (
          <span className="ml-auto text-[10px] font-semibold bg-zinc-900 text-white px-1.5 py-0.5 rounded">
            Fin del grupo
          </span>
        )}
      </div>

      {/* Calendarios */}
      {startDate && endDate ? (
        <>
          <div className={cn("flex justify-center", sameMonth ? "" : "gap-4")}>
            {sameMonth ? (
              <MiniCalendar
                year={startDate.getFullYear()} month={startDate.getMonth()}
                pStart={startDate} pEnd={endDate}
                freqDays={freqDays} col={col}
              />
            ) : (
              <>
                <MiniCalendar
                  year={startDate.getFullYear()} month={startDate.getMonth()}
                  pStart={startDate} pEnd={endDate}
                  freqDays={freqDays} col={col}
                />
                <div className="w-px bg-zinc-100 shrink-0" />
                <MiniCalendar
                  year={endDate.getFullYear()} month={endDate.getMonth()}
                  pStart={startDate} pEnd={endDate}
                  freqDays={freqDays} col={col}
                />
              </>
            )}
          </div>

          {/* Fechas textuales */}
          <div className="flex flex-col gap-0.5 text-[10px] text-zinc-500">
            <span><span className="font-semibold text-zinc-700">Inicio:</span> {ymdToTextLong(periodo.inicio)}</span>
            <span><span className="font-semibold text-zinc-700">Fin:</span> {ymdToTextLong(periodo.fin)}</span>
          </div>

          {/* Leyenda */}
          <div className="flex items-center gap-3 text-[10px] text-zinc-400 justify-center">
            <span className="flex items-center gap-1">
              <span className={`w-3 h-3 rounded-full ${col.range}`} />
              Período
            </span>
            <span className="flex items-center gap-1">
              <span className={`w-3 h-3 rounded-full ${col.classDay}`} />
              Día de clase
            </span>
          </div>
        </>
      ) : (
        <div className="h-20 flex items-center justify-center">
          <p className="text-xs text-zinc-400 text-center">Completa las fechas para ver el calendario</p>
        </div>
      )}

      {/* Fechas editables */}
      <div className="flex items-end gap-2 border-t border-zinc-100 pt-3">
        <div className="flex-1 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Inicio del mes</p>
          <input
            name={`periodo_${idx + 1}_inicio`} type="date" value={periodo.inicio}
            onChange={(e) => onUpdate(idx, "inicio", e.target.value)}
            className={DATE_CLASS}
          />
        </div>
        <ChevronRight className="h-3.5 w-3.5 text-zinc-300 shrink-0 mb-1.5" />
        <div className="flex-1 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Fin del mes</p>
          <input
            name={`periodo_${idx + 1}_fin`} type="date" value={periodo.fin}
            onChange={(e) => onUpdate(idx, "fin", e.target.value)}
            className={DATE_CLASS}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DIAS = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
const DIA_LABEL: Record<string, string> = {
  "Lunes": "Lun", "Martes": "Mar", "Miércoles": "Mié",
  "Jueves": "Jue", "Viernes": "Vie", "Sábado": "Sáb",
};
const SELECT_CLASS = "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
const DATE_INPUT   = "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-40 disabled:cursor-not-allowed";

type Props = {
  open: boolean; onClose: () => void;
  horario?: HorarioSerialized | null;
  selectData: HorarioSelectData;
};

const initialState: HorarioFormState = {};

// ─── Main dialog ──────────────────────────────────────────────────────────────

export function HorarioDialog({ open, onClose, horario, selectData }: Props) {
  const action = horario ? updateHorario.bind(null, horario.id) : createHorario;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [handled, setHandled] = useState(false);

  const [autoNumero, setAutoNumero]       = useState(true);
  const [nextNumero, setNextNumero]       = useState<number | null>(null);
  const [selectedCurso, setSelectedCurso] = useState(horario?.idCurso ?? "");
  const [, startFetch] = useTransition();

  const [diasSeleccionados, setDiasSeleccionados] = useState<string[]>(horario?.dias ?? []);
  const [cantidadMeses,    setCantidadMeses]      = useState(horario?.cantidadMeses ? String(horario.cantidadMeses) : "");
  const [fechaInicioVal,   setFechaInicioVal]     = useState(horario?.fechaInicio ?? "");
  const [fechaInicioError, setFechaInicioError]   = useState<string | null>(null);
  const [periodos,         setPeriodos]           = useState<PeriodoEdit[]>(
    horario?.periodos.map(p => ({ inicio: p.fechaInicio, fin: p.fechaFin })) ?? []
  );
  const [periodosModificados, setPeriodosModificados] = useState(false);

  const [fmt,    setFmt]    = useState<TimeFormat>(readStoredFmt);
  const [inicio, setInicio] = useState<TimeParts>(() => parseTimeParts(horario?.horaInicio, readStoredFmt()));
  const [fin,    setFin]    = useState<TimeParts>(() => parseTimeParts(horario?.horaFin,    readStoredFmt()));

  // Reset on open
  useEffect(() => {
    if (!open) return;
    setHandled(false);
    if (!horario) {
      setAutoNumero(true); setSelectedCurso(""); setNextNumero(null);
      setDiasSeleccionados([]); setCantidadMeses(""); setFechaInicioVal("");
      setFechaInicioError(null); setPeriodos([]); setPeriodosModificados(false);
    } else {
      setSelectedCurso(horario.idCurso);
      setDiasSeleccionados(horario.dias);
      setCantidadMeses(horario.cantidadMeses ? String(horario.cantidadMeses) : "");
      setFechaInicioVal(horario.fechaInicio ?? "");
      setFechaInicioError(null);
      setPeriodos(horario.periodos.map(p => ({ inicio: p.fechaInicio, fin: p.fechaFin })));
      setPeriodosModificados(false);
    }
  }, [open, horario]);

  useEffect(() => {
    if (!horario && autoNumero && selectedCurso) {
      startFetch(async () => { const n = await getNextNumeroGrupo(selectedCurso); setNextNumero(n); });
    }
  }, [selectedCurso, autoNumero, horario]);

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

  function toggleDia(dia: string) {
    setDiasSeleccionados(prev => prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]);
    setFechaInicioError(null);
  }

  function recalcularPeriodos(fecha?: Date, meses?: number, dias?: string[]) {
    const f  = fecha  ?? (() => { if (!fechaInicioVal) return null; const [y,m,d] = fechaInicioVal.split("-").map(Number); return new Date(y,m-1,d); })();
    const m2 = meses  ?? parseInt(cantidadMeses, 10);
    const d2 = dias   ?? diasSeleccionados;
    if (!f || isNaN(m2) || m2 < 1 || d2.length === 0) return;
    const result = calcularPeriodos(f, m2, d2);
    setPeriodos(result.map(p => ({ inicio: dateToYmd(p.fechaInicio), fin: dateToYmd(p.fechaFin) })));
    setPeriodosModificados(false);
  }

  function handleFechaInicioChange(val: string) {
    setFechaInicioVal(val); setFechaInicioError(null);
    if (!val || diasSeleccionados.length === 0) return;
    const [y,m,d] = val.split("-").map(Number);
    const fecha = new Date(y, m-1, d);
    if (!isFreqDay(fecha, diasSeleccionados)) {
      const validos = diasSeleccionados.map(d => DIA_ABREV[d] ?? d).join(", ");
      setFechaInicioError(`"${ymdToDayName(val)}" no es día de clase. Días válidos: ${validos}`);
      if (!periodosModificados) setPeriodos([]);
      return;
    }
    const meses = parseInt(cantidadMeses, 10);
    if (!periodosModificados && meses >= 1) recalcularPeriodos(fecha, meses, diasSeleccionados);
  }

  function handleCantidadMesesChange(val: string) {
    setCantidadMeses(val);
    const meses = parseInt(val, 10);
    if (meses >= 1 && fechaInicioVal && diasSeleccionados.length > 0 && !periodosModificados) {
      const [y,m,d] = fechaInicioVal.split("-").map(Number);
      const fecha = new Date(y, m-1, d);
      if (isFreqDay(fecha, diasSeleccionados)) recalcularPeriodos(fecha, meses, diasSeleccionados);
    }
  }

  function updatePeriodo(idx: number, field: "inicio" | "fin", val: string) {
    setPeriodos(prev => { const next = [...prev]; next[idx] = { ...next[idx], [field]: val }; return next; });
    setPeriodosModificados(true);
  }

  const e = state.errors ?? {};
  const mesesNum = parseInt(cantidadMeses, 10);
  const puedeCalcular = !!(fechaInicioVal && diasSeleccionados.length > 0 && mesesNum >= 1 && !fechaInicioError);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[1100px] p-0 gap-0 flex flex-col h-[92vh] overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 shrink-0">
          <DialogTitle className="text-base font-semibold">
            {horario ? "Editar grupo" : "Nuevo grupo"}
          </DialogTitle>
        </div>

        <form action={formAction} className="flex-1 flex flex-col overflow-hidden min-h-0">
          {e._ && (
            <div className="mx-6 mt-3">
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{e._[0]}</p>
            </div>
          )}

          {/* Two-column body */}
          <div className="flex-1 flex overflow-hidden min-h-0">

            {/* ── Left: form fields ── */}
            <div className="w-[460px] shrink-0 overflow-y-auto px-6 py-4 space-y-4 border-r border-zinc-100">

              {/* Curso */}
              <div className="space-y-1">
                <Label htmlFor="idCurso">Curso *</Label>
                <select id="idCurso" name="idCurso" defaultValue={horario?.idCurso ?? ""} className={SELECT_CLASS}
                  onChange={(e) => setSelectedCurso(e.target.value)}>
                  <option value="">Selecciona un curso</option>
                  {selectData.cursos.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                {e.idCurso && <p className="text-xs text-destructive">{e.idCurso[0]}</p>}
              </div>

              {/* Docente | Aula */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="idDocente">Docente *</Label>
                  <select id="idDocente" name="idDocente" defaultValue={horario?.idDocente ?? ""} className={SELECT_CLASS}>
                    <option value="">— Docente —</option>
                    {selectData.docentes.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                  </select>
                  {e.idDocente && <p className="text-xs text-destructive">{e.idDocente[0]}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="idAula">Aula *</Label>
                  <select id="idAula" name="idAula" defaultValue={horario?.idAula ?? ""} className={SELECT_CLASS}>
                    <option value="">— Aula —</option>
                    {selectData.aulas.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                  </select>
                  {e.idAula && <p className="text-xs text-destructive">{e.idAula[0]}</p>}
                </div>
              </div>

              {/* Número | Precio */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  {!horario && (
                    <label className={cn(
                      "flex items-start gap-2.5 rounded-lg border p-2.5 cursor-pointer transition-colors select-none",
                      autoNumero ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 hover:border-zinc-300"
                    )}>
                      <input type="checkbox" name="autoNumero" value="true" checked={autoNumero}
                        onChange={e => setAutoNumero(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-zinc-300 accent-zinc-900 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-zinc-900 leading-tight">
                          N° automático
                          {autoNumero && nextNumero !== null && selectedCurso && (
                            <span className="ml-1 font-mono text-zinc-500">→ {nextNumero}</span>
                          )}
                        </p>
                        <p className="text-[10px] text-zinc-400 mt-0.5 leading-snug">
                          {selectedCurso ? "Siguiente para este curso" : "Selecciona un curso"}
                        </p>
                      </div>
                    </label>
                  )}
                  {(!autoNumero || horario) && (
                    <div className="space-y-1">
                      <Label htmlFor="numeroGrupo">{horario ? "N° grupo" : "N° manual *"}</Label>
                      <Input id="numeroGrupo" name="numeroGrupo" type="number" min="1" step="1"
                        defaultValue={horario?.numeroGrupo ?? ""} placeholder="Ej: 5" />
                      {e.numeroGrupo && <p className="text-xs text-destructive">{e.numeroGrupo[0]}</p>}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="precioMensual">Precio/mes (S/) *</Label>
                  <Input id="precioMensual" name="precioMensual" type="number" step="0.01" min="0.01"
                    defaultValue={horario?.precioMensual ?? ""} placeholder="0.00" />
                  {e.precioMensual && <p className="text-xs text-destructive">{e.precioMensual[0]}</p>}
                </div>
              </div>

              {/* Horario */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Horario *</Label>
                  <button type="button" onClick={toggleFmt}
                    className="flex items-center gap-1.5 rounded-full border border-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition-colors">
                    <ArrowLeftRight className="h-3 w-3" />
                    {fmt === "24" ? "24 h" : "12 h"}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-6 rounded-lg border border-zinc-100 bg-zinc-50 p-4">
                  <TimeField label="Inicio" name="horaInicio" parts={inicio} onChange={setInicio} fmt={fmt} error={e.horaInicio?.[0]} />
                  <TimeField label="Fin"    name="horaFin"    parts={fin}    onChange={setFin}    fmt={fmt} error={e.horaFin?.[0]}    />
                </div>
              </div>

              {/* Días */}
              <div className="space-y-2">
                <Label>Días de clase *</Label>
                <div className="flex gap-2">
                  {DIAS.map(dia => {
                    const active = diasSeleccionados.includes(dia);
                    return (
                      <label key={dia} className={cn(
                        "flex items-center justify-center rounded-md border px-3 py-1.5 text-xs font-medium cursor-pointer select-none transition-colors",
                        active ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-zinc-600 hover:border-zinc-400"
                      )}>
                        <input type="checkbox" name="dia" value={dia} checked={active}
                          onChange={() => toggleDia(dia)} className="sr-only" />
                        {DIA_LABEL[dia] ?? dia}
                      </label>
                    );
                  })}
                </div>
                {e.dias && <p className="text-xs text-destructive">{e.dias[0]}</p>}
              </div>

              {/* Duración | Fecha inicio */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="cantidadMeses">Duración (meses)</Label>
                  <input id="cantidadMeses" name="cantidadMeses" type="number" min="1" max="24" step="1"
                    value={cantidadMeses} onChange={e => handleCantidadMesesChange(e.target.value)}
                    placeholder="Ej: 3" className={DATE_INPUT} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="fechaInicio">
                    Fecha inicio
                    {diasSeleccionados.length === 0 && (
                      <span className="ml-1 text-[10px] font-normal text-zinc-400">(elige días primero)</span>
                    )}
                  </Label>
                  <input id="fechaInicio" name="fechaInicio" type="date"
                    value={fechaInicioVal} onChange={e => handleFechaInicioChange(e.target.value)}
                    disabled={diasSeleccionados.length === 0}
                    className={cn(DATE_INPUT, fechaInicioError && "border-red-400")} />
                  {fechaInicioError ? (
                    <p className="text-[10px] text-red-500 leading-tight">{fechaInicioError}</p>
                  ) : fechaInicioVal && (
                    <p className="text-[10px] text-zinc-400">{ymdToDayName(fechaInicioVal)}</p>
                  )}
                </div>
              </div>
            </div>

            {/* ── Right: period calendars ── */}
            <div className="flex-1 overflow-y-auto px-5 py-4 bg-zinc-50/40">
              {/* Header del panel */}
              <div className="flex items-center justify-between mb-3">
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
                    <p className="text-[10px] text-amber-600 mt-0.5">Con ediciones manuales</p>
                  )}
                </div>
                <button type="button" onClick={() => recalcularPeriodos()} disabled={!puedeCalcular}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    puedeCalcular
                      ? "border-zinc-300 text-zinc-600 hover:border-zinc-500 hover:text-zinc-800 hover:bg-white"
                      : "border-zinc-200 text-zinc-300 cursor-not-allowed"
                  )}>
                  <RefreshCw className="h-3 w-3" />
                  Recalcular
                </button>
              </div>

              <input type="hidden" name="numPeriodos" value={periodos.length} />

              {periodos.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3 rounded-xl border border-dashed border-zinc-200 bg-white">
                  <CalendarDays className="h-8 w-8 text-zinc-200" />
                  <p className="text-sm text-zinc-400 text-center max-w-[240px] leading-snug">
                    {!puedeCalcular
                      ? "Selecciona los días, la duración en meses y una fecha de inicio válida"
                      : "Presiona Recalcular para generar los períodos automáticamente"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {periodos.map((p, idx) => (
                    <PeriodoCard
                      key={idx} periodo={p} idx={idx} total={periodos.length}
                      freqDays={diasSeleccionados} onUpdate={updatePeriodo}
                    />
                  ))}

                  {/* Resumen */}
                  <div className="rounded-lg border border-zinc-100 bg-white px-4 py-2.5">
                    <p className="text-xs text-zinc-500">
                      <span className="font-semibold text-zinc-700">Inicio: </span>
                      {ymdToDisplay(periodos[0].inicio)}
                      <span className="mx-2 text-zinc-300">·</span>
                      <span className="font-semibold text-zinc-700">Fin: </span>
                      {ymdToDisplay(periodos[periodos.length - 1].fin)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-3 border-t border-zinc-100 bg-white shrink-0">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
