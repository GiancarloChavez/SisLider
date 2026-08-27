import { getUltimasMatriculas } from "@/lib/actions/matriculas";
import { MatriculasTable, MatriculasHistorial } from "./MatriculasTable";

export const dynamic = "force-dynamic";

export default async function MatriculasPage({
  searchParams,
}: {
  searchParams: Promise<{ historial?: string }>;
}) {
  if (process.env.NEXT_PHASE === "phase-production-build") return null;

  const { historial } = await searchParams;

  if (historial === "true") {
    const todas = await getUltimasMatriculas();
    return <MatriculasHistorial matriculas={todas} />;
  }

  const recientes = await getUltimasMatriculas(15);
  return <MatriculasTable matriculas={recientes} />;
}
