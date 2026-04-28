"use server";

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export type HorarioCalendario = {
  id: string;
  horaInicio: string;
  horaFin: string;
  dias: string[];
  cupoMaximo: number;
  cupoOcupado: number;
  curso: { id: string; nombre: string; nivel: string | null };
  docente: { nombre: string; apellido: string };
  aula: { nombre: string };
};

export const getHorariosCalendario = unstable_cache(
  async (): Promise<HorarioCalendario[]> => {
    const horarios = await prisma.horario.findMany({
      where: { activo: true },
      include: {
        curso: true,
        docente: true,
        aula: true,
        dias: true,
        _count: { select: { matriculas: { where: { estado: "activa" } } } },
      },
      orderBy: { horaInicio: "asc" },
    });

    return horarios.map((h) => ({
      id: h.id,
      horaInicio: h.horaInicio.toISOString().slice(11, 16),
      horaFin: h.horaFin.toISOString().slice(11, 16),
      dias: h.dias.map((d) => d.dia),
      cupoMaximo: h.cupoMaximo,
      cupoOcupado: h._count.matriculas,
      curso: { id: h.curso.id, nombre: h.curso.nombre, nivel: h.curso.nivel },
      docente: { nombre: h.docente.nombre, apellido: h.docente.apellido },
      aula: { nombre: h.aula.nombre },
    }));
  },
  ["horarios-calendario"],
  { tags: ["horarios"] }
);
