"use server";

import { revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AusenciaSinRecuperacion = {
  idAsistencia: string;
  fecha: string;
  estadoAsistencia: string;
  observacion: string | null;
  alumno: { id: string; nombre: string; apellido: string; dni: string | null };
  curso: { nombre: string };
  horario: { horaInicio: string; horaFin: string };
};

export type RecuperacionRow = {
  id: string;
  estado: string;
  fechaRecuperacion: string | null;
  observacion: string | null;
  createdAt: string;
  asistencia: {
    fecha: string;
    estadoAsistencia: string;
    alumno: { id: string; nombre: string; apellido: string; dni: string | null };
    curso: { nombre: string };
  };
  horarioRecuperacion: {
    id: string;
    curso: string;
    dias: string[];
    horaInicio: string;
    horaFin: string;
  } | null;
};

export type HorarioRecuperacionOption = {
  id: string;
  label: string;
};

export type RecuperacionFormState = {
  errors?: Record<string, string[]>;
  message?: string;
};

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getAusenciasSinRecuperacion(): Promise<AusenciaSinRecuperacion[]> {
  const asistencias = await prisma.asistencia.findMany({
    where: {
      estado: { in: ["ausente", "justificado"] },
      recuperacion: null,
    },
    include: {
      matricula: {
        include: {
          alumno: { select: { id: true, nombre: true, apellido: true, dni: true } },
          horario: {
            include: { curso: { select: { nombre: true } } },
          },
        },
      },
    },
    orderBy: { fecha: "desc" },
  });

  return asistencias.map((a) => ({
    idAsistencia: a.id,
    fecha: a.fecha.toISOString().slice(0, 10),
    estadoAsistencia: a.estado,
    observacion: a.observacion,
    alumno: {
      id: a.matricula.alumno.id,
      nombre: a.matricula.alumno.nombre,
      apellido: a.matricula.alumno.apellido,
      dni: a.matricula.alumno.dni,
    },
    curso: {
      nombre: a.matricula.horario.curso.nombre,
    },
    horario: {
      horaInicio: a.matricula.horario.horaInicio.toISOString().slice(11, 16),
      horaFin: a.matricula.horario.horaFin.toISOString().slice(11, 16),
    },
  }));
}

export async function getRecuperaciones(): Promise<RecuperacionRow[]> {
  const recuperaciones = await prisma.recuperacion.findMany({
    include: {
      asistencia: {
        include: {
          matricula: {
            include: {
              alumno: { select: { id: true, nombre: true, apellido: true, dni: true } },
              horario: {
                include: { curso: { select: { nombre: true } } },
              },
            },
          },
        },
      },
      horario: {
        include: { curso: true, dias: true },
      },
    },
    orderBy: [{ estado: "asc" }, { createdAt: "desc" }],
  });

  return recuperaciones.map((r) => ({
    id: r.id,
    estado: r.estado,
    fechaRecuperacion: r.fechaRecuperacion?.toISOString().slice(0, 10) ?? null,
    observacion: r.observacion,
    createdAt: r.createdAt.toISOString().slice(0, 10),
    asistencia: {
      fecha: r.asistencia.fecha.toISOString().slice(0, 10),
      estadoAsistencia: r.asistencia.estado,
      alumno: {
        id: r.asistencia.matricula.alumno.id,
        nombre: r.asistencia.matricula.alumno.nombre,
        apellido: r.asistencia.matricula.alumno.apellido,
        dni: r.asistencia.matricula.alumno.dni,
      },
      curso: {
        nombre: r.asistencia.matricula.horario.curso.nombre,
      },
    },
    horarioRecuperacion: r.horario
      ? {
          id: r.horario.id,
          curso: r.horario.curso.nombre,
          dias: r.horario.dias.map((d) => d.dia),
          horaInicio: r.horario.horaInicio.toISOString().slice(11, 16),
          horaFin: r.horario.horaFin.toISOString().slice(11, 16),
        }
      : null,
  }));
}

export async function getHorariosParaRecuperacion(): Promise<HorarioRecuperacionOption[]> {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const horarios = await prisma.horario.findMany({
    where: { activo: true, curso: { activo: true } },
    include: { curso: true, dias: true },
    orderBy: { horaInicio: "asc" },
  });

  const DIA_ABREV: Record<string, string> = {
    Lunes: "Lu", Martes: "Ma", Miércoles: "Mi",
    Jueves: "Ju", Viernes: "Vi", Sábado: "Sa", Domingo: "Do",
  };
  const DIA_ORDER = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];

  return horarios.map((h) => {
    const diasStr = [...h.dias]
      .sort((a, b) => DIA_ORDER.indexOf(a.dia) - DIA_ORDER.indexOf(b.dia))
      .map((d) => DIA_ABREV[d.dia] ?? d.dia)
      .join("/");
    return {
      id: h.id,
      label: `${h.curso.nombre} — ${diasStr} ${h.horaInicio.toISOString().slice(11,16)}–${h.horaFin.toISOString().slice(11,16)}`,
    };
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

const crearSchema = z.object({
  idAsistencia:          z.string().min(1),
  fechaRecuperacion:     z.string().optional().or(z.literal("")),
  idHorarioRecuperacion: z.string().optional().or(z.literal("")),
  observacion:           z.string().max(300).optional().or(z.literal("")),
});

export async function crearRecuperacion(
  _prev: RecuperacionFormState,
  formData: FormData
): Promise<RecuperacionFormState> {
  const parsed = crearSchema.safeParse({
    idAsistencia:          formData.get("idAsistencia"),
    fechaRecuperacion:     formData.get("fechaRecuperacion") || undefined,
    idHorarioRecuperacion: formData.get("idHorarioRecuperacion") || undefined,
    observacion:           formData.get("observacion") || undefined,
  });

  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { idAsistencia, fechaRecuperacion, idHorarioRecuperacion, observacion } = parsed.data;

  const asistencia = await prisma.asistencia.findUnique({ where: { id: idAsistencia } });
  if (!asistencia) return { errors: { idAsistencia: ["Asistencia no encontrada"] } };

  const existe = await prisma.recuperacion.findUnique({ where: { idAsistencia } });
  if (existe) return { errors: { idAsistencia: ["Ya existe una recuperación para esta ausencia"] } };

  await prisma.recuperacion.create({
    data: {
      idAsistencia,
      idHorarioRecuperacion: idHorarioRecuperacion || null,
      fechaRecuperacion: fechaRecuperacion ? new Date(fechaRecuperacion) : null,
      estado: "pendiente",
      observacion: observacion || null,
    },
  });

  revalidateTag("recuperaciones");
  return { message: "ok" };
}

const actualizarSchema = z.object({
  fechaRecuperacion:     z.string().optional().or(z.literal("")),
  idHorarioRecuperacion: z.string().optional().or(z.literal("")),
  observacion:           z.string().max(300).optional().or(z.literal("")),
});

export async function actualizarRecuperacion(
  id: string,
  _prev: RecuperacionFormState,
  formData: FormData
): Promise<RecuperacionFormState> {
  const parsed = actualizarSchema.safeParse({
    fechaRecuperacion:     formData.get("fechaRecuperacion") || undefined,
    idHorarioRecuperacion: formData.get("idHorarioRecuperacion") || undefined,
    observacion:           formData.get("observacion") || undefined,
  });

  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { fechaRecuperacion, idHorarioRecuperacion, observacion } = parsed.data;

  await prisma.recuperacion.update({
    where: { id },
    data: {
      fechaRecuperacion: fechaRecuperacion ? new Date(fechaRecuperacion) : null,
      idHorarioRecuperacion: idHorarioRecuperacion || null,
      observacion: observacion || null,
    },
  });

  revalidateTag("recuperaciones");
  return { message: "ok" };
}

export async function completarRecuperacion(id: string): Promise<{ error?: string }> {
  const r = await prisma.recuperacion.findUnique({ where: { id } });
  if (!r) return { error: "Recuperación no encontrada" };
  if (r.estado === "completada") return { error: "Ya está completada" };

  await prisma.$transaction([
    prisma.recuperacion.update({ where: { id }, data: { estado: "completada" } }),
    prisma.asistencia.update({ where: { id: r.idAsistencia }, data: { estado: "justificado" } }),
  ]);
  revalidateTag("recuperaciones");
  revalidateTag("asistencias");
  return {};
}

export async function cancelarRecuperacion(id: string): Promise<{ error?: string }> {
  const r = await prisma.recuperacion.findUnique({ where: { id } });
  if (!r) return { error: "Recuperación no encontrada" };

  await prisma.recuperacion.update({ where: { id }, data: { estado: "cancelada" } });
  revalidateTag("recuperaciones");
  return {};
}
