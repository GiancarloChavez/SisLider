import { notFound } from "next/navigation";
import { getDocentePerfilAdmin, getDocentesParaReemplazo } from "@/lib/actions/docentes";
import { DocentePerfilView } from "./DocentePerfilView";

export const dynamic = "force-dynamic";

export default async function DocentePerfilPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (process.env.NEXT_PHASE === "phase-production-build") return null;

  const { id } = await params;

  const [docente, reemplazos] = await Promise.all([
    getDocentePerfilAdmin(id),
    getDocentesParaReemplazo(id),
  ]);

  if (!docente) notFound();

  return <DocentePerfilView docente={docente} reemplazos={reemplazos} />;
}
