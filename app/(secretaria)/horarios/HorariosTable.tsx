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
import {
  toggleHorarioActivo,
  type HorarioSerialized,
  type HorarioSelectData,
} from "@/lib/actions/horarios";
import { HorarioDialog } from "./HorarioDialog";

type Props = {
  horarios: HorarioSerialized[];
  selectData: HorarioSelectData;
};

const DIA_ABREV: Record<string, string> = {
  Lunes: "Lu",
  Martes: "Ma",
  Miércoles: "Mi",
  Jueves: "Ju",
  Viernes: "Vi",
  Sábado: "Sa",
  Domingo: "Do",
};

export function HorariosTable({ horarios, selectData }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<HorarioSerialized | null>(null);
  const [dialogKey, setDialogKey] = useState(0);

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

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Horarios</h1>
          <p className="text-sm text-zinc-500">
            {horarios.length} horario{horarios.length !== 1 ? "s" : ""} registrado
            {horarios.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo horario
        </Button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50">
              <TableHead>Curso</TableHead>
              <TableHead>Docente</TableHead>
              <TableHead>Aula</TableHead>
              <TableHead>Días</TableHead>
              <TableHead>Horario</TableHead>
              <TableHead>Cupo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {horarios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-zinc-400">
                  No hay horarios registrados. Crea el primero.
                </TableCell>
              </TableRow>
            ) : (
              horarios.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="font-medium text-zinc-900">
                    {h.curso.nombre}
                    {h.curso.nivel && (
                      <span className="ml-1 text-xs text-zinc-400">({h.curso.nivel})</span>
                    )}
                  </TableCell>
                  <TableCell className="text-zinc-600">
                    {h.docente.apellido}, {h.docente.nombre}
                  </TableCell>
                  <TableCell className="text-zinc-600">{h.aula.nombre}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {h.dias.map((dia) => (
                        <Badge key={dia} variant="outline" className="text-xs px-1.5 py-0">
                          {DIA_ABREV[dia] ?? dia}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm whitespace-nowrap">
                    {h.horaInicio}–{h.horaFin}
                  </TableCell>
                  <TableCell>{h.cupoMaximo}</TableCell>
                  <TableCell>
                    <Badge variant={h.activo ? "default" : "secondary"}>
                      {h.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => openEdit(h)}
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => handleToggle(h)}
                        title={h.activo ? "Desactivar" : "Activar"}
                        className={
                          h.activo
                            ? "text-red-500 hover:text-red-600"
                            : "text-green-600 hover:text-green-700"
                        }
                      >
                        {h.activo ? (
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
