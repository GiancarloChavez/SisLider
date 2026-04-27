"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, PowerOff, Power, Plus } from "lucide-react";
import { toggleDocenteActivo, type DocenteSerialized } from "@/lib/actions/docentes";
import { DocenteDialog } from "./DocenteDialog";

type Props = {
  docentes: DocenteSerialized[];
};

export function DocentesTable({ docentes }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<DocenteSerialized | null>(null);
  const [dialogKey, setDialogKey] = useState(0);

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

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Docentes</h1>
          <p className="text-sm text-zinc-500">
            {docentes.length} docente{docentes.length !== 1 ? "s" : ""} registrado
            {docentes.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo docente
        </Button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50">
              <TableHead>Apellidos y nombre</TableHead>
              <TableHead>Especialidad</TableHead>
              <TableHead>Celular</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {docentes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-zinc-400">
                  No hay docentes registrados. Crea el primero.
                </TableCell>
              </TableRow>
            ) : (
              docentes.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium text-zinc-900">
                    {d.apellido}, {d.nombre}
                  </TableCell>
                  <TableCell className="text-zinc-500">
                    {d.especialidad ?? <span className="text-zinc-300">—</span>}
                  </TableCell>
                  <TableCell className="text-zinc-500 font-mono text-sm">
                    {d.celular ?? <span className="text-zinc-300 font-sans">—</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={d.activo ? "default" : "secondary"}>
                      {d.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => openEdit(d)}
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => handleToggle(d)}
                        title={d.activo ? "Desactivar" : "Activar"}
                        className={
                          d.activo
                            ? "text-red-500 hover:text-red-600"
                            : "text-green-600 hover:text-green-700"
                        }
                      >
                        {d.activo ? (
                          <PowerOff className="h-3.5 w-3.5" />
                        ) : (
                          <Power className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DocenteDialog
        key={dialogKey}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        docente={selected}
      />
    </>
  );
}
