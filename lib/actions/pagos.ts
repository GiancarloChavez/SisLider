"use server";

import { revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AlumnoPagoResumen = {
  id: string;
  nombre: string;
  apellido: string;
  dni: string | null;
  habilitado: boolean;
  matriculasActivas: number;
  totalPendiente: number;
};

export type AbonoRow = {
  id: string;
  monto: number;
  metodoPago: string;
  fechaPago: string;
  observacion: string | null;
};

export type MesPagoRow = {
  id: string;
  anio: number;
  mes: number;
  montoTotal: number;
  montoPagado: number;
  saldo: number;
  estado: string;
  fechaVencimiento: string | null;
  abonos: AbonoRow[];
};

export type MatriculaRow = {
  id: string;
  estado: string;
  precioFinalMensual: number;
  diasMatricula: string[];
  horario: {
    curso: { nombre: string; nivel: string | null };
    dias: string[];
    horaInicio: string;
    horaFin: string;
  };
  descuento: { nombre: string } | null;
  mesesPago: MesPagoRow[];
};

export type AlumnoPagoDetalle = {
  id: string;
  nombre: string;
  apellido: string;
  dni: string | null;
  celular: string | null;
  habilitado: boolean;
  tutor: { nombre: string; apellido: string; celular: string; relacion: string } | null;
  matriculas: MatriculaRow[];
};

export type AbonoFormState = {
  errors?: Record<string, string[]>;
  message?: string;
};

// ─── Lista de alumnos con pagos ───────────────────────────────────────────────

export async function getAlumnosPagos(): Promise<AlumnoPagoResumen[]> {
  const alumnos = await prisma.alumno.findMany({
    where: { matriculas: { some: { estado: "activa" } } },
    orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
    include: {
      matriculas: {
        where: { estado: "activa" },
        include: { mesesPago: { select: { montoTotal: true, montoPagado: true, estado: true } } },
      },
    },
  });

  return alumnos.map((a) => {
    const matriculasActivas = a.matriculas.length;
    const totalPendiente = a.matriculas.reduce((sum, m) => {
      return (
        sum +
        m.mesesPago.reduce((s, mp) => {
          return s + Math.max(0, Number(mp.montoTotal) - Number(mp.montoPagado));
        }, 0)
      );
    }, 0);
    return {
      id: a.id,
      nombre: a.nombre,
      apellido: a.apellido,
      dni: a.dni,
      habilitado: a.habilitado,
      matriculasActivas,
      totalPendiente,
    };
  });
}

// ─── Detalle de pagos de un alumno ───────────────────────────────────────────

export async function getAlumnoPagos(alumnoId: string): Promise<AlumnoPagoDetalle | null> {
  const alumno = await prisma.alumno.findUnique({
    where: { id: alumnoId },
    include: {
      tutorAlumnos: {
        where: { esPrincipal: true },
        include: { tutor: true },
        take: 1,
      },
      matriculas: {
        orderBy: [{ estado: "asc" }, { fechaInicio: "desc" }],
        include: {
          dias: true,
          descuento: { select: { nombre: true } },
          horario: {
            include: { curso: true, dias: true },
          },
          mesesPago: {
            orderBy: [{ anio: "desc" }, { mes: "desc" }],
            include: {
              abonos: { orderBy: { fechaPago: "asc" } },
            },
          },
        },
      },
    },
  });

  if (!alumno) return null;

  const tutorAlumno = alumno.tutorAlumnos[0];

  return {
    id: alumno.id,
    nombre: alumno.nombre,
    apellido: alumno.apellido,
    dni: alumno.dni,
    celular: alumno.celular,
    habilitado: alumno.habilitado,
    tutor: tutorAlumno
      ? {
          nombre: tutorAlumno.tutor.nombre,
          apellido: tutorAlumno.tutor.apellido,
          celular: tutorAlumno.tutor.celular,
          relacion: tutorAlumno.tutor.relacion,
        }
      : null,
    matriculas: alumno.matriculas.map((m) => ({
      id: m.id,
      estado: m.estado,
      precioFinalMensual: Number(m.precioFinalMensual),
      diasMatricula: m.dias.map((d) => d.dia),
      horario: {
        curso: { nombre: m.horario.curso.nombre, nivel: m.horario.curso.nivel },
        dias: m.horario.dias.map((d) => d.dia),
        horaInicio: m.horario.horaInicio.toISOString().slice(11, 16),
        horaFin: m.horario.horaFin.toISOString().slice(11, 16),
      },
      descuento: m.descuento ? { nombre: m.descuento.nombre } : null,
      mesesPago: m.mesesPago.map((mp) => ({
        id: mp.id,
        anio: mp.anio,
        mes: mp.mes,
        montoTotal: Number(mp.montoTotal),
        montoPagado: Number(mp.montoPagado),
        saldo: Math.max(0, Number(mp.montoTotal) - Number(mp.montoPagado)),
        estado: mp.estado,
        fechaVencimiento: mp.fechaVencimiento?.toISOString() ?? null,
        abonos: mp.abonos.map((ab) => ({
          id: ab.id,
          monto: Number(ab.monto),
          metodoPago: ab.metodoPago,
          fechaPago: ab.fechaPago.toISOString(),
          observacion: ab.observacion,
        })),
      })),
    })),
  };
}

// ─── Registrar abono ──────────────────────────────────────────────────────────

const abonoSchema = z.object({
  idMesPago: z.string().min(1, "Mes de pago requerido"),
  monto: z.coerce.number().positive("El monto debe ser mayor a 0"),
  metodoPago: z.enum(["efectivo", "transferencia"], { message: "Selecciona un método de pago" }),
  observacion: z.string().optional(),
});

export async function registrarAbono(
  _prev: AbonoFormState,
  formData: FormData
): Promise<AbonoFormState> {
  const session = await auth();
  if (!session?.user?.email) return { errors: { _: ["No autenticado"] } };

  const usuario = await prisma.usuario.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!usuario) return { errors: { _: ["Usuario no encontrado"] } };

  const parsed = abonoSchema.safeParse({
    idMesPago: formData.get("idMesPago"),
    monto: formData.get("monto"),
    metodoPago: formData.get("metodoPago"),
    observacion: formData.get("observacion") || undefined,
  });

  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { idMesPago, monto, metodoPago, observacion } = parsed.data;

  const mesPago = await prisma.mesPago.findUnique({
    where: { id: idMesPago },
    include: { matricula: { select: { idAlumno: true } } },
  });

  if (!mesPago) return { errors: { idMesPago: ["Mes de pago no encontrado"] } };
  if (mesPago.estado === "pagado") return { errors: { monto: ["Este mes ya está completamente pagado"] } };

  const saldo = Number(mesPago.montoTotal) - Number(mesPago.montoPagado);
  if (monto > saldo + 0.01) {
    return { errors: { monto: [`Excede el saldo pendiente (S/${saldo.toFixed(2)})`] } };
  }

  const idAlumno = mesPago.matricula.idAlumno;
  const nuevoMontoPagado = Number(mesPago.montoPagado) + monto;
  const nuevoEstado = nuevoMontoPagado >= Number(mesPago.montoTotal) - 0.01 ? "pagado" : "parcial";

  await prisma.$transaction(async (tx) => {
    await tx.abono.create({
      data: {
        idMesPago,
        idUsuario: usuario.id,
        monto,
        metodoPago,
        observacion: observacion ?? null,
      },
    });

    await tx.mesPago.update({
      where: { id: idMesPago },
      data: { montoPagado: nuevoMontoPagado, estado: nuevoEstado },
    });

    // Recalcular habilitado sobre todos los meses de todas las matrículas activas
    const pendientesTotal = await tx.mesPago.count({
      where: {
        matricula: { idAlumno, estado: "activa" },
        estado: { in: ["pendiente", "parcial"] },
      },
    });
    await tx.alumno.update({ where: { id: idAlumno }, data: { habilitado: pendientesTotal === 0 } });
  });

  revalidateTag("pagos");
  revalidateTag("alumnos");
  revalidateTag("dashboard");
  return { message: "ok" };
}

// ─── Generar mes de pago ──────────────────────────────────────────────────────

export type GenerarMesState = { error?: string; message?: string };

export async function generarMesPago(
  idMatricula: string,
  anio: number,
  mes: number
): Promise<GenerarMesState> {
  const matricula = await prisma.matricula.findUnique({ where: { id: idMatricula } });
  if (!matricula) return { error: "Matrícula no encontrada" };

  const existing = await prisma.mesPago.findUnique({
    where: { idMatricula_anio_mes: { idMatricula, anio, mes } },
  });
  if (existing) return { error: "Ya existe un registro para ese mes" };

  const ultimoDia = new Date(anio, mes, 0);

  await prisma.mesPago.create({
    data: {
      idMatricula,
      anio,
      mes,
      montoTotal: matricula.precioFinalMensual,
      estado: "pendiente",
      fechaVencimiento: ultimoDia,
    },
  });

  revalidateTag("pagos");
  return { message: "ok" };
}

// ─── Anular mes de pago ───────────────────────────────────────────────────────

export async function anularMesPago(idMesPago: string): Promise<{ error?: string }> {
  const mesPago = await prisma.mesPago.findUnique({
    where: { id: idMesPago },
    include: { matricula: { select: { idAlumno: true } } },
  });

  if (!mesPago) return { error: "Mes de pago no encontrado" };
  if (mesPago.estado === "pagado") return { error: "No se puede eliminar un mes ya pagado" };

  const idAlumno = mesPago.matricula.idAlumno;

  await prisma.$transaction(async (tx) => {
    await tx.abono.deleteMany({ where: { idMesPago } });
    await tx.mesPago.delete({ where: { id: idMesPago } });

    // Recalcular habilitado sobre todos los meses restantes
    const pendientesTotal = await tx.mesPago.count({
      where: {
        matricula: { idAlumno, estado: "activa" },
        estado: { in: ["pendiente", "parcial"] },
      },
    });
    await tx.alumno.update({
      where: { id: idAlumno },
      data: { habilitado: pendientesTotal === 0 },
    });
  });

  revalidateTag("pagos");
  revalidateTag("alumnos");
  revalidateTag("dashboard");
  return {};
}
