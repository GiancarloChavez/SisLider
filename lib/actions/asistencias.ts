"use server";

import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

export type HorarioAsistenciaOption = {
  id: string;
  curso: { nombre: string; nivel: string | null };
  docente: { nombre: string; apellido: string };
  aula: { nombre: string };
  dias: string[];
  horaInicio: string;
  horaFin: string;
};

export type EstudianteAsistencia = {
  idMatricula: string;
  alumno: { id: string; nombre: string; apellido: string };
  asistencia: { id: string; estado: string; observacion: string | null } | null;
};

export type GuardarAsistenciaState = { error?: string; message?: string };

// ─── Get active horarios ──────────────────────────────────────────────────────

export async function getHorariosActivos(): Promise<HorarioAsistenciaOption[]> {
  const horarios = await prisma.horario.findMany({
    where: { activo: true },
    include: { curso: true, docente: true, aula: true, dias: true },
    orderBy: { horaInicio: "asc" },
  });

  return horarios.map((h) => ({
    id: h.id,
    curso: { nombre: h.curso.nombre, nivel: h.curso.nivel },
    docente: { nombre: h.docente.nombre, apellido: h.docente.apellido },
    aula: { nombre: h.aula.nombre },
    dias: h.dias.map((d) => d.dia),
    horaInicio: h.horaInicio.toISOString().slice(11, 16),
    horaFin: h.horaFin.toISOString().slice(11, 16),
  }));
}

// ─── Get attendance for a horario on a date ───────────────────────────────────

export async function getEstudiantesDelHorario(
  idHorario: string,
  fecha: string
): Promise<EstudianteAsistencia[]> {
  const fechaDate = new Date(fecha + "T00:00:00.000Z");

  const matriculas = await prisma.matricula.findMany({
    where: { idHorario, estado: "activa" },
    include: {
      alumno: { select: { id: true, nombre: true, apellido: true } },
      asistencias: {
        where: { fecha: fechaDate },
        select: { id: true, estado: true, observacion: true },
        take: 1,
      },
    },
    orderBy: [
      { alumno: { apellido: "asc" } },
      { alumno: { nombre: "asc" } },
    ],
  });

  return matriculas.map((m) => ({
    idMatricula: m.id,
    alumno: { id: m.alumno.id, nombre: m.alumno.nombre, apellido: m.alumno.apellido },
    asistencia: m.asistencias[0] ?? null,
  }));
}

// ─── Save attendance batch ────────────────────────────────────────────────────

export type AsistenciaRegistro = {
  idMatricula: string;
  estado: string;
  observacion?: string;
};

export async function guardarAsistencias(
  fecha: string,
  registros: AsistenciaRegistro[]
): Promise<GuardarAsistenciaState> {
  const session = await auth();
  if (!session?.user?.email) return { error: "No autenticado" };

  const usuario = await prisma.usuario.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!usuario) return { error: "Usuario no encontrado" };

  if (!registros.length) return { error: "No hay registros para guardar" };

  const fechaDate = new Date(fecha + "T00:00:00.000Z");

  await prisma.$transaction(
    registros.map((r) =>
      prisma.asistencia.upsert({
        where: { idMatricula_fecha: { idMatricula: r.idMatricula, fecha: fechaDate } },
        create: {
          idMatricula: r.idMatricula,
          idUsuario: usuario.id,
          fecha: fechaDate,
          estado: r.estado,
          observacion: r.observacion ?? null,
        },
        update: {
          estado: r.estado,
          observacion: r.observacion ?? null,
        },
      })
    )
  );

  revalidateTag("asistencias");
  return { message: "ok" };
}
