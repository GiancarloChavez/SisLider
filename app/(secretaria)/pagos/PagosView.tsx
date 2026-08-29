"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { PagosTable } from "./PagosTable";
import { RegistroMovimientos } from "./RegistroMovimientos";
import type { AlumnoPagoResumen, RegistroAbonoItem } from "@/lib/actions/pagos";

type Tab = "movimientos" | "deudores";

type Props = {
  alumnos: AlumnoPagoResumen[];
  movimientos: RegistroAbonoItem[];
};

export function PagosView({ alumnos, movimientos }: Props) {
  const [tab, setTab] = useState<Tab>("movimientos");

  const totalMovimientos = movimientos.length;
  const totalIngresado = movimientos.reduce((s, m) => s + m.monto, 0);
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
        <div className="flex items-stretch gap-3">
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-right">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Ingresos registrados</p>
            <p className="text-xl font-bold font-mono text-zinc-800 mt-0.5">S/{totalIngresado.toFixed(2)}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{totalMovimientos} abono{totalMovimientos !== 1 ? "s" : ""}</p>
          </div>
          {conDeuda > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-right">
              <p className="text-xs font-medium text-red-500 uppercase tracking-wide">Total por cobrar</p>
              <p className="text-xl font-bold font-mono text-red-600 mt-0.5">S/{totalDeuda.toFixed(2)}</p>
              <p className="text-xs text-red-400 mt-0.5">{conDeuda} alumno{conDeuda !== 1 ? "s" : ""} con deuda</p>
            </div>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0 mb-5 border-b border-zinc-200">
        {(["movimientos", "deudores"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize",
              tab === t
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            )}
          >
            {t === "movimientos" ? "Movimientos" : `Deudores${conDeuda > 0 ? ` (${conDeuda})` : ""}`}
          </button>
        ))}
      </div>

      {tab === "movimientos" && <RegistroMovimientos movimientos={movimientos} />}
      {tab === "deudores" && <PagosTable alumnos={alumnos} noHeader />}
    </>
  );
}
