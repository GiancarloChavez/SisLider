"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Search, CheckCircle2, Users, X, Clock, ChevronRight, ChevronLeft,
  UserPlus, UserSearch, Plus, Banknote, CreditCard, Smartphone, Wallet,
} from "lucide-react";
import {
  buscarAlumnos,
  createMatriculaConPago,
  type AlumnoSearchResult,
  type HorarioConCupo,
  type DescuentoOption,
  type NuevoAlumnoData,
} from "@/lib/actions/matriculas";

// ─── Constants ────────────────────────────────────────────────────────────────

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const SELECT_CLASS =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
const ANIO_ACTUAL = new Date().getFullYear();
const ANIOS = Array.from({ length: ANIO_ACTUAL - 1929 }, (_, i) => ANIO_ACTUAL - i);
const DIA_ORDER = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const DIA_ABREV: Record<string, string> = {
  Lunes: "Lu", Martes: "Ma", Miércoles: "Mi",
  Jueves: "Ju", Viernes: "Vi", Sábado: "Sa", Domingo: "Do",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type NuevoForm = {
  nombre: string; apellido: string; dni: string; celular: string;
  birthDay: string; birthMonth: string; birthYear: string;
  tieneApoderado: boolean;
  tutorNombre: string; tutorApellido: string; tutorCelular: string;
  tutorCelularAdicional: string; tutorRelacion: string;
  tieneApoderado2: boolean;
  tutor2Nombre: string; tutor2Apellido: string; tutor2Celular: string;
  tutor2CelularAdicional: string; tutor2Relacion: string;
};

type Props = { horarios: HorarioConCupo[]; descuentos: DescuentoOption[] };

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: number }) {
  const steps = ["Alumno", "Horario", "Pago"];
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const active = n === step;
        return (
          <div key={label} className="flex items-center">
            <div className="flex items-center gap-2">
              <span className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shrink-0 transition-colors",
                done ? "bg-zinc-900 text-white" : active ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-400"
              )}>
                {done ? <CheckCircle2 className="h-4 w-4" /> : n}
              </span>
              <span className={cn(
                "text-sm font-medium transition-colors",
                active ? "text-zinc-900" : done ? "text-zinc-500" : "text-zinc-300"
              )}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn(
                "mx-3 h-px w-10 transition-colors",
                n < step ? "bg-zinc-900" : "bg-zinc-200"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

export function NuevaMatriculaForm({ horarios, descuentos }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // ── DNI autocomplete helper ──
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

  // ── Step 1: alumno ──
  const [alumnoTab, setAlumnoTab] = useState<"buscar" | "nuevo">("buscar");

  // Search mode
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AlumnoSearchResult[]>([]);
  const [searching, startSearch] = useTransition();
  const [noResults, setNoResults] = useState(false);
  const [alumnoSel, setAlumnoSel] = useState<AlumnoSearchResult | null>(null);

  // New alumno form
  const [nuevo, setNuevo] = useState<NuevoForm>({
    nombre: "", apellido: "", dni: "", celular: "",
    birthDay: "", birthMonth: "", birthYear: "",
    tieneApoderado: true,
    tutorNombre: "", tutorApellido: "", tutorCelular: "",
    tutorCelularAdicional: "", tutorRelacion: "",
    tieneApoderado2: false,
    tutor2Nombre: "", tutor2Apellido: "", tutor2Celular: "",
    tutor2CelularAdicional: "", tutor2Relacion: "",
  });
  const [step1Errors, setStep1Errors] = useState<Record<string, string>>({});

  // DNI autocomplete states (wizard)
  const [dniLoading,       setDniLoading]       = useState(false);
  const [dniOk,            setDniOk]            = useState(false);
  const [usaDni,           setUsaDni]           = useState(true);
  const [tutorDniLookup,   setTutorDniLookup]   = useState("");
  const [tutorDniLoading,  setTutorDniLoading]  = useState(false);
  const [tutorDniOk,       setTutorDniOk]       = useState(false);
  const [usaTutorDni,      setUsaTutorDni]      = useState(true);
  const [tutor2DniLookup,  setTutor2DniLookup]  = useState("");
  const [tutor2DniLoading, setTutor2DniLoading] = useState(false);
  const [tutor2DniOk,      setTutor2DniOk]      = useState(false);
  const [usaTutor2Dni,     setUsaTutor2Dni]     = useState(true);

  useDniAutocomplete(nuevo.dni,       setDniLoading,       setDniOk,       (n, a) => { setN("nombre", n); setN("apellido", a); });
  useDniAutocomplete(tutorDniLookup,  setTutorDniLoading,  setTutorDniOk,  (n, a) => { setN("tutorNombre", n); setN("tutorApellido", a); });
  useDniAutocomplete(tutor2DniLookup, setTutor2DniLoading, setTutor2DniOk, (n, a) => { setN("tutor2Nombre", n); setN("tutor2Apellido", a); });

  // ── Step 2: horario ──
  const [horarioSel, setHorarioSel] = useState<HorarioConCupo | null>(null);
  const [dias, setDias] = useState<string[]>([]);
  const [step2Error, setStep2Error] = useState("");

  // ── Step 3: pago ──
  const [descuentoId, setDescuentoId] = useState("");
  const [montoStr, setMontoStr] = useState("");
  const [metodoPago, setMetodoPago] = useState<"efectivo" | "transferencia" | "yape" | "plin">("efectivo");
  const [pagoCompleto, setPagoCompleto] = useState(true);
  const [submitErrors, setSubmitErrors] = useState<Record<string, string[]>>({});
  const [isPending, startTransition] = useTransition();

  // Date picker max days
  const maxDays = useMemo(() => {
    if (!nuevo.birthMonth || !nuevo.birthYear) return 31;
    return new Date(Number(nuevo.birthYear), Number(nuevo.birthMonth), 0).getDate();
  }, [nuevo.birthMonth, nuevo.birthYear]);

  useEffect(() => {
    if (nuevo.birthDay && Number(nuevo.birthDay) > maxDays) {
      setNuevo(p => ({ ...p, birthDay: "" }));
    }
  }, [maxDays, nuevo.birthDay]);

  // Live search
  useEffect(() => {
    if (alumnoSel || alumnoTab !== "buscar") return;
    const q = query.trim();
    if (q.length < 2) { setResults([]); setNoResults(false); return; }
    const t = setTimeout(() => {
      startSearch(async () => {
        const res = await buscarAlumnos(q);
        setResults(res);
        setNoResults(res.length === 0);
      });
    }, 300);
    return () => clearTimeout(t);
  }, [query, alumnoSel, alumnoTab]);

  // Sync pago completo → monto
  const precioBase = horarioSel?.precioMensual ?? 0;
  const descuentoSel = descuentos.find(d => d.id === descuentoId);
  const descuentoImporte = descuentoSel
    ? descuentoSel.tipo === "porcentaje"
      ? precioBase * (descuentoSel.valor / 100)
      : Math.min(descuentoSel.valor, precioBase)
    : 0;
  const precioFinal = precioBase - descuentoImporte;

  useEffect(() => {
    if (pagoCompleto) setMontoStr(precioFinal > 0 ? precioFinal.toFixed(2) : "");
  }, [pagoCompleto, precioFinal]);

  // ── Helpers ──

  function setN<K extends keyof NuevoForm>(k: K, v: NuevoForm[K]) {
    setNuevo(p => ({ ...p, [k]: v }));
  }

  function selectAlumno(a: AlumnoSearchResult) {
    setAlumnoSel(a); setResults([]); setQuery("");
  }

  function clearAlumno() {
    setAlumnoSel(null); setResults([]); setNoResults(false); setQuery("");
  }

  function toggleDia(dia: string) {
    setDias(p => p.includes(dia) ? p.filter(d => d !== dia) : [...p, dia]);
  }

  function selectHorario(h: HorarioConCupo) {
    setHorarioSel(h);
    setDias([...h.dias].sort((a, b) => DIA_ORDER.indexOf(a) - DIA_ORDER.indexOf(b)));
    setDescuentoId("");
    setPagoCompleto(true);
  }

  // ── Step validation ──

  function validateStep1(): boolean {
    const errors: Record<string, string> = {};
    if (alumnoTab === "buscar") {
      if (!alumnoSel) errors.alumno = "Selecciona un alumno de la búsqueda";
    } else {
      if (!nuevo.nombre.trim()) errors.nombre = "Nombre requerido";
      if (!nuevo.apellido.trim()) errors.apellido = "Apellido requerido";
      if (nuevo.dni && !/^\d{8}$/.test(nuevo.dni)) errors.dni = "El DNI debe tener 8 dígitos";
      if (nuevo.tieneApoderado) {
        if (!nuevo.tutorNombre.trim()) errors.tutorNombre = "Nombre del apoderado requerido";
        if (!nuevo.tutorApellido.trim()) errors.tutorApellido = "Apellido del apoderado requerido";
        if (!nuevo.tutorCelular.trim()) errors.tutorCelular = "Celular del apoderado requerido";
        if (!nuevo.tutorRelacion.trim()) errors.tutorRelacion = "Relación requerida";
      }
      if (nuevo.tieneApoderado && nuevo.tieneApoderado2) {
        if (!nuevo.tutor2Nombre.trim()) errors.tutor2Nombre = "Nombre del apoderado adicional requerido";
        if (!nuevo.tutor2Apellido.trim()) errors.tutor2Apellido = "Apellido del apoderado adicional requerido";
        if (!nuevo.tutor2Celular.trim()) errors.tutor2Celular = "Celular del apoderado adicional requerido";
        if (!nuevo.tutor2Relacion.trim()) errors.tutor2Relacion = "Relación requerida";
      }
    }
    setStep1Errors(errors);
    return Object.keys(errors).length === 0;
  }

  function validateStep2(): boolean {
    if (!horarioSel) { setStep2Error("Selecciona un horario"); return false; }
    if (dias.length === 0) { setStep2Error("Selecciona al menos un día de asistencia"); return false; }
    setStep2Error("");
    return true;
  }

  function goNext() {
    if (step === 1 && validateStep1()) setStep(2);
    if (step === 2 && validateStep2()) { setStep(3); setPagoCompleto(true); }
  }

  function goBack() {
    setSubmitErrors({});
    setStep(s => s - 1);
  }

  // ── Submit ──

  async function handleSubmit() {
    const monto = parseFloat(montoStr);
    if (isNaN(monto) || monto <= 0) {
      setSubmitErrors({ montoAbono: ["Ingresa un monto válido mayor a 0"] });
      return;
    }

    const fechaNacimiento =
      nuevo.birthDay && nuevo.birthMonth && nuevo.birthYear
        ? `${nuevo.birthYear}-${nuevo.birthMonth.padStart(2, "0")}-${nuevo.birthDay.padStart(2, "0")}`
        : undefined;

    const nuevoAlumnoData: NuevoAlumnoData | undefined =
      alumnoTab === "nuevo"
        ? {
            nombre: nuevo.nombre.trim(),
            apellido: nuevo.apellido.trim(),
            dni: nuevo.dni.trim() || undefined,
            celular: nuevo.celular.trim() || undefined,
            fechaNacimiento,
            tieneApoderado: nuevo.tieneApoderado,
            tutor: nuevo.tieneApoderado
              ? {
                  nombre: nuevo.tutorNombre.trim(),
                  apellido: nuevo.tutorApellido.trim(),
                  celular: nuevo.tutorCelular.trim(),
                  celularAdicional: nuevo.tutorCelularAdicional.trim() || undefined,
                  relacion: nuevo.tutorRelacion.trim(),
                }
              : undefined,
            tutorAdicional: nuevo.tieneApoderado && nuevo.tieneApoderado2 && nuevo.tutor2Nombre.trim()
              ? {
                  nombre: nuevo.tutor2Nombre.trim(),
                  apellido: nuevo.tutor2Apellido.trim(),
                  celular: nuevo.tutor2Celular.trim(),
                  celularAdicional: nuevo.tutor2CelularAdicional.trim() || undefined,
                  relacion: nuevo.tutor2Relacion.trim(),
                }
              : undefined,
          }
        : undefined;

    startTransition(async () => {
      const result = await createMatriculaConPago({
        alumnoId: alumnoTab === "buscar" ? alumnoSel!.id : undefined,
        nuevoAlumno: nuevoAlumnoData,
        idHorario: horarioSel!.id,
        dias,
        idDescuento: descuentoId || undefined,
        montoAbono: monto,
        metodoPago,
      });

      if (result.errors) {
        setSubmitErrors(result.errors);
        // Si el error es del alumno o DNI, volver al paso 1
        if (result.errors.dni || result.errors.nombre || result.errors.alumno) setStep(1);
        // Si el error es del horario, volver al paso 2
        if (result.errors.idHorario) setStep(2);
      } else {
        toast.success("Matrícula registrada correctamente");
        router.push("/matriculas");
      }
    });
  }

  // ── Render ──

  return (
    <div>
      <StepIndicator step={step} />

      {/* ── STEP 1: ALUMNO ──────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-5">
          {/* Tab selector */}
          <div className="flex rounded-lg border border-zinc-200 p-1 bg-zinc-50 gap-1 w-fit">
            <button
              type="button"
              onClick={() => { setAlumnoTab("buscar"); setStep1Errors({}); }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                alumnoTab === "buscar"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              <UserSearch className="h-4 w-4" />
              Alumno existente
            </button>
            <button
              type="button"
              onClick={() => { setAlumnoTab("nuevo"); setStep1Errors({}); }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                alumnoTab === "nuevo"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              <UserPlus className="h-4 w-4" />
              Nuevo alumno
            </button>
          </div>

          {/* ── Buscar existente ── */}
          {alumnoTab === "buscar" && (
            <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4">
              {alumnoSel ? (
                <div className="flex items-center justify-between rounded-lg bg-zinc-50 border border-zinc-200 px-4 py-3">
                  <div>
                    <p className="font-semibold text-zinc-900">{alumnoSel.apellido}, {alumnoSel.nombre}</p>
                    {alumnoSel.dni && <p className="text-xs font-mono text-zinc-400">DNI {alumnoSel.dni}</p>}
                    {!alumnoSel.habilitado && (
                      <p className="text-xs text-amber-600 mt-0.5">Sin habilitar · tiene pagos pendientes</p>
                    )}
                  </div>
                  <Button type="button" size="icon-sm" variant="ghost" onClick={clearAlumno}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Buscar por nombre o DNI</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                    <Input
                      placeholder="Escribe al menos 2 caracteres..."
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {searching && <p className="text-xs text-zinc-400 px-1">Buscando...</p>}
                  {results.length > 0 && (
                    <ul className="rounded-lg border border-zinc-200 divide-y divide-zinc-100 overflow-hidden">
                      {results.map(a => (
                        <li key={a.id}>
                          <button
                            type="button"
                            onClick={() => selectAlumno(a)}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-zinc-50 transition-colors flex items-center justify-between"
                          >
                            <span className="font-medium text-zinc-900">{a.apellido}, {a.nombre}</span>
                            <span className="text-zinc-400 font-mono text-xs">{a.dni ?? "sin DNI"}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {noResults && !searching && (
                    <p className="text-xs text-zinc-400 px-1">
                      Sin resultados. Prueba con el tab &quot;Nuevo alumno&quot; para registrarlo.
                    </p>
                  )}
                  {step1Errors.alumno && (
                    <p className="text-xs text-destructive">{step1Errors.alumno}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Nuevo alumno inline ── */}
          {alumnoTab === "nuevo" && (
            <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-5">

              {/* Datos del alumno */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Datos del alumno</p>

                {/* DNI — primer campo */}
                <div className="space-y-1">
                  <Label>DNI</Label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Input
                        value={nuevo.dni}
                        onChange={e => { setN("dni", e.target.value); setDniOk(false); }}
                        placeholder="12345678"
                        maxLength={8}
                        disabled={!usaDni}
                        className={cn(!usaDni && "opacity-40")}
                      />
                      {dniLoading && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 animate-pulse">buscando...</span>}
                      {dniOk && !dniLoading && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-emerald-500 font-semibold">✓ RENIEC</span>}
                    </div>
                    <input
                      type="checkbox"
                      checked={usaDni}
                      onChange={e => {
                        setUsaDni(e.target.checked);
                        if (!e.target.checked) { setN("dni", ""); setDniOk(false); }
                      }}
                      title="Buscar por DNI"
                      className="h-4 w-4 rounded border-zinc-300 accent-zinc-900 shrink-0 cursor-pointer"
                    />
                  </div>
                  {step1Errors.dni && <p className="text-xs text-destructive">{step1Errors.dni}</p>}
                </div>

                {/* Nombre / Apellido — readonly si autocomplete activo */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Nombre *</Label>
                    <Input
                      value={nuevo.nombre}
                      onChange={e => setN("nombre", e.target.value)}
                      readOnly={dniOk && usaDni}
                      className={cn(dniOk && usaDni && "bg-zinc-50 text-zinc-600 cursor-default")}
                      placeholder="Juan"
                    />
                    {step1Errors.nombre && <p className="text-xs text-destructive">{step1Errors.nombre}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label>Apellido *</Label>
                    <Input
                      value={nuevo.apellido}
                      onChange={e => setN("apellido", e.target.value)}
                      readOnly={dniOk && usaDni}
                      className={cn(dniOk && usaDni && "bg-zinc-50 text-zinc-600 cursor-default")}
                      placeholder="Pérez"
                    />
                    {step1Errors.apellido && <p className="text-xs text-destructive">{step1Errors.apellido}</p>}
                  </div>
                </div>

                {/* Celular */}
                <div className="space-y-1">
                  <Label>Celular</Label>
                  <Input
                    value={nuevo.celular}
                    onChange={e => setN("celular", e.target.value)}
                    placeholder="987654321"
                    maxLength={20}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Fecha de nacimiento</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <select aria-label="Día" className={SELECT_CLASS} value={nuevo.birthDay}
                      onChange={e => setN("birthDay", e.target.value)}>
                      <option value="">Día</option>
                      {Array.from({ length: maxDays }, (_, i) => i + 1).map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <select aria-label="Mes" className={SELECT_CLASS} value={nuevo.birthMonth}
                      onChange={e => setN("birthMonth", e.target.value)}>
                      <option value="">Mes</option>
                      {MESES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                    </select>
                    <select aria-label="Año" className={SELECT_CLASS} value={nuevo.birthYear}
                      onChange={e => setN("birthYear", e.target.value)}>
                      <option value="">Año</option>
                      {ANIOS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Apoderado toggle */}
              <div className="border-t border-zinc-100 pt-4 space-y-3">
                <label className={cn(
                  "flex items-start gap-3 rounded-lg border p-3.5 cursor-pointer transition-colors select-none",
                  nuevo.tieneApoderado ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 hover:border-zinc-300"
                )}>
                  <input
                    type="checkbox"
                    checked={nuevo.tieneApoderado}
                    onChange={e => setN("tieneApoderado", e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-zinc-300 accent-zinc-900 shrink-0"
                  />
                  <div>
                    <p className="text-sm font-medium text-zinc-900 leading-tight">El alumno tiene apoderado</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Desactívalo si el alumno es adulto y se matricula por cuenta propia.
                    </p>
                  </div>
                </label>

                {nuevo.tieneApoderado && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Apoderado</p>

                    {/* DNI del apoderado con checkbox */}
                    <div className="space-y-1">
                      <Label>DNI del apoderado</Label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Input
                            value={tutorDniLookup}
                            onChange={e => { setTutorDniLookup(e.target.value); setTutorDniOk(false); }}
                            placeholder="12345678"
                            maxLength={8}
                            disabled={!usaTutorDni}
                            className={cn(!usaTutorDni && "opacity-40")}
                          />
                          {tutorDniLoading && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 animate-pulse">buscando...</span>}
                          {tutorDniOk && !tutorDniLoading && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-emerald-500 font-semibold">✓ RENIEC</span>}
                        </div>
                        <input
                          type="checkbox"
                          checked={usaTutorDni}
                          onChange={e => {
                            setUsaTutorDni(e.target.checked);
                            if (!e.target.checked) { setTutorDniLookup(""); setTutorDniOk(false); }
                          }}
                          title="Buscar por DNI"
                          className="h-4 w-4 rounded border-zinc-300 accent-zinc-900 shrink-0 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Nombre *</Label>
                        <Input
                          value={nuevo.tutorNombre}
                          onChange={e => setN("tutorNombre", e.target.value)}
                          readOnly={tutorDniOk && usaTutorDni}
                          className={cn(tutorDniOk && usaTutorDni && "bg-zinc-50 text-zinc-600 cursor-default")}
                          placeholder="María"
                        />
                        {step1Errors.tutorNombre && <p className="text-xs text-destructive">{step1Errors.tutorNombre}</p>}
                      </div>
                      <div className="space-y-1">
                        <Label>Apellido *</Label>
                        <Input
                          value={nuevo.tutorApellido}
                          onChange={e => setN("tutorApellido", e.target.value)}
                          readOnly={tutorDniOk && usaTutorDni}
                          className={cn(tutorDniOk && usaTutorDni && "bg-zinc-50 text-zinc-600 cursor-default")}
                          placeholder="Pérez"
                        />
                        {step1Errors.tutorApellido && <p className="text-xs text-destructive">{step1Errors.tutorApellido}</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Celular *</Label>
                        <Input value={nuevo.tutorCelular} onChange={e => setN("tutorCelular", e.target.value)} placeholder="987654321" />
                        {step1Errors.tutorCelular && <p className="text-xs text-destructive">{step1Errors.tutorCelular}</p>}
                      </div>
                      <div className="space-y-1">
                        <Label>Celular adicional</Label>
                        <Input value={nuevo.tutorCelularAdicional} onChange={e => setN("tutorCelularAdicional", e.target.value)} placeholder="987654321" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label>Relación *</Label>
                      <Input value={nuevo.tutorRelacion} onChange={e => setN("tutorRelacion", e.target.value)} placeholder="Madre, Padre, Tutor legal..." />
                      {step1Errors.tutorRelacion && <p className="text-xs text-destructive">{step1Errors.tutorRelacion}</p>}
                    </div>

                    {/* Botón apoderado adicional */}
                    {!nuevo.tieneApoderado2 && (
                      <button
                        type="button"
                        onClick={() => setN("tieneApoderado2", true)}
                        className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-700 transition-colors pt-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Agregar apoderado adicional
                      </button>
                    )}

                    {/* Sección apoderado adicional */}
                    {nuevo.tieneApoderado2 && (
                      <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50/60 p-3.5">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                            Apoderado adicional
                          </p>
                          <button
                            type="button"
                            onClick={() => setN("tieneApoderado2", false)}
                            className="text-zinc-400 hover:text-zinc-700 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        {/* DNI apoderado2 con checkbox */}
                        <div className="space-y-1">
                          <Label>DNI del apoderado</Label>
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <Input
                                value={tutor2DniLookup}
                                onChange={e => { setTutor2DniLookup(e.target.value); setTutor2DniOk(false); }}
                                placeholder="12345678"
                                maxLength={8}
                                disabled={!usaTutor2Dni}
                                className={cn(!usaTutor2Dni && "opacity-40")}
                              />
                              {tutor2DniLoading && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 animate-pulse">buscando...</span>}
                              {tutor2DniOk && !tutor2DniLoading && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-emerald-500 font-semibold">✓ RENIEC</span>}
                            </div>
                            <input
                              type="checkbox"
                              checked={usaTutor2Dni}
                              onChange={e => {
                                setUsaTutor2Dni(e.target.checked);
                                if (!e.target.checked) { setTutor2DniLookup(""); setTutor2DniOk(false); }
                              }}
                              title="Buscar por DNI"
                              className="h-4 w-4 rounded border-zinc-300 accent-zinc-900 shrink-0 cursor-pointer"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label>Nombre *</Label>
                            <Input
                              value={nuevo.tutor2Nombre}
                              onChange={e => setN("tutor2Nombre", e.target.value)}
                              readOnly={tutor2DniOk && usaTutor2Dni}
                              className={cn(tutor2DniOk && usaTutor2Dni && "bg-zinc-50 text-zinc-600 cursor-default")}
                              placeholder="Carlos"
                            />
                            {step1Errors.tutor2Nombre && <p className="text-xs text-destructive">{step1Errors.tutor2Nombre}</p>}
                          </div>
                          <div className="space-y-1">
                            <Label>Apellido *</Label>
                            <Input
                              value={nuevo.tutor2Apellido}
                              onChange={e => setN("tutor2Apellido", e.target.value)}
                              readOnly={tutor2DniOk && usaTutor2Dni}
                              className={cn(tutor2DniOk && usaTutor2Dni && "bg-zinc-50 text-zinc-600 cursor-default")}
                              placeholder="Pérez"
                            />
                            {step1Errors.tutor2Apellido && <p className="text-xs text-destructive">{step1Errors.tutor2Apellido}</p>}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label>Celular *</Label>
                            <Input value={nuevo.tutor2Celular} onChange={e => setN("tutor2Celular", e.target.value)} placeholder="987654321" />
                            {step1Errors.tutor2Celular && <p className="text-xs text-destructive">{step1Errors.tutor2Celular}</p>}
                          </div>
                          <div className="space-y-1">
                            <Label>Celular adicional</Label>
                            <Input value={nuevo.tutor2CelularAdicional} onChange={e => setN("tutor2CelularAdicional", e.target.value)} placeholder="987654321" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label>Relación *</Label>
                          <Input value={nuevo.tutor2Relacion} onChange={e => setN("tutor2Relacion", e.target.value)} placeholder="Padre, Abuelo, Tutor legal..." />
                          {step1Errors.tutor2Relacion && <p className="text-xs text-destructive">{step1Errors.tutor2Relacion}</p>}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {submitErrors.dni && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{submitErrors.dni[0]}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: HORARIO ─────────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          {step2Error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{step2Error}</p>
          )}
          {submitErrors.idHorario && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{submitErrors.idHorario[0]}</p>
          )}

          {horarios.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
              <p className="text-sm text-zinc-400">No hay horarios activos. Crea uno primero en Horarios.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {horarios.map(h => {
                const libre = h.aula.capacidad - h.cupoOcupado;
                const disponible = libre > 0;
                const selected = horarioSel?.id === h.id;
                return (
                  <button
                    key={h.id}
                    type="button"
                    disabled={!disponible}
                    onClick={() => selectHorario(h)}
                    className={cn(
                      "text-left rounded-xl border p-4 transition-all",
                      selected ? "border-zinc-900 bg-zinc-50 ring-2 ring-zinc-900"
                        : disponible ? "border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50"
                        : "border-zinc-100 bg-zinc-50 opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-zinc-900 text-sm leading-tight">{h.curso.nombre}</p>
                          {h.grupoProximo && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-1.5 py-0 text-[10px] font-semibold text-blue-600">
                              <Clock className="h-2.5 w-2.5" /> Próximo
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 font-medium">Grupo {h.numeroGrupo}</p>
                      </div>
                      {selected && <CheckCircle2 className="h-4 w-4 text-zinc-900 shrink-0 mt-0.5" />}
                    </div>
                    <p className="text-xs text-zinc-500 mb-2">
                      {h.docente.apellido}, {h.docente.nombre} · {h.aula.nombre}
                    </p>
                    <div className="flex flex-wrap items-center gap-1 mb-2">
                      {[...h.dias].sort((a, b) => DIA_ORDER.indexOf(a) - DIA_ORDER.indexOf(b)).map(d => (
                        <Badge key={d} variant="outline" className="text-xs px-1.5 py-0">{DIA_ABREV[d] ?? d}</Badge>
                      ))}
                      <span className="text-xs text-zinc-400 font-mono ml-1">{h.horaInicio}–{h.horaFin}</span>
                    </div>
                    {h.grupoProximo && h.fechaInicio && (
                      <p className="text-xs text-blue-600 font-medium mb-2">
                        Apertura: {new Date(h.fechaInicio + "T00:00:00").toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
                      <span className="text-sm font-bold text-zinc-900">S/{h.precioMensual.toFixed(2)}/mes</span>
                      <span className={cn("flex items-center gap-1 text-xs font-medium", disponible ? "text-green-600" : "text-red-500")}>
                        <Users className="h-3 w-3" /> {libre}/{h.aula.capacidad} libres
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Días de asistencia */}
          {horarioSel && (
            <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-3">
              <Label>Días de asistencia *</Label>
              <div className="flex flex-wrap gap-2">
                {DIA_ORDER.filter(d => horarioSel.dias.includes(d)).map(dia => (
                  <button
                    key={dia}
                    type="button"
                    onClick={() => toggleDia(dia)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                      dias.includes(dia)
                        ? "bg-zinc-900 text-white border-zinc-900"
                        : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400"
                    )}
                  >
                    {dia}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 3: PAGO ────────────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-5">
          {/* Resumen */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 space-y-2 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">Resumen</p>
            <div className="flex justify-between">
              <span className="text-zinc-500">Alumno</span>
              <span className="font-medium text-zinc-900">
                {alumnoTab === "buscar"
                  ? `${alumnoSel!.apellido}, ${alumnoSel!.nombre}`
                  : `${nuevo.apellido.trim()}, ${nuevo.nombre.trim()}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Curso</span>
              <span className="font-medium text-zinc-900">{horarioSel!.curso.nombre}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Grupo</span>
              <span className="font-medium text-zinc-900">{horarioSel!.numeroGrupo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Horario</span>
              <span className="font-medium text-zinc-900">
                {[...horarioSel!.dias].sort((a, b) => DIA_ORDER.indexOf(a) - DIA_ORDER.indexOf(b)).map(d => DIA_ABREV[d]).join("/")} · {horarioSel!.horaInicio}–{horarioSel!.horaFin}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Días inscritos</span>
              <span className="font-medium text-zinc-900">
                {dias.sort((a, b) => DIA_ORDER.indexOf(a) - DIA_ORDER.indexOf(b)).join(", ")}
              </span>
            </div>
          </div>

          {/* Precio y descuento */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Precio y descuento</p>
            {descuentos.length > 0 && (
              <div className="space-y-1.5">
                <Label>Descuento</Label>
                <select
                  className={SELECT_CLASS}
                  value={descuentoId}
                  onChange={e => setDescuentoId(e.target.value)}
                >
                  <option value="">Sin descuento</option>
                  {descuentos.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.nombre} — {d.tipo === "porcentaje" ? `${d.valor}%` : `S/${d.valor.toFixed(2)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-zinc-600">
                <span>Precio base</span>
                <span className="font-mono">S/{precioBase.toFixed(2)}</span>
              </div>
              {descuentoSel && (
                <div className="flex justify-between text-green-600">
                  <span>Descuento · {descuentoSel.nombre}</span>
                  <span className="font-mono">−S/{descuentoImporte.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-zinc-900 text-base pt-2 border-t border-zinc-100">
                <span>Total mensual</span>
                <span className="font-mono">S/{precioFinal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Pago inicial */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Pago inicial</p>

            <div className="space-y-1.5">
              <Label>Método de pago *</Label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: "efectivo",      label: "Efectivo",      Icon: Banknote },
                  { value: "transferencia", label: "Transferencia",  Icon: CreditCard },
                  { value: "yape",          label: "Yape",           Icon: Smartphone },
                  { value: "plin",          label: "Plin",           Icon: Wallet },
                ] as const).map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMetodoPago(value)}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors",
                      metodoPago === value
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 text-zinc-600 hover:border-zinc-400"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className={cn(
                "flex items-start gap-3 rounded-lg border p-3.5 cursor-pointer transition-colors select-none",
                pagoCompleto ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 hover:border-zinc-300"
              )}>
                <input
                  type="checkbox"
                  checked={pagoCompleto}
                  onChange={e => setPagoCompleto(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-300 accent-zinc-900 shrink-0"
                />
                <div>
                  <p className="text-sm font-medium text-zinc-900 leading-tight">Pago completo del mes</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Abona S/{precioFinal.toFixed(2)} y el alumno queda habilitado.</p>
                </div>
              </label>

              {!pagoCompleto && (
                <div className="space-y-1.5">
                  <Label>Monto a abonar *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400 font-mono">S/</span>
                    <Input
                      type="number"
                      min="0.01"
                      max={precioFinal}
                      step="0.01"
                      placeholder={precioFinal.toFixed(2)}
                      value={montoStr}
                      onChange={e => setMontoStr(e.target.value)}
                      className="pl-9 font-mono"
                    />
                  </div>
                  {montoStr && parseFloat(montoStr) < precioFinal && parseFloat(montoStr) > 0 && (
                    <p className="text-xs text-amber-600">
                      Quedará un saldo pendiente de S/{(precioFinal - parseFloat(montoStr)).toFixed(2)} · el alumno permanecerá sin habilitar hasta saldar.
                    </p>
                  )}
                  {submitErrors.montoAbono && (
                    <p className="text-xs text-destructive">{submitErrors.montoAbono[0]}</p>
                  )}
                </div>
              )}
            </div>

            {submitErrors._ && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{submitErrors._[0]}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Navigation ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mt-8 pt-5 border-t border-zinc-100">
        <Button
          type="button"
          variant="outline"
          onClick={step === 1 ? () => router.push("/matriculas") : goBack}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {step === 1 ? "Cancelar" : "Atrás"}
        </Button>

        {step < 3 ? (
          <Button type="button" onClick={goNext}>
            Siguiente
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isPending ? "Registrando..." : "Registrar matrícula"}
          </Button>
        )}
      </div>
    </div>
  );
}
