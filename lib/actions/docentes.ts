"use server";

import { revalidateTag } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DocenteSerialized = {
  id: string;
  nombre: string;
  apellido: string;
  celular: string | null;
  dni: string | null;
  email: string | null;
  activo: boolean;
  createdAt: string;
};

export type DocenteFormState = {
  errors?: Record<string, string[]>;
  message?: string;
  credentials?: { email: string; password: string };
};

export type GrupoDocentePerfil = {
  id: string;
  numeroGrupo: string;
  curso: { nombre: string };
  aula: { nombre: string };
  dias: string[];
  horaInicio: string;
  horaFin: string;
  fechaInicio?: string;
  fechaFin?: string;
  alumnos: { id: string; nombre: string; apellido: string }[];
};

export type DocentePerfilData = {
  id: string;
  nombre: string;
  apellido: string;
  dni: string | null;
  celular: string | null;
  grupos: GrupoDocentePerfil[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function generatePassword(length = 10): string {
  return Array.from(
    { length },
    () => CHARSET[Math.floor(Math.random() * CHARSET.length)]
  ).join("");
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createSchema = z.object({
  nombre:   z.string().min(1, "El nombre es requerido").max(100),
  apellido: z.string().min(1, "El apellido es requerido").max(100),
  celular:  z.string().max(20).optional(),
  dni:      z.string().regex(/^\d{8}$/, "El DNI debe tener exactamente 8 dígitos"),
});

const updateSchema = z.object({
  nombre:   z.string().min(1, "El nombre es requerido").max(100),
  apellido: z.string().min(1, "El apellido es requerido").max(100),
  celular:  z.string().max(20).optional(),
});

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createDocente(
  _prev: DocenteFormState,
  formData: FormData
): Promise<DocenteFormState> {
  const rawDni = (formData.get("dni") as string | null)?.trim();

  const parsed = createSchema.safeParse({
    nombre:   formData.get("nombre"),
    apellido: formData.get("apellido"),
    celular:  formData.get("celular") || undefined,
    dni:      rawDni,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { nombre, apellido, celular, dni } = parsed.data;

  const existing = await prisma.docente.findUnique({ where: { dni } });
  if (existing) {
    return { errors: { dni: ["Este DNI ya está registrado en el sistema."] } };
  }
  const emailExisting = await prisma.usuario.findUnique({ where: { email: `${dni}@sislider.pe` } });
  if (emailExisting) {
    return { errors: { dni: ["Ya existe una cuenta con este DNI."] } };
  }

  const password = generatePassword();
  const passwordHash = await bcrypt.hash(password, 10);
  const email = `${dni}@sislider.pe`;

  const usuario = await prisma.usuario.create({
    data: {
      nombre: `${nombre} ${apellido}`,
      email,
      passwordHash,
      rol: "docente",
    },
  });

  await prisma.docente.create({
    data: { nombre, apellido, celular, dni, idUsuario: usuario.id },
  });

  revalidateTag("docentes");
  return { message: "credentials", credentials: { email, password } };
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateDocente(
  id: string,
  _prev: DocenteFormState,
  formData: FormData
): Promise<DocenteFormState> {
  const parsed = updateSchema.safeParse({
    nombre:   formData.get("nombre"),
    apellido: formData.get("apellido"),
    celular:  formData.get("celular") || undefined,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { nombre, apellido, celular } = parsed.data;

  await prisma.docente.update({ where: { id }, data: { nombre, apellido, celular } });

  // Keep usuario.nombre in sync
  const docente = await prisma.docente.findUnique({ where: { id }, select: { idUsuario: true } });
  if (docente?.idUsuario) {
    await prisma.usuario.update({
      where: { id: docente.idUsuario },
      data: { nombre: `${nombre} ${apellido}` },
    });
  }

  revalidateTag("docentes");
  return { message: "ok" };
}

// ─── Toggle active ────────────────────────────────────────────────────────────

export async function toggleDocenteActivo(id: string, activo: boolean) {
  await prisma.docente.update({ where: { id }, data: { activo: !activo } });
  revalidateTag("docentes");
}

// ─── Regenerate password ──────────────────────────────────────────────────────

export async function regenerarPasswordDocente(
  docenteId: string
): Promise<{ email: string; password: string } | { error: string }> {
  const docente = await prisma.docente.findUnique({
    where: { id: docenteId },
    select: { idUsuario: true, nombre: true, apellido: true, dni: true },
  });

  if (!docente) return { error: "Docente no encontrado." };

  // No tiene cuenta → crear una
  if (!docente.idUsuario) {
    if (!docente.dni) {
      return { error: "El docente no tiene DNI registrado. Edítalo primero para asignarle uno." };
    }
    const email = `${docente.dni}@sislider.pe`;
    const existingEmail = await prisma.usuario.findUnique({ where: { email } });
    if (existingEmail) {
      return { error: "Ya existe una cuenta con ese DNI. Contacta al administrador." };
    }
    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 10);
    const usuario = await prisma.usuario.create({
      data: { nombre: `${docente.nombre} ${docente.apellido}`, email, passwordHash, rol: "docente" },
    });
    await prisma.docente.update({ where: { id: docenteId }, data: { idUsuario: usuario.id } });
    revalidateTag("docentes");
    return { email, password };
  }

  // Tiene cuenta → regenerar contraseña
  const password = generatePassword();
  const passwordHash = await bcrypt.hash(password, 10);
  const usuario = await prisma.usuario.update({
    where: { id: docente.idUsuario },
    data: { passwordHash },
    select: { email: true },
  });

  return { email: usuario.email, password };
}

// ─── Perfil admin ────────────────────────────────────────────────────────────

export type DocentePerfilAdmin = {
  id: string;
  nombre: string;
  apellido: string;
  dni: string | null;
  celular: string | null;
  activo: boolean;
  createdAt: string;
  email: string | null;
  idUsuario: string | null;
  grupos: {
    id: string;
    numeroGrupo: string;
    fechaInicio: string | null;
    fechaFin: string | null;
    horaInicio: string;
    horaFin: string;
    curso: { nombre: string };
    aula: { nombre: string };
    dias: string[];
    alumnosCount: number;
  }[];
};

export async function getDocentePerfilAdmin(id: string): Promise<DocentePerfilAdmin | null> {
  const d = await prisma.docente.findUnique({
    where: { id },
    include: {
      usuario: { select: { email: true } },
      horarios: {
        include: {
          curso: true,
          aula: true,
          dias: true,
          _count: { select: { matriculas: { where: { estado: "activa" } } } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!d) return null;

  return {
    id: d.id,
    nombre: d.nombre,
    apellido: d.apellido,
    dni: d.dni,
    celular: d.celular,
    activo: d.activo,
    createdAt: d.createdAt.toISOString(),
    email: d.usuario?.email ?? null,
    idUsuario: d.idUsuario,
    grupos: d.horarios.map((h) => ({
      id: h.id,
      numeroGrupo: h.numeroGrupo,
      fechaInicio: h.fechaInicio ? h.fechaInicio.toISOString().slice(0, 10) : null,
      fechaFin: h.fechaFin ? h.fechaFin.toISOString().slice(0, 10) : null,
      horaInicio: h.horaInicio.toISOString().slice(11, 16),
      horaFin: h.horaFin.toISOString().slice(11, 16),
      curso: { nombre: h.curso.nombre },
      aula: { nombre: h.aula.nombre },
      dias: h.dias.map((dia) => dia.dia),
      alumnosCount: h._count.matriculas,
    })),
  };
}

export async function getDocentesParaReemplazo(
  excludeId: string
): Promise<{ id: string; nombre: string; apellido: string }[]> {
  return prisma.docente.findMany({
    where: { id: { not: excludeId }, activo: true },
    select: { id: true, nombre: true, apellido: true },
    orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
  });
}

export async function deleteDocente(
  id: string,
  replacementId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const d = await prisma.docente.findUnique({
      where: { id },
      select: { idUsuario: true, horarios: { select: { id: true } } },
    });
    if (!d) return { success: false, error: "Docente no encontrado" };

    if (d.horarios.length > 0) {
      let rid = replacementId;
      if (!rid) {
        const other = await prisma.docente.findFirst({
          where: { id: { not: id }, activo: true },
          select: { id: true },
        });
        if (!other) return { success: false, error: "No hay otro docente disponible para reasignar los grupos." };
        rid = other.id;
      }
      await prisma.horario.updateMany({ where: { idDocente: id }, data: { idDocente: rid } });
    }

    if (d.idUsuario) {
      await prisma.usuario.update({ where: { id: d.idUsuario }, data: { activo: false } });
    }

    await prisma.docente.delete({ where: { id } });
    revalidateTag("docentes");
    return { success: true };
  } catch (e) {
    console.error("[deleteDocente]", e);
    return { success: false, error: "Error al eliminar el docente. Intenta nuevamente." };
  }
}

// ─── Perfil portal ────────────────────────────────────────────────────────────

export async function getDocentePerfil(
  docenteId: string
): Promise<DocentePerfilData | null> {
  const docente = await prisma.docente.findUnique({
    where: { id: docenteId },
    include: {
      horarios: {
        where: { activo: true, curso: { activo: true } },
        include: {
          curso: true,
          aula: true,
          dias: true,
          matriculas: {
            where: { estado: "activa", alumno: { habilitado: true } },
            include: {
              alumno: { select: { id: true, nombre: true, apellido: true } },
            },
            orderBy: [{ alumno: { apellido: "asc" } }, { alumno: { nombre: "asc" } }],
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!docente) return null;

  return {
    id: docente.id,
    nombre: docente.nombre,
    apellido: docente.apellido,
    dni: docente.dni,
    celular: docente.celular,
    grupos: docente.horarios.map((h) => ({
      id: h.id,
      numeroGrupo: h.numeroGrupo,
      curso: { nombre: h.curso.nombre },
      aula: { nombre: h.aula.nombre },
      dias: h.dias.map((d) => d.dia),
      horaInicio: h.horaInicio.toISOString().slice(11, 16),
      horaFin: h.horaFin.toISOString().slice(11, 16),
      fechaInicio: h.fechaInicio?.toISOString().slice(0, 10),
      fechaFin: h.fechaFin?.toISOString().slice(0, 10),
      alumnos: h.matriculas.map((m) => m.alumno),
    })),
  };
}
