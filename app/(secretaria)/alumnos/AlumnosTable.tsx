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

function calcularEdad(fechaNacimiento: string | null): number | null {
  if (!fechaNacimiento) return null;
  const hoy = new Date();
  const nac = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nac.getUTCFullYear();
  const diffMes = hoy.getMonth() - nac.getUTCMonth();
  if (diffMes < 0 || (diffMes === 0 && hoy.getDate() < nac.getUTCDate())) edad--;
  return edad >= 0 ? edad : null;
}

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
              <TableHead className="w-16 text-center">Edad</TableHead>
              <TableHead>DNI</TableHead>
              <TableHead>Apoderado</TableHead>
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
              alumnos.map((alumno) => {
                const edad = calcularEdad(alumno.fechaNacimiento);
                return (
                  <TableRow key={alumno.id}>
                    <TableCell>
                      <p className="font-medium text-zinc-900">
                        {alumno.apellido}, {alumno.nombre}
                      </p>
                      {alumno.celular && (
                        <p className="text-xs font-mono text-zinc-400 mt-0.5">
                          {alumno.celular}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {edad !== null ? (
                        <span className="text-sm font-semibold text-zinc-700">{edad}</span>
                      ) : (
                        <span className="text-zinc-300">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-zinc-500">
                      {alumno.dni ?? <span className="text-zinc-300">—</span>}
                    </TableCell>
                    <TableCell>
                      {alumno.tutor ? (
                        <div>
                          <p className="text-sm text-zinc-800">
                            {alumno.tutor.apellido}, {alumno.tutor.nombre}
                            <span className="ml-1 text-xs text-zinc-400">
                              ({alumno.tutor.relacion})
                            </span>
                          </p>
                          <p className="text-xs font-mono text-zinc-400 mt-0.5">
                            {alumno.tutor.celular}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-400 italic">Autónomo</span>
                      )}
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
                );
              })
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
