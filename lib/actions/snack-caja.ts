"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type CajaSerialized = {
  id: string;
  fecha: string;
  montoApertura: number;
  montoCierre: number | null;
  estado: string;
  observacion: string | null;
};

function todayDate(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getCajaHoy(): Promise<CajaSerialized | null> {
  const caja = await prisma.snackCajaDiaria.findUnique({
    where: { fecha: todayDate() },
  });
  if (!caja) return null;
  return {
    id: caja.id,
    fecha: caja.fecha.toISOString().slice(0, 10),
    montoApertura: Number(caja.montoApertura),
    montoCierre: caja.montoCierre ? Number(caja.montoCierre) : null,
    estado: caja.estado,
    observacion: caja.observacion,
  };
}

export async function abrirCaja(
  idUsuario: string,
  montoApertura: number
): Promise<{ error?: string }> {
  const existing = await prisma.snackCajaDiaria.findUnique({ where: { fecha: todayDate() } });
  if (existing) return { error: "Ya existe una caja para hoy." };
  if (montoApertura < 0) return { error: "El monto de apertura no puede ser negativo." };

  await prisma.snackCajaDiaria.create({
    data: { idUsuario, fecha: todayDate(), montoApertura, estado: "abierta" },
  });
  revalidatePath("/snacks");
  return {};
}

export async function cerrarCaja(
  id: string,
  montoCierre: number,
  observacion?: string
): Promise<{ error?: string }> {
  const caja = await prisma.snackCajaDiaria.findUnique({ where: { id } });
  if (!caja || caja.estado !== "abierta") return { error: "La caja no está abierta." };

  await prisma.snackCajaDiaria.update({
    where: { id },
    data: { montoCierre, estado: "cerrada", observacion: observacion || null },
  });
  revalidatePath("/snacks");
  return {};
}

export async function getHistorialCajas(): Promise<(CajaSerialized & { totalVentas: number; cantidadVentas: number })[]> {
  const cajas = await prisma.snackCajaDiaria.findMany({
    orderBy: { fecha: "desc" },
    take: 30,
  });

  return Promise.all(
    cajas.map(async (c) => {
      const end = new Date(c.fecha);
      end.setDate(end.getDate() + 1);
      const agg = await prisma.snackVenta.aggregate({
        where: { fecha: { gte: c.fecha, lt: end } },
        _sum: { total: true },
        _count: { _all: true },
      });
      return {
        id: c.id,
        fecha: c.fecha.toISOString().slice(0, 10),
        montoApertura: Number(c.montoApertura),
        montoCierre: c.montoCierre ? Number(c.montoCierre) : null,
        estado: c.estado,
        observacion: c.observacion,
        totalVentas: Number(agg._sum.total ?? 0),
        cantidadVentas: agg._count._all,
      };
    })
  );
}
