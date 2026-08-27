import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getHorariosByDocente } from "@/lib/actions/asistencias";
import { AsistenciasDocenteView } from "./AsistenciasDocenteView";

export const dynamic = "force-dynamic";

export default async function AsistenciaDocentePage() {
  const session = await auth();
  const docenteId = session?.user?.docenteId;

  if (!docenteId) redirect("/login");

  const horarios = await getHorariosByDocente(docenteId);

  return <AsistenciasDocenteView horarios={horarios} />;
}
