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
import { createCurso, updateCurso, type CursoFormState, type CursoSerialized } from "@/lib/actions/cursos";

type Props = {
  open: boolean;
  onClose: () => void;
  curso?: CursoSerialized | null;
};

const initialState: CursoFormState = {};

export function CursoDialog({ open, onClose, curso }: Props) {
  const action = curso ? updateCurso.bind(null, curso.id) : createCurso;

  const [state, formAction, pending] = useActionState(action, initialState);
  const [handled, setHandled] = useState(false);

  useEffect(() => {
    if (state.message === "ok" && !handled) {
      setHandled(true);
      toast.success(curso ? "Curso actualizado" : "Curso creado");
      onClose();
    }
  }, [state.message, handled, curso, onClose]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{curso ? "Editar curso" : "Nuevo curso"}</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="nombre">Nombre *</Label>
            <Input
              id="nombre"
              name="nombre"
              defaultValue={curso?.nombre ?? ""}
              placeholder="Ej: Matemáticas, Inglés"
            />
            {state.errors?.nombre && (
              <p className="text-xs text-destructive">{state.errors.nombre[0]}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="nivel">Nivel</Label>
            <Input
              id="nivel"
              name="nivel"
              defaultValue={curso?.nivel ?? ""}
              placeholder="Ej: Básico, Intermedio, Avanzado"
            />
            {state.errors?.nivel && (
              <p className="text-xs text-destructive">{state.errors.nivel[0]}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="precioMensual">Precio mensual (S/) *</Label>
            <Input
              id="precioMensual"
              name="precioMensual"
              type="number"
              step="0.01"
              min="0"
              defaultValue={curso?.precioMensual ? Number(curso.precioMensual) : ""}
              placeholder="0.00"
            />
            {state.errors?.precioMensual && (
              <p className="text-xs text-destructive">{state.errors.precioMensual[0]}</p>
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
