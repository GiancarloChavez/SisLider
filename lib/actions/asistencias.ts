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

export type HorarioAsistenciaOption = {
  id: string;
  curso: { nombre: string };
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
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const horarios = await prisma.horario.findMany({
    where: { activo: true, curso: { activo: true } },
    include: { curso: true, docente: true, aula: true, dias: true },
    orderBy: { horaInicio: "asc" },
  });

  return horarios.map((h) => ({
    id: h.id,
    curso: { nombre: h.curso.nombre },
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
  const dia = diaNombre(fecha);

  const matriculas = await prisma.matricula.findMany({
    where: {
      idHorario,
      estado: "activa",
      fechaInicio: { lte: fechaDate },
      alumno: { habilitado: true },
      dias: { some: { dia } },
    },
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
  if (!session?.user?.id) return { error: "No autenticado" };

  const idUsuario = session.user.id;

  if (!registros.length) return { error: "No hay registros para guardar" };

  // Peru is UTC-5 year-round; compute "today" in Lima time
  const nowPeru = new Date(Date.now() - 5 * 60 * 60 * 1000);
  const todayPeru = `${nowPeru.getUTCFullYear()}-${String(nowPeru.getUTCMonth() + 1).padStart(2, "0")}-${String(nowPeru.getUTCDate()).padStart(2, "0")}`;
  if (fecha < todayPeru) return { error: "No se puede registrar asistencia en fechas pasadas." };
  if (fecha > todayPeru) return { error: "No se puede registrar asistencia en fechas futuras." };

  const fechaDate = new Date(fecha + "T00:00:00.000Z");

  try {
    await prisma.$transaction(
      registros.map((r) =>
        prisma.asistencia.upsert({
          where: { idMatricula_fecha: { idMatricula: r.idMatricula, fecha: fechaDate } },
          create: {
            idMatricula: r.idMatricula,
            idUsuario,
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
  } catch {
    return { error: "Error al guardar las asistencias. Intenta nuevamente." };
  }

  revalidateTag("asistencias");
  return { message: "ok" };
}
