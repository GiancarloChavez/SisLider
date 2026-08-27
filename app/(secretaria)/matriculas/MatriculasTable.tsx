"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, ClipboardList, History } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MatriculaReciente } from "@/lib/actions/matriculas";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MESES_CORTO = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

function fmtIso(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${MESES_CORTO[d.getMonth()]}. ${d.getFullYear()}`;
}

// ─── Payment badge ────────────────────────────────────────────────────────────

function PagoBadge({ pago }: { pago: MatriculaReciente["primerPago"] }) {
  if (!pago) return <span className="text-xs text-zinc-400">—</span>;

  if (pago.estado === "pagado") {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
        Pagado
      </span>
    );
  }
  if (pago.estado === "parcial") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-medium text-amber-700">
        Parcial · S/{pago.montoPagado.toFixed(2)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-zinc-100 border border-zinc-200 px-2 py-0.5 text-[11px] font-medium text-zinc-500">
      Pendiente
    </span>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function MatriculaRow({ m }: { m: MatriculaReciente }) {
  return (
    <Link
      href={`/alumnos/${m.alumno.id}`}
      className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-zinc-100 last:border-0 hover:bg-zinc-50/70 transition-colors"
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-zinc-800">
          {m.alumno.apellido}, {m.alumno.nombre}
        </p>
        <p className="text-xs text-zinc-400 mt-0.5">
          {m.horario.curso.nombre} · Grupo {m.horario.numeroGrupo} · {m.horario.horaInicio}–{m.horario.horaFin}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-zinc-400">{fmtIso(m.createdAt)}</span>
        <PagoBadge pago={m.primerPago} />
      </div>
    </Link>
  );
}

// ─── Recientes (últimas 15) ───────────────────────────────────────────────────

export function MatriculasTable({ matriculas }: { matriculas: MatriculaReciente[] }) {
  const router = useRouter();

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Matrículas</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Últimas matrículas realizadas</p>
        </div>
        <Button onClick={() => router.push("/matriculas/nueva")} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          Nueva matrícula
        </Button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        {/* Column headers */}
        <div className="grid grid-cols-[1fr_auto] gap-4 px-5 py-2.5 border-b border-zinc-100 bg-zinc-50">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Alumno · Curso</span>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Fecha · Pago</span>
        </div>

        {matriculas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-2">
            <ClipboardList className="h-6 w-6 text-zinc-300" />
            <p className="text-sm text-zinc-400">No hay matrículas registradas</p>
          </div>
        ) : (
          <>
            {matriculas.map((m) => (
              <MatriculaRow key={m.id} m={m} />
            ))}

            {/* Link to full history */}
            <div className="flex items-center justify-center px-5 py-3 border-t border-zinc-100 bg-zinc-50/50">
              <Link
                href="/matriculas?historial=true"
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
              >
                <History className="h-3.5 w-3.5" />
                Mostrar historial completo
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ─── Historial (todas las matrículas, con filtros próximamente) ───────────────

export function MatriculasHistorial({ matriculas }: { matriculas: MatriculaReciente[] }) {
  const router = useRouter();

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Historial de matrículas</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {matriculas.length} matrícula{matriculas.length !== 1 ? "s" : ""} en total
          </p>
        </div>
        <Button onClick={() => router.push("/matriculas/nueva")} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          Nueva matrícula
        </Button>
      </div>

      {/* Filter panel — se añadirá en el próximo paso */}

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="grid grid-cols-[1fr_auto] gap-4 px-5 py-2.5 border-b border-zinc-100 bg-zinc-50">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Alumno · Curso</span>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Fecha · Pago</span>
        </div>

        {matriculas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-2">
            <ClipboardList className="h-6 w-6 text-zinc-300" />
            <p className="text-sm text-zinc-400">No hay matrículas registradas</p>
          </div>
        ) : (
          matriculas.map((m) => <MatriculaRow key={m.id} m={m} />)
        )}
      </div>

      <div className="mt-4">
        <Link
          href="/matriculas"
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          ← Volver a recientes
        </Link>
      </div>
    </>
  );
}
