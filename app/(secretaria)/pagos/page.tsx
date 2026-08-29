import { getAlumnosPagos, getRegistroAbonos } from "@/lib/actions/pagos";
import { PagosView } from "./PagosView";

export const dynamic = "force-dynamic";

export default async function PagosPage() {
  if (process.env.NEXT_PHASE === "phase-production-build") return null;
  const [alumnos, movimientos] = await Promise.all([
    getAlumnosPagos(),
    getRegistroAbonos(),
  ]);
  return <PagosView alumnos={alumnos} movimientos={movimientos} />;
}
