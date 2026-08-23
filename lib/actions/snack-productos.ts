"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type ProductoSerialized = {
  id: string;
  nombre: string;
  categoria: string | null;
  precioVenta: number;
  costoReferencial: number | null;
  stockActual: number;
  stockMinimo: number;
  fechaVencimiento: string | null;
  activo: boolean;
  bajoStock: boolean;
};

export type ProductoFormState = {
  errors?: Record<string, string[]>;
  message?: string;
};

const schema = z.object({
  nombre:           z.string().min(1, "El nombre es requerido").max(100),
  categoria:        z.string().max(50).optional(),
  precioVenta:      z.coerce.number().positive("El precio debe ser mayor a 0"),
  costoReferencial: z.coerce.number().nonnegative().optional(),
  stockMinimo:      z.coerce.number().int().nonnegative().default(0),
  fechaVencimiento: z.string().optional(),
});

function serialize(p: {
  id: string; nombre: string; categoria: string | null;
  precioVenta: import("@prisma/client").Prisma.Decimal;
  costoReferencial: import("@prisma/client").Prisma.Decimal | null;
  stockActual: number; stockMinimo: number;
  fechaVencimiento: Date | null; activo: boolean;
}): ProductoSerialized {
  return {
    id: p.id,
    nombre: p.nombre,
    categoria: p.categoria,
    precioVenta: Number(p.precioVenta),
    costoReferencial: p.costoReferencial ? Number(p.costoReferencial) : null,
    stockActual: p.stockActual,
    stockMinimo: p.stockMinimo,
    fechaVencimiento: p.fechaVencimiento?.toISOString().slice(0, 10) ?? null,
    activo: p.activo,
    bajoStock: p.stockActual <= p.stockMinimo,
  };
}

export async function getProductos(): Promise<ProductoSerialized[]> {
  const raw = await prisma.snackProducto.findMany({
    orderBy: [{ activo: "desc" }, { nombre: "asc" }],
  });
  return raw.map(serialize);
}

export async function getProductosActivos(): Promise<ProductoSerialized[]> {
  const raw = await prisma.snackProducto.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
  });
  return raw.map(serialize);
}

export async function createProducto(
  _prev: ProductoFormState,
  formData: FormData
): Promise<ProductoFormState> {
  const parsed = schema.safeParse({
    nombre:           formData.get("nombre"),
    categoria:        formData.get("categoria") || undefined,
    precioVenta:      formData.get("precioVenta"),
    costoReferencial: formData.get("costoReferencial") || undefined,
    stockMinimo:      formData.get("stockMinimo") || 0,
    fechaVencimiento: formData.get("fechaVencimiento") || undefined,
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { nombre, categoria, precioVenta, costoReferencial, stockMinimo, fechaVencimiento } = parsed.data;
  await prisma.snackProducto.create({
    data: {
      nombre,
      categoria: categoria || null,
      precioVenta,
      costoReferencial: costoReferencial ?? null,
      stockMinimo,
      fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
    },
  });
  revalidatePath("/snacks/almacen");
  return { message: "ok" };
}

export async function updateProducto(
  id: string,
  _prev: ProductoFormState,
  formData: FormData
): Promise<ProductoFormState> {
  const parsed = schema.safeParse({
    nombre:           formData.get("nombre"),
    categoria:        formData.get("categoria") || undefined,
    precioVenta:      formData.get("precioVenta"),
    costoReferencial: formData.get("costoReferencial") || undefined,
    stockMinimo:      formData.get("stockMinimo") || 0,
    fechaVencimiento: formData.get("fechaVencimiento") || undefined,
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { nombre, categoria, precioVenta, costoReferencial, stockMinimo, fechaVencimiento } = parsed.data;
  await prisma.snackProducto.update({
    where: { id },
    data: {
      nombre,
      categoria: categoria || null,
      precioVenta,
      costoReferencial: costoReferencial ?? null,
      stockMinimo,
      fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
    },
  });
  revalidatePath("/snacks/almacen");
  return { message: "ok" };
}

export async function toggleProductoActivo(id: string, activo: boolean) {
  await prisma.snackProducto.update({ where: { id }, data: { activo: !activo } });
  revalidatePath("/snacks/almacen");
}
