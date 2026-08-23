"use server";

import { prisma } from "@/lib/prisma";

// ─── Calendario (usado en dashboard) ─────────────────────────────────────────

export type HorarioCalendario = {
  id: string;
  horaInicio: string;
  horaFin: string;
  dias: string[];
  cupoOcupado: number;
  curso: { id: string; nombre: string };
  docente: { nombre: string; apellido: string };
  aula: { nombre: string; capacidad: number };
};

export async function getHorariosCalendario(): Promise<HorarioCalendario[]> {
  const [horarios, counts] = await Promise.all([
    prisma.horario.findMany({
      where: { activo: true },
      include: {
        curso: { select: { id: true, nombre: true } },
        docente: true,
        aula: true,
        dias: true,
      },
      orderBy: { horaInicio: "asc" },
    }),
    prisma.matricula.groupBy({
      by: ["idHorario"],
      where: { estado: "activa" },
      _count: { _all: true },
    }),
  ]);

  const countMap: Record<string, number> = {};
  for (const r of counts) countMap[r.idHorario] = r._count._all;

  return horarios.map((h) => ({
    id: h.id,
    horaInicio: h.horaInicio.toISOString().slice(11, 16),
    horaFin: h.horaFin.toISOString().slice(11, 16),
    dias: h.dias.map((d) => d.dia),
    cupoOcupado: countMap[h.id] ?? 0,
    curso: { id: h.curso.id, nombre: h.curso.nombre },
    docente: { nombre: h.docente.nombre, apellido: h.docente.apellido },
    aula: { nombre: h.aula.nombre, capacidad: h.aula.capacidad },
  }));
}

// ─── Vista de Clases: cursos con horarios ─────────────────────────────────────

export type HorarioResumen = {
  id: string;
  horaInicio: string;
  horaFin: string;
  dias: string[];
  docente: { nombre: string; apellido: string };
  aula: { nombre: string; capacidad: number };
  alumnosHabilitados: number;
  alumnosTotales: number;
};

export type CursoConHorarios = {
  id: string;
  nombre: string;
  precioMensual: number;
  activo: boolean;
  horarios: HorarioResumen[];
};

export async function getCursosConHorarios(): Promise<CursoConHorarios[]> {
  const [cursos, totalCounts, habCounts] = await Promise.all([
    prisma.curso.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
      include: {
        horarios: {
          where: { activo: true },
          orderBy: { horaInicio: "asc" },
          include: { docente: true, aula: true, dias: true },
        },
      },
    }),
    prisma.matricula.groupBy({
      by: ["idHorario"],
      where: { estado: "activa" },
      _count: { _all: true },
    }),
    prisma.matricula.groupBy({
      by: ["idHorario"],
      where: { estado: "activa", alumno: { habilitado: true } },
      _count: { _all: true },
    }),
  ]);

  const totalMap: Record<string, number> = {};
  for (const r of totalCounts) totalMap[r.idHorario] = r._count._all;
  const habMap: Record<string, number> = {};
  for (const r of habCounts) habMap[r.idHorario] = r._count._all;

  return cursos.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    precioMensual: Number(c.precioMensual),
    activo: c.activo,
    horarios: c.horarios.map((h) => ({
      id: h.id,
      horaInicio: h.horaInicio.toISOString().slice(11, 16),
      horaFin: h.horaFin.toISOString().slice(11, 16),
      dias: h.dias.map((d) => d.dia),
      docente: { nombre: h.docente.nombre, apellido: h.docente.apellido },
      aula: { nombre: h.aula.nombre, capacidad: h.aula.capacidad },
      alumnosHabilitados: habMap[h.id] ?? 0,
      alumnosTotales: totalMap[h.id] ?? 0,
    })),
  }));
}

// ─── Alumnos de un horario ────────────────────────────────────────────────────

export type AlumnoDelHorario = {
  idMatricula: string;
  alumno: {
    id: string;
    nombre: string;
    apellido: string;
    dni: string | null;
    celular: string | null;
  };
  diasMatricula: string[];
  fechaInicio: string;
  precioFinalMensual: number;
  descuento: { nombre: string } | null;
};

export async function getAlumnosDelHorario(
  idHorario: string
): Promise<AlumnoDelHorario[]> {
  const matriculas = await prisma.matricula.findMany({
    where: {
      idHorario,
      estado: "activa",
      alumno: { habilitado: true },
    },
    include: {
      alumno: true,
      dias: true,
      descuento: { select: { nombre: true } },
    },
    orderBy: [
      { alumno: { apellido: "asc" } },
      { alumno: { nombre: "asc" } },
    ],
  });

  return matriculas.map((m) => ({
    idMatricula: m.id,
    alumno: {
      id: m.alumno.id,
      nombre: m.alumno.nombre,
      apellido: m.alumno.apellido,
      dni: m.alumno.dni,
      celular: m.alumno.celular,
    },
    diasMatricula: m.dias.map((d) => d.dia),
    fechaInicio: m.fechaInicio.toISOString(),
    precioFinalMensual: Number(m.precioFinalMensual),
    descuento: m.descuento ? { nombre: m.descuento.nombre } : null,
  }));
}
