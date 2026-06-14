import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CursosTable } from "./CursosTable";

const getCursos = unstable_cache(
  async () => {
    const raw = await prisma.curso.findMany({
      orderBy: [{ activo: "desc" }, { nombre: "asc" }],
    });
    return raw.map((c) => ({
      ...c,
      precioMensual: Number(c.precioMensual),
      fechaInicio: c.fechaInicio.toISOString().slice(0, 10),
      fechaFin: c.fechaFin.toISOString().slice(0, 10),
      createdAt: c.createdAt.toISOString(),
    }));
  },
  ["cursos-list"],
  { tags: ["cursos"] }
);

export const dynamic = "force-dynamic";

export default async function CursosPage() {
  if (process.env.NEXT_PHASE === "phase-production-build") return null;
  const cursos = await getCursos();
  return <CursosTable cursos={cursos} />;
}
