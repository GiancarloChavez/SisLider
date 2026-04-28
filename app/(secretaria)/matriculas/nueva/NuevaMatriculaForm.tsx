"use client";

import { useState, useTransition, useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, CheckCircle2, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buscarAlumnos,
  createMatricula,
  type AlumnoSearchResult,
  type HorarioConCupo,
  type DescuentoOption,
  type MatriculaFormState,
} from "@/lib/actions/matriculas";

const DIA_ORDER = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const DIA_ABREV: Record<string, string> = {
  Lunes: "Lu", Martes: "Ma", Miércoles: "Mi",
  Jueves: "Ju", Viernes: "Vi", Sábado: "Sa", Domingo: "Do",
};

const SELECT_CLASS =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring";

const initialState: MatriculaFormState = {};

type Props = {
  horarios: HorarioConCupo[];
  descuentos: DescuentoOption[];
};

export function NuevaMatriculaForm({ horarios, descuentos }: Props) {
  const router = useRouter();
  const [state, formAction, submitting] = useActionState(createMatricula, initialState);

  // Search
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<AlumnoSearchResult[]>([]);
  const [searching, startSearch] = useTransition();
  const [noResults, setNoResults] = useState(false);

  // Selections
  const [alumno, setAlumno] = useState<AlumnoSearchResult | null>(null);
  const [horario, setHorario] = useState<HorarioConCupo | null>(null);
  const [dias, setDias] = useState<string[]>([]);
  const [descuentoId, setDescuentoId] = useState("");

  useEffect(() => {
    if (state.message === "ok") {
      toast.success("Matrícula registrada correctamente");
      router.push("/matriculas");
    }
  }, [state.message, router]);

  // Live search — debounced 300 ms
  useEffect(() => {
    if (alumno) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResultados([]);
      setNoResults(false);
      return;
    }
    const timer = setTimeout(() => {
      startSearch(async () => {
        const res = await buscarAlumnos(trimmed);
        setResultados(res);
        setNoResults(res.length === 0);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [query, alumno]);

  function selectAlumno(a: AlumnoSearchResult) {
    setAlumno(a);
    setResultados([]);
    setQuery("");
    // reset downstream
    setHorario(null);
    setDias([]);
    setDescuentoId("");
  }

  function clearAlumno() {
    setAlumno(null);
    setHorario(null);
    setDias([]);
    setDescuentoId("");
    setResultados([]);
    setNoResults(false);
    setQuery("");
  }

  function selectHorario(h: HorarioConCupo) {
    setHorario(h);
    setDias([...h.dias].sort((a, b) => DIA_ORDER.indexOf(a) - DIA_ORDER.indexOf(b)));
    setDescuentoId("");
  }

  function toggleDia(dia: string) {
    setDias((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia]
    );
  }

  // Price calculation (client-side preview)
  const precioBase = horario?.curso.precioMensual ?? 0;
  const descuentoSel = descuentos.find((d) => d.id === descuentoId);
  const descuentoImporte = descuentoSel
    ? descuentoSel.tipo === "porcentaje"
      ? precioBase * (descuentoSel.valor / 100)
      : Math.min(descuentoSel.valor, precioBase)
    : 0;
  const precioFinal = precioBase - descuentoImporte;

  const e = state.errors ?? {};
  const canSubmit = alumno !== null && horario !== null && dias.length > 0;

  return (
    <form action={formAction} className="space-y-5">
      {/* Hidden inputs passed to server action */}
      {alumno && <input type="hidden" name="idAlumno" value={alumno.id} />}
      {horario && <input type="hidden" name="idHorario" value={horario.id} />}
      {dias.map((dia) => (
        <input key={dia} type="hidden" name="dia" value={dia} />
      ))}
      {descuentoId && <input type="hidden" name="idDescuento" value={descuentoId} />}

      {/* ── Sección 1: Alumno ──────────────────────────────────────── */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4">
        <div className="flex items-center gap-2">
          <StepBadge n={1} />
          <h2 className="font-semibold text-zinc-900">Alumno</h2>
        </div>

        {alumno ? (
          <div className="flex items-center justify-between rounded-lg bg-zinc-50 border border-zinc-200 px-4 py-3">
            <div>
              <p className="font-medium text-zinc-900">{alumno.apellido}, {alumno.nombre}</p>
              {alumno.dni && (
                <p className="text-xs font-mono text-zinc-400">DNI {alumno.dni}</p>
              )}
            </div>
            <Button type="button" size="icon-sm" variant="ghost" onClick={clearAlumno}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
              <Input
                placeholder="Buscar por nombre o DNI..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                className="pl-9"
              />
            </div>

            {e.idAlumno && (
              <p className="text-xs text-destructive">{e.idAlumno[0]}</p>
            )}

            {searching && (
              <p className="text-xs text-zinc-400 px-1">Buscando...</p>
            )}

            {resultados.length > 0 && (
              <ul className="rounded-lg border border-zinc-200 divide-y divide-zinc-100 overflow-hidden">
                {resultados.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => selectAlumno(a)}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-zinc-50 transition-colors flex items-center justify-between"
                    >
                      <span className="font-medium text-zinc-900">
                        {a.apellido}, {a.nombre}
                      </span>
                      <span className="text-zinc-400 font-mono text-xs">
                        {a.dni ?? "sin DNI"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {noResults && !searching && (
              <p className="text-xs text-zinc-400 px-1">
                Sin resultados. Verifica el nombre o registra el alumno primero.
              </p>
            )}
          </div>
        )}
      </section>

      {/* ── Sección 2: Horario ─────────────────────────────────────── */}
      <section
        className={cn(
          "rounded-xl border border-zinc-200 bg-white p-6 space-y-4 transition-opacity",
          !alumno && "opacity-40 pointer-events-none"
        )}
      >
        <div className="flex items-center gap-2">
          <StepBadge n={2} />
          <h2 className="font-semibold text-zinc-900">Horario</h2>
        </div>

        {e.idHorario && (
          <p className="text-xs text-destructive">{e.idHorario[0]}</p>
        )}

        {horarios.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-4">
            No hay horarios activos. Crea uno primero en Horarios.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {horarios.map((h) => {
              const libre = h.cupoMaximo - h.cupoOcupado;
              const disponible = libre > 0;
              const selected = horario?.id === h.id;

              return (
                <button
                  key={h.id}
                  type="button"
                  disabled={!disponible}
                  onClick={() => selectHorario(h)}
                  className={cn(
                    "text-left rounded-lg border p-4 transition-all",
                    selected
                      ? "border-zinc-900 bg-zinc-50 ring-2 ring-zinc-900"
                      : disponible
                      ? "border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50"
                      : "border-zinc-100 bg-zinc-50 opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-semibold text-zinc-900 text-sm leading-tight">
                        {h.curso.nombre}
                      </p>
                      {h.curso.nivel && (
                        <p className="text-xs text-zinc-400">{h.curso.nivel}</p>
                      )}
                    </div>
                    {selected && <CheckCircle2 className="h-4 w-4 text-zinc-900 shrink-0 mt-0.5" />}
                  </div>

                  <p className="text-xs text-zinc-500 mb-2">
                    {h.docente.apellido}, {h.docente.nombre} · {h.aula.nombre}
                  </p>

                  <div className="flex flex-wrap items-center gap-1 mb-2">
                    {[...h.dias]
                      .sort((a, b) => DIA_ORDER.indexOf(a) - DIA_ORDER.indexOf(b))
                      .map((d) => (
                        <Badge key={d} variant="outline" className="text-xs px-1.5 py-0">
                          {DIA_ABREV[d] ?? d}
                        </Badge>
                      ))}
                    <span className="text-xs text-zinc-400 font-mono ml-1">
                      {h.horaInicio}–{h.horaFin}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
                    <span className="text-sm font-bold text-zinc-900">
                      S/{h.curso.precioMensual.toFixed(2)}/mes
                    </span>
                    <span
                      className={cn(
                        "flex items-center gap-1 text-xs font-medium",
                        disponible ? "text-green-600" : "text-red-500"
                      )}
                    >
                      <Users className="h-3 w-3" />
                      {libre}/{h.cupoMaximo} libres
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Sección 3: Detalles + Resumen ─────────────────────────── */}
      {horario && (
        <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-5">
          <div className="flex items-center gap-2">
            <StepBadge n={3} />
            <h2 className="font-semibold text-zinc-900">Detalles y confirmación</h2>
          </div>

          {/* Días de asistencia */}
          <div className="space-y-2">
            <Label>Días de asistencia *</Label>
            <div className="flex flex-wrap gap-2">
              {DIA_ORDER.filter((d) => horario.dias.includes(d)).map((dia) => (
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
            {e.dias && <p className="text-xs text-destructive">{e.dias[0]}</p>}
          </div>

          {/* Descuento */}
          {descuentos.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="descuento-select">Descuento</Label>
              <select
                id="descuento-select"
                className={SELECT_CLASS}
                value={descuentoId}
                onChange={(e) => setDescuentoId(e.target.value)}
              >
                <option value="">Sin descuento</option>
                {descuentos.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre} —{" "}
                    {d.tipo === "porcentaje" ? `${d.valor}%` : `S/${d.valor.toFixed(2)}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Resumen de precio */}
          <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-4 space-y-2 text-sm">
            <div className="flex justify-between text-zinc-600">
              <span>Precio base ({horario.curso.nombre})</span>
              <span className="font-mono">S/{precioBase.toFixed(2)}</span>
            </div>
            {descuentoSel && (
              <div className="flex justify-between text-green-600">
                <span>Descuento · {descuentoSel.nombre}</span>
                <span className="font-mono">−S/{descuentoImporte.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-zinc-900 text-base pt-2 border-t border-zinc-200">
              <span>Total mensual</span>
              <span className="font-mono">S/{precioFinal.toFixed(2)}</span>
            </div>
            <p className="text-xs text-zinc-400">
              Se genera el primer mes de pago automáticamente al matricular.
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={!canSubmit || submitting}>
            {submitting ? "Registrando..." : "Registrar matrícula"}
          </Button>
        </section>
      )}
    </form>
  );
}

function StepBadge({ n }: { n: number }) {
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white shrink-0">
      {n}
    </span>
  );
}
