import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { auth } from "@/auth";
import { getReporteAlumnoData } from "@/lib/pdf/queries";
import { ReporteAlumno } from "@/lib/pdf/templates/ReporteAlumno";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ alumnoId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new Response("No autorizado", { status: 401 });
  }

  const { alumnoId } = await params;
  const data = await getReporteAlumnoData(alumnoId);

  if (!data) {
    return new Response("Alumno no encontrado", { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(createElement(ReporteAlumno, { data }) as any);
  const filename = `reporte-alumno-${data.alumno.apellido.toLowerCase().replace(/\s/g, "-")}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
