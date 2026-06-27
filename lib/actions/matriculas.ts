"use server";

import { randomUUID } from "crypto";
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
  cupoOcupado: number;
  dias: string[];
  curso: { nombre: string; nivel: string | null; precioMensual: number };
  docente: { nombre: string; apellido: string };
  aula: { nombre: string; capacidad: number };
  cursoProximo: boolean;
  cursoFechaInicio: string;
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
    alumnosActivos: number;
    docente: { nombre: string; apellido: string };
    aula: { nombre: string; capacidad: number };
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
          fechaFin: { gte: hoy }, // Incluye próximos; excluye finalizados
        },
      },
      include: {
        curso: true,
        docente: true,
        aula: true,
        dias: true,
        _count: { select: { matriculas: { where: { estado: "activa" } } } },
      },
      orderBy: [{ curso: { fechaInicio: "asc" } }, { curso: { nombre: "asc" } }],
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
    cupoOcupado: h._count.matriculas,
    dias: h.dias.map((d) => d.dia),
    curso: {
      nombre: h.curso.nombre,
      nivel: h.curso.nivel,
      precioMensual: Number(h.curso.precioMensual),
    },
    docente: { nombre: h.docente.nombre, apellido: h.docente.apellido },
    aula: { nombre: h.aula.nombre, capacidad: h.aula.capacidad },
    cursoProximo: h.curso.fechaInicio > hoy,
    cursoFechaInicio: h.curso.fechaInicio.toISOString().slice(0, 10),
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
    cupoTotal: c.horarios.reduce((s, h) => s + h.aula.capacidad, 0),
    horarios: c.horarios.map((h) => ({
      id: h.id,
      dias: h.dias.map((d) => d.dia),
      horaInicio: h.horaInicio.toISOString().slice(11, 16),
      horaFin: h.horaFin.toISOString().slice(11, 16),
      alumnosActivos: h._count.matriculas,
      docente: { nombre: h.docente.nombre, apellido: h.docente.apellido },
      aula: { nombre: h.aula.nombre, capacidad: h.aula.capacidad },
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
    include: { curso: true, aula: true },
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
        descuento.tipo.toLowerCase() === "porcentaje"
          ? precioFinal * (1 - Number(descuento.valor) / 100)
          : Math.max(0, precioFinal - Number(descuento.valor));
    }
  }

  const now = new Date();
  // Si el curso aún no inicia, el primer pago corresponde al mes de apertura
  const pagoRef = horario.curso.fechaInicio > now ? horario.curso.fechaInicio : now;
  const ultimoDiaMes = new Date(pagoRef.getFullYear(), pagoRef.getMonth() + 1, 0);

  const cupoOcupado = await prisma.matricula.count({
    where: { idHorario, estado: "activa" },
  });
  if (cupoOcupado >= horario.aula.capacidad) {
    return { errors: { idHorario: ["El horario no tiene cupo disponible"] } };
  }

  const matriculaId = randomUUID();
  await prisma.$transaction([
    prisma.matricula.create({
      data: {
        id: matriculaId,
        idAlumno,
        idHorario,
        idDescuento: idDescuento ?? null,
        precioFinalMensual: precioFinal,
        estado: "activa",
        dias: { create: dias.map((dia) => ({ dia })) },
      },
    }),
    prisma.mesPago.create({
      data: {
        idMatricula: matriculaId,
        anio: pagoRef.getFullYear(),
        mes: pagoRef.getMonth() + 1,
        montoTotal: precioFinal,
        estado: "pendiente",
        fechaVencimiento: ultimoDiaMes,
      },
    }),
    prisma.alumno.update({ where: { id: idAlumno }, data: { habilitado: true } }),
  ]);

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

  // Compute habilitado before the batch transaction.
  // For "inactiva": exclude this matricula (not yet deactivated in DB).
  // For "activa": include this matricula's own pending months (not yet active in DB).
  let pendientes: number;
  if (nuevo === "inactiva") {
    pendientes = await prisma.mesPago.count({
      where: {
        matricula: { idAlumno: matricula.idAlumno, estado: "activa", id: { not: id } },
        estado: { in: ["pendiente", "parcial"] },
      },
    });
  } else {
    const [deOtras, deEsta] = await Promise.all([
      prisma.mesPago.count({
        where: {
          matricula: { idAlumno: matricula.idAlumno, estado: "activa" },
          estado: { in: ["pendiente", "parcial"] },
        },
      }),
      prisma.mesPago.count({
        where: { idMatricula: id, estado: { in: ["pendiente", "parcial"] } },
      }),
    ]);
    pendientes = deOtras + deEsta;
  }

  await prisma.$transaction([
    prisma.matricula.update({
      where: { id },
      data: {
        estado: nuevo,
        fechaFin: nuevo === "inactiva" ? new Date() : null,
      },
    }),
    prisma.alumno.update({
      where: { id: matricula.idAlumno },
      data: { habilitado: pendientes === 0 },
    }),
  ]);

  revalidateTag("matriculas");
  revalidateTag("alumnos");
  revalidateTag("dashboard");
}
