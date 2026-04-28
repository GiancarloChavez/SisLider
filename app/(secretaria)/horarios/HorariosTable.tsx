"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Pencil, PowerOff, Power, Plus, Search, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  toggleHorarioActivo,
  type HorarioSerialized,
  type HorarioSelectData,
} from "@/lib/actions/horarios";
import { HorarioDialog } from "./HorarioDialog";

type Props = { horarios: HorarioSerialized[]; selectData: HorarioSelectData };

const DIA_ABREV: Record<string, string> = {
  Lunes: "Lu", Martes: "Ma", Miércoles: "Mi",
  Jueves: "Ju", Viernes: "Vi", Sábado: "Sa", Domingo: "Do",
};

const DIA_COLORS: Record<string, string> = {
  Lunes: "bg-blue-50 text-blue-700 border-blue-200",
  Martes: "bg-violet-50 text-violet-700 border-violet-200",
  Miércoles: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Jueves: "bg-orange-50 text-orange-700 border-orange-200",
  Viernes: "bg-pink-50 text-pink-700 border-pink-200",
  Sábado: "bg-teal-50 text-teal-700 border-teal-200",
  Domingo: "bg-zinc-50 text-zinc-600 border-zinc-200",
};

function StatusPill({ active }: { active: boolean }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
      active
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-zinc-100 text-zinc-500 border-zinc-200"
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-emerald-500" : "bg-zinc-400")} />
      {active ? "Activo" : "Inactivo"}
    </span>
  );
}

export function HorariosTable({ horarios, selectData }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<HorarioSerialized | null>(null);
  const [dialogKey, setDialogKey] = useState(0);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return horarios;
    return horarios.filter(
      (h) =>
        h.curso.nombre.toLowerCase().includes(q) ||
        h.docente.apellido.toLowerCase().includes(q) ||
        h.docente.nombre.toLowerCase().includes(q) ||
        h.aula.nombre.toLowerCase().includes(q)
    );
  }, [horarios, search]);

  function openCreate() {
    setSelected(null);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  function openEdit(horario: HorarioSerialized) {
    setSelected(horario);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  async function handleToggle(horario: HorarioSerialized) {
    await toggleHorarioActivo(horario.id, horario.activo);
    toast.success(horario.activo ? "Horario desactivado" : "Horario activado");
  }

  const activos = horarios.filter((h) => h.activo).length;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Horarios</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {activos} activo{activos !== 1 ? "s" : ""} · {horarios.length} total
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          Nuevo horario
        </Button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
            <Input
              placeholder="Buscar por curso, docente o aula..."
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
              <TableHead className="font-semibold text-zinc-600">Curso</TableHead>
              <TableHead className="font-semibold text-zinc-600">Docente</TableHead>
              <TableHead className="font-semibold text-zinc-600">Aula</TableHead>
              <TableHead className="font-semibold text-zinc-600">Días</TableHead>
              <TableHead className="font-semibold text-zinc-600">Horario</TableHead>
              <TableHead className="font-semibold text-zinc-600 text-center">Cupo</TableHead>
              <TableHead className="font-semibold text-zinc-600">Estado</TableHead>
              <TableHead className="text-right font-semibold text-zinc-600">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <div className="flex flex-col items-center justify-center py-14 gap-3">
                    <div className="rounded-full bg-zinc-100 p-4">
                      <CalendarDays className="h-7 w-7 text-zinc-300" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-zinc-500">
                        {search ? "Sin resultados" : "No hay horarios registrados"}
                      </p>
                      <p className="text-xs text-zinc-400 mt-1">
                        {search ? "Prueba con otro término" : "Crea el primero usando el botón de arriba"}
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((h) => (
                <TableRow key={h.id} className="transition-colors duration-100 hover:bg-zinc-50/70">
                  <TableCell>
                    <p className="font-medium text-zinc-900">{h.curso.nombre}</p>
                    {h.curso.nivel && (
                      <p className="text-xs text-zinc-400 mt-0.5">{h.curso.nivel}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-zinc-600 text-sm">
                    {h.docente.apellido}, {h.docente.nombre}
                  </TableCell>
                  <TableCell className="text-zinc-600 text-sm">{h.aula.nombre}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {h.dias.map((dia) => (
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
                  </TableCell>
                  <TableCell className="font-mono text-sm text-zinc-700 whitespace-nowrap">
                    {h.horaInicio}–{h.horaFin}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center justify-center rounded-full bg-zinc-100 text-zinc-700 text-xs font-semibold w-8 h-8">
                      {h.cupoMaximo}
                    </span>
                  </TableCell>
                  <TableCell><StatusPill active={h.activo} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon-sm" variant="ghost" onClick={() => openEdit(h)} title="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon-sm" variant="ghost"
                        onClick={() => handleToggle(h)}
                        title={h.activo ? "Desactivar" : "Activar"}
                        className={h.activo ? "text-red-400 hover:text-red-600 hover:bg-red-50" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"}
                      >
                        {h.activo ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <HorarioDialog
        key={dialogKey}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        horario={selected}
        selectData={selectData}
      />
    </>
  );
}
