import { getCompras } from "@/lib/actions/snack-compras";
import { getProveedores } from "@/lib/actions/snack-proveedores";
import { getProductosActivos } from "@/lib/actions/snack-productos";
import { ComprasView } from "./ComprasView";

export const dynamic = "force-dynamic";

export default async function ComprasPage() {
  if (process.env.NEXT_PHASE === "phase-production-build") return null;
  const [compras, proveedores, productos] = await Promise.all([
    getCompras(), getProveedores(), getProductosActivos(),
  ]);
  return <ComprasView compras={compras} proveedores={proveedores} productos={productos} />;
}
