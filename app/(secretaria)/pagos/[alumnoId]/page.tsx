import { notFound } from "next/navigation";
import { getAlumnoPagos } from "@/lib/actions/pagos";
import { PagoAlumnoView } from "./PagoAlumnoView";

export default async function PagoAlumnoPage({
  params,
}: {
  params: Promise<{ alumnoId: string }>;
}) {
  const { alumnoId } = await params;
  const alumno = await getAlumnoPagos(alumnoId);
  if (!alumno) notFound();
  return <PagoAlumnoView alumno={alumno} />;
}
