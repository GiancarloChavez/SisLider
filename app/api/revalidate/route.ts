import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

const TAGS = [
  "cursos",
  "docentes",
  "aulas",
  "horarios",
  "alumnos",
  "matriculas",
  "pagos",
  "asistencias",
  "descuentos",
];

export async function POST(req: Request) {
  const secret = req.headers.get("x-revalidate-secret");
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  TAGS.forEach(revalidateTag);
  return NextResponse.json({ revalidated: true, tags: TAGS });
}
