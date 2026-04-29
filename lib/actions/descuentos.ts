"use server";

import { revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export type DescuentoSerialized = {
  id: string;
  nombre: string;
  tipo: string;
  valor: number;
  automatico: boolean;
  activo: boolean;
  grupo: { id: string; nombre: string } | null;
};

export type GrupoOption = {
  id: string;
  nombre: string;
};

export type DescuentoFormState = {
  errors?: Record<string, string[]>;
  message?: string;
};

const descuentoSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").max(100),
  tipo: z.enum(["porcentaje", "monto"], { message: "Tipo inválido" }),
  valor: z.coerce.number().positive("El valor debe ser mayor a 0"),
  automatico: z.coerce.boolean().default(false),
  idGrupo: z.string().optional(),
});

export async function getGruposOptions(): Promise<GrupoOption[]> {
  const grupos = await prisma.grupoDescuento.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true },
  });
  return grupos;
}

export async function createDescuento(
  _prev: DescuentoFormState,
  formData: FormData
): Promise<DescuentoFormState> {
  const parsed = descuentoSchema.safeParse({
    nombre: formData.get("nombre"),
    tipo: formData.get("tipo"),
    valor: formData.get("valor"),
    automatico: formData.get("automatico") === "true",
    idGrupo: formData.get("idGrupo") || undefined,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { idGrupo, ...rest } = parsed.data;
  await prisma.descuento.create({
    data: { ...rest, idGrupo: idGrupo ?? null },
  });
  revalidateTag("descuentos");
  return { message: "ok" };
}

export async function updateDescuento(
  id: string,
  _prev: DescuentoFormState,
  formData: FormData
): Promise<DescuentoFormState> {
  const parsed = descuentoSchema.safeParse({
    nombre: formData.get("nombre"),
    tipo: formData.get("tipo"),
    valor: formData.get("valor"),
    automatico: formData.get("automatico") === "true",
    idGrupo: formData.get("idGrupo") || undefined,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { idGrupo, ...rest } = parsed.data;
  await prisma.descuento.update({
    where: { id },
    data: { ...rest, idGrupo: idGrupo ?? null },
  });
  revalidateTag("descuentos");
  return { message: "ok" };
}

export async function toggleDescuentoActivo(id: string, activo: boolean) {
  await prisma.descuento.update({ where: { id }, data: { activo: !activo } });
  revalidateTag("descuentos");
}
