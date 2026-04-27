import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { AulasTable } from "./AulasTable";

const getAulas = unstable_cache(
  async () =>
    prisma.aula.findMany({
      orderBy: [{ activa: "desc" }, { nombre: "asc" }],
    }),
  ["aulas-list"],
  { tags: ["aulas"] }
);

export default async function AulasPage() {
  const aulas = await getAulas();
  return <AulasTable aulas={aulas} />;
}
