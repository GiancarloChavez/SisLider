import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { MatriculasTable } from "./MatriculasTable";
import type { MatriculaSerialized } from "@/lib/actions/matriculas";

const getMatriculas = unstable_cache(
  async (): Promise<MatriculaSerialized[]> => {
    const raw = await prisma.matricula.findMany({
      orderBy: [{ estado: "asc" }, { createdAt: "desc" }],
      include: {
        alumno: true,
        horario: {
          include: { curso: true, docente: true, aula: true, dias: true },
        },
        descuento: true,
      },
    });

    return raw.map((m) => ({
      id: m.id,
      precioFinalMensual: Number(m.precioFinalMensual),
      fechaInicio: m.fechaInicio.toISOString(),
      estado: m.estado,
      alumno: {
        id: m.alumno.id,
        nombre: m.alumno.nombre,
        apellido: m.alumno.apellido,
        dni: m.alumno.dni,
      },
      horario: {
        curso: { nombre: m.horario.curso.nombre, nivel: m.horario.curso.nivel },
        docente: { nombre: m.horario.docente.nombre, apellido: m.horario.docente.apellido },
        aula: { nombre: m.horario.aula.nombre },
        dias: m.horario.dias.map((d) => d.dia),
        horaInicio: m.horario.horaInicio.toISOString().slice(11, 16),
        horaFin: m.horario.horaFin.toISOString().slice(11, 16),
      },
      descuento: m.descuento ? { nombre: m.descuento.nombre } : null,
    }));
  },
  ["matriculas-list"],
  { tags: ["matriculas"] }
);

export default async function MatriculasPage() {
  const matriculas = await getMatriculas();
  return <MatriculasTable matriculas={matriculas} />;
}
