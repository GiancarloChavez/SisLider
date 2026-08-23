import { prisma } from "@/lib/prisma";
import { DocentesTable } from "./DocentesTable";
import type { DocenteSerialized } from "@/lib/actions/docentes";

async function getDocentes(): Promise<DocenteSerialized[]> {
  const raw = await prisma.docente.findMany({
    include: { usuario: { select: { email: true } } },
    orderBy: [{ activo: "desc" }, { apellido: "asc" }, { nombre: "asc" }],
  });
  return raw.map((d) => ({
    id: d.id,
    nombre: d.nombre,
    apellido: d.apellido,
    celular: d.celular,
    dni: d.dni,
    email: d.usuario?.email ?? null,
    activo: d.activo,
    createdAt: d.createdAt.toISOString(),
  }));
}

export const dynamic = "force-dynamic";

export default async function DocentesPage() {
  if (process.env.NEXT_PHASE === "phase-production-build") return null;
  const docentes = await getDocentes();
  return <DocentesTable docentes={docentes} />;
}
