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

export const dynamic = "force-dynamic";

export default async function AulasPage() {
  if (process.env.NEXT_PHASE === "phase-production-build") return null;
  const aulas = await getAulas();
  return <AulasTable aulas={aulas} />;
}
