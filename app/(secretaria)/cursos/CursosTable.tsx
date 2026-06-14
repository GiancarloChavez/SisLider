"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Pencil, PowerOff, Power, Plus, Search, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleCursoActivo, type CursoSerialized } from "@/lib/actions/cursos";
import { CursoDialog } from "./CursoDialog";

type Props = { cursos: CursoSerialized[] };

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-PE", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function getPeriodoEstado(fechaInicio: string, fechaFin: string) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const inicio = new Date(fechaInicio + "T00:00:00");
  const fin = new Date(fechaFin + "T00:00:00");
  if (hoy < inicio) return "proximo";
  if (hoy > fin) return "finalizado";
  return "vigente";
}

function PeriodoPill({ estado }: { estado: "vigente" | "proximo" | "finalizado" }) {
  const map = {
    vigente: "bg-emerald-50 text-emerald-700 border-emerald-200",
    proximo: "bg-blue-50 text-blue-700 border-blue-200",
    finalizado: "bg-zinc-100 text-zinc-500 border-zinc-200",
  };
  const label = { vigente: "Vigente", proximo: "Próximo", finalizado: "Finalizado" };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", map[estado])}>
      {label[estado]}
    </span>
  );
}

export function CursosTable({ cursos }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<CursoSerialized | null>(null);
  const [dialogKey, setDialogKey] = useState(0);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cursos;
    return cursos.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        (c.nivel ?? "").toLowerCase().includes(q)
    );
  }, [cursos, search]);

  function openCreate() {
    setSelected(null);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  function openEdit(curso: CursoSerialized) {
    setSelected(curso);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  async function handleToggle(curso: CursoSerialized) {
    await toggleCursoActivo(curso.id, curso.activo);
    toast.success(curso.activo ? "Curso desactivado" : "Curso activado");
  }

  const activos = cursos.filter((c) => c.activo).length;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Cursos</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {activos} activo{activos !== 1 ? "s" : ""} · {cursos.length} total
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          Nuevo curso
        </Button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
            <Input
              placeholder="Buscar por nombre o nivel..."
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
              <TableHead className="font-semibold text-zinc-600">Nombre</TableHead>
              <TableHead className="font-semibold text-zinc-600">Nivel</TableHead>
              <TableHead className="font-semibold text-zinc-600">Período</TableHead>
              <TableHead className="font-semibold text-zinc-600">Precio mensual</TableHead>
              <TableHead className="font-semibold text-zinc-600">Estado</TableHead>
              <TableHead className="text-right font-semibold text-zinc-600">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="flex flex-col items-center justify-center py-14 gap-3">
                    <div className="rounded-full bg-zinc-100 p-4">
                      <GraduationCap className="h-7 w-7 text-zinc-300" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-zinc-500">
                        {search ? "Sin resultados" : "No hay cursos registrados"}
                      </p>
                      <p className="text-xs text-zinc-400 mt-1">
                        {search ? "Prueba con otro término" : "Crea el primero usando el botón de arriba"}
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((curso) => {
                const estado = getPeriodoEstado(curso.fechaInicio, curso.fechaFin);
                return (
                  <TableRow key={curso.id} className={cn("transition-colors duration-100 hover:bg-zinc-50/70", !curso.activo && "opacity-55")}>
                    <TableCell className="font-medium text-zinc-900">{curso.nombre}</TableCell>
                    <TableCell className="text-zinc-500">
                      {curso.nivel ?? <span className="text-zinc-300">—</span>}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-zinc-700">
                        {fmtDate(curso.fechaInicio)} → {fmtDate(curso.fechaFin)}
                      </p>
                      <div className="mt-1">
                        <PeriodoPill estado={estado} />
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-zinc-700 font-medium">
                      S/{Number(curso.precioMensual).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                        curso.activo
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-zinc-100 text-zinc-500 border-zinc-200"
                      )}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", curso.activo ? "bg-emerald-500" : "bg-zinc-400")} />
                        {curso.activo ? "Activo" : "Inactivo"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon-sm" variant="ghost" onClick={() => openEdit(curso)} title="Editar">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon-sm" variant="ghost"
                          onClick={() => handleToggle(curso)}
                          title={curso.activo ? "Desactivar" : "Activar"}
                          className={curso.activo ? "text-red-400 hover:text-red-600 hover:bg-red-50" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"}
                        >
                          {curso.activo ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <CursoDialog key={dialogKey} open={dialogOpen} onClose={() => setDialogOpen(false)} curso={selected} />
    </>
  );
}
