"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Pencil, PowerOff, Power, Plus, Search, DoorOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleAulaActiva, type AulaSerialized } from "@/lib/actions/aulas";
import { AulaDialog } from "./AulaDialog";

type Props = { aulas: AulaSerialized[] };

function StatusPill({ active }: { active: boolean }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
      active
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-zinc-100 text-zinc-500 border-zinc-200"
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-emerald-500" : "bg-zinc-400")} />
      {active ? "Activa" : "Inactiva"}
    </span>
  );
}

export function AulasTable({ aulas }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<AulaSerialized | null>(null);
  const [dialogKey, setDialogKey] = useState(0);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return aulas;
    return aulas.filter((a) => a.nombre.toLowerCase().includes(q));
  }, [aulas, search]);

  function openCreate() {
    setSelected(null);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  function openEdit(aula: AulaSerialized) {
    setSelected(aula);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  async function handleToggle(aula: AulaSerialized) {
    await toggleAulaActiva(aula.id, aula.activa);
    toast.success(aula.activa ? "Aula desactivada" : "Aula activada");
  }

  const activas = aulas.filter((a) => a.activa).length;
  const maxCap = Math.max(...aulas.map((a) => a.capacidad), 1);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Aulas</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {activas} activa{activas !== 1 ? "s" : ""} · {aulas.length} total
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          Nueva aula
        </Button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
            <Input
              placeholder="Buscar aula..."
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
              <TableHead className="font-semibold text-zinc-600">Capacidad</TableHead>
              <TableHead className="font-semibold text-zinc-600">Estado</TableHead>
              <TableHead className="text-right font-semibold text-zinc-600">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <div className="flex flex-col items-center justify-center py-14 gap-3">
                    <div className="rounded-full bg-zinc-100 p-4">
                      <DoorOpen className="h-7 w-7 text-zinc-300" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-zinc-500">
                        {search ? "Sin resultados" : "No hay aulas registradas"}
                      </p>
                      <p className="text-xs text-zinc-400 mt-1">
                        {search ? "Prueba con otro nombre" : "Crea la primera usando el botón de arriba"}
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((a) => (
                <TableRow key={a.id} className="transition-colors duration-100 hover:bg-zinc-50/70">
                  <TableCell className="font-medium text-zinc-900">{a.nombre}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-zinc-700 w-20 shrink-0">
                        {a.capacidad} alumnos
                      </span>
                      <div className="flex-1 max-w-[100px] h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-zinc-300"
                          style={{ width: `${(a.capacidad / maxCap) * 100}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><StatusPill active={a.activa} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon-sm" variant="ghost" onClick={() => openEdit(a)} title="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon-sm" variant="ghost"
                        onClick={() => handleToggle(a)}
                        title={a.activa ? "Desactivar" : "Activar"}
                        className={a.activa ? "text-red-400 hover:text-red-600 hover:bg-red-50" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"}
                      >
                        {a.activa ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AulaDialog key={dialogKey} open={dialogOpen} onClose={() => setDialogOpen(false)} aula={selected} />
    </>
  );
}
