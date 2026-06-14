import { unstable_cache } from "next/cache";
import { getCursosConMatriculas } from "@/lib/actions/matriculas";
import { MatriculasTable } from "./MatriculasTable";

const getCursos = unstable_cache(
  getCursosConMatriculas,
  ["cursos-matriculas"],
  { tags: ["matriculas", "cursos"] }
);

export const dynamic = "force-dynamic";

export default async function MatriculasPage() {
  if (process.env.NEXT_PHASE === "phase-production-build") return null;
  const cursos = await getCursos();
  return <MatriculasTable cursos={cursos} />;
}
