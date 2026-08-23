import { getVentas } from "@/lib/actions/snack-ventas";
import { VentasHistorial } from "./VentasHistorial";

export const dynamic = "force-dynamic";

export default async function VentasPage() {
  if (process.env.NEXT_PHASE === "phase-production-build") return null;
  const ventas = await getVentas();
  return <VentasHistorial ventas={ventas} />;
}
