"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, ChevronRight, AlertCircle, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AlumnoPagoResumen } from "@/lib/actions/pagos";

type Props = { alumnos: AlumnoPagoResumen[] };

export function PagosTable({ alumnos }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [soloDeudores, setSoloDeudores] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = alumnos;
    if (soloDeudores) list = list.filter((a) => a.totalPendiente > 0);
    if (!q) return list;
    return list.filter(
      (a) =>
        a.nombre.toLowerCase().includes(q) ||
        a.apellido.toLowerCase().includes(q) ||
        (a.dni ?? "").includes(q)
    );
  }, [alumnos, query, soloDeudores]);

  const conDeuda = alumnos.filter((a) => a.totalPendiente > 0).length;
  const totalDeuda = alumnos.reduce((s, a) => s + a.totalPendiente, 0);

  return (
    <>
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Pagos</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {alumnos.length} alumno{alumnos.length !== 1 ? "s" : ""} con matrícula activa
          </p>
        </div>
        {conDeuda > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-right">
            <p className="text-xs font-medium text-red-500 uppercase tracking-wide">Total por cobrar</p>
            <p className="text-xl font-bold font-mono text-red-600 mt-0.5">S/{totalDeuda.toFixed(2)}</p>
            <p className="text-xs text-red-400 mt-0.5">{conDeuda} alumno{conDeuda !== 1 ? "s" : ""} con deuda</p>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
            <Input
              placeholder="Buscar por nombre o DNI..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8 h-8 text-sm bg-zinc-50 border-zinc-200"
            />
          </div>
          <Button
            variant={soloDeudores ? "default" : "outline"}
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setSoloDeudores((v) => !v)}
          >
            <AlertCircle className="h-3.5 w-3.5" />
            Solo con deuda
            {conDeuda > 0 && (
              <span className={cn(
                "rounded-full px-1.5 py-0 text-[10px] font-bold",
                soloDeudores ? "bg-white/20 text-white" : "bg-red-100 text-red-600"
              )}>
                {conDeuda}
              </span>
            )}
          </Button>
          {(query || soloDeudores) && (
            <span className="text-xs text-zinc-400 shrink-0">
              {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 hover:bg-zinc-50">
              <TableHead className="font-semibold text-zinc-600">Alumno</TableHead>
              <TableHead className="font-semibold text-zinc-600">DNI</TableHead>
              <TableHead className="text-center font-semibold text-zinc-600">Matrículas</TableHead>
              <TableHead className="text-right font-semibold text-zinc-600">Saldo pendiente</TableHead>
              <TableHead className="font-semibold text-zinc-600">Estado</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="flex flex-col items-center justify-center py-14 gap-3">
                    <div className="rounded-full bg-zinc-100 p-4">
                      <CreditCard className="h-7 w-7 text-zinc-300" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-zinc-500">
                        {query || soloDeudores ? "Sin resultados" : "No hay alumnos con matrícula"}
                      </p>
                      <p className="text-xs text-zinc-400 mt-1">
                        {query || soloDeudores ? "Prueba con otro filtro" : "Los alumnos matriculados aparecerán aquí"}
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((a) => (
                <TableRow
                  key={a.id}
                  className="cursor-pointer transition-colors duration-100 hover:bg-zinc-50/80 group"
                  onClick={() => router.push(`/pagos/${a.id}`)}
                >
                  <TableCell className="font-medium text-zinc-900">
                    {a.apellido}, {a.nombre}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-zinc-500">
                    {a.dni ?? <span className="text-zinc-300">—</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center justify-center rounded-full bg-zinc-100 text-zinc-700 text-xs font-semibold w-7 h-7">
                      {a.matriculasActivas}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {a.totalPendiente > 0 ? (
                      <span className="inline-flex items-center gap-1.5 font-mono font-bold text-red-600">
                        S/{a.totalPendiente.toFixed(2)}
                      </span>
                    ) : (
                      <span className="font-mono text-emerald-600 font-medium">Al día</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                      a.habilitado
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    )}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", a.habilitado ? "bg-emerald-500" : "bg-amber-400")} />
                      {a.habilitado ? "Habilitado" : "Sin habilitar"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:text-zinc-500 transition-colors" />
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
