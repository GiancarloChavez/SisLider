import { getAlumnosList } from "@/lib/pdf/queries";
import { ReportesView } from "./ReportesView";

export const dynamic = "force-dynamic";

export default async function ReportesPage() {
  const alumnos = await getAlumnosList();
  return <ReportesView alumnos={alumnos} />;
}
