"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type ProveedorSerialized = {
  id: string;
  nombre: string;
  ruc: string | null;
  contacto: string | null;
  telefono: string | null;
  activo: boolean;
};

export type ProveedorFormState = {
  errors?: Record<string, string[]>;
  message?: string;
};

const schema = z.object({
  nombre:   z.string().min(1, "El nombre es requerido").max(100),
  ruc:      z.string().regex(/^\d{11}$/, "El RUC debe tener 11 dígitos").optional().or(z.literal("")),
  contacto: z.string().max(100).optional(),
  telefono: z.string().max(20).optional(),
});

export async function getProveedores(): Promise<ProveedorSerialized[]> {
  const raw = await prisma.snackProveedor.findMany({
    orderBy: [{ activo: "desc" }, { nombre: "asc" }],
  });
  return raw.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    ruc: p.ruc,
    contacto: p.contacto,
    telefono: p.telefono,
    activo: p.activo,
  }));
}

export async function createProveedor(
  _prev: ProveedorFormState,
  formData: FormData
): Promise<ProveedorFormState> {
  const parsed = schema.safeParse({
    nombre:   formData.get("nombre"),
    ruc:      formData.get("ruc") || undefined,
    contacto: formData.get("contacto") || undefined,
    telefono: formData.get("telefono") || undefined,
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { nombre, ruc, contacto, telefono } = parsed.data;
  if (ruc) {
    const exists = await prisma.snackProveedor.findUnique({ where: { ruc } });
    if (exists) return { errors: { ruc: ["Este RUC ya está registrado."] } };
  }

  await prisma.snackProveedor.create({ data: { nombre, ruc: ruc || null, contacto: contacto || null, telefono: telefono || null } });
  revalidatePath("/snacks/proveedores");
  return { message: "ok" };
}

export async function updateProveedor(
  id: string,
  _prev: ProveedorFormState,
  formData: FormData
): Promise<ProveedorFormState> {
  const parsed = schema.safeParse({
    nombre:   formData.get("nombre"),
    ruc:      formData.get("ruc") || undefined,
    contacto: formData.get("contacto") || undefined,
    telefono: formData.get("telefono") || undefined,
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { nombre, ruc, contacto, telefono } = parsed.data;
  if (ruc) {
    const exists = await prisma.snackProveedor.findFirst({ where: { ruc, NOT: { id } } });
    if (exists) return { errors: { ruc: ["Este RUC ya está registrado."] } };
  }

  await prisma.snackProveedor.update({ where: { id }, data: { nombre, ruc: ruc || null, contacto: contacto || null, telefono: telefono || null } });
  revalidatePath("/snacks/proveedores");
  return { message: "ok" };
}

export async function toggleProveedorActivo(id: string, activo: boolean) {
  await prisma.snackProveedor.update({ where: { id }, data: { activo: !activo } });
  revalidatePath("/snacks/proveedores");
}
