"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type VentaItemInput = {
  idProducto: string;
  cantidad: number;
  precioUnit: number;
};

export type VentaSerialized = {
  id: string;
  fecha: string;
  total: number;
  items: {
    id: string;
    producto: { nombre: string };
    cantidad: number;
    precioUnit: number;
    subtotal: number;
  }[];
};

export async function getVentas(): Promise<VentaSerialized[]> {
  const raw = await prisma.snackVenta.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      items: { include: { producto: { select: { nombre: true } } } },
    },
  });
  return raw.map((v) => ({
    id: v.id,
    fecha: v.createdAt.toISOString(),
    total: Number(v.total),
    items: v.items.map((i) => ({
      id: i.id,
      producto: { nombre: i.producto.nombre },
      cantidad: i.cantidad,
      precioUnit: Number(i.precioUnit),
      subtotal: Number(i.subtotal),
    })),
  }));
}

export async function getVentasDelDia(fecha: string): Promise<{ total: number; count: number }> {
  const start = new Date(fecha);
  const end = new Date(fecha);
  end.setDate(end.getDate() + 1);

  const [agg] = await prisma.snackVenta.aggregate({
    where: { fecha: { gte: start, lt: end } },
    _sum: { total: true },
    _count: { _all: true },
  }) as any[];

  return {
    total: Number((agg as any)?._sum?.total ?? 0),
    count: (agg as any)?._count?._all ?? 0,
  };
}

export async function registrarVenta(
  idUsuario: string,
  items: VentaItemInput[]
): Promise<{ error?: string }> {
  if (!items.length) return { error: "El carrito está vacío." };

  // Verificar caja abierta hoy
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const caja = await prisma.snackCajaDiaria.findFirst({
    where: { fecha: hoy, estado: "abierta" },
  });
  if (!caja) return { error: "No hay caja abierta para hoy. Abre la caja primero." };

  const total = items.reduce((s, i) => s + i.cantidad * i.precioUnit, 0);

  await prisma.$transaction(async (tx) => {
    // Verificar stock suficiente
    for (const item of items) {
      const producto = await tx.snackProducto.findUnique({ where: { id: item.idProducto } });
      if (!producto) throw new Error(`Producto no encontrado.`);
      if (producto.stockActual < item.cantidad) {
        throw new Error(`Stock insuficiente para "${producto.nombre}". Disponible: ${producto.stockActual}`);
      }
    }

    await tx.snackVenta.create({
      data: {
        idUsuario,
        total,
        items: {
          create: items.map((i) => ({
            idProducto: i.idProducto,
            cantidad: i.cantidad,
            precioUnit: i.precioUnit,
            subtotal: i.cantidad * i.precioUnit,
          })),
        },
      },
    });

    for (const item of items) {
      await tx.snackProducto.update({
        where: { id: item.idProducto },
        data: { stockActual: { decrement: item.cantidad } },
      });
    }
  });

  revalidatePath("/snacks");
  revalidatePath("/snacks/ventas");
  revalidatePath("/snacks/almacen");
  return {};
}
