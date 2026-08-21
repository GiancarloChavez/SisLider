"use server";

export type CursoSerialized = {
  id: string;
  nombre: string;
  nivel: string | null;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
  createdAt: string;
};

import { revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const cursoSchema = z
  .object({
    nombre: z.string().min(1, "El nombre es requerido").max(100),
    nivel: z.string().max(50).optional(),
    fechaInicio: z.string().min(1, "La fecha de inicio es requerida"),
    fechaFin: z.string().min(1, "La fecha de fin es requerida"),
  })
  .refine((d) => d.fechaFin > d.fechaInicio, {
    message: "La fecha de fin debe ser posterior a la de inicio",
    path: ["fechaFin"],
  });

export type CursoFormState = {
  errors?: Record<string, string[]>;
  message?: string;
};

export async function createCurso(
  _prev: CursoFormState,
  formData: FormData
): Promise<CursoFormState> {
  const parsed = cursoSchema.safeParse({
    nombre: formData.get("nombre"),
    nivel: formData.get("nivel") || undefined,
    fechaInicio: formData.get("fechaInicio"),
    fechaFin: formData.get("fechaFin"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { fechaInicio, fechaFin, ...rest } = parsed.data;
  await prisma.curso.create({
    data: {
      ...rest,
      fechaInicio: new Date(fechaInicio),
      fechaFin: new Date(fechaFin),
    },
  });
  revalidateTag("cursos");
  return { message: "ok" };
}

export async function updateCurso(
  id: string,
  _prev: CursoFormState,
  formData: FormData
): Promise<CursoFormState> {
  const parsed = cursoSchema.safeParse({
    nombre: formData.get("nombre"),
    nivel: formData.get("nivel") || undefined,
    fechaInicio: formData.get("fechaInicio"),
    fechaFin: formData.get("fechaFin"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { fechaInicio, fechaFin, ...rest } = parsed.data;
  await prisma.curso.update({
    where: { id },
    data: {
      ...rest,
      fechaInicio: new Date(fechaInicio),
      fechaFin: new Date(fechaFin),
    },
  });
  revalidateTag("cursos");
  return { message: "ok" };
}

export async function toggleCursoActivo(id: string, activo: boolean) {
  await prisma.curso.update({ where: { id }, data: { activo: !activo } });
  revalidateTag("cursos");
}
