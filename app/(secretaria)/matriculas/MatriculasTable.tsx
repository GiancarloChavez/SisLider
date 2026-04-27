"use client";

import Link from "next/link";
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
import { Plus, PowerOff, Power } from "lucide-react";
// Button import kept — used for toggle action
import { toggleMatriculaEstado, type MatriculaSerialized } from "@/lib/actions/matriculas";

const DIA_ABREV: Record<string, string> = {
  Lunes: "Lu", Martes: "Ma", Miércoles: "Mi",
  Jueves: "Ju", Viernes: "Vi", Sábado: "Sa", Domingo: "Do",
};
const DIA_ORDER = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

type Props = { matriculas: MatriculaSerialized[] };

export function MatriculasTable({ matriculas }: Props) {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleToggle(m: MatriculaSerialized) {
    setLoading(m.id);
    await toggleMatriculaEstado(m.id, m.estado);
    toast.success(m.estado === "activa" ? "Matrícula dada de baja" : "Matrícula reactivada");
    setLoading(null);
  }

  const activas = matriculas.filter((m) => m.estado === "activa").length;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Matrículas</h1>
          <p className="text-sm text-zinc-500">
            {activas} activa{activas !== 1 ? "s" : ""} · {matriculas.length} total
          </p>
        </div>
        <Link
          href="/matriculas/nueva"
          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium transition-colors hover:bg-primary/80"
        >
          <Plus className="h-4 w-4" />
          Nueva matrícula
        </Link>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50">
              <TableHead>Alumno</TableHead>
              <TableHead>Curso</TableHead>
              <TableHead>Horario</TableHead>
              <TableHead>Precio / mes</TableHead>
              <TableHead>Desde</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {matriculas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-zinc-400">
                  No hay matrículas registradas. Crea la primera.
                </TableCell>
              </TableRow>
            ) : (
              matriculas.map((m) => (
                <TableRow key={m.id} className={m.estado !== "activa" ? "opacity-60" : ""}>
                  <TableCell className="font-medium text-zinc-900">
                    {m.alumno.apellido}, {m.alumno.nombre}
                    {m.alumno.dni && (
                      <span className="block text-xs font-mono text-zinc-400">{m.alumno.dni}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-zinc-800">{m.horario.curso.nombre}</span>
                    {m.horario.curso.nivel && (
                      <span className="block text-xs text-zinc-400">{m.horario.curso.nivel}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 mb-0.5">
                      {[...m.horario.dias]
                        .sort((a, b) => DIA_ORDER.indexOf(a) - DIA_ORDER.indexOf(b))
                        .map((d) => (
                          <Badge key={d} variant="outline" className="text-xs px-1.5 py-0">
                            {DIA_ABREV[d] ?? d}
                          </Badge>
                        ))}
                    </div>
                    <span className="text-xs font-mono text-zinc-400">
                      {m.horario.horaInicio}–{m.horario.horaFin}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono font-semibold text-zinc-900">
                    S/{m.precioFinalMensual.toFixed(2)}
                    {m.descuento && (
                      <span className="block text-xs font-sans font-normal text-green-600">
                        {m.descuento.nombre}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-500">
                    {new Date(m.fechaInicio).toLocaleDateString("es-PE", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.estado === "activa" ? "default" : "secondary"}>
                      {m.estado === "activa" ? "Activa" : "Inactiva"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      disabled={loading === m.id}
                      onClick={() => handleToggle(m)}
                      title={m.estado === "activa" ? "Dar de baja" : "Reactivar"}
                      className={
                        m.estado === "activa"
                          ? "text-red-500 hover:text-red-600"
                          : "text-green-600 hover:text-green-700"
                      }
                    >
                      {m.estado === "activa" ? (
                        <PowerOff className="h-3.5 w-3.5" />
                      ) : (
                        <Power className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
