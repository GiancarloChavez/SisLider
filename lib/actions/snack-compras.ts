"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type CompraItemInput = {
  idProducto: string;
  cantidad: number;
  precioUnit: number;
};

export type CompraSerialized = {
  id: string;
  fecha: string;
  proveedor: { nombre: string };
  total: number;
  observacion: string | null;
  items: {
    id: string;
    producto: { nombre: string };
    cantidad: number;
    precioUnit: number;
    subtotal: number;
  }[];
};

export async function getCompras(): Promise<CompraSerialized[]> {
  const raw = await prisma.snackCompra.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      proveedor: { select: { nombre: true } },
      items: { include: { producto: { select: { nombre: true } } } },
    },
  });
  return raw.map((c) => ({
    id: c.id,
    fecha: c.fecha.toISOString().slice(0, 10),
    proveedor: { nombre: c.proveedor.nombre },
    total: Number(c.total),
    observacion: c.observacion,
    items: c.items.map((i) => ({
      id: i.id,
      producto: { nombre: i.producto.nombre },
      cantidad: i.cantidad,
      precioUnit: Number(i.precioUnit),
      subtotal: Number(i.subtotal),
    })),
  }));
}

export async function createCompra(data: {
  idProveedor: string;
  observacion?: string;
  items: CompraItemInput[];
}): Promise<{ error?: string }> {
  if (!data.items.length) return { error: "Agrega al menos un producto." };

  const session = await auth();
  const idUsuario = session?.user?.id;
  if (!idUsuario) return { error: "No autenticado." };

  const total = data.items.reduce((s, i) => s + i.cantidad * i.precioUnit, 0);

  await prisma.$transaction(async (tx) => {
    const compra = await tx.snackCompra.create({
      data: {
        idProveedor: data.idProveedor,
        idUsuario,
        total,
        observacion: data.observacion || null,
        items: {
          create: data.items.map((i) => ({
            idProducto: i.idProducto,
            cantidad: i.cantidad,
            precioUnit: i.precioUnit,
            subtotal: i.cantidad * i.precioUnit,
          })),
        },
      },
    });

    // Incrementar stock de cada producto
    for (const item of data.items) {
      await tx.snackProducto.update({
        where: { id: item.idProducto },
        data: { stockActual: { increment: item.cantidad } },
      });
    }

    return compra;
  });

  revalidatePath("/snacks/compras");
  revalidatePath("/snacks/almacen");
  return {};
}
