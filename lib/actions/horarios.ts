"use server";

import { revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export type HorarioSerialized = {
  id: string;
  idCurso: string;
  idDocente: string;
  idAula: string;
  horaInicio: string;
  horaFin: string;
  cupoMaximo: number;
  activo: boolean;
  createdAt: string;
  curso: { nombre: string; nivel: string | null };
  docente: { nombre: string; apellido: string };
  aula: { nombre: string };
  dias: string[];
};

export type SelectOption = { id: string; label: string };

export type HorarioSelectData = {
  cursos: SelectOption[];
  docentes: SelectOption[];
  aulas: SelectOption[];
};

export type HorarioFormState = {
  errors?: Record<string, string[]>;
  message?: string;
};

export async function getHorarioSelectData(): Promise<HorarioSelectData> {
  const [cursos, docentes, aulas] = await Promise.all([
    prisma.curso.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    prisma.docente.findMany({
      where: { activo: true },
      orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
    }),
    prisma.aula.findMany({ where: { activa: true }, orderBy: { nombre: "asc" } }),
  ]);
  return {
    cursos: cursos.map((c) => ({
      id: c.id,
      label: c.nivel ? `${c.nombre} (${c.nivel})` : c.nombre,
    })),
    docentes: docentes.map((d) => ({ id: d.id, label: `${d.apellido}, ${d.nombre}` })),
    aulas: aulas.map((a) => ({ id: a.id, label: a.nombre })),
  };
}

const horarioSchema = z
  .object({
    idCurso: z.string().min(1, "Selecciona un curso"),
    idDocente: z.string().min(1, "Selecciona un docente"),
    idAula: z.string().min(1, "Selecciona un aula"),
    horaInicio: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
    horaFin: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
    cupoMaximo: z.coerce.number().int().positive("El cupo debe ser mayor a 0"),
    dias: z.array(z.string()).min(1, "Selecciona al menos un día"),
  })
  .refine((d) => d.horaFin > d.horaInicio, {
    message: "La hora de fin debe ser posterior a la de inicio",
    path: ["horaFin"],
  });

function parseTime(time: string) {
  return new Date(`1970-01-01T${time}:00.000Z`);
}

export async function createHorario(
  _prev: HorarioFormState,
  formData: FormData
): Promise<HorarioFormState> {
  const parsed = horarioSchema.safeParse({
    idCurso: formData.get("idCurso"),
    idDocente: formData.get("idDocente"),
    idAula: formData.get("idAula"),
    horaInicio: formData.get("horaInicio"),
    horaFin: formData.get("horaFin"),
    cupoMaximo: formData.get("cupoMaximo"),
    dias: formData.getAll("dia"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { dias, horaInicio, horaFin, ...rest } = parsed.data;
  await prisma.horario.create({
    data: {
      ...rest,
      horaInicio: parseTime(horaInicio),
      horaFin: parseTime(horaFin),
      dias: { create: dias.map((dia) => ({ dia })) },
    },
  });
  revalidateTag("horarios");
  return { message: "ok" };
}

export async function updateHorario(
  id: string,
  _prev: HorarioFormState,
  formData: FormData
): Promise<HorarioFormState> {
  const parsed = horarioSchema.safeParse({
    idCurso: formData.get("idCurso"),
    idDocente: formData.get("idDocente"),
    idAula: formData.get("idAula"),
    horaInicio: formData.get("horaInicio"),
    horaFin: formData.get("horaFin"),
    cupoMaximo: formData.get("cupoMaximo"),
    dias: formData.getAll("dia"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { dias, horaInicio, horaFin, ...rest } = parsed.data;
  await prisma.horario.update({
    where: { id },
    data: {
      ...rest,
      horaInicio: parseTime(horaInicio),
      horaFin: parseTime(horaFin),
      dias: {
        deleteMany: {},
        create: dias.map((dia) => ({ dia })),
      },
    },
  });
  revalidateTag("horarios");
  return { message: "ok" };
}

export async function toggleHorarioActivo(id: string, activo: boolean) {
  await prisma.horario.update({ where: { id }, data: { activo: !activo } });
  revalidateTag("horarios");
}
