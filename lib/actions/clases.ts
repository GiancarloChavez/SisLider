"use server";

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

// ─── Calendario (usado en dashboard) ─────────────────────────────────────────

export type HorarioCalendario = {
  id: string;
  horaInicio: string;
  horaFin: string;
  dias: string[];
  cupoMaximo: number;
  cupoOcupado: number;
  curso: { id: string; nombre: string; nivel: string | null };
  docente: { nombre: string; apellido: string };
  aula: { nombre: string };
};

export const getHorariosCalendario = unstable_cache(
  async (): Promise<HorarioCalendario[]> => {
    const [horarios, counts] = await Promise.all([
      prisma.horario.findMany({
        where: { activo: true },
        include: {
          curso: { select: { id: true, nombre: true, nivel: true } },
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
      cupoMaximo: h.cupoMaximo,
      cupoOcupado: countMap[h.id] ?? 0,
      curso: { id: h.curso.id, nombre: h.curso.nombre, nivel: h.curso.nivel },
      docente: { nombre: h.docente.nombre, apellido: h.docente.apellido },
      aula: { nombre: h.aula.nombre },
    }));
  },
  ["horarios-calendario"],
  { tags: ["horarios"] }
);

// ─── Vista de Clases: cursos con horarios ─────────────────────────────────────

export type HorarioResumen = {
  id: string;
  horaInicio: string;
  horaFin: string;
  dias: string[];
  docente: { nombre: string; apellido: string };
  aula: { nombre: string };
  cupoMaximo: number;
  alumnosHabilitados: number;
  alumnosTotales: number;
};

export type CursoConHorarios = {
  id: string;
  nombre: string;
  nivel: string | null;
  precioMensual: number;
  activo: boolean;
  horarios: HorarioResumen[];
};

export const getCursosConHorarios = unstable_cache(
  async (): Promise<CursoConHorarios[]> => {
    const cursos = await prisma.curso.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
      include: {
        horarios: {
          where: { activo: true },
          orderBy: { horaInicio: "asc" },
          include: {
            docente: true,
            aula: true,
            dias: true,
            _count: {
              select: {
                matriculas: { where: { estado: "activa" } },
              },
            },
          },
        },
      },
    });

    // Para alumnosHabilitados hacemos una query adicional por batch
    const horarioIds = cursos.flatMap((c) => c.horarios.map((h) => h.id));
    const habilitadosCounts = await prisma.matricula.groupBy({
      by: ["idHorario"],
      where: {
        idHorario: { in: horarioIds },
        estado: "activa",
        alumno: { habilitado: true },
      },
      _count: { id: true },
    });
    const habMap: Record<string, number> = {};
    for (const row of habilitadosCounts) {
      habMap[row.idHorario] = row._count.id;
    }

    return cursos.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      nivel: c.nivel,
      precioMensual: Number(c.precioMensual),
      activo: c.activo,
      horarios: c.horarios.map((h) => ({
        id: h.id,
        horaInicio: h.horaInicio.toISOString().slice(11, 16),
        horaFin: h.horaFin.toISOString().slice(11, 16),
        dias: h.dias.map((d) => d.dia),
        docente: { nombre: h.docente.nombre, apellido: h.docente.apellido },
        aula: { nombre: h.aula.nombre },
        cupoMaximo: h.cupoMaximo,
        alumnosHabilitados: habMap[h.id] ?? 0,
        alumnosTotales: h._count.matriculas,
      })),
    }));
  },
  ["clases-cursos"],
  { tags: ["horarios", "matriculas", "alumnos"] }
);

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
