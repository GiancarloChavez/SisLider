import { prisma } from "@/lib/prisma";
import { AulasTable } from "./AulasTable";

export const dynamic = "force-dynamic";

export default async function AulasPage() {
  if (process.env.NEXT_PHASE === "phase-production-build") return null;
  const aulas = await prisma.aula.findMany({
    orderBy: [{ activa: "desc" }, { nombre: "asc" }],
  });
  return <AulasTable aulas={aulas} />;
}
