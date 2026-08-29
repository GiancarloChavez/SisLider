import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/auth";
import { getNotaPagoData } from "@/lib/pdf/queries";
import { NotaPago } from "@/lib/pdf/templates/NotaPago";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ abonoId: string }> }
) {
  const session = await auth();
  if (!session?.user) return new Response("No autorizado", { status: 401 });

  const { abonoId } = await params;
  const data = await getNotaPagoData(abonoId);
  if (!data) return new Response("Abono no encontrado", { status: 404 });

  const buffer = await renderToBuffer(createElement(NotaPago, { data }) as any);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="nota-pago-${data.numero}.pdf"`,
    },
  });
}
