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
import { toggleCursoActivo, type CursoSerialized } from "@/lib/actions/cursos";
import { CursoDialog } from "./CursoDialog";

type Props = {
  cursos: CursoSerialized[];
};

export function CursosTable({ cursos }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<CursoSerialized | null>(null);
  const [dialogKey, setDialogKey] = useState(0);

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

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Cursos</h1>
          <p className="text-sm text-zinc-500">{cursos.length} curso{cursos.length !== 1 ? "s" : ""} registrado{cursos.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo curso
        </Button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50">
              <TableHead>Nombre</TableHead>
              <TableHead>Nivel</TableHead>
              <TableHead>Precio mensual</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cursos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-zinc-400">
                  No hay cursos registrados. Crea el primero.
                </TableCell>
              </TableRow>
            ) : (
              cursos.map((curso) => (
                <TableRow key={curso.id}>
                  <TableCell className="font-medium text-zinc-900">
                    {curso.nombre}
                  </TableCell>
                  <TableCell className="text-zinc-500">
                    {curso.nivel ?? <span className="text-zinc-300">—</span>}
                  </TableCell>
                  <TableCell className="font-mono">
                    S/{Number(curso.precioMensual).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={curso.activo ? "default" : "secondary"}>
                      {curso.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => openEdit(curso)}
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => handleToggle(curso)}
                        title={curso.activo ? "Desactivar" : "Activar"}
                        className={curso.activo ? "text-red-500 hover:text-red-600" : "text-green-600 hover:text-green-700"}
                      >
                        {curso.activo ? (
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

      <CursoDialog
        key={dialogKey}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        curso={selected}
      />
    </>
  );
}
