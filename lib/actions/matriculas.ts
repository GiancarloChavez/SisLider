"use server";

import { revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AlumnoSearchResult = {
  id: string;
  nombre: string;
  apellido: string;
  dni: string | null;
  habilitado: boolean;
};

export type HorarioConCupo = {
  id: string;
  horaInicio: string;
  horaFin: string;
  cupoMaximo: number;
  cupoOcupado: number;
  dias: string[];
  curso: { nombre: string; nivel: string | null; precioMensual: number };
  docente: { nombre: string; apellido: string };
  aula: { nombre: string };
};

export type DescuentoOption = {
  id: string;
  nombre: string;
  tipo: string;
  valor: number;
};

export type CursoConMatriculas = {
  id: string;
  nombre: string;
  nivel: string | null;
  precioMensual: number;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
  totalAlumnos: number;
  cupoTotal: number;
  horarios: {
    id: string;
    dias: string[];
    horaInicio: string;
    horaFin: string;
    cupoMaximo: number;
    alumnosActivos: number;
    docente: { nombre: string; apellido: string };
    aula: { nombre: string };
  }[];
};

export type MatriculaFormState = {
  errors?: Record<string, string[]>;
  message?: string;
};

// ─── Search alumnos ───────────────────────────────────────────────────────────

export async function buscarAlumnos(query: string): Promise<AlumnoSearchResult[]> {
  const session = await auth();
  if (!session?.user) return [];

  const q = query.trim();
  if (q.length < 2) return [];

  const results = await prisma.alumno.findMany({
    where: {
      OR: [
        { nombre: { contains: q, mode: "insensitive" } },
        { apellido: { contains: q, mode: "insensitive" } },
        { dni: { contains: q } },
      ],
    },
    orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
    take: 8,
  });

  return results.map((a) => ({
    id: a.id,
    nombre: a.nombre,
    apellido: a.apellido,
    dni: a.dni,
    habilitado: a.habilitado,
  }));
}

// ─── Form data (para nueva matrícula) ────────────────────────────────────────

export async function getMatriculaFormData(): Promise<{
  horarios: HorarioConCupo[];
  descuentos: DescuentoOption[];
}> {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const [horariosRaw, descuentosRaw] = await Promise.all([
    prisma.horario.findMany({
      where: {
        activo: true,
        curso: {
          activo: true,
          fechaInicio: { lte: hoy },
          fechaFin: { gte: hoy },
        },
      },
      include: {
        curso: true,
        docente: true,
        aula: true,
        dias: true,
        _count: { select: { matriculas: { where: { estado: "activa" } } } },
      },
      orderBy: { curso: { nombre: "asc" } },
    }),
    prisma.descuento.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  const horarios: HorarioConCupo[] = horariosRaw.map((h) => ({
    id: h.id,
    horaInicio: h.horaInicio.toISOString().slice(11, 16),
    horaFin: h.horaFin.toISOString().slice(11, 16),
    cupoMaximo: h.cupoMaximo,
    cupoOcupado: h._count.matriculas,
    dias: h.dias.map((d) => d.dia),
    curso: {
      nombre: h.curso.nombre,
      nivel: h.curso.nivel,
      precioMensual: Number(h.curso.precioMensual),
    },
    docente: { nombre: h.docente.nombre, apellido: h.docente.apellido },
    aula: { nombre: h.aula.nombre },
  }));

  const descuentos: DescuentoOption[] = descuentosRaw.map((d) => ({
    id: d.id,
    nombre: d.nombre,
    tipo: d.tipo,
    valor: Number(d.valor),
  }));

  return { horarios, descuentos };
}

// ─── Cursos con matrículas (para página principal) ────────────────────────────

export async function getCursosConMatriculas(): Promise<CursoConMatriculas[]> {
  const cursos = await prisma.curso.findMany({
    orderBy: [{ activo: "desc" }, { nombre: "asc" }],
    include: {
      horarios: {
        include: {
          dias: true,
          docente: true,
          aula: true,
          _count: { select: { matriculas: { where: { estado: "activa" } } } },
        },
      },
    },
  });

  return cursos.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    nivel: c.nivel,
    precioMensual: Number(c.precioMensual),
    fechaInicio: c.fechaInicio.toISOString().slice(0, 10),
    fechaFin: c.fechaFin.toISOString().slice(0, 10),
    activo: c.activo,
    totalAlumnos: c.horarios.reduce((s, h) => s + h._count.matriculas, 0),
    cupoTotal: c.horarios.reduce((s, h) => s + h.cupoMaximo, 0),
    horarios: c.horarios.map((h) => ({
      id: h.id,
      dias: h.dias.map((d) => d.dia),
      horaInicio: h.horaInicio.toISOString().slice(11, 16),
      horaFin: h.horaFin.toISOString().slice(11, 16),
      cupoMaximo: h.cupoMaximo,
      alumnosActivos: h._count.matriculas,
      docente: { nombre: h.docente.nombre, apellido: h.docente.apellido },
      aula: { nombre: h.aula.nombre },
    })),
  }));
}

// ─── Create matrícula ─────────────────────────────────────────────────────────

const matriculaSchema = z.object({
  idAlumno: z.string().min(1, "Selecciona un alumno"),
  idHorario: z.string().min(1, "Selecciona un horario"),
  idDescuento: z.string().optional(),
  dias: z.array(z.string()).min(1, "Selecciona al menos un día de asistencia"),
});

export async function createMatricula(
  _prev: MatriculaFormState,
  formData: FormData
): Promise<MatriculaFormState> {
  const parsed = matriculaSchema.safeParse({
    idAlumno: formData.get("idAlumno"),
    idHorario: formData.get("idHorario"),
    idDescuento: formData.get("idDescuento") || undefined,
    dias: formData.getAll("dia"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { idAlumno, idHorario, idDescuento, dias } = parsed.data;

  const horario = await prisma.horario.findUnique({
    where: { id: idHorario },
    include: { curso: true },
  });
  if (!horario) return { errors: { idHorario: ["Horario no encontrado"] } };

  const existing = await prisma.matricula.findUnique({
    where: { idAlumno_idHorario: { idAlumno, idHorario } },
  });
  if (existing) {
    return { errors: { idAlumno: ["El alumno ya está matriculado en este horario"] } };
  }

  let precioFinal = Number(horario.curso.precioMensual);
  if (idDescuento) {
    const descuento = await prisma.descuento.findUnique({ where: { id: idDescuento } });
    if (descuento) {
      precioFinal =
        descuento.tipo === "porcentaje"
          ? precioFinal * (1 - Number(descuento.valor) / 100)
          : Math.max(0, precioFinal - Number(descuento.valor));
    }
  }

  const now = new Date();
  const ultimoDiaMes = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const txResult = await prisma.$transaction(async (tx) => {
    const cupoOcupado = await tx.matricula.count({
      where: { idHorario, estado: "activa" },
    });
    if (cupoOcupado >= horario.cupoMaximo) {
      return "CUPO_LLENO" as const;
    }

    const matricula = await tx.matricula.create({
      data: {
        idAlumno,
        idHorario,
        idDescuento: idDescuento ?? null,
        precioFinalMensual: precioFinal,
        estado: "activa",
        dias: { create: dias.map((dia) => ({ dia })) },
      },
    });

    await tx.mesPago.create({
      data: {
        idMatricula: matricula.id,
        anio: now.getFullYear(),
        mes: now.getMonth() + 1,
        montoTotal: precioFinal,
        estado: "pendiente",
        fechaVencimiento: ultimoDiaMes,
      },
    });

    await tx.alumno.update({ where: { id: idAlumno }, data: { habilitado: true } });
    return "ok" as const;
  });

  if (txResult === "CUPO_LLENO") {
    return { errors: { idHorario: ["El horario no tiene cupo disponible"] } };
  }

  revalidateTag("matriculas");
  revalidateTag("alumnos");
  revalidateTag("dashboard");
  return { message: "ok" };
}

// ─── Toggle estado ────────────────────────────────────────────────────────────

export async function toggleMatriculaEstado(id: string, estado: string) {
  const nuevo = estado === "activa" ? "inactiva" : "activa";

  const matricula = await prisma.matricula.findUnique({
    where: { id },
    select: { idAlumno: true },
  });
  if (!matricula) return;

  await prisma.$transaction(async (tx) => {
    await tx.matricula.update({ where: { id }, data: { estado: nuevo } });

    const pendientes = await tx.mesPago.count({
      where: {
        matricula: { idAlumno: matricula.idAlumno, estado: "activa" },
        estado: { in: ["pendiente", "parcial"] },
      },
    });
    await tx.alumno.update({
      where: { id: matricula.idAlumno },
      data: { habilitado: pendientes === 0 },
    });
  });

  revalidateTag("matriculas");
  revalidateTag("alumnos");
  revalidateTag("dashboard");
}
