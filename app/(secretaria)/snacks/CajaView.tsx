"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Minus, Trash2, ShoppingBag, LockKeyhole, TrendingUp, Banknote, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { abrirCaja, cerrarCaja, type CajaSerialized } from "@/lib/actions/snack-caja";
import { registrarVenta, type VentaItemInput } from "@/lib/actions/snack-ventas";
import { type ProductoSerialized } from "@/lib/actions/snack-productos";

type CartItem = { idProducto: string; nombre: string; precio: number; cantidad: number };

// ─── Abrir caja ───────────────────────────────────────────────────────────────

function AbrirCajaPanel() {
  const [monto, setMonto] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleAbrir() {
    const val = parseFloat(monto);
    if (isNaN(val) || val < 0) { toast.error("Ingresa un monto válido"); return; }
    startTransition(async () => {
      const res = await abrirCaja(val);
      if (res.error) toast.error(res.error);
      else toast.success("Caja abierta");
    });
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-zinc-100 p-5"><Banknote className="h-8 w-8 text-zinc-500" /></div>
        </div>
        <div>
          <h2 className="text-xl font-bold text-zinc-900">Abrir caja del día</h2>
          <p className="text-sm text-zinc-500 mt-1">Ingresa el monto inicial (efectivo disponible para dar vuelto)</p>
        </div>
        <div className="space-y-2 text-left">
          <Label htmlFor="montoApertura">Monto de apertura (S/)</Label>
          <Input
            id="montoApertura"
            type="number"
            min="0"
            step="0.50"
            placeholder="0.00"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className="text-lg font-mono text-center"
          />
        </div>
        <Button className="w-full" size="lg" onClick={handleAbrir} disabled={isPending}>
          {isPending ? "Abriendo..." : "Abrir caja"}
        </Button>
      </div>
    </div>
  );
}

// ─── Cerrar caja ──────────────────────────────────────────────────────────────

function CerrarCajaModal({
  open, onClose, caja, totalVentas, idCaja,
}: { open: boolean; onClose: () => void; caja: CajaSerialized; totalVentas: number; idCaja: string }) {
  const [montoCierre, setMontoCierre] = useState("");
  const [observacion, setObservacion] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!open) return null;

  const esperado = caja.montoApertura + totalVentas;
  const diferencia = parseFloat(montoCierre || "0") - esperado;

  function handleCerrar() {
    const val = parseFloat(montoCierre);
    if (isNaN(val) || val < 0) { toast.error("Ingresa el monto de cierre"); return; }
    startTransition(async () => {
      const res = await cerrarCaja(idCaja, val, observacion);
      if (res.error) toast.error(res.error);
      else { toast.success("Caja cerrada"); onClose(); }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900">Cerrar caja</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700"><X className="h-5 w-5" /></button>
        </div>

        <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-zinc-500">Apertura</span><span className="font-mono">S/ {caja.montoApertura.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-zinc-500">Total ventas</span><span className="font-mono text-emerald-700">+ S/ {totalVentas.toFixed(2)}</span></div>
          <div className="flex justify-between border-t border-zinc-200 pt-2 font-semibold"><span>Esperado en caja</span><span className="font-mono">S/ {esperado.toFixed(2)}</span></div>
        </div>

        <div className="space-y-1">
          <Label>Monto contado en caja (S/)</Label>
          <Input type="number" min="0" step="0.10" placeholder="0.00" value={montoCierre} onChange={(e) => setMontoCierre(e.target.value)} className="font-mono text-center text-lg" />
        </div>

        {montoCierre && (
          <p className={cn("text-sm font-semibold text-center", diferencia === 0 ? "text-emerald-600" : diferencia > 0 ? "text-blue-600" : "text-red-600")}>
            Diferencia: {diferencia > 0 ? "+" : ""}S/ {diferencia.toFixed(2)}{" "}
            {diferencia === 0 ? "✓ Cuadra exacto" : diferencia > 0 ? "(sobrante)" : "(faltante)"}
          </p>
        )}

        <div className="space-y-1">
          <Label>Observación <span className="text-zinc-400">(opcional)</span></Label>
          <Input placeholder="Notas del cierre..." value={observacion} onChange={(e) => setObservacion(e.target.value)} />
        </div>

        <Button className="w-full" onClick={handleCerrar} disabled={isPending}>
          <LockKeyhole className="h-4 w-4 mr-2" />
          {isPending ? "Cerrando..." : "Confirmar cierre"}
        </Button>
      </div>
    </div>
  );
}

// ─── POS (caja abierta) ───────────────────────────────────────────────────────

function PosView({
  caja, productos, ventasDelDia,
}: { caja: CajaSerialized; productos: ProductoSerialized[]; ventasDelDia: { total: number; count: number } }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isPending, startTransition] = useTransition();
  const [showCierre, setShowCierre] = useState(false);
  const [searchQ, setSearchQ] = useState("");

  const filtered = productos.filter((p) => p.activo && p.stockActual > 0 && p.nombre.toLowerCase().includes(searchQ.toLowerCase()));

  function addToCart(p: ProductoSerialized) {
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.idProducto === p.id);
      if (idx >= 0) {
        const updated = [...prev];
        if (updated[idx].cantidad >= p.stockActual) { toast.error(`Stock máximo: ${p.stockActual}`); return prev; }
        updated[idx] = { ...updated[idx], cantidad: updated[idx].cantidad + 1 };
        return updated;
      }
      return [...prev, { idProducto: p.id, nombre: p.nombre, precio: p.precioVenta, cantidad: 1 }];
    });
  }

  function updateQty(idProducto: string, delta: number) {
    setCart((prev) => prev.map((c) => {
      if (c.idProducto !== idProducto) return c;
      const newQty = c.cantidad + delta;
      if (newQty <= 0) return c;
      const stock = productos.find((p) => p.id === idProducto)?.stockActual ?? 0;
      if (newQty > stock) { toast.error(`Stock máximo: ${stock}`); return c; }
      return { ...c, cantidad: newQty };
    }));
  }

  function removeFromCart(idProducto: string) { setCart((prev) => prev.filter((c) => c.idProducto !== idProducto)); }

  const totalCart = cart.reduce((s, c) => s + c.cantidad * c.precio, 0);

  function handleVenta() {
    if (!cart.length) { toast.error("El carrito está vacío"); return; }
    startTransition(async () => {
      const items: VentaItemInput[] = cart.map((c) => ({ idProducto: c.idProducto, cantidad: c.cantidad, precioUnit: c.precio }));
      const res = await registrarVenta(items);
      if (res.error) { toast.error(res.error); return; }
      toast.success(`Venta registrada — S/ ${totalCart.toFixed(2)}`);
      setCart([]);
    });
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Caja del día</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Apertura S/ {caja.montoApertura.toFixed(2)} · {ventasDelDia.count} venta{ventasDelDia.count !== 1 ? "s" : ""} · S/ {ventasDelDia.total.toFixed(2)} recaudado
          </p>
        </div>
        <Button variant="outline" onClick={() => setShowCierre(true)} className="gap-2 text-zinc-600">
          <LockKeyhole className="h-4 w-4" />Cerrar caja
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Apertura", value: `S/ ${caja.montoApertura.toFixed(2)}`, icon: Banknote, color: "text-zinc-600", bg: "bg-zinc-50" },
          { label: "Ventas hoy", value: ventasDelDia.count.toString(), icon: ShoppingBag, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Total recaudado", value: `S/ ${ventasDelDia.total.toFixed(2)}`, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm flex items-center gap-3">
            <div className={cn("rounded-lg p-2", bg)}><Icon className={cn("h-4 w-4", color)} /></div>
            <div><p className="text-xs text-zinc-500">{label}</p><p className="text-lg font-bold text-zinc-900 tabular-nums">{value}</p></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-5">
        {/* Productos */}
        <div className="space-y-3">
          <Input placeholder="Buscar producto..." value={searchQ} onChange={(e) => setSearchQ(e.target.value)} className="bg-white" />
          {filtered.length === 0 ? (
            <p className="text-center text-zinc-400 text-sm py-8">Sin productos disponibles</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className={cn(
                    "rounded-xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition-all",
                    "hover:border-zinc-400 hover:shadow-md active:scale-95",
                    p.bajoStock && "border-amber-200 bg-amber-50/30"
                  )}
                >
                  <p className="font-medium text-zinc-900 text-sm leading-tight line-clamp-2">{p.nombre}</p>
                  <p className="text-base font-bold text-emerald-700 mt-1 font-mono">S/ {p.precioVenta.toFixed(2)}</p>
                  <p className={cn("text-xs mt-0.5", p.bajoStock ? "text-amber-600" : "text-zinc-400")}>
                    Stock: {p.stockActual}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Carrito */}
        <div className="flex flex-col rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100 flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-zinc-500" />
            <span className="font-semibold text-zinc-800">Carrito</span>
            {cart.length > 0 && <span className="ml-auto text-xs bg-zinc-100 rounded-full px-2 py-0.5">{cart.reduce((s, c) => s + c.cantidad, 0)} ítems</span>}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">
            {cart.length === 0 ? (
              <p className="text-center text-zinc-400 text-sm py-10">Toca un producto para agregar</p>
            ) : cart.map((item) => (
              <div key={item.idProducto} className="flex items-center gap-2 px-4 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800 truncate">{item.nombre}</p>
                  <p className="text-xs text-zinc-400 font-mono">S/ {item.precio.toFixed(2)} c/u</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateQty(item.idProducto, -1)} className="rounded p-0.5 hover:bg-zinc-100"><Minus className="h-3.5 w-3.5 text-zinc-500" /></button>
                  <span className="w-6 text-center text-sm font-semibold tabular-nums">{item.cantidad}</span>
                  <button onClick={() => updateQty(item.idProducto, 1)} className="rounded p-0.5 hover:bg-zinc-100"><Plus className="h-3.5 w-3.5 text-zinc-500" /></button>
                </div>
                <span className="text-sm font-mono font-semibold text-zinc-800 w-16 text-right">S/ {(item.cantidad * item.precio).toFixed(2)}</span>
                <button onClick={() => removeFromCart(item.idProducto)} className="text-zinc-300 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>

          {cart.length > 0 && (
            <div className="border-t border-zinc-200 px-4 py-3 space-y-3">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="font-mono text-emerald-700">S/ {totalCart.toFixed(2)}</span>
              </div>
              <Button className="w-full" size="lg" onClick={handleVenta} disabled={isPending}>
                {isPending ? "Registrando..." : "Cobrar"}
              </Button>
              <button onClick={() => setCart([])} className="w-full text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
                Limpiar carrito
              </button>
            </div>
          )}
        </div>
      </div>

      <CerrarCajaModal
        open={showCierre}
        onClose={() => setShowCierre(false)}
        caja={caja}
        totalVentas={ventasDelDia.total}
        idCaja={caja.id}
      />
    </>
  );
}

// ─── Caja cerrada ─────────────────────────────────────────────────────────────

function CajaCerradaPanel({ caja, totalVentas }: { caja: CajaSerialized; totalVentas: number }) {
  const esperado = caja.montoApertura + totalVentas;
  const diferencia = (caja.montoCierre ?? 0) - esperado;
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-sm space-y-5 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-zinc-100 p-5"><LockKeyhole className="h-8 w-8 text-zinc-500" /></div>
        </div>
        <div>
          <h2 className="text-xl font-bold text-zinc-900">Caja cerrada</h2>
          <p className="text-sm text-zinc-500 mt-1">{caja.fecha}</p>
        </div>
        <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-4 space-y-2 text-sm text-left">
          <div className="flex justify-between"><span className="text-zinc-500">Apertura</span><span className="font-mono">S/ {caja.montoApertura.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-zinc-500">Total ventas</span><span className="font-mono text-emerald-700">S/ {totalVentas.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-zinc-500">Esperado</span><span className="font-mono">S/ {esperado.toFixed(2)}</span></div>
          {caja.montoCierre !== null && (
            <>
              <div className="flex justify-between border-t border-zinc-200 pt-2"><span className="text-zinc-500">Contado</span><span className="font-mono">S/ {caja.montoCierre.toFixed(2)}</span></div>
              <div className={cn("flex justify-between font-semibold", diferencia === 0 ? "text-emerald-600" : diferencia > 0 ? "text-blue-600" : "text-red-600")}>
                <span>Diferencia</span>
                <span className="font-mono">{diferencia > 0 ? "+" : ""}S/ {diferencia.toFixed(2)}</span>
              </div>
            </>
          )}
        </div>
        {caja.observacion && <p className="text-xs text-zinc-400 italic">"{caja.observacion}"</p>}
        <p className="text-xs text-zinc-400">La caja se reabrirá automáticamente el próximo día de operación.</p>
      </div>
    </div>
  );
}

// ─── Export principal ─────────────────────────────────────────────────────────

export function CajaView({
  caja, productos, ventasDelDia,
}: {
  caja: CajaSerialized | null;
  productos: ProductoSerialized[];
  ventasDelDia: { total: number; count: number };
}) {
  if (!caja) return <AbrirCajaPanel />;
  if (caja.estado === "cerrada") return <CajaCerradaPanel caja={caja} totalVentas={ventasDelDia.total} />;
  return <PosView caja={caja} productos={productos} ventasDelDia={ventasDelDia} />;
}
