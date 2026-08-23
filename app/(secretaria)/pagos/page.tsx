import { getAlumnosPagos } from "@/lib/actions/pagos";
import { PagosTable } from "./PagosTable";

export const dynamic = "force-dynamic";

export default async function PagosPage() {
  if (process.env.NEXT_PHASE === "phase-production-build") return null;
  const alumnos = await getAlumnosPagos();
  return <PagosTable alumnos={alumnos} />;
}
