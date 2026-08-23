"use client";

import { useState, useActionState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Power, PowerOff, AlertTriangle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  createProducto, updateProducto, toggleProductoActivo,
  type ProductoSerialized, type ProductoFormState,
} from "@/lib/actions/snack-productos";

function ProductoDialog({
  open, onClose, producto,
}: { open: boolean; onClose: () => void; producto?: ProductoSerialized | null }) {
  const action = producto ? updateProducto.bind(null, producto.id) : createProducto;
  const [state, formAction, pending] = useActionState(action, {} as ProductoFormState);

  if (state.message === "ok") { onClose(); toast.success(producto ? "Producto actualizado" : "Producto creado"); }

  const e = state.errors ?? {};
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{producto ? "Editar producto" : "Nuevo producto"}</DialogTitle></DialogHeader>
        <form action={formAction} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input id="nombre" name="nombre" defaultValue={producto?.nombre ?? ""} placeholder="Coca Cola 500ml" />
              {e.nombre && <p className="text-xs text-destructive">{e.nombre[0]}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="categoria">Categoría</Label>
              <Input id="categoria" name="categoria" defaultValue={producto?.categoria ?? ""} placeholder="Bebidas" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="precioVenta">Precio de venta (S/) *</Label>
              <Input id="precioVenta" name="precioVenta" type="number" step="0.10" min="0" defaultValue={producto?.precioVenta ?? ""} placeholder="2.50" />
              {e.precioVenta && <p className="text-xs text-destructive">{e.precioVenta[0]}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="costoReferencial">Costo referencial (S/)</Label>
              <Input id="costoReferencial" name="costoReferencial" type="number" step="0.10" min="0" defaultValue={producto?.costoReferencial ?? ""} placeholder="1.50" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="stockMinimo">Stock mínimo (alerta)</Label>
              <Input id="stockMinimo" name="stockMinimo" type="number" min="0" defaultValue={producto?.stockMinimo ?? 0} placeholder="5" />
            </div>
            <div className="space-y-1 col-span-2">
              <Label htmlFor="fechaVencimiento">Fecha de vencimiento <span className="text-zinc-400">(opcional)</span></Label>
              <Input id="fechaVencimiento" name="fechaVencimiento" type="date" defaultValue={producto?.fechaVencimiento ?? ""} />
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

export function AlmacenView({ productos }: { productos: ProductoSerialized[] }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ProductoSerialized | null>(null);
  const [key, setKey] = useState(0);

  function openCreate() { setSelected(null); setKey((k) => k + 1); setOpen(true); }
  function openEdit(p: ProductoSerialized) { setSelected(p); setKey((k) => k + 1); setOpen(true); }

  async function handleToggle(p: ProductoSerialized) {
    await toggleProductoActivo(p.id, p.activo);
    toast.success(p.activo ? "Producto desactivado" : "Producto activado");
  }

  const conAlerta = productos.filter((p) => p.activo && p.bajoStock);
  const hoy = new Date().toISOString().slice(0, 10);
  const proxVencimiento = productos.filter((p) => p.activo && p.fechaVencimiento && p.fechaVencimiento <= new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10));

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Almacén</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{productos.filter(p => p.activo).length} producto{productos.filter(p => p.activo).length !== 1 ? "s" : ""} activo{productos.filter(p => p.activo).length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={openCreate} className="gap-2 shadow-sm"><Plus className="h-4 w-4" />Nuevo producto</Button>
      </div>

      {/* Alertas */}
      {conAlerta.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Stock bajo en {conAlerta.length} producto{conAlerta.length !== 1 ? "s" : ""}</p>
            <p className="text-xs text-amber-700 mt-0.5">{conAlerta.map(p => p.nombre).join(", ")}</p>
          </div>
        </div>
      )}
      {proxVencimiento.length > 0 && (
        <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-800">Vencimiento próximo (≤30 días)</p>
            <p className="text-xs text-orange-700 mt-0.5">{proxVencimiento.map(p => `${p.nombre} (${p.fechaVencimiento})`).join(", ")}</p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 hover:bg-zinc-50">
              <TableHead className="font-semibold text-zinc-600">Producto</TableHead>
              <TableHead className="font-semibold text-zinc-600">Categoría</TableHead>
              <TableHead className="font-semibold text-zinc-600 text-right">Precio</TableHead>
              <TableHead className="font-semibold text-zinc-600 text-right">Costo ref.</TableHead>
              <TableHead className="font-semibold text-zinc-600 text-center">Stock</TableHead>
              <TableHead className="font-semibold text-zinc-600 text-center">Mín.</TableHead>
              <TableHead className="font-semibold text-zinc-600">Vence</TableHead>
              <TableHead className="text-right font-semibold text-zinc-600">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <div className="flex flex-col items-center justify-center py-14 gap-3">
                    <div className="rounded-full bg-zinc-100 p-4"><Package className="h-7 w-7 text-zinc-300" /></div>
                    <p className="text-sm text-zinc-400">No hay productos. Crea el primero.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : productos.map((p) => (
              <TableRow key={p.id} className={cn(!p.activo && "opacity-50", p.activo && p.bajoStock && "bg-amber-50/40")}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-900">{p.nombre}</span>
                    {p.activo && p.bajoStock && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-zinc-500">{p.categoria ?? "—"}</TableCell>
                <TableCell className="text-right font-mono text-sm">S/ {p.precioVenta.toFixed(2)}</TableCell>
                <TableCell className="text-right font-mono text-sm text-zinc-400">{p.costoReferencial ? `S/ ${p.costoReferencial.toFixed(2)}` : "—"}</TableCell>
                <TableCell className="text-center">
                  <span className={cn("font-bold tabular-nums", p.activo && p.bajoStock ? "text-amber-600" : "text-zinc-800")}>{p.stockActual}</span>
                </TableCell>
                <TableCell className="text-center text-sm text-zinc-400">{p.stockMinimo}</TableCell>
                <TableCell className="text-sm">
                  {p.fechaVencimiento ? (
                    <span className={cn(p.fechaVencimiento <= hoy ? "text-red-600 font-semibold" : p.fechaVencimiento <= new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10) ? "text-orange-600" : "text-zinc-500")}>
                      {p.fechaVencimiento}
                    </span>
                  ) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon-sm" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon-sm" variant="ghost" onClick={() => handleToggle(p)}
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

      <ProductoDialog key={key} open={open} onClose={() => setOpen(false)} producto={selected} />
    </>
  );
}
