import { unstable_cache } from "next/cache";
import { getAlumnosPagos } from "@/lib/actions/pagos";
import { PagosTable } from "./PagosTable";

const getCached = unstable_cache(getAlumnosPagos, ["alumnos-pagos"], {
  tags: ["pagos", "alumnos"],
});

export const dynamic = "force-dynamic";

export default async function PagosPage() {
  if (process.env.NEXT_PHASE === "phase-production-build") return null;
  const alumnos = await getCached();
  return <PagosTable alumnos={alumnos} />;
}
