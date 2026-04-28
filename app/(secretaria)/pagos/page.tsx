import { unstable_cache } from "next/cache";
import { getAlumnosPagos } from "@/lib/actions/pagos";
import { PagosTable } from "./PagosTable";

const getCached = unstable_cache(getAlumnosPagos, ["alumnos-pagos"], {
  tags: ["pagos", "alumnos"],
});

export default async function PagosPage() {
  const alumnos = await getCached();
  return <PagosTable alumnos={alumnos} />;
}
