"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HorarioCalendario } from "@/lib/actions/clases";

// ─── Constants ────────────────────────────────────────────────────────────────

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const MINI_WEEKDAYS = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"];
const COL_WEEKDAYS = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
const DIA_TO_DOW: Record<string, number> = {
  Domingo: 0, Lunes: 1, Martes: 2, Miércoles: 3, Jueves: 4, Viernes: 5, Sábado: 6,
};

const HOUR_START = 0;
const HOUR_END = 24;
const PX_PER_HOUR = 52;
const TOTAL_HEIGHT = (HOUR_END - HOUR_START) * PX_PER_HOUR;
const TIME_COL_W = 60;
const COLOR_STORAGE_KEY = "sislider-calendar-colors";

const PALETTE = [
  { bg: "bg-blue-100/70",    border: "border-blue-200",    bar: "bg-blue-400",    text: "text-blue-900",    sub: "text-blue-700/70",    dot: "bg-blue-400"    },
  { bg: "bg-violet-100/70",  border: "border-violet-200",  bar: "bg-violet-400",  text: "text-violet-900",  sub: "text-violet-700/70",  dot: "bg-violet-400"  },
  { bg: "bg-emerald-100/70", border: "border-emerald-200", bar: "bg-emerald-400", text: "text-emerald-900", sub: "text-emerald-700/70", dot: "bg-emerald-400" },
  { bg: "bg-orange-100/70",  border: "border-orange-200",  bar: "bg-orange-400",  text: "text-orange-900",  sub: "text-orange-700/70",  dot: "bg-orange-400"  },
  { bg: "bg-pink-100/70",    border: "border-pink-200",    bar: "bg-pink-400",    text: "text-pink-900",    sub: "text-pink-700/70",    dot: "bg-pink-400"    },
  { bg: "bg-teal-100/70",    border: "border-teal-200",    bar: "bg-teal-400",    text: "text-teal-900",    sub: "text-teal-700/70",    dot: "bg-teal-400"    },
  { bg: "bg-indigo-100/70",  border: "border-indigo-200",  bar: "bg-indigo-400",  text: "text-indigo-900",  sub: "text-indigo-700/70",  dot: "bg-indigo-400"  },
  { bg: "bg-rose-100/70",    border: "border-rose-200",    bar: "bg-rose-400",    text: "text-rose-900",    sub: "text-rose-700/70",    dot: "bg-rose-400"    },
  { bg: "bg-amber-100/70",   border: "border-amber-200",   bar: "bg-amber-400",   text: "text-amber-900",   sub: "text-amber-700/70",   dot: "bg-amber-400"   },
  { bg: "bg-cyan-100/70",    border: "border-cyan-200",    bar: "bg-cyan-400",    text: "text-cyan-900",    sub: "text-cyan-700/70",    dot: "bg-cyan-400"    },
  { bg: "bg-lime-100/70",    border: "border-lime-200",    bar: "bg-lime-400",    text: "text-lime-900",    sub: "text-lime-700/70",    dot: "bg-lime-400"    },
  { bg: "bg-sky-100/70",     border: "border-sky-200",     bar: "bg-sky-400",     text: "text-sky-900",     sub: "text-sky-700/70",     dot: "bg-sky-400"     },
  { bg: "bg-fuchsia-100/70", border: "border-fuchsia-200", bar: "bg-fuchsia-400", text: "text-fuchsia-900", sub: "text-fuchsia-700/70", dot: "bg-fuchsia-400" },
  { bg: "bg-red-100/70",     border: "border-red-200",     bar: "bg-red-400",     text: "text-red-900",     sub: "text-red-700/70",     dot: "bg-red-400"     },
  { bg: "bg-yellow-100/70",  border: "border-yellow-200",  bar: "bg-yellow-400",  text: "text-yellow-900",  sub: "text-yellow-700/70",  dot: "bg-yellow-400"  },
  { bg: "bg-purple-100/70",  border: "border-purple-200",  bar: "bg-purple-400",  text: "text-purple-900",  sub: "text-purple-700/70",  dot: "bg-purple-400"  },
  { bg: "bg-green-100/70",   border: "border-green-200",   bar: "bg-green-400",   text: "text-green-900",   sub: "text-green-700/70",   dot: "bg-green-400"   },
  { bg: "bg-slate-100/70",   border: "border-slate-200",   bar: "bg-slate-400",   text: "text-slate-900",   sub: "text-slate-700/70",   dot: "bg-slate-400"   },
  { bg: "bg-stone-100/70",   border: "border-stone-200",   bar: "bg-stone-400",   text: "text-stone-900",   sub: "text-stone-700/70",   dot: "bg-stone-400"   },
  { bg: "bg-zinc-100/70",    border: "border-zinc-300",    bar: "bg-zinc-400",    text: "text-zinc-900",    sub: "text-zinc-600/70",    dot: "bg-zinc-400"    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function topPx(t: string): number {
  return ((timeToMinutes(t) - HOUR_START * 60) / 60) * PX_PER_HOUR;
}
function heightPx(a: string, b: string): number {
  return ((timeToMinutes(b) - timeToMinutes(a)) / 60) * PX_PER_HOUR;
}
function hashColor(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffff;
  return hash % PALETTE.length;
}
function fmt12(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12} ${ampm}` : `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function startOfWeekSun(d: Date): Date {
  const r = new Date(d);
  r.setDate(d.getDate() - d.getDay());
  r.setHours(0, 0, 0, 0);
  return r;
}

// ─── Overlap layout ───────────────────────────────────────────────────────────

type Layout = { horario: HorarioCalendario; lane: number; numLanes: number };

function computeLayout(items: HorarioCalendario[]): Layout[] {
  if (items.length === 0) return [];
  const sorted = [...items].sort((a, b) => timeToMinutes(a.horaInicio) - timeToMinutes(b.horaInicio));
  const laneEnds: number[] = [];
  const assigned: { horario: HorarioCalendario; lane: number }[] = [];
  for (const h of sorted) {
    const s = timeToMinutes(h.horaInicio), e = timeToMinutes(h.horaFin);
    let lane = laneEnds.findIndex((end) => end <= s);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(e); }
    else laneEnds[lane] = e;
    assigned.push({ horario: h, lane });
  }
  return assigned.map(({ horario, lane }) => {
    const s = timeToMinutes(horario.horaInicio), e = timeToMinutes(horario.horaFin);
    let maxLane = lane;
    for (const o of assigned) {
      const os = timeToMinutes(o.horario.horaInicio), oe = timeToMinutes(o.horario.horaFin);
      if (os < e && oe > s) maxLane = Math.max(maxLane, o.lane);
    }
    return { horario, lane, numLanes: maxLane + 1 };
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props = { horarios: HorarioCalendario[] };

export function CalendarView({ horarios }: Props) {
  const today = new Date();
  const [weekOffset, setWeekOffset] = useState(0);
  const [miniRef, setMiniRef] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [colorOverrides, setColorOverrides] = useState<Record<string, number>>({});
  const [pickerOpen, setPickerOpen] = useState<string | null>(null);
  const [nowMin, setNowMin] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Cargar colores guardados
  useEffect(() => {
    try {
      const stored = localStorage.getItem(COLOR_STORAGE_KEY);
      if (stored) setColorOverrides(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  // Reloj para el indicador de hora actual
  useEffect(() => {
    const tick = () => {
      const n = new Date();
      setNowMin(n.getHours() * 60 + n.getMinutes());
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  // Scroll inicial cerca de la hora actual
  useEffect(() => {
    if (scrollRef.current && nowMin !== null) {
      scrollRef.current.scrollTop = Math.max(0, (nowMin / 60) * PX_PER_HOUR - 200);
    }
    // solo al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function colorFor(courseId: string) {
    const idx = colorOverrides[courseId];
    return PALETTE[idx !== undefined ? idx : hashColor(courseId)];
  }
  function setCourseColor(courseId: string, idx: number) {
    setColorOverrides((prev) => {
      const next = { ...prev, [courseId]: idx };
      try { localStorage.setItem(COLOR_STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    setPickerOpen(null);
  }

  const cursos = useMemo(
    () => Array.from(new Map(horarios.map((h) => [h.curso.id, h.curso])).values()),
    [horarios]
  );

  const visibles = horarios.filter((h) => !hidden.has(h.curso.id));

  const baseWeek = startOfWeekSun(today);
  const weekStart = new Date(baseWeek);
  weekStart.setDate(baseWeek.getDate() + weekOffset * 7);
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const monthTitle = `${MESES[weekDates[0].getMonth()]} ${weekDates[0].getFullYear()}`;

  const miniFirst = new Date(miniRef.getFullYear(), miniRef.getMonth(), 1);
  const miniStart = new Date(miniFirst);
  miniStart.setDate(miniFirst.getDate() - miniFirst.getDay());
  const miniDays = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(miniStart);
    d.setDate(miniStart.getDate() + i);
    return d;
  });

  function toggleCurso(id: string) {
    setHidden((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }
  function jumpToDate(d: Date) {
    const target = startOfWeekSun(d);
    const diffDays = Math.round((target.getTime() - baseWeek.getTime()) / 86400000);
    setWeekOffset(Math.round(diffDays / 7));
  }

  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
  const nowTopPx = nowMin !== null ? ((nowMin - HOUR_START * 60) / 60) * PX_PER_HOUR : 0;

  return (
    <div className="flex rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm" style={{ height: "calc(100vh - 150px)" }}>

      {/* ── Main ────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200 shrink-0">
          <h2 className="text-lg font-bold text-zinc-900">{monthTitle}</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-zinc-200 overflow-hidden">
              <button
                onClick={() => setWeekOffset((w) => w - 1)}
                className="p-2 hover:bg-zinc-50 text-zinc-500 border-r border-zinc-200"
                aria-label="Semana anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setWeekOffset((w) => w + 1)}
                className="p-2 hover:bg-zinc-50 text-zinc-500"
                aria-label="Semana siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={() => setWeekOffset(0)}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
            >
              Hoy
            </button>
            <span className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600">
              Semana
            </span>
          </div>
        </div>

        {/* Day headers */}
        <div
          className="grid border-b border-zinc-200 shrink-0"
          style={{ gridTemplateColumns: `${TIME_COL_W}px repeat(7, 1fr)` }}
        >
          <div className="py-2 text-center text-[10px] text-zinc-400 font-medium flex items-end justify-center pb-2">
            GMT-5
          </div>
          {weekDates.map((d, i) => {
            const isToday = isSameDay(d, today);
            return (
              <div key={i} className="border-l border-zinc-100 py-2 text-center select-none">
                <p className={cn("text-[11px] font-medium uppercase tracking-wide", isToday ? "text-zinc-900" : "text-zinc-400")}>
                  {COL_WEEKDAYS[d.getDay()]} {d.getDate()}
                </p>
                {isToday && <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />}
              </div>
            );
          })}
        </div>

        {/* Scrollable grid */}
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
          <div
            className="relative grid"
            style={{
              gridTemplateColumns: `${TIME_COL_W}px repeat(7, 1fr)`,
              height: TOTAL_HEIGHT,
            }}
          >
            {/* Time labels */}
            <div className="relative border-r border-zinc-100">
              {hours.map((h) => (
                <div
                  key={h}
                  className="absolute right-2 text-[11px] text-zinc-400 tabular-nums select-none"
                  style={{ top: (h - HOUR_START) * PX_PER_HOUR - 6 }}
                >
                  {fmt12(`${String(h).padStart(2, "0")}:00`)}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDates.map((date, colIdx) => {
              const isToday = isSameDay(date, today);
              const dow = date.getDay();
              const diaEsp = Object.keys(DIA_TO_DOW).find((k) => DIA_TO_DOW[k] === dow);
              const dayItems = diaEsp ? visibles.filter((h) => h.dias.includes(diaEsp)) : [];
              const layouts = computeLayout(dayItems);
              return (
                <div key={colIdx} className={cn("relative border-l border-zinc-100", isToday && "bg-blue-50/20")}>
                  {hours.map((h) => (
                    <div
                      key={h}
                      className="absolute inset-x-0 border-t border-zinc-100"
                      style={{ top: (h - HOUR_START) * PX_PER_HOUR }}
                    />
                  ))}

                  {/* Indicador de hora actual */}
                  {isToday && nowMin !== null && (
                    <div className="absolute inset-x-0 z-20 pointer-events-none" style={{ top: nowTopPx }}>
                      <div className="relative flex items-center">
                        <span className="absolute -left-1 h-2.5 w-2.5 rounded-full bg-red-500 shadow-sm" />
                        <span className="w-full border-t-2 border-red-500" />
                      </div>
                    </div>
                  )}

                  {layouts.map(({ horario: h, lane, numLanes }) => {
                    const color = colorFor(h.curso.id);
                    const top = topPx(h.horaInicio);
                    const height = heightPx(h.horaInicio, h.horaFin);
                    const leftPct = (lane / numLanes) * 100;
                    const widthPct = (1 / numLanes) * 100;
                    const compact = height < 40;
                    return (
                      <div
                        key={h.id}
                        className={cn("absolute rounded-lg border overflow-hidden", color.bg, color.border)}
                        style={{
                          top: top + 1,
                          height: height - 2,
                          left: `calc(${leftPct}% + 2px)`,
                          width: `calc(${widthPct}% - 4px)`,
                        }}
                      >
                        <div className={cn("absolute left-0 top-0 bottom-0 w-1", color.bar)} />
                        <div className="pl-2.5 pr-1.5 py-1 h-full overflow-hidden">
                          <p className={cn("font-semibold leading-tight truncate", compact ? "text-[10px]" : "text-xs", color.text)}>
                            {h.curso.nombre}
                          </p>
                          {!compact && (
                            <p className={cn("text-[10px] mt-0.5 tabular-nums", color.sub)}>
                              {fmt12(h.horaInicio)} - {fmt12(h.horaFin)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Sidebar (derecha) ───────────────────────────────────── */}
      <aside className="w-60 shrink-0 border-l border-zinc-200 flex flex-col bg-zinc-50/40">

        {/* Mini month */}
        <div className="p-4 border-b border-zinc-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-zinc-800">
              {MESES[miniRef.getMonth()]} {miniRef.getFullYear()}
            </p>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setMiniRef(new Date(miniRef.getFullYear(), miniRef.getMonth() - 1, 1))}
                className="p-1 rounded hover:bg-zinc-200 text-zinc-500"
                aria-label="Mes anterior"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setMiniRef(new Date(miniRef.getFullYear(), miniRef.getMonth() + 1, 1))}
                className="p-1 rounded hover:bg-zinc-200 text-zinc-500"
                aria-label="Mes siguiente"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center">
            {MINI_WEEKDAYS.map((d) => (
              <span key={d} className="text-[10px] font-medium text-zinc-400">{d}</span>
            ))}
            {miniDays.map((d, i) => {
              const inMonth = d.getMonth() === miniRef.getMonth();
              const isToday = isSameDay(d, today);
              const inWeek = d >= weekDates[0] && d <= weekDates[6];
              return (
                <button
                  key={i}
                  onClick={() => jumpToDate(d)}
                  className={cn(
                    "mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[11px] transition-colors",
                    isToday
                      ? "bg-zinc-900 text-white font-semibold"
                      : inWeek
                      ? "bg-zinc-200 text-zinc-800"
                      : inMonth
                      ? "text-zinc-700 hover:bg-zinc-200"
                      : "text-zinc-300 hover:bg-zinc-100"
                  )}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Cursos + color picker */}
        <div className="p-4 overflow-y-auto flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-2">
            Cursos
          </p>
          <ul className="space-y-0.5">
            {cursos.length === 0 && (
              <li className="text-xs text-zinc-400 py-2">No hay cursos con horarios.</li>
            )}
            {cursos.map((c) => {
              const color = colorFor(c.id);
              const active = !hidden.has(c.id);
              return (
                <li key={c.id} className="relative">
                  <div className="w-full flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-zinc-100 transition-colors">
                    <button
                      onClick={() => toggleCurso(c.id)}
                      className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                    >
                      <span className={cn(
                        "flex h-4 w-4 items-center justify-center rounded border shrink-0 transition-colors",
                        active ? cn(color.bar, "border-transparent") : "border-zinc-300 bg-white"
                      )}>
                        {active && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                      </span>
                      <span className={cn("text-sm truncate", active ? "text-zinc-700" : "text-zinc-400")}>
                        {c.nombre}
                      </span>
                    </button>
                    <button
                      onClick={() => setPickerOpen(pickerOpen === c.id ? null : c.id)}
                      className={cn("h-3.5 w-3.5 rounded-full shrink-0 ring-offset-1 hover:ring-2 hover:ring-zinc-300 transition-all", color.dot)}
                      title="Cambiar color"
                      aria-label="Cambiar color"
                    />
                  </div>

                  {/* Popover de colores */}
                  {pickerOpen === c.id && (
                    <div className="absolute right-2 top-full z-30 mt-1 rounded-lg border border-zinc-200 bg-white p-2 shadow-lg">
                      <div className="grid grid-cols-5 gap-1.5">
                        {PALETTE.map((p, idx) => (
                          <button
                            key={idx}
                            onClick={() => setCourseColor(c.id, idx)}
                            className={cn("h-5 w-5 rounded-full transition-transform hover:scale-110", p.dot)}
                            aria-label={`Color ${idx + 1}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </div>
  );
}
