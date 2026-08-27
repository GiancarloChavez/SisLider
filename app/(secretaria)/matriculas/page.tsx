import { getAlumnosMatriculaView } from "@/lib/actions/matriculas";
import { MatriculasTable } from "./MatriculasTable";

export const dynamic = "force-dynamic";

export default async function MatriculasPage() {
  if (process.env.NEXT_PHASE === "phase-production-build") return null;

  const alumnos = await getAlumnosMatriculaView();

  return <MatriculasTable alumnos={alumnos} />;
}
