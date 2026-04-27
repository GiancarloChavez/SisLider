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
import { toggleAulaActiva, type AulaSerialized } from "@/lib/actions/aulas";
import { AulaDialog } from "./AulaDialog";

type Props = {
  aulas: AulaSerialized[];
};

export function AulasTable({ aulas }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<AulaSerialized | null>(null);

  function openCreate() {
    setSelected(null);
    setDialogOpen(true);
  }

  function openEdit(aula: AulaSerialized) {
    setSelected(aula);
    setDialogOpen(true);
  }

  async function handleToggle(aula: AulaSerialized) {
    await toggleAulaActiva(aula.id, aula.activa);
    toast.success(aula.activa ? "Aula desactivada" : "Aula activada");
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Aulas</h1>
          <p className="text-sm text-zinc-500">
            {aulas.length} aula{aulas.length !== 1 ? "s" : ""} registrada
            {aulas.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva aula
        </Button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50">
              <TableHead>Nombre</TableHead>
              <TableHead>Capacidad</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {aulas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-zinc-400">
                  No hay aulas registradas. Crea la primera.
                </TableCell>
              </TableRow>
            ) : (
              aulas.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium text-zinc-900">{a.nombre}</TableCell>
                  <TableCell className="text-zinc-600">{a.capacidad} alumnos</TableCell>
                  <TableCell>
                    <Badge variant={a.activa ? "default" : "secondary"}>
                      {a.activa ? "Activa" : "Inactiva"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => openEdit(a)}
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => handleToggle(a)}
                        title={a.activa ? "Desactivar" : "Activar"}
                        className={
                          a.activa
                            ? "text-red-500 hover:text-red-600"
                            : "text-green-600 hover:text-green-700"
                        }
                      >
                        {a.activa ? (
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

      <AulaDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        aula={selected}
      />
    </>
  );
}
