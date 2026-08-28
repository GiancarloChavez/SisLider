"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2, ChevronDown, ChevronUp, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createCompra, type CompraSerialized } from "@/lib/actions/snack-compras";
import { type ProveedorSerialized } from "@/lib/actions/snack-proveedores";
import { type ProductoSerialized } from "@/lib/actions/snack-productos";

type LineaItem = { idProducto: string; nombre: string; cantidad: number; precioUnit: number };

function NuevaCompraDialog({
  open, onClose, proveedores, productos,
}: {
  open: boolean; onClose: () => void;
  proveedores: ProveedorSerialized[]; productos: ProductoSerialized[];
}) {
  const [idProveedor, setIdProveedor] = useState("");
  const [observacion, setObservacion] = useState("");
  const [lineas, setLineas] = useState<LineaItem[]>([]);
  const [isPending, startTransition] = useTransition();

  function addLinea() {
    if (!productos.length) return;
    setLineas((prev) => [...prev, { idProducto: productos[0].id, nombre: productos[0].nombre, cantidad: 1, precioUnit: 0 }]);
  }

  function removeLinea(i: number) { setLineas((prev) => prev.filter((_, idx) => idx !== i)); }

  function updateLinea(i: number, field: keyof LineaItem, value: string | number) {
    setLineas((prev) => prev.map((l, idx) => {
      if (idx !== i) return l;
      if (field === "idProducto") {
        const p = productos.find((p) => p.id === value);
        return { ...l, idProducto: value as string, nombre: p?.nombre ?? "" };
      }
      return { ...l, [field]: value };
    }));
  }

  const total = lineas.reduce((s, l) => s + l.cantidad * l.precioUnit, 0);

  function handleSubmit() {
    if (!idProveedor) { toast.error("Selecciona un proveedor"); return; }
    if (!lineas.length) { toast.error("Agrega al menos un producto"); return; }

    startTransition(async () => {
      const res = await createCompra({
        idProveedor,
        observacion,
        items: lineas.map((l) => ({ idProducto: l.idProducto, cantidad: l.cantidad, precioUnit: l.precioUnit })),
      });
      if (res.error) { toast.error(res.error); return; }
      toast.success("Compra registrada y stock actualizado");
      onClose();
    });
  }

  const SELECT = "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nueva orden de compra</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Proveedor *</Label>
              <select className={SELECT} value={idProveedor} onChange={(e) => setIdProveedor(e.target.value)}>
                <option value="">Seleccionar...</option>
                {proveedores.filter(p => p.activo).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Observación</Label>
              <Input value={observacion} onChange={(e) => setObservacion(e.target.value)} placeholder="Opcional" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-700">Productos</p>
              <Button type="button" variant="outline" size="sm" onClick={addLinea} className="gap-1.5 h-7 text-xs">
                <Plus className="h-3 w-3" />Agregar línea
              </Button>
            </div>
            {lineas.length === 0 && (
              <p className="text-sm text-zinc-400 italic py-3 text-center">Sin productos. Agrega una línea.</p>
            )}
            {lineas.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_100px_32px] gap-2 items-center">
                <select className={SELECT} value={l.idProducto} onChange={(e) => updateLinea(i, "idProducto", e.target.value)}>
                  {productos.filter(p => p.activo).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
                <Input type="number" min="1" value={l.cantidad} onChange={(e) => updateLinea(i, "cantidad", Number(e.target.value))} placeholder="Cant." />
                <Input type="number" min="0" step="0.01" value={l.precioUnit || ""} onChange={(e) => updateLinea(i, "precioUnit", Number(e.target.value))} placeholder="P. unit." />
                <Button type="button" size="icon-sm" variant="ghost" onClick={() => removeLinea(i)} className="text-red-400 hover:text-red-600 hover:bg-red-50">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {lineas.length > 0 && (
              <div className="flex justify-end pt-1">
                <span className="text-sm font-semibold text-zinc-700">Total: <span className="font-mono">S/ {total.toFixed(2)}</span></span>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isPending}>{isPending ? "Guardando..." : "Registrar compra"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ComprasView({
  compras, proveedores, productos,
}: { compras: CompraSerialized[]; proveedores: ProveedorSerialized[]; productos: ProductoSerialized[] }) {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Compras</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{compras.length} orden{compras.length !== 1 ? "es" : ""} registrada{compras.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2 shadow-sm"><ShoppingCart className="h-4 w-4" />Nueva compra</Button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 hover:bg-zinc-50">
              <TableHead className="font-semibold text-zinc-600">Fecha</TableHead>
              <TableHead className="font-semibold text-zinc-600">Proveedor</TableHead>
              <TableHead className="font-semibold text-zinc-600 text-center">Ítems</TableHead>
              <TableHead className="font-semibold text-zinc-600 text-right">Total</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {compras.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-zinc-400">No hay compras registradas</TableCell></TableRow>
            ) : compras.map((c) => (
              <>
                <TableRow key={c.id} className="cursor-pointer hover:bg-zinc-50/70" onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
                  <TableCell className="text-sm text-zinc-600">{c.fecha}</TableCell>
                  <TableCell className="font-medium text-zinc-900">{c.proveedor.nombre}</TableCell>
                  <TableCell className="text-center text-sm text-zinc-500">{c.items.length}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">S/ {c.total.toFixed(2)}</TableCell>
                  <TableCell className="text-zinc-400">
                    {expandedId === c.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </TableCell>
                </TableRow>
                {expandedId === c.id && (
                  <TableRow key={`${c.id}-detail`}>
                    <TableCell colSpan={5} className="bg-zinc-50 px-6 py-3">
                      <table className="w-full text-sm">
                        <thead><tr className="text-zinc-400 text-xs"><th className="text-left pb-1">Producto</th><th className="text-center pb-1">Cant.</th><th className="text-right pb-1">P. unit.</th><th className="text-right pb-1">Subtotal</th></tr></thead>
                        <tbody>
                          {c.items.map((item) => (
                            <tr key={item.id} className="border-t border-zinc-100">
                              <td className="py-1 text-zinc-700">{item.producto.nombre}</td>
                              <td className="py-1 text-center tabular-nums">{item.cantidad}</td>
                              <td className="py-1 text-right font-mono text-zinc-500">S/ {item.precioUnit.toFixed(2)}</td>
                              <td className="py-1 text-right font-mono font-medium">S/ {item.subtotal.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {c.observacion && <p className="text-xs text-zinc-400 mt-2 italic">Obs: {c.observacion}</p>}
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </div>

      <NuevaCompraDialog open={open} onClose={() => setOpen(false)} proveedores={proveedores} productos={productos} />
    </>
  );
}
