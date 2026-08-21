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
  numeroGrupo: string;
  precioMensual: number;
  horaInicio: string;
  horaFin: string;
  cupoOcupado: number;
  dias: string[];
  curso: { nombre: string; nivel: string | null };
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
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
  totalAlumnos: number;
  cupoTotal: number;
  horarios: {
    id: string;
    numeroGrupo: string;
    precioMensual: number;
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
    numeroGrupo: h.numeroGrupo,
    precioMensual: Number(h.precioMensual),
    horaInicio: h.horaInicio.toISOString().slice(11, 16),
    horaFin: h.horaFin.toISOString().slice(11, 16),
    cupoOcupado: h._count.matriculas,
    dias: h.dias.map((d) => d.dia),
    curso: {
      nombre: h.curso.nombre,
      nivel: h.curso.nivel,
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
    fechaInicio: c.fechaInicio.toISOString().slice(0, 10),
    fechaFin: c.fechaFin.toISOString().slice(0, 10),
    activo: c.activo,
    totalAlumnos: c.horarios.reduce((s, h) => s + h._count.matriculas, 0),
    cupoTotal: c.horarios.reduce((s, h) => s + h.aula.capacidad, 0),
    horarios: c.horarios.map((h) => ({
      id: h.id,
      numeroGrupo: h.numeroGrupo,
      precioMensual: Number(h.precioMensual),
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

  let precioFinal = Number(horario.precioMensual);
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

// ─── Create matrícula + pago inicial (wizard) ─────────────────────────────────

export type TutorData = {
  nombre: string;
  apellido: string;
  celular: string;
  celularAdicional?: string;
  relacion: string;
};

export type NuevoAlumnoData = {
  nombre: string;
  apellido: string;
  dni?: string;
  celular?: string;
  fechaNacimiento?: string;
  tieneApoderado: boolean;
  tutor?: TutorData;
  tutorAdicional?: TutorData;
};

export type MatriculaConPagoInput = {
  alumnoId?: string;
  nuevoAlumno?: NuevoAlumnoData;
  idHorario: string;
  dias: string[];
  idDescuento?: string;
  montoAbono: number;
  metodoPago: "efectivo" | "transferencia";
};

export type MatriculaConPagoResult = {
  errors?: Record<string, string[]>;
  message?: string;
};

export async function createMatriculaConPago(
  input: MatriculaConPagoInput
): Promise<MatriculaConPagoResult> {
  const session = await auth();
  if (!session?.user?.id) return { errors: { _: ["No autenticado"] } };
  const idUsuario = session.user.id;

  const usuarioExiste = await prisma.usuario.count({ where: { id: idUsuario } });
  if (!usuarioExiste) return { errors: { _: ["Sesión caducada. Cierra sesión e inicia sesión nuevamente."] } };

  const { alumnoId: existingAlumnoId, nuevoAlumno, idHorario, dias, idDescuento, montoAbono, metodoPago } = input;

  if (!existingAlumnoId && !nuevoAlumno) {
    return { errors: { alumno: ["Selecciona o registra un alumno"] } };
  }
  if (!dias || dias.length === 0) {
    return { errors: { dias: ["Selecciona al menos un día"] } };
  }
  if (!montoAbono || montoAbono <= 0) {
    return { errors: { montoAbono: ["El monto debe ser mayor a 0"] } };
  }

  // Validate new alumno data if provided
  if (!existingAlumnoId && nuevoAlumno) {
    const alumnoVal = z.object({
      nombre: z.string().min(1, "Nombre requerido").max(100),
      apellido: z.string().min(1, "Apellido requerido").max(100),
      dni: z.string().length(8, "DNI debe tener 8 dígitos").regex(/^\d+$/, "Solo dígitos").optional().or(z.literal("")),
      celular: z.string().max(20).optional().or(z.literal("")),
    }).safeParse(nuevoAlumno);
    if (!alumnoVal.success) return { errors: alumnoVal.error.flatten().fieldErrors };

    if (nuevoAlumno.tieneApoderado) {
      if (!nuevoAlumno.tutor) return { errors: { tutorNombre: ["Datos del apoderado requeridos"] } };
      const tutorVal = z.object({
        nombre: z.string().min(1, "Nombre del apoderado requerido").max(100),
        apellido: z.string().min(1, "Apellido del apoderado requerido").max(100),
        celular: z.string().min(7, "Celular inválido").max(20),
        relacion: z.string().min(1, "Relación requerida").max(50),
      }).safeParse(nuevoAlumno.tutor);
      if (!tutorVal.success) return { errors: tutorVal.error.flatten().fieldErrors };
    }
  }

  const horario = await prisma.horario.findUnique({
    where: { id: idHorario },
    include: { curso: true, aula: true },
  });
  if (!horario) return { errors: { idHorario: ["Horario no encontrado"] } };

  const cupoOcupado = await prisma.matricula.count({ where: { idHorario, estado: "activa" } });
  if (cupoOcupado >= horario.aula.capacidad) {
    return { errors: { idHorario: ["El horario no tiene cupo disponible"] } };
  }

  let precioFinal = Number(horario.precioMensual);
  if (idDescuento) {
    const descuento = await prisma.descuento.findUnique({ where: { id: idDescuento } });
    if (descuento) {
      precioFinal = descuento.tipo.toLowerCase() === "porcentaje"
        ? precioFinal * (1 - Number(descuento.valor) / 100)
        : Math.max(0, precioFinal - Number(descuento.valor));
    }
  }

  if (montoAbono > precioFinal + 0.01) {
    return { errors: { montoAbono: [`El monto no puede superar S/${precioFinal.toFixed(2)}`] } };
  }

  const alumnoId = existingAlumnoId ?? randomUUID();

  if (existingAlumnoId) {
    const dup = await prisma.matricula.findUnique({
      where: { idAlumno_idHorario: { idAlumno: existingAlumnoId, idHorario } },
    });
    if (dup) return { errors: { idHorario: ["El alumno ya está matriculado en este horario"] } };
  }

  const now = new Date();
  const pagoRef = horario.curso.fechaInicio > now ? horario.curso.fechaInicio : now;
  const ultimoDiaMes = new Date(pagoRef.getFullYear(), pagoRef.getMonth() + 1, 0);

  const matriculaId = randomUUID();
  const mesPagoId = randomUUID();
  const nuevoEstado = montoAbono >= precioFinal - 0.01 ? "pagado" : "parcial";

  let habilitado: boolean;
  if (existingAlumnoId) {
    const otrosPendientes = await prisma.mesPago.count({
      where: {
        matricula: { idAlumno: existingAlumnoId, estado: "activa" },
        estado: { in: ["pendiente", "parcial"] },
      },
    });
    habilitado = nuevoEstado === "pagado" && otrosPendientes === 0;
  } else {
    habilitado = nuevoEstado === "pagado";
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ops: any[] = [];

  if (!existingAlumnoId && nuevoAlumno) {
    ops.push(
      prisma.alumno.create({
        data: {
          id: alumnoId,
          nombre: nuevoAlumno.nombre,
          apellido: nuevoAlumno.apellido,
          dni: nuevoAlumno.dni || null,
          celular: nuevoAlumno.celular || null,
          fechaNacimiento: nuevoAlumno.fechaNacimiento ? new Date(nuevoAlumno.fechaNacimiento) : null,
          habilitado,
        },
      })
    );
    if (nuevoAlumno.tieneApoderado && nuevoAlumno.tutor) {
      const tutorId = randomUUID();
      ops.push(
        prisma.tutor.create({
          data: {
            id: tutorId,
            nombre: nuevoAlumno.tutor.nombre,
            apellido: nuevoAlumno.tutor.apellido,
            celular: nuevoAlumno.tutor.celular,
            celularAdicional: nuevoAlumno.tutor.celularAdicional || null,
            relacion: nuevoAlumno.tutor.relacion,
          },
        }),
        prisma.tutorAlumno.create({
          data: { idTutor: tutorId, idAlumno: alumnoId, esPrincipal: true },
        })
      );
    }
    if (nuevoAlumno.tieneApoderado && nuevoAlumno.tutorAdicional) {
      const tutor2Id = randomUUID();
      ops.push(
        prisma.tutor.create({
          data: {
            id: tutor2Id,
            nombre: nuevoAlumno.tutorAdicional.nombre,
            apellido: nuevoAlumno.tutorAdicional.apellido,
            celular: nuevoAlumno.tutorAdicional.celular,
            celularAdicional: nuevoAlumno.tutorAdicional.celularAdicional || null,
            relacion: nuevoAlumno.tutorAdicional.relacion,
          },
        }),
        prisma.tutorAlumno.create({
          data: { idTutor: tutor2Id, idAlumno: alumnoId, esPrincipal: false },
        })
      );
    }
  }

  ops.push(
    prisma.matricula.create({
      data: {
        id: matriculaId,
        idAlumno: alumnoId,
        idHorario,
        idDescuento: idDescuento ?? null,
        precioFinalMensual: precioFinal,
        estado: "activa",
        dias: { create: dias.map((dia) => ({ dia })) },
      },
    }),
    prisma.mesPago.create({
      data: {
        id: mesPagoId,
        idMatricula: matriculaId,
        anio: pagoRef.getFullYear(),
        mes: pagoRef.getMonth() + 1,
        montoTotal: precioFinal,
        montoPagado: montoAbono,
        estado: nuevoEstado,
        fechaVencimiento: ultimoDiaMes,
      },
    }),
    prisma.abono.create({
      data: { idMesPago: mesPagoId, idUsuario, monto: montoAbono, metodoPago },
    })
  );

  if (existingAlumnoId) {
    ops.push(prisma.alumno.update({ where: { id: alumnoId }, data: { habilitado } }));
  }

  try {
    await prisma.$transaction(ops);
  } catch (e: unknown) {
    const code = (e as { code?: string }).code;
    if (code === "P2002") return { errors: { dni: ["Este DNI ya está registrado en el sistema"] } };
    console.error("[createMatriculaConPago]", e);
    return { errors: { _: ["Error al registrar. Intenta nuevamente."] } };
  }

  revalidateTag("matriculas");
  revalidateTag("alumnos");
  revalidateTag("pagos");
  revalidateTag("dashboard");
  return { message: "ok" };
}
