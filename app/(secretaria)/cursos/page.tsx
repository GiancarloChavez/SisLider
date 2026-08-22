import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CursosTable } from "./CursosTable";
import { HorariosTable } from "../horarios/HorariosTable";
import type { CursoSerialized } from "@/lib/actions/cursos";
import type { HorarioSerialized, HorarioSelectData } from "@/lib/actions/horarios";

// ─── Data fetching ────────────────────────────────────────────────────────────

const getCursos = unstable_cache(
  async (): Promise<CursoSerialized[]> => {
    const raw = await prisma.curso.findMany({
      orderBy: [{ activo: "desc" }, { nombre: "asc" }],
    });
    return raw.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      activo: c.activo,
      createdAt: c.createdAt.toISOString(),
    }));
  },
  ["cursos-list"],
  { tags: ["cursos"] }
);

const getHorarios = unstable_cache(
  async (): Promise<HorarioSerialized[]> => {
    const raw = await prisma.horario.findMany({
      include: { curso: true, docente: true, aula: true, dias: true },
      orderBy: [{ activo: "desc" }, { createdAt: "asc" }],
    });
    return raw.map((h) => ({
      id: h.id,
      idCurso: h.idCurso,
      idDocente: h.idDocente,
      idAula: h.idAula,
      numeroGrupo: h.numeroGrupo,
      precioMensual: Number(h.precioMensual),
      fechaInicio: h.fechaInicio ? h.fechaInicio.toISOString().slice(0, 10) : undefined,
      fechaFin: h.fechaFin ? h.fechaFin.toISOString().slice(0, 10) : undefined,
      horaInicio: h.horaInicio.toISOString().slice(11, 16),
      horaFin: h.horaFin.toISOString().slice(11, 16),
      activo: h.activo,
      createdAt: h.createdAt.toISOString(),
      curso: { nombre: h.curso.nombre },
      docente: { nombre: h.docente.nombre, apellido: h.docente.apellido },
      aula: { nombre: h.aula.nombre, capacidad: h.aula.capacidad },
      dias: h.dias.map((d) => d.dia),
    }));
  },
  ["horarios-list"],
  { tags: ["horarios", "cursos", "docentes", "aulas"] }
);

const getSelectData = unstable_cache(
  async (): Promise<HorarioSelectData> => {
    const [cursos, docentes, aulas] = await Promise.all([
      prisma.curso.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
      prisma.docente.findMany({
        where: { activo: true },
        orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
      }),
      prisma.aula.findMany({ where: { activa: true }, orderBy: { nombre: "asc" } }),
    ]);
    return {
      cursos: cursos.map((c) => ({ id: c.id, label: c.nombre })),
      docentes: docentes.map((d) => ({ id: d.id, label: `${d.apellido}, ${d.nombre}` })),
      aulas: aulas.map((a) => ({ id: a.id, label: a.nombre })),
    };
  },
  ["horarios-select"],
  { tags: ["cursos", "docentes", "aulas"] }
);

export const dynamic = "force-dynamic";

type Tab = "cursos" | "horarios";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CursosPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  if (process.env.NEXT_PHASE === "phase-production-build") return null;

  const params = await searchParams;
  const activeTab: Tab = params.tab === "horarios" ? "horarios" : "cursos";

  const [cursos, horariosResult] = await Promise.all([
    getCursos(),
    activeTab === "horarios"
      ? Promise.all([getHorarios(), getSelectData()])
      : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-4">

      {/* ── Tabs ──────────────────────────────────────────────────────────────── */}
      <div className="border-b border-zinc-200 -mb-2">
        <div className="flex gap-0">
          {([
            { key: "cursos",   label: "Cursos" },
            { key: "horarios", label: "Horarios" },
          ] as { key: Tab; label: string }[]).map(({ key, label }) => (
            <a
              key={key}
              href={key === "cursos" ? "/cursos" : `/cursos?tab=${key}`}
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

      {/* ── CURSOS TAB ────────────────────────────────────────────────────────── */}
      {activeTab === "cursos" && (
        <div className="pt-3">
          <CursosTable cursos={cursos} />
        </div>
      )}

      {/* ── HORARIOS TAB ──────────────────────────────────────────────────────── */}
      {activeTab === "horarios" && horariosResult && (
        <div className="pt-3">
          <HorariosTable horarios={horariosResult[0]} selectData={horariosResult[1]} />
        </div>
      )}
    </div>
  );
}
