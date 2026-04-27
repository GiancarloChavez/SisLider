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
      createdAt: c.createdAt.toISOString(),
    }));
  },
  ["cursos-list"],
  { tags: ["cursos"] }
);

export default async function CursosPage() {
  const cursos = await getCursos();
  return <CursosTable cursos={cursos} />;
}
