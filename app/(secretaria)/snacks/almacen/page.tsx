import { getProductos } from "@/lib/actions/snack-productos";
import { AlmacenView } from "./AlmacenView";

export const dynamic = "force-dynamic";

export default async function AlmacenPage() {
  if (process.env.NEXT_PHASE === "phase-production-build") return null;
  const productos = await getProductos();
  return <AlmacenView productos={productos} />;
}
