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
  createDescuento,
  updateDescuento,
  type DescuentoFormState,
  type DescuentoSerialized,
  type GrupoOption,
} from "@/lib/actions/descuentos";

type Props = {
  open: boolean;
  onClose: () => void;
  descuento?: DescuentoSerialized | null;
  grupos: GrupoOption[];
};

const initialState: DescuentoFormState = {};

export function DescuentoDialog({ open, onClose, descuento, grupos }: Props) {
  const action = descuento
    ? updateDescuento.bind(null, descuento.id)
    : createDescuento;

  const [state, formAction, pending] = useActionState(action, initialState);
  const [handled, setHandled] = useState(false);
  const [automatico, setAutomatico] = useState(descuento?.automatico ?? true);

  useEffect(() => {
    if (state.message === "ok" && !handled) {
      setHandled(true);
      toast.success(descuento ? "Descuento actualizado" : "Descuento creado");
      onClose();
    }
  }, [state.message, handled, descuento, onClose]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {descuento ? "Editar descuento" : "Nuevo descuento"}
          </DialogTitle>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="nombre">Nombre *</Label>
            <Input
              id="nombre"
              name="nombre"
              defaultValue={descuento?.nombre ?? ""}
              placeholder="Ej: Descuento hermanos, Beca 50%"
            />
            {state.errors?.nombre && (
              <p className="text-xs text-destructive">{state.errors.nombre[0]}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="tipo">Tipo *</Label>
              <select
                id="tipo"
                name="tipo"
                defaultValue={descuento?.tipo ?? "porcentaje"}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="porcentaje">Porcentaje (%)</option>
                <option value="monto">Monto fijo (S/)</option>
              </select>
              {state.errors?.tipo && (
                <p className="text-xs text-destructive">{state.errors.tipo[0]}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="valor">Valor *</Label>
              <Input
                id="valor"
                name="valor"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={descuento?.valor ?? ""}
                placeholder="0.00"
              />
              {state.errors?.valor && (
                <p className="text-xs text-destructive">{state.errors.valor[0]}</p>
              )}
            </div>
          </div>

          {grupos.length > 0 && (
            <div className="space-y-1">
              <Label htmlFor="idGrupo">Grupo</Label>
              <select
                id="idGrupo"
                name="idGrupo"
                defaultValue={descuento?.grupo?.id ?? ""}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Sin grupo</option>
                {grupos.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
            <input
              type="hidden"
              name="automatico"
              value={automatico ? "true" : "false"}
            />
            <input
              id="automatico"
              type="checkbox"
              checked={automatico}
              onChange={(e) => setAutomatico(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 accent-zinc-900"
            />
            <div>
              <Label htmlFor="automatico" className="cursor-pointer font-medium">
                Aplicar automáticamente
              </Label>
              <p className="text-xs text-zinc-500 mt-0.5">
                Se sugiere al matricular si aplica la condición
              </p>
            </div>
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
