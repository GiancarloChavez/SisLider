"use client";

import { useEffect, useActionState, useState, useMemo } from "react";
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
import { cn } from "@/lib/utils";
import {
  createAlumno,
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

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const SELECT_CLASS =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

const ANIO_ACTUAL = new Date().getFullYear();
const ANIOS = Array.from({ length: ANIO_ACTUAL - 1929 }, (_, i) => ANIO_ACTUAL - i);

export function AlumnoDialog({ open, onClose, alumno }: Props) {
  const action = alumno ? updateAlumno.bind(null, alumno.id) : createAlumno;
  const [state, formAction, pending] = useActionState(action, initialState);

  const [tieneApoderado, setTieneApoderado] = useState(true);

  // Date picker state
  const [birthDay, setBirthDay]     = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthYear, setBirthYear]   = useState("");

  // Combined ISO date for hidden input
  const fechaNacimiento =
    birthDay && birthMonth && birthYear
      ? `${birthYear}-${birthMonth.padStart(2, "0")}-${birthDay.padStart(2, "0")}`
      : "";

  // Max days for selected month/year
  const maxDays = useMemo(() => {
    if (!birthMonth || !birthYear) return 31;
    return new Date(Number(birthYear), Number(birthMonth), 0).getDate();
  }, [birthMonth, birthYear]);

  // Reset day if it exceeds the new month's max
  useEffect(() => {
    if (birthDay && Number(birthDay) > maxDays) setBirthDay("");
  }, [maxDays, birthDay]);

  // Initialize / reset state when dialog opens
  useEffect(() => {
    if (!open) return;
    if (!alumno) {
      setTieneApoderado(true);
      setBirthDay("");
      setBirthMonth("");
      setBirthYear("");
    } else if (alumno.fechaNacimiento) {
      const d = new Date(alumno.fechaNacimiento);
      setBirthDay(String(d.getUTCDate()));
      setBirthMonth(String(d.getUTCMonth() + 1));
      setBirthYear(String(d.getUTCFullYear()));
    } else {
      setBirthDay("");
      setBirthMonth("");
      setBirthYear("");
    }
  }, [open, alumno]);

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
          {/* Hidden input with combined fecha */}
          <input type="hidden" name="fechaNacimiento" value={fechaNacimiento} />

          {/* ── Datos del alumno ──────────────────────────────── */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
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
                <Label htmlFor="celular">Celular de contacto</Label>
                <Input
                  id="celular"
                  name="celular"
                  defaultValue={alumno?.celular ?? ""}
                  placeholder="987654321"
                  maxLength={20}
                />
                {e.celular && <p className="text-xs text-destructive">{e.celular[0]}</p>}
              </div>
            </div>

            {/* Date picker — tres selects */}
            <div className="space-y-1.5">
              <Label>Fecha de nacimiento</Label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <select
                    aria-label="Día"
                    className={SELECT_CLASS}
                    value={birthDay}
                    onChange={(e) => setBirthDay(e.target.value)}
                  >
                    <option value="">Día</option>
                    {Array.from({ length: maxDays }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <select
                    aria-label="Mes"
                    className={SELECT_CLASS}
                    value={birthMonth}
                    onChange={(e) => setBirthMonth(e.target.value)}
                  >
                    <option value="">Mes</option>
                    {MESES.map((m, i) => (
                      <option key={i + 1} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <select
                    aria-label="Año"
                    className={SELECT_CLASS}
                    value={birthYear}
                    onChange={(e) => setBirthYear(e.target.value)}
                  >
                    <option value="">Año</option>
                    {ANIOS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
              {e.fechaNacimiento && (
                <p className="text-xs text-destructive">{e.fechaNacimiento[0]}</p>
              )}
            </div>
          </div>

          {/* ── Toggle + sección apoderado ────────────────────── */}
          <div className="border-t border-zinc-100 pt-4 space-y-4">

            {!alumno && (
              <label
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3.5 cursor-pointer transition-colors select-none",
                  tieneApoderado
                    ? "border-zinc-900 bg-zinc-50"
                    : "border-zinc-200 hover:border-zinc-300"
                )}
              >
                <input
                  type="checkbox"
                  name="tieneApoderado"
                  checked={tieneApoderado}
                  onChange={(e) => setTieneApoderado(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-300 accent-zinc-900 shrink-0"
                />
                <div>
                  <p className="text-sm font-medium text-zinc-900 leading-tight">
                    El alumno tiene apoderado
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Actívalo si un padre, madre u otro responsable lo representa.
                    Desactívalo si el alumno es adulto y se matricula por cuenta propia.
                  </p>
                </div>
              </label>
            )}

            {/* Campos del apoderado */}
            {!alumno && tieneApoderado && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Apoderado
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
                    placeholder="Madre, Padre, Tutor legal..."
                  />
                  {e.tutorRelacion && (
                    <p className="text-xs text-destructive">{e.tutorRelacion[0]}</p>
                  )}
                </div>
              </div>
            )}

            {/* Al editar: tutor en modo solo lectura */}
            {alumno && alumno.tutor && (
              <div className="rounded-lg bg-zinc-50 border border-zinc-200 px-4 py-3 space-y-0.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Apoderado registrado
                </p>
                <p className="text-sm font-medium text-zinc-800">
                  {alumno.tutor.apellido}, {alumno.tutor.nombre}
                </p>
                <p className="text-xs text-zinc-500">
                  {alumno.tutor.relacion} · {alumno.tutor.celular}
                </p>
              </div>
            )}

            {alumno && !alumno.tutor && (
              <p className="text-xs text-zinc-400 italic">
                Sin apoderado — alumno autónomo.
              </p>
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
