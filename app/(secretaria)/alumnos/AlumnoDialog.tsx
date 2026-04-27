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
  createAlumnoConTutor,
  updateAlumno,
  type AlumnoFormState,
  type AlumnoSerialized,
} from "@/lib/actions/alumnos";

type Props = {
  open: boolean;
  onClose: () => void;
  alumno?: AlumnoSerialized | null;
};

const initialState: AlumnoFormState = {};

export function AlumnoDialog({ open, onClose, alumno }: Props) {
  const action = alumno ? updateAlumno.bind(null, alumno.id) : createAlumnoConTutor;
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.message === "ok") {
      toast.success(alumno ? "Alumno actualizado" : "Alumno registrado");
      onClose();
    }
  }, [state.message, alumno, onClose]);

  const e = state.errors ?? {};

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{alumno ? "Editar alumno" : "Nuevo alumno"}</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="space-y-5">
          {/* Datos del alumno */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Datos del alumno
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  name="nombre"
                  defaultValue={alumno?.nombre ?? ""}
                  placeholder="Juan"
                />
                {e.nombre && <p className="text-xs text-destructive">{e.nombre[0]}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="apellido">Apellido *</Label>
                <Input
                  id="apellido"
                  name="apellido"
                  defaultValue={alumno?.apellido ?? ""}
                  placeholder="Pérez"
                />
                {e.apellido && <p className="text-xs text-destructive">{e.apellido[0]}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="dni">DNI</Label>
                <Input
                  id="dni"
                  name="dni"
                  defaultValue={alumno?.dni ?? ""}
                  placeholder="12345678"
                  maxLength={8}
                />
                {e.dni && <p className="text-xs text-destructive">{e.dni[0]}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="fechaNacimiento">Fecha de nacimiento</Label>
                <Input
                  id="fechaNacimiento"
                  name="fechaNacimiento"
                  type="date"
                  defaultValue={alumno?.fechaNacimiento?.slice(0, 10) ?? ""}
                />
                {e.fechaNacimiento && (
                  <p className="text-xs text-destructive">{e.fechaNacimiento[0]}</p>
                )}
              </div>
            </div>
          </div>

          {/* Datos del tutor — solo al crear */}
          {!alumno && (
            <div className="space-y-3 border-t border-zinc-100 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Tutor / Apoderado
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="tutorNombre">Nombre *</Label>
                  <Input id="tutorNombre" name="tutorNombre" placeholder="María" />
                  {e.tutorNombre && (
                    <p className="text-xs text-destructive">{e.tutorNombre[0]}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tutorApellido">Apellido *</Label>
                  <Input id="tutorApellido" name="tutorApellido" placeholder="Pérez" />
                  {e.tutorApellido && (
                    <p className="text-xs text-destructive">{e.tutorApellido[0]}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="tutorCelular">Celular *</Label>
                  <Input id="tutorCelular" name="tutorCelular" placeholder="987654321" />
                  {e.tutorCelular && (
                    <p className="text-xs text-destructive">{e.tutorCelular[0]}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tutorCelularAdicional">Celular adicional</Label>
                  <Input
                    id="tutorCelularAdicional"
                    name="tutorCelularAdicional"
                    placeholder="987654321"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="tutorRelacion">Relación *</Label>
                <Input
                  id="tutorRelacion"
                  name="tutorRelacion"
                  placeholder="Madre, Padre, Abuelo..."
                />
                {e.tutorRelacion && (
                  <p className="text-xs text-destructive">{e.tutorRelacion[0]}</p>
                )}
              </div>
            </div>
          )}

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
