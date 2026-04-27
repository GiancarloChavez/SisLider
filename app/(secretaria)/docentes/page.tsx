import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { DocentesTable } from "./DocentesTable";

const getDocentes = unstable_cache(
  async () => {
    const raw = await prisma.docente.findMany({
      orderBy: [{ activo: "desc" }, { apellido: "asc" }, { nombre: "asc" }],
    });
    return raw.map((d) => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
    }));
  },
  ["docentes-list"],
  { tags: ["docentes"] }
);

export default async function DocentesPage() {
  const docentes = await getDocentes();
  return <DocentesTable docentes={docentes} />;
}
