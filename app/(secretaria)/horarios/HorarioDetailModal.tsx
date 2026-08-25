"use client";

import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ymdToDisplay, ymdToDayName, DIA_ABREV } from "@/lib/horario-periodos";
import type { HorarioSerialized } from "@/lib/actions/horarios";
import {
  Clock, MapPin, User, CalendarDays, BookOpen,
} from "lucide-react";

const DIA_COLORS: Record<string, string> = {
  Lunes:     "bg-blue-50 text-blue-700 border-blue-200",
  Martes:    "bg-violet-50 text-violet-700 border-violet-200",
  Miércoles: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Jueves:    "bg-orange-50 text-orange-700 border-orange-200",
  Viernes:   "bg-pink-50 text-pink-700 border-pink-200",
  Sábado:    "bg-teal-50 text-teal-700 border-teal-200",
};

type Props = {
  open: boolean;
  onClose: () => void;
  horario: HorarioSerialized | null;
};

export function HorarioDetailModal({ open, onClose, horario }: Props) {
  if (!horario) return null;

  const hayPeriodos = horario.periodos.length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-zinc-400" />
            {horario.curso.nombre}
            <span className="text-zinc-400 font-normal text-sm">· Grupo {horario.numeroGrupo}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">

          {/* ── Info básica ──────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-2.5 rounded-lg border border-zinc-100 bg-zinc-50 p-3">
              <User className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Docente</p>
                <p className="text-sm text-zinc-800 font-medium">
                  {horario.docente.apellido}, {horario.docente.nombre}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-lg border border-zinc-100 bg-zinc-50 p-3">
              <MapPin className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Aula</p>
                <p className="text-sm text-zinc-800 font-medium">{horario.aula.nombre}</p>
                <p className="text-xs text-zinc-400">Cap. {horario.aula.capacidad}</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-lg border border-zinc-100 bg-zinc-50 p-3">
              <Clock className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Horario</p>
                <p className="text-sm text-zinc-800 font-mono font-medium">
                  {horario.horaInicio}–{horario.horaFin}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-lg border border-zinc-100 bg-zinc-50 p-3">
              <CalendarDays className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Precio / mes</p>
                <p className="text-sm text-zinc-800 font-mono font-semibold">
                  S/{horario.precioMensual.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* ── Días ─────────────────────────────────────────────────── */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 mb-2">
              Días de clase
            </p>
            <div className="flex flex-wrap gap-1.5">
              {horario.dias.map((dia) => (
                <span
                  key={dia}
                  className={cn(
                    "inline-flex rounded-md border px-3 py-1 text-xs font-semibold",
                    DIA_COLORS[dia] ?? "bg-zinc-50 text-zinc-600 border-zinc-200"
                  )}
                >
                  {dia}
                </span>
              ))}
            </div>
          </div>

          {/* ── Períodos ─────────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                Períodos de pago
              </p>
              {horario.cantidadMeses && (
                <span className="text-xs text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full font-medium">
                  {horario.cantidadMeses} {horario.cantidadMeses === 1 ? "mes" : "meses"}
                </span>
              )}
            </div>

            {hayPeriodos ? (
              <div className="relative">
                {/* Línea vertical del timeline */}
                <div className="absolute left-3.5 top-4 bottom-4 w-px bg-zinc-200" />

                <div className="space-y-0">
                  {horario.periodos.map((p, idx) => {
                    const isLast = idx === horario.periodos.length - 1;
                    const [iy, im, id] = p.fechaInicio.split("-").map(Number);
                    const [fy, fm, fd] = p.fechaFin.split("-").map(Number);
                    const inicioDate = new Date(iy, im - 1, id);
                    const finDate = new Date(fy, fm - 1, fd);
                    const diasDuracion = Math.round(
                      (finDate.getTime() - inicioDate.getTime()) / (1000 * 60 * 60 * 24)
                    ) + 1;

                    return (
                      <div key={idx} className="flex gap-4 pb-4">
                        {/* Dot + línea */}
                        <div className="flex flex-col items-center shrink-0 w-7 pt-1">
                          <div className={cn(
                            "w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold z-10",
                            isLast
                              ? "bg-zinc-900 border-zinc-900 text-white"
                              : "bg-white border-zinc-300 text-zinc-600"
                          )}>
                            {idx + 1}
                          </div>
                        </div>

                        {/* Contenido */}
                        <div className={cn(
                          "flex-1 rounded-lg border p-3 space-y-1",
                          isLast
                            ? "border-zinc-300 bg-zinc-50"
                            : "border-zinc-100 bg-white"
                        )}>
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                              Mes {p.numeroPeriodo}
                              {isLast && (
                                <span className="ml-2 bg-zinc-900 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                                  Fin del grupo
                                </span>
                              )}
                            </p>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              {diasDuracion}d
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-zinc-700 font-medium">
                              {ymdToDisplay(p.fechaInicio)}
                            </span>
                            <span className="text-zinc-300">→</span>
                            <span className={cn(
                              "font-semibold",
                              isLast ? "text-zinc-900" : "text-zinc-700"
                            )}>
                              {ymdToDisplay(p.fechaFin)}
                            </span>
                          </div>

                          <p className="text-[11px] text-zinc-400">
                            {ymdToDayName(p.fechaInicio)} → {ymdToDayName(p.fechaFin)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-4 text-zinc-400">
                <CalendarDays className="h-5 w-5 shrink-0" />
                <p className="text-sm">
                  Este grupo no tiene períodos definidos.
                  Edítalo para configurar la duración y fechas.
                </p>
              </div>
            )}
          </div>

          {/* ── Días por período (abrev) ──────────────────────────────── */}
          {hayPeriodos && horario.dias.length > 0 && (
            <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 text-xs text-zinc-500">
              Clases: {horario.dias.map((d) => DIA_ABREV[d] ?? d).join(" · ")} · {horario.horaInicio}–{horario.horaFin}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
