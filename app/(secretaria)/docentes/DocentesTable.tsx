"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Pencil, PowerOff, Power, Plus, Search, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleDocenteActivo, type DocenteSerialized } from "@/lib/actions/docentes";
import { DocenteDialog } from "./DocenteDialog";

type Props = { docentes: DocenteSerialized[] };

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

export function DocentesTable({ docentes }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<DocenteSerialized | null>(null);
  const [dialogKey, setDialogKey] = useState(0);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return docentes;
    return docentes.filter(
      (d) =>
        d.nombre.toLowerCase().includes(q) ||
        d.apellido.toLowerCase().includes(q) ||
        (d.especialidad ?? "").toLowerCase().includes(q)
    );
  }, [docentes, search]);

  function openCreate() {
    setSelected(null);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  function openEdit(docente: DocenteSerialized) {
    setSelected(docente);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  async function handleToggle(docente: DocenteSerialized) {
    await toggleDocenteActivo(docente.id, docente.activo);
    toast.success(docente.activo ? "Docente desactivado" : "Docente activado");
  }

  const activos = docentes.filter((d) => d.activo).length;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Docentes</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {activos} activo{activos !== 1 ? "s" : ""} · {docentes.length} total
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          Nuevo docente
        </Button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
            <Input
              placeholder="Buscar por nombre o especialidad..."
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
              <TableHead className="font-semibold text-zinc-600">Apellidos y nombre</TableHead>
              <TableHead className="font-semibold text-zinc-600">Especialidad</TableHead>
              <TableHead className="font-semibold text-zinc-600">Celular</TableHead>
              <TableHead className="font-semibold text-zinc-600">Estado</TableHead>
              <TableHead className="text-right font-semibold text-zinc-600">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <div className="flex flex-col items-center justify-center py-14 gap-3">
                    <div className="rounded-full bg-zinc-100 p-4">
                      <UserCheck className="h-7 w-7 text-zinc-300" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-zinc-500">
                        {search ? "Sin resultados" : "No hay docentes registrados"}
                      </p>
                      <p className="text-xs text-zinc-400 mt-1">
                        {search ? "Prueba con otro término de búsqueda" : "Crea el primero usando el botón de arriba"}
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((d) => (
                <TableRow key={d.id} className="transition-colors duration-100 hover:bg-zinc-50/70">
                  <TableCell>
                    <p className="font-medium text-zinc-900">{d.apellido}, {d.nombre}</p>
                  </TableCell>
                  <TableCell className="text-zinc-500">
                    {d.especialidad ?? <span className="text-zinc-300">—</span>}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-zinc-500">
                    {d.celular ?? <span className="text-zinc-300 font-sans">—</span>}
                  </TableCell>
                  <TableCell><StatusPill active={d.activo} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon-sm" variant="ghost" onClick={() => openEdit(d)} title="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon-sm" variant="ghost"
                        onClick={() => handleToggle(d)}
                        title={d.activo ? "Desactivar" : "Activar"}
                        className={d.activo ? "text-red-400 hover:text-red-600 hover:bg-red-50" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"}
                      >
                        {d.activo ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DocenteDialog key={dialogKey} open={dialogOpen} onClose={() => setDialogOpen(false)} docente={selected} />
    </>
  );
}
