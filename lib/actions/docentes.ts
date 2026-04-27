"use server";

import { revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export type DocenteSerialized = {
  id: string;
  nombre: string;
  apellido: string;
  celular: string | null;
  especialidad: string | null;
  activo: boolean;
  createdAt: string;
};

export type DocenteFormState = {
  errors?: Record<string, string[]>;
  message?: string;
};

const docenteSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").max(100),
  apellido: z.string().min(1, "El apellido es requerido").max(100),
  celular: z.string().max(20).optional(),
  especialidad: z.string().max(100).optional(),
});

export async function createDocente(
  _prev: DocenteFormState,
  formData: FormData
): Promise<DocenteFormState> {
  const parsed = docenteSchema.safeParse({
    nombre: formData.get("nombre"),
    apellido: formData.get("apellido"),
    celular: formData.get("celular") || undefined,
    especialidad: formData.get("especialidad") || undefined,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  await prisma.docente.create({ data: parsed.data });
  revalidateTag("docentes");
  return { message: "ok" };
}

export async function updateDocente(
  id: string,
  _prev: DocenteFormState,
  formData: FormData
): Promise<DocenteFormState> {
  const parsed = docenteSchema.safeParse({
    nombre: formData.get("nombre"),
    apellido: formData.get("apellido"),
    celular: formData.get("celular") || undefined,
    especialidad: formData.get("especialidad") || undefined,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  await prisma.docente.update({ where: { id }, data: parsed.data });
  revalidateTag("docentes");
  return { message: "ok" };
}

export async function toggleDocenteActivo(id: string, activo: boolean) {
  await prisma.docente.update({ where: { id }, data: { activo: !activo } });
  revalidateTag("docentes");
}
