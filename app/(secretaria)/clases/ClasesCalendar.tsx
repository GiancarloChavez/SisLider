"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HorarioCalendario } from "@/lib/actions/clases";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"] as const;
const HOUR_START = 7;
const HOUR_END = 21;
const PX_PER_HOUR = 72;
const TOTAL_HEIGHT = (HOUR_END - HOUR_START) * PX_PER_HOUR;
const TIME_COL_W = 56; // px

const COURSE_COLORS = [
  { bg: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-900",   accent: "bg-blue-400",   dot: "bg-blue-400"   },
  { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-900", accent: "bg-violet-400", dot: "bg-violet-400" },
  { bg: "bg-emerald-50",border: "border-emerald-200",text: "text-emerald-900",accent: "bg-emerald-400",dot: "bg-emerald-400"},
  { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-900", accent: "bg-orange-400", dot: "bg-orange-400" },
  { bg: "bg-pink-50",   border: "border-pink-200",   text: "text-pink-900",   accent: "bg-pink-400",   dot: "bg-pink-400"   },
  { bg: "bg-teal-50",   border: "border-teal-200",   text: "text-teal-900",   accent: "bg-teal-400",   dot: "bg-teal-400"   },
  { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-900", accent: "bg-indigo-400", dot: "bg-indigo-400" },
  { bg: "bg-rose-50",   border: "border-rose-200",   text: "text-rose-900",   accent: "bg-rose-400",   dot: "bg-rose-400"   },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function topPx(time: string): number {
  return ((timeToMinutes(time) - HOUR_START * 60) / 60) * PX_PER_HOUR;
}

function heightPx(start: string, end: string): number {
  return ((timeToMinutes(end) - timeToMinutes(start)) / 60) * PX_PER_HOUR;
}

function colorForCourse(courseId: string) {
  let hash = 0;
  for (let i = 0; i < courseId.length; i++) {
    hash = (hash * 31 + courseId.charCodeAt(i)) & 0xffff;
  }
  return COURSE_COLORS[hash % COURSE_COLORS.length];
}

function getMondayOfWeek(offset: number): Date {
  const today = new Date();
  const dow = today.getDay(); // 0 Sun … 6 Sat
  const daysToMon = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + daysToMon + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

// ─── Event card ───────────────────────────────────────────────────────────────

function EventCard({ horario, color }: {
  horario: HorarioCalendario;
  color: (typeof COURSE_COLORS)[number];
}) {
  const top = topPx(horario.horaInicio);
  const height = heightPx(horario.horaInicio, horario.horaFin);
  const compact = height < 52;
  const medium  = height >= 52 && height < 80;

  return (
    <div
      className={cn(
        "absolute inset-x-1 rounded-lg border overflow-hidden shadow-sm",
        "transition-shadow duration-150 hover:shadow-md cursor-default group",
        color.bg, color.border
      )}
      style={{ top: top + 2, height: height - 4 }}
      role="article"
      aria-label={`${horario.curso.nombre}, ${horario.horaInicio}–${horario.horaFin}, ${horario.docente.apellido}`}
    >
      {/* Left accent stripe */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-lg", color.accent)} />

      <div className="pl-2.5 pr-1.5 py-1.5 h-full flex flex-col justify-start overflow-hidden">
        <p className={cn(
          "font-semibold leading-tight",
          compact ? "text-[10px] truncate" : "text-xs",
          color.text
        )}>
          {horario.curso.nombre}
          {horario.curso.nivel && !compact && (
            <span className="ml-1 font-normal opacity-70">{horario.curso.nivel}</span>
          )}
        </p>

        {!compact && (
          <p className="text-[10px] text-zinc-500 truncate mt-0.5">
            {horario.docente.apellido}, {horario.docente.nombre[0]}.
          </p>
        )}

        {!medium && !compact && (
          <p className="text-[10px] text-zinc-400 truncate">{horario.aula.nombre}</p>
        )}

        {!compact && (
          <p className="text-[10px] text-zinc-400 mt-auto tabular-nums">
            {horario.horaInicio}–{horario.horaFin}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main calendar ────────────────────────────────────────────────────────────

type Props = {
  horarios: HorarioCalendario[];
  title?: string;
  subtitle?: string;
};

export function ClasesCalendar({ horarios, title = "Clases", subtitle }: Props) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [currentMinutes, setCurrentMinutes] = useState<number | null>(null);

  // Update current time every minute (client-only)
  useEffect(() => {
    function tick() {
      const now = new Date();
      setCurrentMinutes(now.getHours() * 60 + now.getMinutes());
    }
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  const monday = getMondayOfWeek(weekOffset);
  const weekDates = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const today = new Date();

  // Header week label
  const fmtShort = (d: Date) =>
    d.toLocaleDateString("es-PE", { day: "numeric", month: "short" });
  const fmtFull = (d: Date) =>
    d.toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" });
  const weekLabel =
    weekDates[0].getMonth() === weekDates[5].getMonth()
      ? `${weekDates[0].getDate()} – ${fmtFull(weekDates[5])}`
      : `${fmtShort(weekDates[0])} – ${fmtFull(weekDates[5])}`;

  // Unique courses for legend
  const uniqueCourses = Array.from(
    new Map(horarios.map((h) => [h.curso.id, h.curso])).values()
  );

  // Current time indicator
  const showCurrentTime =
    currentMinutes !== null &&
    currentMinutes > HOUR_START * 60 &&
    currentMinutes < HOUR_END * 60;
  const currentTimePx = currentMinutes !== null
    ? ((currentMinutes - HOUR_START * 60) / 60) * PX_PER_HOUR
    : 0;

  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

  return (
    <div className="flex flex-col gap-4">
      {/* ── Page header ──────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {subtitle ?? (horarios.length === 0
              ? "No hay horarios activos"
              : `${horarios.length} horario${horarios.length !== 1 ? "s" : ""} activo${horarios.length !== 1 ? "s" : ""}`)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset(0)}
            disabled={weekOffset === 0}
            className="gap-1.5"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Hoy
          </Button>
          <div className="flex items-center rounded-lg border border-zinc-200 bg-white overflow-hidden">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setWeekOffset((w) => w - 1)}
              aria-label="Semana anterior"
              className="rounded-none border-r border-zinc-200 h-9 w-9"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-4 text-sm font-medium text-zinc-700 min-w-[200px] text-center">
              {weekLabel}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setWeekOffset((w) => w + 1)}
              aria-label="Semana siguiente"
              className="rounded-none border-l border-zinc-200 h-9 w-9"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Calendar grid ────────────────────────────────────── */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm">

        {/* Day header row — sticky */}
        <div
          className="grid border-b border-zinc-200 bg-white"
          style={{ gridTemplateColumns: `${TIME_COL_W}px repeat(6, 1fr)` }}
        >
          <div className="py-3" /> {/* time column placeholder */}
          {DAYS.map((day, i) => {
            const date = weekDates[i];
            const isToday = isSameDay(date, today);
            return (
              <div
                key={day}
                className={cn(
                  "border-l border-zinc-100 py-3 text-center select-none",
                  isToday && "bg-blue-50"
                )}
              >
                <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-400">
                  {day.slice(0, 3)}
                </p>
                <p
                  className={cn(
                    "text-xl font-bold mt-0.5 leading-none",
                    isToday ? "text-blue-600" : "text-zinc-800"
                  )}
                >
                  {date.getDate()}
                </p>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  {date.toLocaleDateString("es-PE", { month: "short" })}
                </p>
              </div>
            );
          })}
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 260px)" }}>
          {horarios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-zinc-400 gap-2">
              <CalendarDays className="h-10 w-10 opacity-30" />
              <p className="text-sm">No hay horarios activos para mostrar.</p>
              <p className="text-xs">Crea horarios en el módulo de Horarios.</p>
            </div>
          ) : (
            <div
              className="relative grid"
              style={{
                gridTemplateColumns: `${TIME_COL_W}px repeat(6, 1fr)`,
                height: TOTAL_HEIGHT,
              }}
            >
              {/* Time labels column */}
              <div className="relative bg-white border-r border-zinc-100 z-10">
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="absolute right-3 text-[11px] text-zinc-400 tabular-nums select-none"
                    style={{ top: (hour - HOUR_START) * PX_PER_HOUR - 7 }}
                  >
                    {String(hour).padStart(2, "0")}:00
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {DAYS.map((day, colIdx) => {
                const date = weekDates[colIdx];
                const isToday = isSameDay(date, today);
                const dayHorarios = horarios.filter((h) => h.dias.includes(day));

                return (
                  <div
                    key={day}
                    className={cn(
                      "relative border-l border-zinc-100",
                      isToday && "bg-blue-50/20"
                    )}
                  >
                    {/* Hour grid lines */}
                    {hours.map((hour) => (
                      <div
                        key={hour}
                        className="absolute inset-x-0 border-t border-zinc-100"
                        style={{ top: (hour - HOUR_START) * PX_PER_HOUR }}
                      />
                    ))}
                    {/* Half-hour dashed lines */}
                    {hours.map((hour) => (
                      <div
                        key={`h${hour}`}
                        className="absolute inset-x-0 border-t border-dashed border-zinc-50"
                        style={{ top: (hour - HOUR_START) * PX_PER_HOUR + PX_PER_HOUR / 2 }}
                      />
                    ))}

                    {/* Current time indicator */}
                    {isToday && showCurrentTime && (
                      <div
                        className="absolute inset-x-0 z-20 pointer-events-none"
                        style={{ top: currentTimePx }}
                      >
                        <div className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 shrink-0" />
                          <div className="flex-1 border-t-2 border-red-400" />
                        </div>
                      </div>
                    )}

                    {/* Events */}
                    {dayHorarios.map((h) => (
                      <EventCard
                        key={h.id}
                        horario={h}
                        color={colorForCourse(h.curso.id)}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Legend ───────────────────────────────────────────── */}
      {uniqueCourses.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {uniqueCourses.map((curso) => {
            const color = colorForCourse(curso.id);
            return (
              <div
                key={curso.id}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
                  color.bg, color.border, color.text
                )}
              >
                <div className={cn("w-2 h-2 rounded-full shrink-0", color.dot)} />
                {curso.nombre}
                {curso.nivel && <span className="opacity-60">· {curso.nivel}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
