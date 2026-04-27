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
import { Pencil, UserCheck, UserX, Plus } from "lucide-react";
import { toggleAlumnoHabilitado, type AlumnoSerialized } from "@/lib/actions/alumnos";
import { AlumnoDialog } from "./AlumnoDialog";

type Props = {
  alumnos: AlumnoSerialized[];
};

export function AlumnosTable({ alumnos }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<AlumnoSerialized | null>(null);

  function openCreate() {
    setSelected(null);
    setDialogOpen(true);
  }

  function openEdit(alumno: AlumnoSerialized) {
    setSelected(alumno);
    setDialogOpen(true);
  }

  async function handleToggle(alumno: AlumnoSerialized) {
    await toggleAlumnoHabilitado(alumno.id, alumno.habilitado);
    toast.success(alumno.habilitado ? "Alumno deshabilitado" : "Alumno habilitado");
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Alumnos</h1>
          <p className="text-sm text-zinc-500">
            {alumnos.length} alumno{alumnos.length !== 1 ? "s" : ""} registrado
            {alumnos.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo alumno
        </Button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50">
              <TableHead>Alumno</TableHead>
              <TableHead>DNI</TableHead>
              <TableHead>Tutor / Apoderado</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alumnos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-zinc-400">
                  No hay alumnos registrados. Crea el primero.
                </TableCell>
              </TableRow>
            ) : (
              alumnos.map((alumno) => (
                <TableRow key={alumno.id}>
                  <TableCell className="font-medium text-zinc-900">
                    {alumno.apellido}, {alumno.nombre}
                  </TableCell>
                  <TableCell className="font-mono text-zinc-500">
                    {alumno.dni ?? <span className="text-zinc-300">—</span>}
                  </TableCell>
                  <TableCell className="text-zinc-700">
                    {alumno.tutor ? (
                      <span>
                        {alumno.tutor.apellido}, {alumno.tutor.nombre}{" "}
                        <span className="text-zinc-400 text-xs">({alumno.tutor.relacion})</span>
                      </span>
                    ) : (
                      <span className="text-zinc-300">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-zinc-500 font-mono text-sm">
                    {alumno.tutor?.celular ?? <span className="text-zinc-300">—</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={alumno.habilitado ? "default" : "secondary"}>
                      {alumno.habilitado ? "Habilitado" : "Deshabilitado"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => openEdit(alumno)}
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => handleToggle(alumno)}
                        title={alumno.habilitado ? "Deshabilitar" : "Habilitar"}
                        className={
                          alumno.habilitado
                            ? "text-red-500 hover:text-red-600"
                            : "text-green-600 hover:text-green-700"
                        }
                      >
                        {alumno.habilitado ? (
                          <UserX className="h-3.5 w-3.5" />
                        ) : (
                          <UserCheck className="h-3.5 w-3.5" />
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

      <AlumnoDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        alumno={selected}
      />
    </>
  );
}
