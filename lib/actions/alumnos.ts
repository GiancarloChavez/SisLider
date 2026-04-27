"use server";

import { revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export type AlumnoSerialized = {
  id: string;
  nombre: string;
  apellido: string;
  dni: string | null;
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
  dni: z.string().length(8, "El DNI debe tener 8 dígitos").regex(/^\d+$/, "Solo dígitos").optional().or(z.literal("")),
  fechaNacimiento: z.string().optional().or(z.literal("")),
});

const tutorSchema = z.object({
  tutorNombre: z.string().min(1, "El nombre del tutor es requerido").max(100),
  tutorApellido: z.string().min(1, "El apellido del tutor es requerido").max(100),
  tutorCelular: z.string().min(7, "Celular inválido").max(20),
  tutorCelularAdicional: z.string().max(20).optional().or(z.literal("")),
  tutorRelacion: z.string().min(1, "La relación es requerida").max(50),
});

export async function createAlumnoConTutor(
  _prev: AlumnoFormState,
  formData: FormData
): Promise<AlumnoFormState> {
  const parsedAlumno = alumnoSchema.safeParse({
    nombre: formData.get("nombre"),
    apellido: formData.get("apellido"),
    dni: formData.get("dni") || undefined,
    fechaNacimiento: formData.get("fechaNacimiento") || undefined,
  });

  const parsedTutor = tutorSchema.safeParse({
    tutorNombre: formData.get("tutorNombre"),
    tutorApellido: formData.get("tutorApellido"),
    tutorCelular: formData.get("tutorCelular"),
    tutorCelularAdicional: formData.get("tutorCelularAdicional") || undefined,
    tutorRelacion: formData.get("tutorRelacion"),
  });

  const errors: Record<string, string[]> = {};
  if (!parsedAlumno.success) Object.assign(errors, parsedAlumno.error.flatten().fieldErrors);
  if (!parsedTutor.success) Object.assign(errors, parsedTutor.error.flatten().fieldErrors);
  if (Object.keys(errors).length > 0) return { errors };

  const alumnoData = parsedAlumno.data!;
  const tutorData = parsedTutor.data!;

  await prisma.$transaction(async (tx) => {
    const tutor = await tx.tutor.create({
      data: {
        nombre: tutorData.tutorNombre,
        apellido: tutorData.tutorApellido,
        celular: tutorData.tutorCelular,
        celularAdicional: tutorData.tutorCelularAdicional || null,
        relacion: tutorData.tutorRelacion,
      },
    });

    const alumno = await tx.alumno.create({
      data: {
        nombre: alumnoData.nombre,
        apellido: alumnoData.apellido,
        dni: alumnoData.dni || null,
        fechaNacimiento: alumnoData.fechaNacimiento ? new Date(alumnoData.fechaNacimiento) : null,
      },
    });

    await tx.tutorAlumno.create({
      data: { idTutor: tutor.id, idAlumno: alumno.id, esPrincipal: true },
    });
  });

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
    fechaNacimiento: formData.get("fechaNacimiento") || undefined,
  });

  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  await prisma.alumno.update({
    where: { id },
    data: {
      nombre: parsed.data.nombre,
      apellido: parsed.data.apellido,
      dni: parsed.data.dni || null,
      fechaNacimiento: parsed.data.fechaNacimiento ? new Date(parsed.data.fechaNacimiento) : null,
    },
  });

  revalidateTag("alumnos");
  return { message: "ok" };
}

export async function toggleAlumnoHabilitado(id: string, habilitado: boolean) {
  await prisma.alumno.update({ where: { id }, data: { habilitado: !habilitado } });
  revalidateTag("alumnos");
}
