import { NextResponse } from "next/server";
import { auth } from "@/auth";

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ dni: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { dni } = await params;

  if (!/^\d{8}$/.test(dni)) {
    return NextResponse.json({ error: "DNI inválido" }, { status: 400 });
  }

  const token = process.env.APISPERU_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "API no configurada" }, { status: 503 });
  }

  let data: { success?: boolean; nombres?: string; apellidoPaterno?: string; apellidoMaterno?: string };
  try {
    const res = await fetch(
      `https://dniruc.apisperu.com/api/v1/dni/${dni}?token=${token}`,
      { next: { revalidate: 86400 } } // cache 24 h — el DNI no cambia
    );
    if (!res.ok) return NextResponse.json({ error: "DNI no encontrado" }, { status: 404 });
    data = await res.json();
  } catch {
    return NextResponse.json({ error: "Error al consultar RENIEC" }, { status: 502 });
  }

  if (!data.success) {
    return NextResponse.json({ error: "DNI no encontrado" }, { status: 404 });
  }

  const apellido = [data.apellidoPaterno, data.apellidoMaterno]
    .filter(Boolean)
    .join(" ");

  return NextResponse.json({
    nombre: toTitleCase(data.nombres ?? ""),
    apellido: toTitleCase(apellido),
  });
}
