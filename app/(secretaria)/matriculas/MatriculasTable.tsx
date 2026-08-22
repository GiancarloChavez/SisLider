"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Search, ClipboardList, Users, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CursoConMatriculas } from "@/lib/actions/matriculas";

const DIA_ABREV: Record<string, string> = {
  Lunes: "Lu", Martes: "Ma", Miércoles: "Mi",
  Jueves: "Ju", Viernes: "Vi", Sábado: "Sa", Domingo: "Do",
};
const DIA_ORDER = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

type Props = { cursos: CursoConMatriculas[] };

export function MatriculasTable({ cursos }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cursos;
    return cursos.filter((c) => c.nombre.toLowerCase().includes(q));
  }, [cursos, search]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const totalAlumnos = cursos.reduce((s, c) => s + c.totalAlumnos, 0);
  const activos = cursos.filter((c) => c.activo).length;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Matrículas</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {activos} curso{activos !== 1 ? "s" : ""} activo{activos !== 1 ? "s" : ""} · {totalAlumnos} alumno{totalAlumnos !== 1 ? "s" : ""} matriculado{totalAlumnos !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => router.push("/matriculas/nueva")} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          Nueva matrícula
        </Button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
            <Input
              placeholder="Buscar por nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm bg-zinc-50 border-zinc-200"
            />
          </div>
          {search && (
            <span className="text-xs text-zinc-400 shrink-0">
              {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 hover:bg-zinc-50">
              <TableHead className="w-8" />
              <TableHead className="font-semibold text-zinc-600">Curso</TableHead>
              <TableHead className="font-semibold text-zinc-600">Inscritos / Cupo</TableHead>
              <TableHead className="font-semibold text-zinc-600">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <div className="flex flex-col items-center justify-center py-14 gap-3">
                    <div className="rounded-full bg-zinc-100 p-4">
                      <ClipboardList className="h-7 w-7 text-zinc-300" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-zinc-500">
                        {search ? "Sin resultados" : "No hay cursos registrados"}
                      </p>
                      <p className="text-xs text-zinc-400 mt-1">
                        {search ? "Prueba con otro término" : "Crea cursos primero en la sección Cursos"}
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.flatMap((c) => {
                const isExpanded = expanded.has(c.id);
                const libreTotal = c.cupoTotal - c.totalAlumnos;

                return [
                  <TableRow
                    key={c.id}
                    className={cn(
                      "cursor-pointer transition-colors hover:bg-zinc-50/70",
                      !c.activo && "opacity-55"
                    )}
                    onClick={() => c.horarios.length > 0 && toggleExpand(c.id)}
                  >
                    <TableCell>
                      {c.horarios.length > 0 ? (
                        isExpanded
                          ? <ChevronDown className="h-4 w-4 text-zinc-400" />
                          : <ChevronRight className="h-4 w-4 text-zinc-400" />
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold text-zinc-900">{c.nombre}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-zinc-400" />
                        <span className="text-sm font-medium text-zinc-800">
                          {c.totalAlumnos}
                        </span>
                        {c.cupoTotal > 0 && (
                          <span className="text-xs text-zinc-400">/ {c.cupoTotal}</span>
                        )}
                        {c.cupoTotal > 0 && (
                          <span className={cn(
                            "text-xs font-medium ml-1",
                            libreTotal > 0 ? "text-green-600" : "text-red-500"
                          )}>
                            ({libreTotal > 0 ? `${libreTotal} libres` : "lleno"})
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                        c.activo
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-zinc-100 text-zinc-500 border-zinc-200"
                      )}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", c.activo ? "bg-emerald-500" : "bg-zinc-400")} />
                        {c.activo ? "Activo" : "Inactivo"}
                      </span>
                    </TableCell>
                  </TableRow>,
                  ...(isExpanded && c.horarios.length > 0
                    ? c.horarios.map((h) => (
                        <TableRow key={h.id} className="bg-zinc-50/60 hover:bg-zinc-50">
                          <TableCell />
                          <TableCell colSpan={2}>
                            <div className="pl-4 flex items-center gap-3 text-sm text-zinc-600">
                              <span className="font-medium">{h.docente.apellido}, {h.docente.nombre}</span>
                              <span className="text-zinc-300">·</span>
                              <span>{h.aula.nombre}</span>
                              <span className="text-zinc-300">·</span>
                              <span className="font-mono text-xs">{h.horaInicio}–{h.horaFin}</span>
                              <span className="text-zinc-300">·</span>
                              <span className="text-zinc-500">Grupo {h.numeroGrupo}</span>
                              <span className="text-zinc-300">·</span>
                              <span className="font-mono font-semibold text-zinc-700">S/{h.precioMensual.toFixed(2)}/mes</span>
                              <span className="flex gap-1">
                                {[...h.dias]
                                  .sort((a, b) => DIA_ORDER.indexOf(a) - DIA_ORDER.indexOf(b))
                                  .map((d) => (
                                    <span key={d} className="inline-flex rounded border border-zinc-200 bg-white px-1.5 py-0 text-[11px] font-medium text-zinc-600">
                                      {DIA_ABREV[d] ?? d}
                                    </span>
                                  ))}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={cn(
                              "text-xs font-medium",
                              h.alumnosActivos < h.aula.capacidad ? "text-green-600" : "text-red-500"
                            )}>
                              {h.alumnosActivos}/{h.aula.capacidad} inscritos
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    : []),
                ];
              })
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
