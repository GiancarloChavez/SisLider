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

export type MatriculaSerialized = {
  id: string;
  precioFinalMensual: number;
  fechaInicio: string;
  estado: string;
  alumno: { id: string; nombre: string; apellido: string; dni: string | null };
  horario: {
    curso: { nombre: string; nivel: string | null };
    docente: { nombre: string; apellido: string };
    aula: { nombre: string };
    dias: string[];
    horaInicio: string;
    horaFin: string;
  };
  descuento: { nombre: string } | null;
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

// ─── Form data ────────────────────────────────────────────────────────────────

export async function getMatriculaFormData(): Promise<{
  horarios: HorarioConCupo[];
  descuentos: DescuentoOption[];
}> {
  const [horariosRaw, descuentosRaw] = await Promise.all([
    prisma.horario.findMany({
      where: { activo: true },
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

  // Validate horario exists and fetch curso price
  const horario = await prisma.horario.findUnique({
    where: { id: idHorario },
    include: { curso: true },
  });
  if (!horario) return { errors: { idHorario: ["Horario no encontrado"] } };

  // Validate existing enrollment
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

  await prisma.$transaction(async (tx) => {
    // Check cupo inside transaction to avoid race conditions
    const cupoOcupado = await tx.matricula.count({
      where: { idHorario, estado: "activa" },
    });
    if (cupoOcupado >= horario.cupoMaximo) {
      throw new Error("CUPO_LLENO");
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
  }).catch((e: Error) => {
    if (e.message === "CUPO_LLENO") return "CUPO_LLENO";
    throw e;
  });

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

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.matricula.update({ where: { id }, data: { estado: nuevo } });

    const pendientes = await tx.mesPago.count({
      where: {
        matricula: { idAlumno: matricula.idAlumno, estado: "activa" },
        anio: now.getFullYear(),
        mes: now.getMonth() + 1,
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
