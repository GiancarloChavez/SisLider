import { getCursosConHorarios } from "@/lib/actions/clases";
import { ClasesView } from "./ClasesView";

type PageProps = { searchParams: Promise<{ curso?: string; horario?: string }> };

export const dynamic = "force-dynamic";

export default async function ClasesPage({ searchParams }: PageProps) {
  if (process.env.NEXT_PHASE === "phase-production-build") return null;
  const [cursos, params] = await Promise.all([getCursosConHorarios(), searchParams]);

  const totalHorarios = cursos.reduce((s, c) => s + c.horarios.length, 0);
  const totalAlumnos = cursos.reduce(
    (s, c) => s + c.horarios.reduce((ss, h) => ss + h.alumnosHabilitados, 0),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Clases</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          {cursos.length} curso{cursos.length !== 1 ? "s" : ""} ·{" "}
          {totalHorarios} horario{totalHorarios !== 1 ? "s" : ""} ·{" "}
          {totalAlumnos} alumno{totalAlumnos !== 1 ? "s" : ""} habilitado{totalAlumnos !== 1 ? "s" : ""}
        </p>
      </div>

      {cursos.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-16 text-center text-zinc-400">
          <p className="text-sm">No hay cursos activos con horarios.</p>
          <p className="text-xs mt-1">Crea cursos y horarios desde las secciones correspondientes.</p>
        </div>
      ) : (
        <ClasesView
          cursos={cursos}
          initialCursoId={params.curso}
          initialHorarioId={params.horario}
        />
      )}
    </div>
  );
}
