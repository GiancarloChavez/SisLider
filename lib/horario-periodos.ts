// Algoritmo de cálculo de períodos para grupos de horario.
// Sin dependencias de framework — importable tanto en cliente como en servidor.

export const DIA_TO_DOW: Record<string, number> = {
  Lunes: 1,
  Martes: 2,
  Miércoles: 3,
  Jueves: 4,
  Viernes: 5,
  Sábado: 6,
};

export const DIA_ABREV: Record<string, string> = {
  Lunes: "Lu", Martes: "Ma", Miércoles: "Mi",
  Jueves: "Ju", Viernes: "Vi", Sábado: "Sa",
};

/** Verifica si la fecha dada cae en un día de la frecuencia. */
export function isFreqDay(date: Date, dias: string[]): boolean {
  const dows = new Set(dias.map((d) => DIA_TO_DOW[d]).filter((n) => n !== undefined));
  return dows.has(date.getDay());
}

/** Suma N meses a una fecha, clampando al último día del mes destino. */
function addMonths(date: Date, months: number): Date {
  const totalMonths = date.getMonth() + months;
  const year = date.getFullYear() + Math.floor(totalMonths / 12);
  const month = ((totalMonths % 12) + 12) % 12;
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(date.getDate(), lastDay));
}

/**
 * Retrocede desde `anchor` hasta encontrar el último día que pertenece
 * a la frecuencia (max 6 días hacia atrás). Si ninguno coincide devuelve anchor.
 */
function lastFreqDayOnOrBefore(anchor: Date, dias: string[]): Date {
  const dows = new Set(dias.map((d) => DIA_TO_DOW[d]).filter((n) => n !== undefined));
  for (let i = 0; i <= 6; i++) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - i);
    if (dows.has(d.getDay())) return d;
  }
  return new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
}

export type Periodo = {
  numeroPeriodo: number;
  fechaInicio: Date;
  fechaFin: Date;
};

/**
 * Calcula los períodos mensuales del grupo.
 *
 * Regla: el fin de cada período = último día de frecuencia ≤ (fechaInicio + N meses).
 * El inicio del período N+1 = fin del período N + 1 día.
 */
export function calcularPeriodos(
  fechaInicio: Date,
  cantidadMeses: number,
  dias: string[]
): Periodo[] {
  const base = new Date(
    fechaInicio.getFullYear(),
    fechaInicio.getMonth(),
    fechaInicio.getDate()
  );
  const result: Periodo[] = [];
  let currentStart = new Date(base);

  for (let n = 1; n <= cantidadMeses; n++) {
    const ancla = addMonths(base, n);
    const fin = lastFreqDayOnOrBefore(ancla, dias);
    result.push({
      numeroPeriodo: n,
      fechaInicio: new Date(currentStart),
      fechaFin: new Date(fin),
    });
    // El siguiente período empieza el día después del fin de éste
    currentStart = new Date(fin.getFullYear(), fin.getMonth(), fin.getDate() + 1);
  }

  return result;
}

/** Convierte una Date local a string YYYY-MM-DD para inputs type="date". */
export function dateToYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Formatea YYYY-MM-DD a "26 ago 2026". */
export function ymdToDisplay(ymd: string): string {
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Nombre largo del día de la semana para una fecha YYYY-MM-DD. */
export function ymdToDayName(ymd: string): string {
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("es-PE", { weekday: "long" });
}
