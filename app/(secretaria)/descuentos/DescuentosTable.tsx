"use client";

import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Pencil,
  PowerOff,
  Power,
  Plus,
  Search,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  toggleDescuentoActivo,
  getGruposOptions,
  type DescuentoSerialized,
  type GrupoOption,
} from "@/lib/actions/descuentos";
import { DescuentoDialog } from "./DescuentoDialog";

type Props = { descuentos: DescuentoSerialized[] };

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        active
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-zinc-100 text-zinc-500 border-zinc-200"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          active ? "bg-emerald-500" : "bg-zinc-400"
        )}
      />
      {active ? "Activo" : "Inactivo"}
    </span>
  );
}

function TipoPill({ tipo }: { tipo: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tipo === "porcentaje"
          ? "bg-blue-50 text-blue-700 border-blue-200"
          : "bg-amber-50 text-amber-700 border-amber-200"
      )}
    >
      {tipo === "porcentaje" ? "%" : "S/"}
    </span>
  );
}

export function DescuentosTable({ descuentos }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<DescuentoSerialized | null>(null);
  const [dialogKey, setDialogKey] = useState(0);
  const [search, setSearch] = useState("");
  const [grupos, setGrupos] = useState<GrupoOption[]>([]);

  useEffect(() => {
    getGruposOptions().then(setGrupos);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return descuentos;
    return descuentos.filter(
      (d) =>
        d.nombre.toLowerCase().includes(q) ||
        (d.grupo?.nombre ?? "").toLowerCase().includes(q)
    );
  }, [descuentos, search]);

  function openCreate() {
    setSelected(null);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  function openEdit(descuento: DescuentoSerialized) {
    setSelected(descuento);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  async function handleToggle(descuento: DescuentoSerialized) {
    await toggleDescuentoActivo(descuento.id, descuento.activo);
    toast.success(descuento.activo ? "Descuento desactivado" : "Descuento activado");
  }

  const activos = descuentos.filter((d) => d.activo).length;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Descuentos</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {activos} activo{activos !== 1 ? "s" : ""} · {descuentos.length} total
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          Nuevo descuento
        </Button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
            <Input
              placeholder="Buscar por nombre o grupo..."
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
              <TableHead className="font-semibold text-zinc-600">Nombre</TableHead>
              <TableHead className="font-semibold text-zinc-600">Tipo</TableHead>
              <TableHead className="font-semibold text-zinc-600">Valor</TableHead>
              <TableHead className="font-semibold text-zinc-600">Grupo</TableHead>
              <TableHead className="font-semibold text-zinc-600">Automático</TableHead>
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
                      <Tag className="h-7 w-7 text-zinc-300" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-zinc-500">
                        {search ? "Sin resultados" : "No hay descuentos registrados"}
                      </p>
                      <p className="text-xs text-zinc-400 mt-1">
                        {search
                          ? "Prueba con otro término de búsqueda"
                          : "Crea el primero usando el botón de arriba"}
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((d) => (
                <TableRow
                  key={d.id}
                  className="transition-colors duration-100 hover:bg-zinc-50/70"
                >
                  <TableCell className="font-medium text-zinc-900">{d.nombre}</TableCell>
                  <TableCell>
                    <TipoPill tipo={d.tipo} />
                  </TableCell>
                  <TableCell className="font-mono text-zinc-700 font-medium">
                    {d.tipo === "porcentaje"
                      ? `${d.valor}%`
                      : `S/${d.valor.toFixed(2)}`}
                  </TableCell>
                  <TableCell className="text-zinc-500">
                    {d.grupo?.nombre ?? <span className="text-zinc-300">—</span>}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        d.automatico ? "text-zinc-700" : "text-zinc-400"
                      )}
                    >
                      {d.automatico ? "Sí" : "No"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusPill active={d.activo} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => openEdit(d)}
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => handleToggle(d)}
                        title={d.activo ? "Desactivar" : "Activar"}
                        className={
                          d.activo
                            ? "text-red-400 hover:text-red-600 hover:bg-red-50"
                            : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        }
                      >
                        {d.activo ? (
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

      <DescuentoDialog
        key={dialogKey}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        descuento={selected}
        grupos={grupos}
      />
    </>
  );
}
