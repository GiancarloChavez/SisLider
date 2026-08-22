"use client";

import { useState } from "react";
import {
  ChevronDown, ChevronRight, Users, Phone, BadgeCheck, BookOpen, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocentePerfilData } from "@/lib/actions/docentes";

const DIA_ABREV: Record<string, string> = {
  Lunes: "Lu", Martes: "Ma", Miércoles: "Mi",
  Jueves: "Ju", Viernes: "Vi", Sábado: "Sa", Domingo: "Do",
};

const DIA_COLORS: Record<string, string> = {
  Lunes:     "bg-blue-50 text-blue-700 border-blue-200",
  Martes:    "bg-violet-50 text-violet-700 border-violet-200",
  Miércoles: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Jueves:    "bg-orange-50 text-orange-700 border-orange-200",
  Viernes:   "bg-pink-50 text-pink-700 border-pink-200",
  Sábado:    "bg-teal-50 text-teal-700 border-teal-200",
  Domingo:   "bg-zinc-50 text-zinc-600 border-zinc-200",
};

type Props = { perfil: DocentePerfilData };

export function PerfilDocenteView({ perfil }: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const totalAlumnos = perfil.grupos.reduce((s, g) => s + g.alumnos.length, 0);

  return (
    <div className="space-y-8">
      {/* ── Profile card ─────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white border border-zinc-200 shadow-sm px-6 py-5 flex items-start gap-5">
        <div className="h-14 w-14 rounded-full bg-zinc-900 flex items-center justify-center shrink-0">
          <span className="text-xl font-bold text-white">
            {perfil.nombre[0]}{perfil.apellido[0]}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-zinc-900">
            {perfil.nombre} {perfil.apellido}
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">Docente</p>
          <div className="flex flex-wrap gap-4 mt-3">
            {perfil.dni && (
              <span className="flex items-center gap-1.5 text-sm text-zinc-600">
                <BadgeCheck className="h-4 w-4 text-zinc-400" />
                DNI: {perfil.dni}
              </span>
            )}
            {perfil.celular && (
              <span className="flex items-center gap-1.5 text-sm text-zinc-600">
                <Phone className="h-4 w-4 text-zinc-400" />
                {perfil.celular}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-sm text-zinc-600">
              <BookOpen className="h-4 w-4 text-zinc-400" />
              {perfil.grupos.length} grupo{perfil.grupos.length !== 1 ? "s" : ""} activo{perfil.grupos.length !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1.5 text-sm text-zinc-600">
              <Users className="h-4 w-4 text-zinc-400" />
              {totalAlumnos} alumno{totalAlumnos !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* ── Groups ───────────────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-3">Mis grupos</h2>

        {perfil.grupos.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center">
            <BookOpen className="h-8 w-8 text-zinc-300 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">No tienes grupos activos asignados.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden divide-y divide-zinc-100">
            {perfil.grupos.map((grupo) => {
              const isOpen = expandedIds.has(grupo.id);
              return (
                <div key={grupo.id}>
                  {/* Group header row */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggle(grupo.id)}
                    onKeyDown={(e) => e.key === "Enter" && toggle(grupo.id)}
                    className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-zinc-50 transition-colors select-none"
                  >
                    <div className="text-zinc-400 shrink-0">
                      {isOpen
                        ? <ChevronDown className="h-4 w-4" />
                        : <ChevronRight className="h-4 w-4" />
                      }
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-zinc-900">{grupo.curso.nombre}</span>
                        <span className="text-xs bg-zinc-100 text-zinc-600 rounded-full px-2 py-0.5 font-medium">
                          Grupo {grupo.numeroGrupo}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-zinc-500">
                          <Clock className="h-3.5 w-3.5" />
                          {grupo.horaInicio}–{grupo.horaFin}
                        </span>
                        <span className="text-xs text-zinc-500">{grupo.aula.nombre}</span>
                        <div className="flex gap-0.5">
                          {grupo.dias.map((dia) => (
                            <span
                              key={dia}
                              className={cn(
                                "inline-flex rounded border px-1.5 py-0 text-[11px] font-medium",
                                DIA_COLORS[dia] ?? "bg-zinc-50 text-zinc-600 border-zinc-200"
                              )}
                            >
                              {DIA_ABREV[dia] ?? dia}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <span className="flex items-center gap-1.5 text-sm text-zinc-500 shrink-0">
                      <Users className="h-4 w-4 text-zinc-400" />
                      {grupo.alumnos.length} alumno{grupo.alumnos.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Student list */}
                  {isOpen && (
                    <div className="bg-zinc-50/60 border-t border-zinc-100">
                      {grupo.alumnos.length === 0 ? (
                        <p className="px-12 py-4 text-sm text-zinc-400">
                          Sin alumnos matriculados en este grupo.
                        </p>
                      ) : (
                        <div className="divide-y divide-zinc-100/80">
                          {/* Header */}
                          <div className="flex items-center px-12 py-1.5">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 w-7 shrink-0">#</span>
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Alumno</span>
                          </div>
                          {grupo.alumnos.map((alumno, idx) => (
                            <div key={alumno.id} className="flex items-center gap-3 px-12 py-2.5 hover:bg-zinc-100/50 transition-colors">
                              <span className="text-xs font-mono text-zinc-300 w-7 shrink-0 text-right">
                                {idx + 1}
                              </span>
                              <span className="text-sm text-zinc-700">
                                {alumno.apellido}, {alumno.nombre}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
