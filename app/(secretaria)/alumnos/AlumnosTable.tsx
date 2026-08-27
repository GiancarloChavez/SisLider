"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Search, Users } from "lucide-react";
import { type AlumnoSerialized } from "@/lib/actions/alumnos";
import { AlumnoDialog } from "./AlumnoDialog";

type Props = { alumnos: AlumnoSerialized[]; autoOpen?: boolean };

function calcularEdad(fechaNacimiento: string | null): number | null {
  if (!fechaNacimiento) return null;
  const hoy = new Date();
  const nac = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nac.getUTCFullYear();
  const diffMes = hoy.getMonth() - nac.getUTCMonth();
  if (diffMes < 0 || (diffMes === 0 && hoy.getDate() < nac.getUTCDate())) edad--;
  return edad >= 0 ? edad : null;
}

export function AlumnosTable({ alumnos, autoOpen }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return alumnos;
    return alumnos.filter(
      (a) =>
        a.nombre.toLowerCase().includes(q) ||
        a.apellido.toLowerCase().includes(q) ||
        (a.dni ?? "").includes(q)
    );
  }, [alumnos, search]);

  useEffect(() => {
    if (autoOpen) openCreate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Alumnos</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {alumnos.length} alumno{alumnos.length !== 1 ? "s" : ""} registrado{alumnos.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          Nuevo alumno
        </Button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
            <Input
              placeholder="Buscar por nombre o DNI..."
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
              <TableHead className="font-semibold text-zinc-600">Alumno</TableHead>
              <TableHead className="font-semibold text-zinc-600 w-16 text-center">Edad</TableHead>
              <TableHead className="font-semibold text-zinc-600">DNI</TableHead>
              <TableHead className="font-semibold text-zinc-600">Apoderado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <div className="flex flex-col items-center justify-center py-14 gap-3">
                    <div className="rounded-full bg-zinc-100 p-4">
                      <Users className="h-7 w-7 text-zinc-300" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-zinc-500">
                        {search ? "Sin resultados" : "No hay alumnos registrados"}
                      </p>
                      <p className="text-xs text-zinc-400 mt-1">
                        {search ? "Prueba con otro nombre o DNI" : "Crea el primero usando el botón de arriba"}
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((alumno) => {
                const edad = calcularEdad(alumno.fechaNacimiento);
                return (
                  <TableRow key={alumno.id} className="transition-colors duration-100 hover:bg-zinc-50/70">
                    <TableCell>
                      <Link
                        href={`/alumnos/${alumno.id}`}
                        className="font-medium text-zinc-900 hover:text-blue-600 hover:underline transition-colors"
                      >
                        {alumno.apellido}, {alumno.nombre}
                      </Link>
                      {alumno.celular && (
                        <p className="text-xs font-mono text-zinc-400 mt-0.5">{alumno.celular}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {edad !== null ? (
                        <span className="inline-flex items-center justify-center rounded-full bg-zinc-100 text-zinc-600 text-xs font-semibold w-7 h-7">
                          {edad}
                        </span>
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
                            <span className="ml-1 text-xs text-zinc-400">({alumno.tutor.relacion})</span>
                          </p>
                          <p className="text-xs font-mono text-zinc-400 mt-0.5">{alumno.tutor.celular}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-400 italic">Autónomo</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AlumnoDialog key={dialogKey} open={dialogOpen} onClose={() => setDialogOpen(false)} alumno={null} />
    </>
  );
}
