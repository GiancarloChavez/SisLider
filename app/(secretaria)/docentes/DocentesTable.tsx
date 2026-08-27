"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Search, UserCheck } from "lucide-react";
import Link from "next/link";
import type { DocenteSerialized } from "@/lib/actions/docentes";
import { DocenteDialog } from "./DocenteDialog";

type Props = { docentes: DocenteSerialized[] };

export function DocentesTable({ docentes }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return docentes;
    return docentes.filter(
      (d) =>
        d.nombre.toLowerCase().includes(q) ||
        d.apellido.toLowerCase().includes(q) ||
        (d.dni ?? "").includes(q)
    );
  }, [docentes, search]);

  function openCreate() {
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Docentes</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {docentes.length} docente{docentes.length !== 1 ? "s" : ""}
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
              <TableHead className="font-semibold text-zinc-600">Apellidos y nombre</TableHead>
              <TableHead className="font-semibold text-zinc-600">DNI</TableHead>
              <TableHead className="font-semibold text-zinc-600">Celular</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3}>
                  <div className="flex flex-col items-center justify-center py-14 gap-3">
                    <div className="rounded-full bg-zinc-100 p-4">
                      <UserCheck className="h-7 w-7 text-zinc-300" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-zinc-500">
                        {search ? "Sin resultados" : "No hay docentes registrados"}
                      </p>
                      <p className="text-xs text-zinc-400 mt-1">
                        {search ? "Prueba con otro término" : "Crea el primero usando el botón de arriba"}
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((d) => (
                <TableRow key={d.id} className="transition-colors duration-100 hover:bg-zinc-50/70">
                  <TableCell>
                    <Link
                      href={`/docentes/${d.id}`}
                      className="font-medium text-zinc-900 hover:text-blue-600 hover:underline transition-colors"
                    >
                      {d.apellido}, {d.nombre}
                    </Link>
                    {d.email && (
                      <p className="text-xs text-zinc-400 font-mono mt-0.5">{d.email}</p>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-zinc-500">
                    {d.dni ?? <span className="text-zinc-300 font-sans">—</span>}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-zinc-500">
                    {d.celular ?? <span className="text-zinc-300 font-sans">—</span>}
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
        docente={null}
      />
    </>
  );
}
