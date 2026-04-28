"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Plus, PowerOff, Power, UserPlus, UserCheck, Search, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleMatriculaEstado, type MatriculaSerialized } from "@/lib/actions/matriculas";

const DIA_ABREV: Record<string, string> = {
  Lunes: "Lu", Martes: "Ma", Miércoles: "Mi",
  Jueves: "Ju", Viernes: "Vi", Sábado: "Sa", Domingo: "Do",
};
const DIA_ORDER = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const DIA_COLORS: Record<string, string> = {
  Lunes: "bg-blue-50 text-blue-700 border-blue-200",
  Martes: "bg-violet-50 text-violet-700 border-violet-200",
  Miércoles: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Jueves: "bg-orange-50 text-orange-700 border-orange-200",
  Viernes: "bg-pink-50 text-pink-700 border-pink-200",
  Sábado: "bg-teal-50 text-teal-700 border-teal-200",
};

type Props = { matriculas: MatriculaSerialized[] };

export function MatriculasTable({ matriculas }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [tipoDialogOpen, setTipoDialogOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return matriculas;
    return matriculas.filter(
      (m) =>
        m.alumno.nombre.toLowerCase().includes(q) ||
        m.alumno.apellido.toLowerCase().includes(q) ||
        (m.alumno.dni ?? "").includes(q) ||
        m.horario.curso.nombre.toLowerCase().includes(q)
    );
  }, [matriculas, search]);

  async function handleToggle(m: MatriculaSerialized) {
    setLoading(m.id);
    await toggleMatriculaEstado(m.id, m.estado);
    toast.success(m.estado === "activa" ? "Matrícula dada de baja" : "Matrícula reactivada");
    setLoading(null);
  }

  const activas = matriculas.filter((m) => m.estado === "activa").length;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Matrículas</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {activas} activa{activas !== 1 ? "s" : ""} · {matriculas.length} total
          </p>
        </div>
        <Button onClick={() => setTipoDialogOpen(true)} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          Nueva matrícula
        </Button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
            <Input
              placeholder="Buscar por alumno, DNI o curso..."
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
              <TableHead className="font-semibold text-zinc-600">Curso</TableHead>
              <TableHead className="font-semibold text-zinc-600">Horario</TableHead>
              <TableHead className="font-semibold text-zinc-600">Precio / mes</TableHead>
              <TableHead className="font-semibold text-zinc-600">Desde</TableHead>
              <TableHead className="font-semibold text-zinc-600">Estado</TableHead>
              <TableHead className="text-right font-semibold text-zinc-600">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="flex flex-col items-center justify-center py-14 gap-3">
                    <div className="rounded-full bg-zinc-100 p-4">
                      <ClipboardList className="h-7 w-7 text-zinc-300" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-zinc-500">
                        {search ? "Sin resultados" : "No hay matrículas registradas"}
                      </p>
                      <p className="text-xs text-zinc-400 mt-1">
                        {search ? "Prueba con otro término" : "Crea la primera usando el botón de arriba"}
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((m) => (
                <TableRow
                  key={m.id}
                  className={cn(
                    "transition-colors duration-100 hover:bg-zinc-50/70",
                    m.estado !== "activa" && "opacity-55"
                  )}
                >
                  <TableCell>
                    <p className="font-medium text-zinc-900">{m.alumno.apellido}, {m.alumno.nombre}</p>
                    {m.alumno.dni && (
                      <p className="text-xs font-mono text-zinc-400 mt-0.5">{m.alumno.dni}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-zinc-800">{m.horario.curso.nombre}</p>
                    {m.horario.curso.nivel && (
                      <p className="text-xs text-zinc-400 mt-0.5">{m.horario.curso.nivel}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 mb-0.5">
                      {[...m.horario.dias]
                        .sort((a, b) => DIA_ORDER.indexOf(a) - DIA_ORDER.indexOf(b))
                        .map((d) => (
                          <span
                            key={d}
                            className={cn(
                              "inline-flex rounded border px-1.5 py-0 text-[11px] font-medium",
                              DIA_COLORS[d] ?? "bg-zinc-50 text-zinc-600 border-zinc-200"
                            )}
                          >
                            {DIA_ABREV[d] ?? d}
                          </span>
                        ))}
                    </div>
                    <span className="text-xs font-mono text-zinc-400">
                      {m.horario.horaInicio}–{m.horario.horaFin}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono font-semibold text-zinc-900">
                      S/{m.precioFinalMensual.toFixed(2)}
                    </span>
                    {m.descuento && (
                      <p className="text-xs text-emerald-600 mt-0.5">{m.descuento.nombre}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-500">
                    {new Date(m.fechaInicio).toLocaleDateString("es-PE", {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                      m.estado === "activa"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-zinc-100 text-zinc-500 border-zinc-200"
                    )}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", m.estado === "activa" ? "bg-emerald-500" : "bg-zinc-400")} />
                      {m.estado === "activa" ? "Activa" : "Inactiva"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon-sm" variant="ghost"
                      disabled={loading === m.id}
                      onClick={() => handleToggle(m)}
                      title={m.estado === "activa" ? "Dar de baja" : "Reactivar"}
                      className={m.estado === "activa" ? "text-red-400 hover:text-red-600 hover:bg-red-50" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"}
                    >
                      {m.estado === "activa" ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Tipo dialog */}
      <Dialog open={tipoDialogOpen} onOpenChange={setTipoDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Es un estudiante nuevo?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-500">
            Indica si el alumno ya está registrado en el sistema o si es su primera vez.
          </p>
          <div className="flex flex-col gap-3 pt-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-14 text-left"
              onClick={() => { setTipoDialogOpen(false); router.push("/alumnos?nuevo=true"); }}
            >
              <UserPlus className="h-5 w-5 text-zinc-500 shrink-0" />
              <div>
                <p className="font-medium text-zinc-900">Estudiante nuevo</p>
                <p className="text-xs text-zinc-400">Registrar alumno y luego matricular</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-14 text-left"
              onClick={() => { setTipoDialogOpen(false); router.push("/matriculas/nueva"); }}
            >
              <UserCheck className="h-5 w-5 text-zinc-500 shrink-0" />
              <div>
                <p className="font-medium text-zinc-900">Ex alumno / ya registrado</p>
                <p className="text-xs text-zinc-400">Buscar alumno existente y matricular</p>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
