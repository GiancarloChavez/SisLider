"use server";

export type CursoSerialized = {
  id: string;
  nombre: string;
  activo: boolean;
  createdAt: string;
};

import { revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const cursoSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").max(100),
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
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  await prisma.curso.create({ data: parsed.data });
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
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  await prisma.curso.update({ where: { id }, data: parsed.data });
  revalidateTag("cursos");
  return { message: "ok" };
}

export async function toggleCursoActivo(id: string, activo: boolean) {
  await prisma.curso.update({ where: { id }, data: { activo: !activo } });
  revalidateTag("cursos");
}
