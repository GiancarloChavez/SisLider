import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { DescuentosTable } from "./DescuentosTable";

const getDescuentos = unstable_cache(
  async () => {
    const raw = await prisma.descuento.findMany({
      orderBy: [{ activo: "desc" }, { nombre: "asc" }],
      include: { grupo: { select: { id: true, nombre: true } } },
    });
    return raw.map((d) => ({
      id: d.id,
      nombre: d.nombre,
      tipo: d.tipo,
      valor: Number(d.valor),
      automatico: d.automatico,
      activo: d.activo,
      grupo: d.grupo ? { id: d.grupo.id, nombre: d.grupo.nombre } : null,
    }));
  },
  ["descuentos-list"],
  { tags: ["descuentos"] }
);

export default async function DescuentosPage() {
  const descuentos = await getDescuentos();
  return <DescuentosTable descuentos={descuentos} />;
}
