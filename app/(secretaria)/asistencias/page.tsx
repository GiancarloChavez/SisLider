import { getHorariosActivos } from "@/lib/actions/asistencias";
import { AsistenciasView } from "./AsistenciasView";

export const dynamic = "force-dynamic";

export default async function AsistenciasPage() {
  if (process.env.NEXT_PHASE === "phase-production-build") return null;
  const horarios = await getHorariosActivos();
  return <AsistenciasView horarios={horarios} />;
}
