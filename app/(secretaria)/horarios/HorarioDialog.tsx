"use client";

import { useEffect, useActionState, useState } from "react";
import { toast } from "sonner";
import { ArrowLeftRight } from "lucide-react";
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
  type HorarioFormState,
  type HorarioSerialized,
  type HorarioSelectData,
} from "@/lib/actions/horarios";

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
  label,
  name,
  parts,
  onChange,
  fmt,
  error,
}: {
  label: string;
  name: string;
  parts: TimeParts;
  onChange: (p: TimeParts) => void;
  fmt: TimeFormat;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-zinc-500 uppercase tracking-wide">{label}</Label>
      <input type="hidden" name={name} value={partsToHHmm(parts, fmt)} />
      <div className="flex items-center gap-1.5">
        <select
          value={parts.hour}
          onChange={(e) => onChange({ ...parts, hour: e.target.value })}
          className={`${SEL} w-16`}
        >
          {(fmt === "24" ? HOURS_24 : HOURS_12).map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>

        <span className="text-base font-bold text-zinc-400 select-none leading-none">:</span>

        <select
          value={parts.minute}
          onChange={(e) => onChange({ ...parts, minute: e.target.value })}
          className={`${SEL} w-16`}
        >
          {MINUTES.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        {fmt === "12" && (
          <div className="flex rounded-md overflow-hidden border border-input h-9">
            {(["AM", "PM"] as const).map((ap) => (
              <button
                key={ap}
                type="button"
                onClick={() => onChange({ ...parts, ampm: ap })}
                className={`w-10 text-xs font-semibold transition-colors ${
                  parts.ampm === ap
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-500 hover:bg-zinc-50"
                }`}
              >
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

  const [fmt, setFmt] = useState<TimeFormat>(readStoredFmt);
  const [inicio, setInicio] = useState<TimeParts>(() =>
    parseTimeParts(horario?.horaInicio, readStoredFmt())
  );
  const [fin, setFin] = useState<TimeParts>(() =>
    parseTimeParts(horario?.horaFin, readStoredFmt())
  );

  function toggleFmt() {
    const next: TimeFormat = fmt === "24" ? "12" : "24";
    setInicio(parseTimeParts(partsToHHmm(inicio, fmt), next));
    setFin(parseTimeParts(partsToHHmm(fin, fmt), next));
    setFmt(next);
    localStorage.setItem(FMT_KEY, next);
  }

  useEffect(() => {
    if (state.message === "ok" && !handled) {
      setHandled(true);
      toast.success(horario ? "Horario actualizado" : "Horario creado");
      onClose();
    }
  }, [state.message, handled, horario, onClose]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{horario ? "Editar horario" : "Nuevo horario"}</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="idCurso">Curso *</Label>
            <select
              id="idCurso"
              name="idCurso"
              defaultValue={horario?.idCurso ?? ""}
              className={SELECT_CLASS}
            >
              <option value="">Selecciona un curso</option>
              {selectData.cursos.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            {state.errors?.idCurso && (
              <p className="text-xs text-destructive">{state.errors.idCurso[0]}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="idDocente">Docente *</Label>
            <select
              id="idDocente"
              name="idDocente"
              defaultValue={horario?.idDocente ?? ""}
              className={SELECT_CLASS}
            >
              <option value="">Selecciona un docente</option>
              {selectData.docentes.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
            {state.errors?.idDocente && (
              <p className="text-xs text-destructive">{state.errors.idDocente[0]}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="idAula">Aula *</Label>
            <select
              id="idAula"
              name="idAula"
              defaultValue={horario?.idAula ?? ""}
              className={SELECT_CLASS}
            >
              <option value="">Selecciona un aula</option>
              {selectData.aulas.map((a) => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
            {state.errors?.idAula && (
              <p className="text-xs text-destructive">{state.errors.idAula[0]}</p>
            )}
          </div>

          {/* ── Time pickers ───────────────────────────────────────────── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Horario *</Label>
              <button
                type="button"
                onClick={toggleFmt}
                title="Cambiar formato de hora"
                className="flex items-center gap-1.5 rounded-full border border-zinc-200 px-2.5 py-0.5 text-xs font-medium text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition-colors"
              >
                <ArrowLeftRight className="h-3 w-3" />
                {fmt === "24" ? "24 h" : "12 h"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6 rounded-lg border border-zinc-100 bg-zinc-50 p-3">
              <TimeField
                label="Inicio"
                name="horaInicio"
                parts={inicio}
                onChange={setInicio}
                fmt={fmt}
                error={state.errors?.horaInicio?.[0]}
              />
              <TimeField
                label="Fin"
                name="horaFin"
                parts={fin}
                onChange={setFin}
                fmt={fmt}
                error={state.errors?.horaFin?.[0]}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="cupoMaximo">Cupo máximo *</Label>
            <Input
              id="cupoMaximo"
              name="cupoMaximo"
              type="number"
              min="1"
              defaultValue={horario?.cupoMaximo ?? 20}
            />
            {state.errors?.cupoMaximo && (
              <p className="text-xs text-destructive">{state.errors.cupoMaximo[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Días *</Label>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {DIAS.map((dia) => (
                <label key={dia} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    name="dia"
                    value={dia}
                    defaultChecked={horario?.dias.includes(dia) ?? false}
                    className="h-4 w-4 rounded border-zinc-300 accent-zinc-900"
                  />
                  {dia}
                </label>
              ))}
            </div>
            {state.errors?.dias && (
              <p className="text-xs text-destructive">{state.errors.dias[0]}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
