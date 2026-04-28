import { getHorariosActivos } from "@/lib/actions/asistencias";
import { AsistenciasView } from "./AsistenciasView";

export default async function AsistenciasPage() {
  const horarios = await getHorariosActivos();
  return <AsistenciasView horarios={horarios} />;
}
