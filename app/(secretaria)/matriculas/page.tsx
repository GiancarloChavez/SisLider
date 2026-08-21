import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCursosConMatriculas } from "@/lib/actions/matriculas";
import { MatriculasTable } from "./MatriculasTable";
import { AlumnosTable } from "../alumnos/AlumnosTable";
import type { AlumnoSerialized } from "@/lib/actions/alumnos";

const getCursos = unstable_cache(
  getCursosConMatriculas,
  ["cursos-matriculas"],
  { tags: ["matriculas", "cursos"] }
);

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
      const t = a.tutorAlumnos[0];
      return {
        id: a.id,
        nombre: a.nombre,
        apellido: a.apellido,
        dni: a.dni,
        celular: a.celular,
        fechaNacimiento: a.fechaNacimiento?.toISOString() ?? null,
        habilitado: a.habilitado,
        createdAt: a.createdAt.toISOString(),
        tutor: t
          ? { nombre: t.tutor.nombre, apellido: t.tutor.apellido, celular: t.tutor.celular, relacion: t.tutor.relacion }
          : null,
      };
    });
  },
  ["alumnos-list"],
  { tags: ["alumnos"] }
);

export const dynamic = "force-dynamic";

const TABS = ["matriculas", "alumnos"] as const;
type Tab = (typeof TABS)[number];

export default async function MatriculasPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; nuevo?: string }>;
}) {
  if (process.env.NEXT_PHASE === "phase-production-build") return null;

  const params = await searchParams;
  const activeTab: Tab = TABS.includes(params.tab as Tab) ? (params.tab as Tab) : "matriculas";

  const [cursos, alumnos] = await Promise.all([getCursos(), getAlumnos()]);

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="border-b border-zinc-200">
        <div className="flex gap-0">
          {([
            { key: "matriculas", label: "Matrículas" },
            { key: "alumnos", label: "Alumnos" },
          ] as { key: Tab; label: string }[]).map(({ key, label }) => (
            <a
              key={key}
              href={`/matriculas${key !== "matriculas" ? `?tab=${key}` : ""}`}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === key
                  ? "border-zinc-900 text-zinc-900"
                  : "border-transparent text-zinc-400 hover:text-zinc-700 hover:border-zinc-300"
              }`}
            >
              {label}
            </a>
          ))}
        </div>
      </div>

      {activeTab === "matriculas" && <MatriculasTable cursos={cursos} />}
      {activeTab === "alumnos" && (
        <AlumnosTable alumnos={alumnos} autoOpen={params.nuevo === "true"} />
      )}
    </div>
  );
}
