import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { auth } from "@/auth";
import { getReporteIngresosMensual, getReporteIngresosAnual } from "@/lib/pdf/queries";
import { ReporteIngresosMensual } from "@/lib/pdf/templates/ReporteIngresosMensual";
import { ReporteIngresosAnual } from "@/lib/pdf/templates/ReporteIngresosAnual";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response("No autorizado", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tipo      = searchParams.get("tipo"); // "mensual" | "anual"
  const anioParam = searchParams.get("anio");
  const mesParam  = searchParams.get("mes");
  const anio      = anioParam ? parseInt(anioParam, 10) : new Date().getFullYear();

  if (isNaN(anio) || anio < 2000 || anio > 2100) {
    return new Response("Año inválido", { status: 400 });
  }

  if (tipo === "anual") {
    const data   = await getReporteIngresosAnual(anio);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(createElement(ReporteIngresosAnual, { data }) as any);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="ingresos-${anio}.pdf"`,
      },
    });
  }

  // Default: mensual
  const mes = mesParam ? parseInt(mesParam, 10) : new Date().getMonth() + 1;
  if (isNaN(mes) || mes < 1 || mes > 12) {
    return new Response("Mes inválido", { status: 400 });
  }

  const data   = await getReporteIngresosMensual(anio, mes);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(createElement(ReporteIngresosMensual, { data }) as any);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="ingresos-${String(mes).padStart(2, "0")}-${anio}.pdf"`,
    },
  });
}
