"use client";

import { useEffect, useActionState, useState, useMemo, useRef } from "react";
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
import { Plus, X } from "lucide-react";
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
  const [showApoderado2, setShowApoderado2] = useState(false);
  const apoderado2Ref = useRef<HTMLDivElement>(null);
  const [handled, setHandled] = useState(false);

  // ── Campos controlados (alumno) ──────────────────────────────
  const [dniVal,      setDniVal]      = useState(alumno?.dni      ?? "");
  const [nombreVal,   setNombreVal]   = useState(alumno?.nombre   ?? "");
  const [apellidoVal, setApellidoVal] = useState(alumno?.apellido ?? "");
  const [dniLoading,  setDniLoading]  = useState(false);
  const [dniOk,       setDniOk]       = useState(false);

  // ── DNI lookup apoderado principal (no se guarda) ────────────
  const [tutorDni,         setTutorDni]         = useState("");
  const [tutorNombreVal,   setTutorNombreVal]   = useState("");
  const [tutorApellidoVal, setTutorApellidoVal] = useState("");
  const [tutorDniLoading,  setTutorDniLoading]  = useState(false);
  const [tutorDniOk,       setTutorDniOk]       = useState(false);

  // ── DNI lookup apoderado adicional (no se guarda) ────────────
  const [tutor2Dni,         setTutor2Dni]         = useState("");
  const [tutor2NombreVal,   setTutor2NombreVal]   = useState("");
  const [tutor2ApellidoVal, setTutor2ApellidoVal] = useState("");
  const [tutor2DniLoading,  setTutor2DniLoading]  = useState(false);
  const [tutor2DniOk,       setTutor2DniOk]       = useState(false);

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

  // ── Autocomplete helper ───────────────────────────────────────
  function useDniAutocomplete(
    dni: string,
    setLoading: (v: boolean) => void,
    setOk: (v: boolean) => void,
    onResult: (nombre: string, apellido: string) => void
  ) {
    useEffect(() => {
      if (!/^\d{8}$/.test(dni)) { setOk(false); return; }
      let cancelled = false;
      setLoading(true);
      fetch(`/api/dni/${dni}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (cancelled) return;
          if (data?.nombre) { onResult(data.nombre, data.apellido); setOk(true); }
        })
        .finally(() => { if (!cancelled) setLoading(false); });
      return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dni]);
  }

  useDniAutocomplete(dniVal,    setDniLoading,    setDniOk,    (n, a) => { setNombreVal(n);   setApellidoVal(a); });
  useDniAutocomplete(tutorDni,  setTutorDniLoading,  setTutorDniOk,  (n, a) => { setTutorNombreVal(n);   setTutorApellidoVal(a); });
  useDniAutocomplete(tutor2Dni, setTutor2DniLoading, setTutor2DniOk, (n, a) => { setTutor2NombreVal(n); setTutor2ApellidoVal(a); });

  // Initialize / reset state when dialog opens
  useEffect(() => {
    if (!open) return;
    if (!alumno) {
      setTieneApoderado(true);
      setShowApoderado2(false);
      setDniVal(""); setNombreVal(""); setApellidoVal(""); setDniOk(false);
      setTutorDni(""); setTutorNombreVal(""); setTutorApellidoVal(""); setTutorDniOk(false);
      setTutor2Dni(""); setTutor2NombreVal(""); setTutor2ApellidoVal(""); setTutor2DniOk(false);
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
    if (state.message === "ok" && !handled) {
      setHandled(true);
      toast.success(alumno ? "Alumno actualizado" : "Alumno registrado");
      onClose();
    }
  }, [state.message, handled, alumno, onClose]);

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

          {/* Error global */}
          {e._ && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {e._[0]}
            </p>
          )}

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
                  value={nombreVal}
                  onChange={e => setNombreVal(e.target.value)}
                  placeholder="Juan"
                />
                {e.nombre && <p className="text-xs text-destructive">{e.nombre[0]}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="apellido">Apellido *</Label>
                <Input
                  id="apellido"
                  name="apellido"
                  value={apellidoVal}
                  onChange={e => setApellidoVal(e.target.value)}
                  placeholder="Pérez"
                />
                {e.apellido && <p className="text-xs text-destructive">{e.apellido[0]}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="dni">DNI</Label>
                <div className="relative">
                  <Input
                    id="dni"
                    name="dni"
                    value={dniVal}
                    onChange={e => { setDniVal(e.target.value); setDniOk(false); }}
                    placeholder="12345678"
                    maxLength={8}
                  />
                  {dniLoading && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 animate-pulse">buscando...</span>
                  )}
                  {dniOk && !dniLoading && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-emerald-500 font-semibold">✓ RENIEC</span>
                  )}
                </div>
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

                {/* DNI lookup apoderado (no se guarda) */}
                <div className="space-y-1">
                  <Label>DNI del apoderado <span className="text-zinc-400 font-normal">(para autocompletar)</span></Label>
                  <div className="relative">
                    <Input
                      value={tutorDni}
                      onChange={e => { setTutorDni(e.target.value); setTutorDniOk(false); }}
                      placeholder="12345678"
                      maxLength={8}
                    />
                    {tutorDniLoading && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 animate-pulse">buscando...</span>
                    )}
                    {tutorDniOk && !tutorDniLoading && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-emerald-500 font-semibold">✓ RENIEC</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="tutorNombre">Nombre *</Label>
                    <Input
                      id="tutorNombre"
                      name="tutorNombre"
                      value={tutorNombreVal}
                      onChange={e => setTutorNombreVal(e.target.value)}
                      placeholder="María"
                    />
                    {e.tutorNombre && (
                      <p className="text-xs text-destructive">{e.tutorNombre[0]}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="tutorApellido">Apellido *</Label>
                    <Input
                      id="tutorApellido"
                      name="tutorApellido"
                      value={tutorApellidoVal}
                      onChange={e => setTutorApellidoVal(e.target.value)}
                      placeholder="Pérez"
                    />
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

                {/* Botón para agregar apoderado adicional */}
                {!showApoderado2 && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowApoderado2(true);
                      setTimeout(() => apoderado2Ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
                    }}
                    className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-700 transition-colors pt-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Agregar apoderado adicional
                  </button>
                )}

                {/* Sección apoderado adicional */}
                {showApoderado2 && (
                  <div ref={apoderado2Ref} className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50/60 p-3.5">
                    <input type="hidden" name="tieneApoderado2" value="on" />
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        Apoderado adicional
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowApoderado2(false)}
                        className="text-zinc-400 hover:text-zinc-700 transition-colors"
                        aria-label="Eliminar apoderado adicional"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* DNI lookup apoderado2 (no se guarda) */}
                    <div className="space-y-1">
                      <Label>DNI del apoderado <span className="text-zinc-400 font-normal">(para autocompletar)</span></Label>
                      <div className="relative">
                        <Input
                          value={tutor2Dni}
                          onChange={e => { setTutor2Dni(e.target.value); setTutor2DniOk(false); }}
                          placeholder="12345678"
                          maxLength={8}
                        />
                        {tutor2DniLoading && (
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 animate-pulse">buscando...</span>
                        )}
                        {tutor2DniOk && !tutor2DniLoading && (
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-emerald-500 font-semibold">✓ RENIEC</span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="tutor2Nombre">Nombre *</Label>
                        <Input
                          id="tutor2Nombre"
                          name="tutor2Nombre"
                          value={tutor2NombreVal}
                          onChange={e => setTutor2NombreVal(e.target.value)}
                          placeholder="Carlos"
                        />
                        {e.tutor2Nombre && <p className="text-xs text-destructive">{e.tutor2Nombre[0]}</p>}
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="tutor2Apellido">Apellido *</Label>
                        <Input
                          id="tutor2Apellido"
                          name="tutor2Apellido"
                          value={tutor2ApellidoVal}
                          onChange={e => setTutor2ApellidoVal(e.target.value)}
                          placeholder="Pérez"
                        />
                        {e.tutor2Apellido && <p className="text-xs text-destructive">{e.tutor2Apellido[0]}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="tutor2Celular">Celular *</Label>
                        <Input id="tutor2Celular" name="tutor2Celular" placeholder="987654321" />
                        {e.tutor2Celular && <p className="text-xs text-destructive">{e.tutor2Celular[0]}</p>}
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="tutor2CelularAdicional">Celular adicional</Label>
                        <Input id="tutor2CelularAdicional" name="tutor2CelularAdicional" placeholder="987654321" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="tutor2Relacion">Relación *</Label>
                      <Input id="tutor2Relacion" name="tutor2Relacion" placeholder="Padre, Abuelo, Tutor legal..." />
                      {e.tutor2Relacion && <p className="text-xs text-destructive">{e.tutor2Relacion[0]}</p>}
                    </div>
                  </div>
                )}
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
