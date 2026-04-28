import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { AlumnosTable } from "./AlumnosTable";
import type { AlumnoSerialized } from "@/lib/actions/alumnos";

const getAlumnos = unstable_cache(
  async (): Promise<AlumnoSerialized[]> => {
    const raw = await prisma.alumno.findMany({
      orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
      include: {
        tutorAlumnos: {
          where: { esPrincipal: true },
          include: { tutor: true },
          take: 1,
        },
      },
    });

    return raw.map((a) => {
      const tutorAlumno = a.tutorAlumnos[0];
      return {
        id: a.id,
        nombre: a.nombre,
        apellido: a.apellido,
        dni: a.dni,
        celular: a.celular,
        fechaNacimiento: a.fechaNacimiento?.toISOString() ?? null,
        habilitado: a.habilitado,
        createdAt: a.createdAt.toISOString(),
        tutor: tutorAlumno
          ? {
              nombre: tutorAlumno.tutor.nombre,
              apellido: tutorAlumno.tutor.apellido,
              celular: tutorAlumno.tutor.celular,
              relacion: tutorAlumno.tutor.relacion,
            }
          : null,
      };
    });
  },
  ["alumnos-list"],
  { tags: ["alumnos"] }
);

export default async function AlumnosPage({
  searchParams,
}: {
  searchParams: Promise<{ nuevo?: string }>;
}) {
  const [alumnos, params] = await Promise.all([getAlumnos(), searchParams]);
  return <AlumnosTable alumnos={alumnos} autoOpen={params.nuevo === "true"} />;
}
