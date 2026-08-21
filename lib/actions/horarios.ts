"use server";

import { revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export type HorarioSerialized = {
  id: string;
  idCurso: string;
  idDocente: string;
  idAula: string;
  numeroGrupo: string;
  precioMensual: number;
  horaInicio: string;
  horaFin: string;
  activo: boolean;
  createdAt: string;
  curso: { nombre: string; nivel: string | null };
  docente: { nombre: string; apellido: string };
  aula: { nombre: string; capacidad: number };
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
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const [cursos, docentes, aulas] = await Promise.all([
    prisma.curso.findMany({
      where: { activo: true, fechaFin: { gte: hoy } }, // Incluye próximos
      orderBy: [{ fechaInicio: "asc" }, { nombre: "asc" }],
    }),
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

export async function getNextNumeroGrupo(idCurso: string): Promise<number> {
  const all = await prisma.horario.findMany({
    where: { idCurso },
    select: { numeroGrupo: true },
  });
  const nums = all.map((h) => parseInt(h.numeroGrupo, 10)).filter((n) => !isNaN(n));
  return nums.length > 0 ? Math.max(...nums) + 1 : 1;
}

const horarioSchema = z
  .object({
    idCurso: z.string().min(1, "Selecciona un curso"),
    idDocente: z.string().min(1, "Selecciona un docente"),
    idAula: z.string().min(1, "Selecciona un aula"),
    precioMensual: z.coerce.number().positive("El precio debe ser mayor a 0"),
    horaInicio: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
    horaFin: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
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
    precioMensual: formData.get("precioMensual"),
    horaInicio: formData.get("horaInicio"),
    horaFin: formData.get("horaFin"),
    dias: formData.getAll("dia"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  // Resolver número de grupo (único por curso)
  const autoNumero = formData.get("autoNumero") === "true";
  let numeroGrupo: string;

  if (autoNumero) {
    numeroGrupo = String(await getNextNumeroGrupo(parsed.data.idCurso));
  } else {
    const raw = formData.get("numeroGrupo");
    const num = z.coerce.number().int().positive("Debe ser un número entero positivo").safeParse(raw);
    if (!num.success) return { errors: { numeroGrupo: num.error.issues.map((e) => e.message) } };
    numeroGrupo = String(num.data);
  }

  const { dias, horaInicio, horaFin, ...rest } = parsed.data;
  try {
    await prisma.horario.create({
      data: { ...rest, numeroGrupo, horaInicio: parseTime(horaInicio), horaFin: parseTime(horaFin), dias: { create: dias.map((dia) => ({ dia })) } },
    });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") {
      return { errors: { numeroGrupo: [`El grupo ${numeroGrupo} ya existe en este curso. Elige otro número.`] } };
    }
    throw e;
  }
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
    precioMensual: formData.get("precioMensual"),
    horaInicio: formData.get("horaInicio"),
    horaFin: formData.get("horaFin"),
    dias: formData.getAll("dia"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  // Número de grupo para edición (siempre manual, único por curso)
  const raw = formData.get("numeroGrupo");
  const num = z.coerce.number().int().positive("Debe ser un número entero positivo").safeParse(raw);
  if (!num.success) return { errors: { numeroGrupo: num.error.issues.map((e) => e.message) } };
  const numeroGrupo = String(num.data);

  const { dias, horaInicio, horaFin, ...rest } = parsed.data;
  try {
    await prisma.horario.update({
      where: { id },
      data: {
        ...rest,
        numeroGrupo,
        horaInicio: parseTime(horaInicio),
        horaFin: parseTime(horaFin),
        dias: { deleteMany: {}, create: dias.map((dia) => ({ dia })) },
      },
    });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") {
      return { errors: { numeroGrupo: [`El grupo ${numeroGrupo} ya existe en este curso. Elige otro número.`] } };
    }
    throw e;
  }
  revalidateTag("horarios");
  return { message: "ok" };
}


export async function toggleHorarioActivo(id: string, activo: boolean) {
  await prisma.horario.update({ where: { id }, data: { activo: !activo } });
  revalidateTag("horarios");
}
