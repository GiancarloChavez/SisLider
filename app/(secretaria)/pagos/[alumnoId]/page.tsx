import { notFound } from "next/navigation";
import { getAlumnoPagos } from "@/lib/actions/pagos";
import { PagoAlumnoView } from "./PagoAlumnoView";

export const dynamic = "force-dynamic";

export default async function PagoAlumnoPage({
  params,
}: {
  params: Promise<{ alumnoId: string }>;
}) {
  if (process.env.NEXT_PHASE === "phase-production-build") return null;
  const { alumnoId } = await params;
  const alumno = await getAlumnoPagos(alumnoId);
  if (!alumno) notFound();
  return <PagoAlumnoView alumno={alumno} />;
}
