"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Receipt } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type VentaSerialized } from "@/lib/actions/snack-ventas";

export function VentasHistorial({ ventas }: { ventas: VentaSerialized[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalDia = ventas
    .filter((v) => v.fecha.startsWith(new Date().toISOString().slice(0, 10)))
    .reduce((s, v) => s + v.total, 0);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Historial de ventas</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{ventas.length} venta{ventas.length !== 1 ? "s" : ""} · Hoy: S/ {totalDia.toFixed(2)}</p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 hover:bg-zinc-50">
              <TableHead className="font-semibold text-zinc-600">Fecha y hora</TableHead>
              <TableHead className="font-semibold text-zinc-600 text-center">Ítems</TableHead>
              <TableHead className="font-semibold text-zinc-600 text-right">Total</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {ventas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <div className="flex flex-col items-center justify-center py-14 gap-3">
                    <div className="rounded-full bg-zinc-100 p-4"><Receipt className="h-7 w-7 text-zinc-300" /></div>
                    <p className="text-sm text-zinc-400">No hay ventas registradas aún</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : ventas.map((v) => (
              <>
                <TableRow key={v.id} className="cursor-pointer hover:bg-zinc-50/70" onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}>
                  <TableCell className="text-sm text-zinc-600">
                    {new Date(v.fecha).toLocaleString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </TableCell>
                  <TableCell className="text-center text-sm text-zinc-500">{v.items.reduce((s, i) => s + i.cantidad, 0)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold text-emerald-700">S/ {v.total.toFixed(2)}</TableCell>
                  <TableCell className="text-zinc-400">
                    {expandedId === v.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </TableCell>
                </TableRow>
                {expandedId === v.id && (
                  <TableRow key={`${v.id}-detail`}>
                    <TableCell colSpan={4} className="bg-zinc-50 px-6 py-3">
                      <table className="w-full text-sm">
                        <thead><tr className="text-zinc-400 text-xs"><th className="text-left pb-1">Producto</th><th className="text-center pb-1">Cant.</th><th className="text-right pb-1">P. unit.</th><th className="text-right pb-1">Subtotal</th></tr></thead>
                        <tbody>
                          {v.items.map((item) => (
                            <tr key={item.id} className="border-t border-zinc-100">
                              <td className="py-1 text-zinc-700">{item.producto.nombre}</td>
                              <td className="py-1 text-center tabular-nums">{item.cantidad}</td>
                              <td className="py-1 text-right font-mono text-zinc-500">S/ {item.precioUnit.toFixed(2)}</td>
                              <td className="py-1 text-right font-mono font-medium">S/ {item.subtotal.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
