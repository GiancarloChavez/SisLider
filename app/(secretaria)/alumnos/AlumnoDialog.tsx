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

// ─── DNI status types ─────────────────────────────────────────────────────────

type DniStatus = 'idle' | 'loading' | 'found' | 'not_found';

// ─── DNI status indicator ─────────────────────────────────────────────────────

function DniStatusBadge({ status }: { status: DniStatus }) {
  if (status === 'loading') return (
    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 animate-pulse">buscando...</span>
  );
  if (status === 'found') return (
    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-emerald-500 font-semibold">✓ RENIEC</span>
  );
  if (status === 'not_found') return (
    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-red-500 font-semibold">✗</span>
  );
  return null;
}

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
  const [dniStatus,   setDniStatus]   = useState<DniStatus>('idle');

  // ── Toggle "usar DNI" ────────────────────────────────────────
  const [usaDni,       setUsaDni]       = useState(true);
  const [usaTutorDni,  setUsaTutorDni]  = useState(true);
  const [usaTutor2Dni, setUsaTutor2Dni] = useState(true);

  // ── DNI lookup apoderado principal ───────────────────────────
  const [tutorDni,          setTutorDni]          = useState("");
  const [tutorNombreVal,    setTutorNombreVal]    = useState("");
  const [tutorApellidoVal,  setTutorApellidoVal]  = useState("");
  const [tutorDniStatus,    setTutorDniStatus]    = useState<DniStatus>('idle');

  // ── DNI lookup apoderado adicional ───────────────────────────
  const [tutor2Dni,          setTutor2Dni]          = useState("");
  const [tutor2NombreVal,    setTutor2NombreVal]    = useState("");
  const [tutor2ApellidoVal,  setTutor2ApellidoVal]  = useState("");
  const [tutor2DniStatus,    setTutor2DniStatus]    = useState<DniStatus>('idle');

  // Date picker state
  const [birthDay, setBirthDay]     = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthYear, setBirthYear]   = useState("");

  const fechaNacimiento =
    birthDay && birthMonth && birthYear
      ? `${birthYear}-${birthMonth.padStart(2, "0")}-${birthDay.padStart(2, "0")}`
      : "";

  const maxDays = useMemo(() => {
    if (!birthMonth || !birthYear) return 31;
    return new Date(Number(birthYear), Number(birthMonth), 0).getDate();
  }, [birthMonth, birthYear]);

  useEffect(() => {
    if (birthDay && Number(birthDay) > maxDays) setBirthDay("");
  }, [maxDays, birthDay]);

  // ── RENIEC lookup helper ──────────────────────────────────────
  function useDniLookup(
    dni: string,
    enabled: boolean,
    setStatus: (s: DniStatus) => void,
    setNombre: (v: string) => void,
    setApellido: (v: string) => void
  ) {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
      if (!enabled || !/^\d{8}$/.test(dni)) { setStatus('idle'); return; }
      let cancelled = false;
      setStatus('loading');

      fetch(`/api/dni/${dni}`)
        .then(async (r) => {
          if (cancelled) return;
          if (r.ok) {
            const data = await r.json();
            if (!cancelled) {
              if (data?.nombre) {
                setNombre(data.nombre);
                setApellido(data.apellido ?? '');
                setStatus('found');
              } else {
                setStatus('not_found');
              }
            }
          } else if (!cancelled) {
            setStatus('not_found');
          }
        })
        .catch(() => { if (!cancelled) setStatus('not_found'); });

      return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dni, enabled]);
  }

  useDniLookup(dniVal,    usaDni,       setDniStatus,      setNombreVal,      setApellidoVal);
  useDniLookup(tutorDni,  usaTutorDni,  setTutorDniStatus,  setTutorNombreVal,  setTutorApellidoVal);
  useDniLookup(tutor2Dni, usaTutor2Dni, setTutor2DniStatus, setTutor2NombreVal, setTutor2ApellidoVal);

  // Initialize / reset state when dialog opens
  useEffect(() => {
    if (!open) return;
    if (!alumno) {
      setTieneApoderado(true);
      setShowApoderado2(false);
      setDniVal(""); setNombreVal(""); setApellidoVal(""); setDniStatus('idle'); setUsaDni(true);
      setTutorDni(""); setTutorNombreVal(""); setTutorApellidoVal(""); setTutorDniStatus('idle'); setUsaTutorDni(true);
      setTutor2Dni(""); setTutor2NombreVal(""); setTutor2ApellidoVal(""); setTutor2DniStatus('idle'); setUsaTutor2Dni(true);
      setBirthDay(""); setBirthMonth(""); setBirthYear("");
    } else if (alumno.fechaNacimiento) {
      const d = new Date(alumno.fechaNacimiento);
      setBirthDay(String(d.getUTCDate()));
      setBirthMonth(String(d.getUTCMonth() + 1));
      setBirthYear(String(d.getUTCFullYear()));
    } else {
      setBirthDay(""); setBirthMonth(""); setBirthYear("");
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

  // nombre/apellido del alumno son readonly cuando DNI está activo y no falló
  const alumnoReadOnly = usaDni && dniStatus !== 'not_found' && dniStatus !== 'idle';
  const tutorReadOnly  = usaTutorDni && tutorDniStatus !== 'not_found' && tutorDniStatus !== 'idle';
  const tutor2ReadOnly = usaTutor2Dni && tutor2DniStatus !== 'not_found' && tutor2DniStatus !== 'idle';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{alumno ? "Editar alumno" : "Nuevo alumno"}</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="space-y-5">
          <input type="hidden" name="fechaNacimiento" value={fechaNacimiento} />

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

            {/* DNI */}
            <div className="space-y-1">
              <Label htmlFor="dni">DNI</Label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    id="dni"
                    name="dni"
                    value={dniVal}
                    onChange={ev => {
                      setDniVal(ev.target.value);
                      setDniStatus('idle');
                      setNombreVal('');
                      setApellidoVal('');
                    }}
                    placeholder="12345678"
                    maxLength={8}
                    disabled={!usaDni}
                    className={cn(!usaDni && "opacity-40")}
                  />
                  <DniStatusBadge status={usaDni ? dniStatus : 'idle'} />
                </div>
                <input
                  type="checkbox"
                  checked={usaDni}
                  onChange={ev => {
                    setUsaDni(ev.target.checked);
                    if (!ev.target.checked) { setDniVal(""); setDniStatus('idle'); setNombreVal(''); setApellidoVal(''); }
                  }}
                  title="Buscar por DNI"
                  className="h-4 w-4 rounded border-zinc-300 accent-zinc-900 shrink-0 cursor-pointer"
                />
              </div>
              {usaDni && dniStatus === 'not_found' && (
                <p className="text-xs text-amber-600">No encontrado en RENIEC. Ingresa el nombre manualmente.</p>
              )}
              {e.dni && <p className="text-xs text-destructive">{e.dni[0]}</p>}
            </div>

            {/* Nombre / Apellido */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  name="nombre"
                  value={nombreVal}
                  onChange={ev => setNombreVal(ev.target.value)}
                  readOnly={alumnoReadOnly}
                  className={cn(alumnoReadOnly && "bg-zinc-50 text-zinc-600 cursor-default")}
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
                  onChange={ev => setApellidoVal(ev.target.value)}
                  readOnly={alumnoReadOnly}
                  className={cn(alumnoReadOnly && "bg-zinc-50 text-zinc-600 cursor-default")}
                  placeholder="Pérez"
                />
                {e.apellido && <p className="text-xs text-destructive">{e.apellido[0]}</p>}
              </div>
            </div>

            {/* Celular */}
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

            {/* Fecha de nacimiento */}
            <div className="space-y-1.5">
              <Label>Fecha de nacimiento</Label>
              <div className="grid grid-cols-3 gap-2">
                <select aria-label="Día" className={SELECT_CLASS} value={birthDay} onChange={ev => setBirthDay(ev.target.value)}>
                  <option value="">Día</option>
                  {Array.from({ length: maxDays }, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <select aria-label="Mes" className={SELECT_CLASS} value={birthMonth} onChange={ev => setBirthMonth(ev.target.value)}>
                  <option value="">Mes</option>
                  {MESES.map((m, i) => (
                    <option key={i + 1} value={i + 1}>{m}</option>
                  ))}
                </select>
                <select aria-label="Año" className={SELECT_CLASS} value={birthYear} onChange={ev => setBirthYear(ev.target.value)}>
                  <option value="">Año</option>
                  {ANIOS.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              {e.fechaNacimiento && (
                <p className="text-xs text-destructive">{e.fechaNacimiento[0]}</p>
              )}
            </div>
          </div>

          {/* ── Toggle + sección apoderado ────────────────────── */}
          <div className="border-t border-zinc-100 pt-4 space-y-4">

            {!alumno && (
              <label className={cn(
                "flex items-start gap-3 rounded-lg border p-3.5 cursor-pointer transition-colors select-none",
                tieneApoderado ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 hover:border-zinc-300"
              )}>
                <input
                  type="checkbox"
                  name="tieneApoderado"
                  checked={tieneApoderado}
                  onChange={ev => setTieneApoderado(ev.target.checked)}
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

            {!alumno && tieneApoderado && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Apoderado
                </p>

                {/* DNI apoderado */}
                <div className="space-y-1">
                  <Label>DNI del apoderado</Label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Input
                        value={tutorDni}
                        onChange={ev => {
                          setTutorDni(ev.target.value);
                          setTutorDniStatus('idle');
                          setTutorNombreVal('');
                          setTutorApellidoVal('');
                        }}
                        placeholder="12345678"
                        maxLength={8}
                        disabled={!usaTutorDni}
                        className={cn(!usaTutorDni && "opacity-40")}
                      />
                      <DniStatusBadge status={usaTutorDni ? tutorDniStatus : 'idle'} />
                    </div>
                    <input
                      type="checkbox"
                      checked={usaTutorDni}
                      onChange={ev => {
                        setUsaTutorDni(ev.target.checked);
                        if (!ev.target.checked) { setTutorDni(""); setTutorDniStatus('idle'); setTutorNombreVal(''); setTutorApellidoVal(''); }
                      }}
                      title="Buscar por DNI"
                      className="h-4 w-4 rounded border-zinc-300 accent-zinc-900 shrink-0 cursor-pointer"
                    />
                  </div>
                  {usaTutorDni && tutorDniStatus === 'not_found' && (
                    <p className="text-xs text-amber-600">No encontrado en RENIEC. Ingresa el nombre manualmente.</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="tutorNombre">Nombre *</Label>
                    <Input
                      id="tutorNombre"
                      name="tutorNombre"
                      value={tutorNombreVal}
                      onChange={ev => setTutorNombreVal(ev.target.value)}
                      readOnly={tutorReadOnly}
                      className={cn(tutorReadOnly && "bg-zinc-50 text-zinc-600 cursor-default")}
                      placeholder="María"
                    />
                    {e.tutorNombre && <p className="text-xs text-destructive">{e.tutorNombre[0]}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="tutorApellido">Apellido *</Label>
                    <Input
                      id="tutorApellido"
                      name="tutorApellido"
                      value={tutorApellidoVal}
                      onChange={ev => setTutorApellidoVal(ev.target.value)}
                      readOnly={tutorReadOnly}
                      className={cn(tutorReadOnly && "bg-zinc-50 text-zinc-600 cursor-default")}
                      placeholder="Pérez"
                    />
                    {e.tutorApellido && <p className="text-xs text-destructive">{e.tutorApellido[0]}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="tutorCelular">Celular *</Label>
                    <Input id="tutorCelular" name="tutorCelular" placeholder="987654321" />
                    {e.tutorCelular && <p className="text-xs text-destructive">{e.tutorCelular[0]}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="tutorCelularAdicional">Celular adicional</Label>
                    <Input id="tutorCelularAdicional" name="tutorCelularAdicional" placeholder="987654321" />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="tutorRelacion">Relación *</Label>
                  <Input id="tutorRelacion" name="tutorRelacion" placeholder="Madre, Padre, Tutor legal..." />
                  {e.tutorRelacion && <p className="text-xs text-destructive">{e.tutorRelacion[0]}</p>}
                </div>

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

                    {/* DNI apoderado2 */}
                    <div className="space-y-1">
                      <Label>DNI del apoderado</Label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Input
                            value={tutor2Dni}
                            onChange={ev => {
                              setTutor2Dni(ev.target.value);
                              setTutor2DniStatus('idle');
                              setTutor2NombreVal('');
                              setTutor2ApellidoVal('');
                            }}
                            placeholder="12345678"
                            maxLength={8}
                            disabled={!usaTutor2Dni}
                            className={cn(!usaTutor2Dni && "opacity-40")}
                          />
                          <DniStatusBadge status={usaTutor2Dni ? tutor2DniStatus : 'idle'} />
                        </div>
                        <input
                          type="checkbox"
                          checked={usaTutor2Dni}
                          onChange={ev => {
                            setUsaTutor2Dni(ev.target.checked);
                            if (!ev.target.checked) { setTutor2Dni(""); setTutor2DniStatus('idle'); setTutor2NombreVal(''); setTutor2ApellidoVal(''); }
                          }}
                          title="Buscar por DNI"
                          className="h-4 w-4 rounded border-zinc-300 accent-zinc-900 shrink-0 cursor-pointer"
                        />
                      </div>
                      {usaTutor2Dni && tutor2DniStatus === 'not_found' && (
                        <p className="text-xs text-amber-600">No encontrado en RENIEC. Ingresa el nombre manualmente.</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="tutor2Nombre">Nombre *</Label>
                        <Input
                          id="tutor2Nombre"
                          name="tutor2Nombre"
                          value={tutor2NombreVal}
                          onChange={ev => setTutor2NombreVal(ev.target.value)}
                          readOnly={tutor2ReadOnly}
                          className={cn(tutor2ReadOnly && "bg-zinc-50 text-zinc-600 cursor-default")}
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
                          onChange={ev => setTutor2ApellidoVal(ev.target.value)}
                          readOnly={tutor2ReadOnly}
                          className={cn(tutor2ReadOnly && "bg-zinc-50 text-zinc-600 cursor-default")}
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
