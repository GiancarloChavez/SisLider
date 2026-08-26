"use server";

import { revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export type PeriodoSerialized = {
  id?: string;
  numeroPeriodo: number;
  fechaInicio: string; // YYYY-MM-DD
  fechaFin: string;   // YYYY-MM-DD
};

export type HorarioSerialized = {
  id: string;
  idCurso: string;
  idDocente: string;
  idAula: string;
  numeroGrupo: string;
  precioMensual: number;
  cantidadMeses: number | null;
  fechaInicio?: string;
  fechaFin?: string;
  horaInicio: string;
  horaFin: string;
  activo: boolean;
  createdAt: string;
  curso: { nombre: string };
  docente: { nombre: string; apellido: string };
  aula: { nombre: string; capacidad: number };
  dias: string[];
  periodos: PeriodoSerialized[];
  cantidadMatriculados: number;
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
    prisma.curso.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.docente.findMany({
      where: { activo: true },
      orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
    }),
    prisma.aula.findMany({ where: { activa: true }, orderBy: { nombre: "asc" } }),
  ]);
  return {
    cursos: cursos.map((c) => ({ id: c.id, label: c.nombre })),
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
    fechaInicio: z.string().optional(),
    fechaFin: z.string().optional(),
  })
  .refine((d) => d.horaFin > d.horaInicio, {
    message: "La hora de fin debe ser posterior a la de inicio",
    path: ["horaFin"],
  });

function parseTime(time: string) {
  return new Date(`1970-01-01T${time}:00.000Z`);
}

/** Parsea los períodos enviados en el FormData. */
function parsePeriodos(formData: FormData) {
  const num = parseInt(formData.get("numPeriodos") as string, 10) || 0;
  const result: { numeroPeriodo: number; fechaInicio: Date; fechaFin: Date }[] = [];
  for (let i = 1; i <= num; i++) {
    const ini = formData.get(`periodo_${i}_inicio`) as string;
    const fin = formData.get(`periodo_${i}_fin`) as string;
    if (ini && fin) {
      result.push({
        numeroPeriodo: i,
        fechaInicio: new Date(ini + "T00:00:00"),
        fechaFin: new Date(fin + "T00:00:00"),
      });
    }
  }
  return result;
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

  // Número de grupo
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

  const cantidadMeses = parseInt(formData.get("cantidadMeses") as string, 10) || null;
  const periodos = parsePeriodos(formData);

  const { dias, horaInicio, horaFin, fechaInicio } = parsed.data;

  // fechaFin = último período o null
  const fechaFin =
    periodos.length > 0
      ? periodos[periodos.length - 1].fechaFin
      : null;

  try {
    await prisma.horario.create({
      data: {
        idCurso: parsed.data.idCurso,
        idDocente: parsed.data.idDocente,
        idAula: parsed.data.idAula,
        precioMensual: parsed.data.precioMensual,
        numeroGrupo,
        cantidadMeses,
        horaInicio: parseTime(horaInicio),
        horaFin: parseTime(horaFin),
        fechaInicio: fechaInicio ? new Date(fechaInicio + "T00:00:00") : null,
        fechaFin,
        dias: { create: dias.map((dia) => ({ dia })) },
        periodos: periodos.length > 0
          ? { create: periodos.map((p) => ({ numeroPeriodo: p.numeroPeriodo, fechaInicio: p.fechaInicio, fechaFin: p.fechaFin })) }
          : undefined,
      },
    });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") {
      return { errors: { numeroGrupo: [`El grupo ${numeroGrupo} ya existe en este curso.`] } };
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

  const raw = formData.get("numeroGrupo");
  const num = z.coerce.number().int().positive("Debe ser un número entero positivo").safeParse(raw);
  if (!num.success) return { errors: { numeroGrupo: num.error.issues.map((e) => e.message) } };
  const numeroGrupo = String(num.data);

  const cantidadMeses = parseInt(formData.get("cantidadMeses") as string, 10) || null;
  const periodos = parsePeriodos(formData);

  const { dias, horaInicio, horaFin, fechaInicio } = parsed.data;

  const fechaFin =
    periodos.length > 0
      ? periodos[periodos.length - 1].fechaFin
      : null;

  try {
    await prisma.$transaction([
      // Recrear períodos
      prisma.horarioPeriodo.deleteMany({ where: { idHorario: id } }),
      prisma.horario.update({
        where: { id },
        data: {
          idCurso: parsed.data.idCurso,
          idDocente: parsed.data.idDocente,
          idAula: parsed.data.idAula,
          precioMensual: parsed.data.precioMensual,
          numeroGrupo,
          cantidadMeses,
          horaInicio: parseTime(horaInicio),
          horaFin: parseTime(horaFin),
          fechaInicio: fechaInicio ? new Date(fechaInicio + "T00:00:00") : null,
          fechaFin,
          dias: { deleteMany: {}, create: dias.map((dia) => ({ dia })) },
          periodos: periodos.length > 0
            ? { create: periodos.map((p) => ({ numeroPeriodo: p.numeroPeriodo, fechaInicio: p.fechaInicio, fechaFin: p.fechaFin })) }
            : undefined,
        },
      }),
    ]);
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") {
      return { errors: { numeroGrupo: [`El grupo ${numeroGrupo} ya existe en este curso.`] } };
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

export type BlockedGrupo = {
  id: string;
  numeroGrupo: string;
  nombreCurso: string;
  cantidadMatriculados: number;
};

/**
 * Batch delete: elimina grupos individuales y/o cursos completos (con todos sus grupos).
 * Bloquea si cualquier grupo en la selección tiene matriculados.
 */
export async function deleteBatch(
  grupoIds: string[],
  cursoIds: string[]
): Promise<{ blocked: BlockedGrupo[] } | { deleted: true }> {
  // Expandir cursoIds a sus grupos
  const gruposFromCursos = cursoIds.length > 0
    ? await prisma.horario.findMany({
        where: { idCurso: { in: cursoIds } },
        select: { id: true },
      })
    : [];

  const allGrupoIds = [...new Set([...grupoIds, ...gruposFromCursos.map((g) => g.id)])];

  // Validar matriculados
  if (allGrupoIds.length > 0) {
    const withMatriculas = await prisma.horario.findMany({
      where: { id: { in: allGrupoIds }, matriculas: { some: {} } },
      select: {
        id: true,
        numeroGrupo: true,
        curso: { select: { nombre: true } },
        _count: { select: { matriculas: true } },
      },
    });
    if (withMatriculas.length > 0) {
      return {
        blocked: withMatriculas.map((g) => ({
          id: g.id,
          numeroGrupo: g.numeroGrupo,
          nombreCurso: g.curso.nombre,
          cantidadMatriculados: g._count.matriculas,
        })),
      };
    }
  }

  await prisma.$transaction(async (tx) => {
    if (allGrupoIds.length > 0) {
      await tx.horarioDia.deleteMany({ where: { idHorario: { in: allGrupoIds } } });
      await tx.horario.deleteMany({ where: { id: { in: allGrupoIds } } });
    }
    if (cursoIds.length > 0) {
      await tx.curso.deleteMany({ where: { id: { in: cursoIds } } });
    }
  });

  revalidateTag("horarios");
  return { deleted: true };
}
