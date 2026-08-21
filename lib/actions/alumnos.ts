"use server";

import { randomUUID } from "crypto";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export type AlumnoSerialized = {
  id: string;
  nombre: string;
  apellido: string;
  dni: string | null;
  celular: string | null;
  fechaNacimiento: string | null;
  habilitado: boolean;
  createdAt: string;
  tutor: { nombre: string; apellido: string; celular: string; relacion: string } | null;
};

export type AlumnoFormState = {
  errors?: Record<string, string[]>;
  message?: string;
};

const alumnoSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").max(100),
  apellido: z.string().min(1, "El apellido es requerido").max(100),
  dni: z
    .string()
    .length(8, "El DNI debe tener 8 dígitos")
    .regex(/^\d+$/, "Solo dígitos")
    .optional()
    .or(z.literal("")),
  celular: z.string().max(20).optional().or(z.literal("")),
  fechaNacimiento: z.string().optional().or(z.literal("")),
});

const apoderadoSchema = z.object({
  tutorNombre: z.string().min(1, "El nombre del apoderado es requerido").max(100),
  tutorApellido: z.string().min(1, "El apellido del apoderado es requerido").max(100),
  tutorCelular: z.string().min(7, "Celular inválido").max(20),
  tutorCelularAdicional: z.string().max(20).optional().or(z.literal("")),
  tutorRelacion: z.string().min(1, "La relación es requerida").max(50),
});

const apoderado2Schema = z.object({
  tutor2Nombre: z.string().min(1, "El nombre del apoderado adicional es requerido").max(100),
  tutor2Apellido: z.string().min(1, "El apellido del apoderado adicional es requerido").max(100),
  tutor2Celular: z.string().min(7, "Celular inválido").max(20),
  tutor2CelularAdicional: z.string().max(20).optional().or(z.literal("")),
  tutor2Relacion: z.string().min(1, "La relación es requerida").max(50),
});

export async function createAlumno(
  _prev: AlumnoFormState,
  formData: FormData
): Promise<AlumnoFormState> {
  const tieneApoderado = formData.get("tieneApoderado") === "on";
  const tieneApoderado2 = tieneApoderado && formData.get("tieneApoderado2") === "on";

  const parsedAlumno = alumnoSchema.safeParse({
    nombre: formData.get("nombre"),
    apellido: formData.get("apellido"),
    dni: formData.get("dni") || undefined,
    celular: formData.get("celular") || undefined,
    fechaNacimiento: formData.get("fechaNacimiento") || undefined,
  });

  const errors: Record<string, string[]> = {};
  if (!parsedAlumno.success) Object.assign(errors, parsedAlumno.error.flatten().fieldErrors);

  let apoderado = null;
  if (tieneApoderado) {
    const parsedApoderado = apoderadoSchema.safeParse({
      tutorNombre: formData.get("tutorNombre"),
      tutorApellido: formData.get("tutorApellido"),
      tutorCelular: formData.get("tutorCelular"),
      tutorCelularAdicional: formData.get("tutorCelularAdicional") || undefined,
      tutorRelacion: formData.get("tutorRelacion"),
    });
    if (!parsedApoderado.success) Object.assign(errors, parsedApoderado.error.flatten().fieldErrors);
    else apoderado = parsedApoderado.data;
  }

  let apoderado2 = null;
  if (tieneApoderado2) {
    const parsed2 = apoderado2Schema.safeParse({
      tutor2Nombre: formData.get("tutor2Nombre"),
      tutor2Apellido: formData.get("tutor2Apellido"),
      tutor2Celular: formData.get("tutor2Celular"),
      tutor2CelularAdicional: formData.get("tutor2CelularAdicional") || undefined,
      tutor2Relacion: formData.get("tutor2Relacion"),
    });
    if (!parsed2.success) Object.assign(errors, parsed2.error.flatten().fieldErrors);
    else apoderado2 = parsed2.data;
  }

  if (Object.keys(errors).length > 0) return { errors };

  const alumnoData = parsedAlumno.data!;

  const alumnoId = randomUUID();
  const tutorId  = tieneApoderado  && apoderado  ? randomUUID() : null;
  const tutor2Id = tieneApoderado2 && apoderado2 ? randomUUID() : null;

  try {
    await prisma.$transaction([
      prisma.alumno.create({
        data: {
          id: alumnoId,
          nombre: alumnoData.nombre,
          apellido: alumnoData.apellido,
          dni: alumnoData.dni || null,
          celular: alumnoData.celular || null,
          fechaNacimiento: alumnoData.fechaNacimiento
            ? new Date(alumnoData.fechaNacimiento)
            : null,
        },
      }),
      ...(tieneApoderado && apoderado && tutorId
        ? [
            prisma.tutor.create({
              data: {
                id: tutorId,
                nombre: apoderado.tutorNombre,
                apellido: apoderado.tutorApellido,
                celular: apoderado.tutorCelular,
                celularAdicional: apoderado.tutorCelularAdicional || null,
                relacion: apoderado.tutorRelacion,
              },
            }),
            prisma.tutorAlumno.create({
              data: { idTutor: tutorId, idAlumno: alumnoId, esPrincipal: true },
            }),
          ]
        : []),
      ...(tieneApoderado2 && apoderado2 && tutor2Id
        ? [
            prisma.tutor.create({
              data: {
                id: tutor2Id,
                nombre: apoderado2.tutor2Nombre,
                apellido: apoderado2.tutor2Apellido,
                celular: apoderado2.tutor2Celular,
                celularAdicional: apoderado2.tutor2CelularAdicional || null,
                relacion: apoderado2.tutor2Relacion,
              },
            }),
            prisma.tutorAlumno.create({
              data: { idTutor: tutor2Id, idAlumno: alumnoId, esPrincipal: false },
            }),
          ]
        : []),
    ]);
  } catch (e: unknown) {
    const code = (e as { code?: string }).code;
    if (code === "P2002") {
      return { errors: { dni: ["Este DNI ya está registrado en el sistema"] } };
    }
    console.error("[createAlumno]", e);
    return { errors: { _: ["Error al registrar el alumno. Intenta nuevamente."] } };
  }

  revalidateTag("alumnos");
  return { message: "ok" };
}

export async function updateAlumno(
  id: string,
  _prev: AlumnoFormState,
  formData: FormData
): Promise<AlumnoFormState> {
  const parsed = alumnoSchema.safeParse({
    nombre: formData.get("nombre"),
    apellido: formData.get("apellido"),
    dni: formData.get("dni") || undefined,
    celular: formData.get("celular") || undefined,
    fechaNacimiento: formData.get("fechaNacimiento") || undefined,
  });

  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  try {
    await prisma.alumno.update({
      where: { id },
      data: {
        nombre: parsed.data.nombre,
        apellido: parsed.data.apellido,
        dni: parsed.data.dni || null,
        celular: parsed.data.celular || null,
        fechaNacimiento: parsed.data.fechaNacimiento
          ? new Date(parsed.data.fechaNacimiento)
          : null,
      },
    });
  } catch (e: unknown) {
    const code = (e as { code?: string }).code;
    if (code === "P2002") {
      return { errors: { dni: ["Este DNI ya está registrado en el sistema"] } };
    }
    console.error("[updateAlumno]", e);
    return { errors: { _: ["Error al actualizar el alumno. Intenta nuevamente."] } };
  }

  revalidateTag("alumnos");
  return { message: "ok" };
}

export async function toggleAlumnoHabilitado(id: string, habilitado: boolean) {
  await prisma.alumno.update({ where: { id }, data: { habilitado: !habilitado } });
  revalidateTag("alumnos");
}
