"use client";

import { useState, useActionState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Power, PowerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  createProveedor, updateProveedor, toggleProveedorActivo,
  type ProveedorSerialized, type ProveedorFormState,
} from "@/lib/actions/snack-proveedores";

function ProveedorDialog({
  open, onClose, proveedor,
}: { open: boolean; onClose: () => void; proveedor?: ProveedorSerialized | null }) {
  const action = proveedor ? updateProveedor.bind(null, proveedor.id) : createProveedor;
  const [state, formAction, pending] = useActionState(action, {} as ProveedorFormState);

  if (state.message === "ok") { onClose(); toast.success(proveedor ? "Proveedor actualizado" : "Proveedor creado"); }

  const e = state.errors ?? {};
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>{proveedor ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle></DialogHeader>
        <form action={formAction} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="nombre">Nombre *</Label>
            <Input id="nombre" name="nombre" defaultValue={proveedor?.nombre ?? ""} placeholder="Distribuidora XYZ" />
            {e.nombre && <p className="text-xs text-destructive">{e.nombre[0]}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="ruc">RUC</Label>
            <Input id="ruc" name="ruc" defaultValue={proveedor?.ruc ?? ""} placeholder="20123456789" maxLength={11} />
            {e.ruc && <p className="text-xs text-destructive">{e.ruc[0]}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="contacto">Contacto</Label>
              <Input id="contacto" name="contacto" defaultValue={proveedor?.contacto ?? ""} placeholder="Juan Pérez" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input id="telefono" name="telefono" defaultValue={proveedor?.telefono ?? ""} placeholder="987654321" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? "Guardando..." : "Guardar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ProveedoresTable({ proveedores }: { proveedores: ProveedorSerialized[] }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ProveedorSerialized | null>(null);
  const [key, setKey] = useState(0);

  function openCreate() { setSelected(null); setKey((k) => k + 1); setOpen(true); }
  function openEdit(p: ProveedorSerialized) { setSelected(p); setKey((k) => k + 1); setOpen(true); }

  async function handleToggle(p: ProveedorSerialized) {
    await toggleProveedorActivo(p.id, p.activo);
    toast.success(p.activo ? "Proveedor desactivado" : "Proveedor activado");
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Proveedores</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{proveedores.length} proveedor{proveedores.length !== 1 ? "es" : ""}</p>
        </div>
        <Button onClick={openCreate} className="gap-2 shadow-sm"><Plus className="h-4 w-4" />Nuevo proveedor</Button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 hover:bg-zinc-50">
              <TableHead className="font-semibold text-zinc-600">Nombre</TableHead>
              <TableHead className="font-semibold text-zinc-600">RUC</TableHead>
              <TableHead className="font-semibold text-zinc-600">Contacto</TableHead>
              <TableHead className="font-semibold text-zinc-600">Teléfono</TableHead>
              <TableHead className="text-right font-semibold text-zinc-600">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {proveedores.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-zinc-400">No hay proveedores registrados</TableCell></TableRow>
            ) : proveedores.map((p) => (
              <TableRow key={p.id} className={cn(!p.activo && "opacity-50")}>
                <TableCell className="font-medium text-zinc-900">{p.nombre}</TableCell>
                <TableCell className="font-mono text-sm text-zinc-500">{p.ruc ?? "—"}</TableCell>
                <TableCell className="text-sm text-zinc-500">{p.contacto ?? "—"}</TableCell>
                <TableCell className="text-sm text-zinc-500">{p.telefono ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon-sm" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon-sm" variant="ghost"
                      onClick={() => handleToggle(p)}
                      className={p.activo ? "text-red-400 hover:text-red-600 hover:bg-red-50" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"}
                    >
                      {p.activo ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ProveedorDialog key={key} open={open} onClose={() => setOpen(false)} proveedor={selected} />
    </>
  );
}
