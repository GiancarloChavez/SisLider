"use client";

import { useEffect, useActionState, useState } from "react";
import { toast } from "sonner";
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

export function HorarioDialog({ open, onClose, horario, selectData }: Props) {
  const action = horario ? updateHorario.bind(null, horario.id) : createHorario;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [handled, setHandled] = useState(false);

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

        <form key={horario?.id ?? "new"} action={formAction} className="space-y-4">
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
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
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
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
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
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
            {state.errors?.idAula && (
              <p className="text-xs text-destructive">{state.errors.idAula[0]}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="horaInicio">Hora inicio *</Label>
              <Input
                id="horaInicio"
                name="horaInicio"
                type="time"
                defaultValue={horario?.horaInicio ?? ""}
              />
              {state.errors?.horaInicio && (
                <p className="text-xs text-destructive">{state.errors.horaInicio[0]}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="horaFin">Hora fin *</Label>
              <Input
                id="horaFin"
                name="horaFin"
                type="time"
                defaultValue={horario?.horaFin ?? ""}
              />
              {state.errors?.horaFin && (
                <p className="text-xs text-destructive">{state.errors.horaFin[0]}</p>
              )}
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
