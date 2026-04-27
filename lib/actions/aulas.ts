"use server";

import { revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export type AulaSerialized = {
  id: string;
  nombre: string;
  capacidad: number;
  activa: boolean;
};

export type AulaFormState = {
  errors?: Record<string, string[]>;
  message?: string;
};

const aulaSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").max(50),
  capacidad: z.coerce.number().int().positive("La capacidad debe ser mayor a 0"),
});

export async function createAula(
  _prev: AulaFormState,
  formData: FormData
): Promise<AulaFormState> {
  const parsed = aulaSchema.safeParse({
    nombre: formData.get("nombre"),
    capacidad: formData.get("capacidad"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  await prisma.aula.create({ data: parsed.data });
  revalidateTag("aulas");
  return { message: "ok" };
}

export async function updateAula(
  id: string,
  _prev: AulaFormState,
  formData: FormData
): Promise<AulaFormState> {
  const parsed = aulaSchema.safeParse({
    nombre: formData.get("nombre"),
    capacidad: formData.get("capacidad"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  await prisma.aula.update({ where: { id }, data: parsed.data });
  revalidateTag("aulas");
  return { message: "ok" };
}

export async function toggleAulaActiva(id: string, activa: boolean) {
  await prisma.aula.update({ where: { id }, data: { activa: !activa } });
  revalidateTag("aulas");
}
