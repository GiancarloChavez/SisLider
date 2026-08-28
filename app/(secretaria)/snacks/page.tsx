import { getCajaHoy } from "@/lib/actions/snack-caja";
import { getProductosActivos } from "@/lib/actions/snack-productos";
import { getVentasDelDia } from "@/lib/actions/snack-ventas";
import { CajaView } from "./CajaView";

export const dynamic = "force-dynamic";

export default async function SnacksPage() {
  if (process.env.NEXT_PHASE === "phase-production-build") return null;

  const hoy = new Date().toISOString().slice(0, 10);

  const [caja, productos, ventasDelDia] = await Promise.all([
    getCajaHoy(),
    getProductosActivos(),
    getVentasDelDia(hoy),
  ]);

  return (
    <CajaView
      caja={caja}
      productos={productos}
      ventasDelDia={ventasDelDia}
    />
  );
}
