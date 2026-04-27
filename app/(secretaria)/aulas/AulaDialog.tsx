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
  createAula,
  updateAula,
  type AulaFormState,
  type AulaSerialized,
} from "@/lib/actions/aulas";

type Props = {
  open: boolean;
  onClose: () => void;
  aula?: AulaSerialized | null;
};

const initialState: AulaFormState = {};

export function AulaDialog({ open, onClose, aula }: Props) {
  const action = aula ? updateAula.bind(null, aula.id) : createAula;
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.message === "ok") {
      toast.success(aula ? "Aula actualizada" : "Aula creada");
      onClose();
    }
  }, [state.message, aula, onClose]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{aula ? "Editar aula" : "Nueva aula"}</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="nombre">Nombre *</Label>
            <Input
              id="nombre"
              name="nombre"
              defaultValue={aula?.nombre ?? ""}
              placeholder="Ej: Aula 101, Sala de Cómputo"
            />
            {state.errors?.nombre && (
              <p className="text-xs text-destructive">{state.errors.nombre[0]}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="capacidad">Capacidad (alumnos) *</Label>
            <Input
              id="capacidad"
              name="capacidad"
              type="number"
              min="1"
              defaultValue={aula?.capacidad ?? 20}
            />
            {state.errors?.capacidad && (
              <p className="text-xs text-destructive">{state.errors.capacidad[0]}</p>
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
