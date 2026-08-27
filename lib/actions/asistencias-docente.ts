"use server";

import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

const DIAS_ES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function diaNombre(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return DIAS_ES[new Date(y, m - 1, d).getDay()];
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type ClaseDelDia = {
  idHorario: string;
  curso: { nombre: string };
  docente: { nombre: string; apellido: string };
  aula: { nombre: string };
  numeroGrupo: string;
  horaInicio: string;
  horaFin: string;
  asistencia: { id: string; estado: string } | null;
};

export type RegistroHistorial = {
  id: string;
  fecha: string;
  estado: string;
  horario: {
    id: string;
    numeroGrupo: string;
    horaInicio: string;
    horaFin: string;
    curso: { nombre: string };
    docente: { nombre: string; apellido: string };
  };
};

// ─── Clases del día ───────────────────────────────────────────────────────────

export async function getClasesDelDia(fecha: string): Promise<ClaseDelDia[]> {
  const dia = diaNombre(fecha);
  const fechaDate = new Date(fecha + "T00:00:00.000Z");

  const horarios = await prisma.horario.findMany({
    where: {
      activo: true,
      curso: { activo: true },
      dias: { some: { dia } },
      AND: [
        { OR: [{ fechaInicio: null }, { fechaInicio: { lte: fechaDate } }] },
        { OR: [{ fechaFin: null },    { fechaFin:    { gte: fechaDate } }] },
      ],
    },
    include: {
      curso: { select: { nombre: true } },
      docente: { select: { nombre: true, apellido: true } },
      aula: { select: { nombre: true } },
      asistenciasDocente: {
        where: { fecha: fechaDate },
        select: { id: true, estado: true },
        take: 1,
      },
    },
    orderBy: { horaInicio: "asc" },
  });

  return horarios.map((h) => ({
    idHorario: h.id,
    curso: { nombre: h.curso.nombre },
    docente: { nombre: h.docente.nombre, apellido: h.docente.apellido },
    aula: { nombre: h.aula.nombre },
    numeroGrupo: h.numeroGrupo,
    horaInicio: h.horaInicio.toISOString().slice(11, 16),
    horaFin: h.horaFin.toISOString().slice(11, 16),
    asistencia: h.asistenciasDocente[0] ?? null,
  }));
}

// ─── Registrar asistencia ─────────────────────────────────────────────────────

export async function registrarAsistenciaDocente(
  idHorario: string,
  fecha: string,
  estado: "presente" | "ausente"
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };

  const fechaDate = new Date(fecha + "T00:00:00.000Z");

  try {
    await prisma.asistenciaDocente.upsert({
      where: { idHorario_fecha: { idHorario, fecha: fechaDate } },
      create: { id: crypto.randomUUID(), idHorario, idUsuario: session.user.id, fecha: fechaDate, estado },
      update: { estado, idUsuario: session.user.id },
    });
  } catch {
    return { error: "Error al registrar. Intenta nuevamente." };
  }

  revalidateTag("asistencias-docente");
  return {};
}

// ─── Historial ────────────────────────────────────────────────────────────────

export async function getHistorialAsistenciasDocente(): Promise<RegistroHistorial[]> {
  const records = await prisma.asistenciaDocente.findMany({
    orderBy: [{ fecha: "desc" }],
    take: 500,
    include: {
      horario: {
        include: {
          curso: { select: { nombre: true } },
          docente: { select: { nombre: true, apellido: true } },
        },
      },
    },
  });

  return records.map((r) => ({
    id: r.id,
    fecha: r.fecha.toISOString().slice(0, 10),
    estado: r.estado,
    horario: {
      id: r.horario.id,
      numeroGrupo: r.horario.numeroGrupo,
      horaInicio: r.horario.horaInicio.toISOString().slice(11, 16),
      horaFin: r.horario.horaFin.toISOString().slice(11, 16),
      curso: { nombre: r.horario.curso.nombre },
      docente: { nombre: r.horario.docente.nombre, apellido: r.horario.docente.apellido },
    },
  }));
}
