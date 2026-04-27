"use client";

import { useEffect, useActionState } from "react";
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
  createDocente,
  updateDocente,
  type DocenteFormState,
  type DocenteSerialized,
} from "@/lib/actions/docentes";

type Props = {
  open: boolean;
  onClose: () => void;
  docente?: DocenteSerialized | null;
};

const initialState: DocenteFormState = {};

export function DocenteDialog({ open, onClose, docente }: Props) {
  const action = docente ? updateDocente.bind(null, docente.id) : createDocente;
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.message === "ok") {
      toast.success(docente ? "Docente actualizado" : "Docente creado");
      onClose();
    }
  }, [state.message, docente, onClose]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{docente ? "Editar docente" : "Nuevo docente"}</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="apellido">Apellido *</Label>
              <Input
                id="apellido"
                name="apellido"
                defaultValue={docente?.apellido ?? ""}
                placeholder="García"
              />
              {state.errors?.apellido && (
                <p className="text-xs text-destructive">{state.errors.apellido[0]}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                name="nombre"
                defaultValue={docente?.nombre ?? ""}
                placeholder="Carlos"
              />
              {state.errors?.nombre && (
                <p className="text-xs text-destructive">{state.errors.nombre[0]}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="especialidad">Especialidad</Label>
            <Input
              id="especialidad"
              name="especialidad"
              defaultValue={docente?.especialidad ?? ""}
              placeholder="Ej: Matemáticas, Inglés, Piano"
            />
            {state.errors?.especialidad && (
              <p className="text-xs text-destructive">{state.errors.especialidad[0]}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="celular">Celular</Label>
            <Input
              id="celular"
              name="celular"
              defaultValue={docente?.celular ?? ""}
              placeholder="987654321"
            />
            {state.errors?.celular && (
              <p className="text-xs text-destructive">{state.errors.celular[0]}</p>
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
