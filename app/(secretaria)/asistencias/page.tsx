import { getClasesDelDia } from "@/lib/actions/asistencias-docente";
import { AsistenciasView } from "./AsistenciasView";

export const dynamic = "force-dynamic";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function AsistenciasPage() {
  if (process.env.NEXT_PHASE === "phase-production-build") return null;
  const clasesHoy = await getClasesDelDia(todayISO());
  return <AsistenciasView initialClases={clasesHoy} />;
}
