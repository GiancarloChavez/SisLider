"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, Banknote, CreditCard, Smartphone, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RegistroAbonoItem } from "@/lib/actions/pagos";

const MESES = [
  "Ene","Feb","Mar","Abr","May","Jun",
  "Jul","Ago","Sep","Oct","Nov","Dic",
];

function MetodoChip({ metodo }: { metodo: string }) {
  if (metodo === "efectivo")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-600">
        <Banknote className="h-3 w-3" />Efectivo
      </span>
    );
  if (metodo === "yape" || metodo === "plin")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-xs text-purple-700">
        <Smartphone className="h-3 w-3" />Yape / Plin
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
      <CreditCard className="h-3 w-3" />Transferencia
    </span>
  );
}

type Props = { movimientos: RegistroAbonoItem[] };

export function RegistroMovimientos({ movimientos }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return movimientos;
    return movimientos.filter(
      (m) =>
        m.alumnoNombre.toLowerCase().includes(q) ||
        m.alumnoApellido.toLowerCase().includes(q) ||
        m.curso.toLowerCase().includes(q) ||
        (m.alumnoDni ?? "").includes(q)
    );
  }, [movimientos, query]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
          <Input
            placeholder="Buscar por alumno, curso o DNI..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8 h-8 text-sm bg-zinc-50 border-zinc-200"
          />
        </div>
        {query && (
          <span className="text-xs text-zinc-400 shrink-0">
            {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow className="bg-zinc-50 hover:bg-zinc-50">
            <TableHead className="font-semibold text-zinc-600">Fecha</TableHead>
            <TableHead className="font-semibold text-zinc-600">Alumno</TableHead>
            <TableHead className="font-semibold text-zinc-600">Curso</TableHead>
            <TableHead className="font-semibold text-zinc-600">Período</TableHead>
            <TableHead className="font-semibold text-zinc-600">Método</TableHead>
            <TableHead className="text-right font-semibold text-zinc-600">Monto</TableHead>
            <TableHead className="w-28 font-semibold text-zinc-600" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7}>
                <div className="flex flex-col items-center justify-center py-14 gap-3">
                  <div className="rounded-full bg-zinc-100 p-4">
                    <FileText className="h-7 w-7 text-zinc-300" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-zinc-500">
                      {query ? "Sin resultados" : "No hay pagos registrados"}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">
                      {query ? "Prueba con otro filtro" : "Los pagos registrados aparecerán aquí"}
                    </p>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((m) => (
              <TableRow
                key={m.id}
                className="hover:bg-zinc-50/80 transition-colors cursor-pointer"
                onClick={() => router.push(`/pagos/${m.alumnoId}`)}
              >
                <TableCell className="text-sm text-zinc-500 font-mono whitespace-nowrap">
                  {m.fechaPago}
                </TableCell>
                <TableCell className="font-medium text-zinc-900">
                  {m.alumnoApellido}, {m.alumnoNombre}
                  {m.alumnoDni && (
                    <span className="ml-2 font-mono text-xs text-zinc-400">{m.alumnoDni}</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-zinc-600">{m.curso}</TableCell>
                <TableCell className="text-sm text-zinc-500 whitespace-nowrap">
                  {MESES[m.mes - 1]} {m.anio}
                </TableCell>
                <TableCell>
                  <MetodoChip metodo={m.metodoPago} />
                </TableCell>
                <TableCell className="text-right font-mono font-semibold text-zinc-800">
                  S/{m.monto.toFixed(2)}
                </TableCell>
                <TableCell
                  className="text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <a
                    href={`/api/pdf/nota-pago/${m.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md border border-zinc-200",
                      "px-2.5 py-1 text-xs font-medium text-zinc-600 hover:border-zinc-400",
                      "hover:bg-zinc-50 transition-colors whitespace-nowrap"
                    )}
                  >
                    <FileText className="h-3 w-3" />
                    Nota de Pago
                  </a>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
