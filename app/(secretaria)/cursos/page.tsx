import { prisma } from "@/lib/prisma";
import { CursosGruposView } from "./CursosGruposView";
import type { CursoSerialized } from "@/lib/actions/cursos";
import type { HorarioSerialized, HorarioSelectData } from "@/lib/actions/horarios";

async function getCursos(): Promise<CursoSerialized[]> {
  const raw = await prisma.curso.findMany({
    orderBy: [{ activo: "desc" }, { nombre: "asc" }],
  });
  return raw.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    activo: c.activo,
    createdAt: c.createdAt.toISOString(),
  }));
}

async function getHorarios(): Promise<HorarioSerialized[]> {
  const raw = await prisma.horario.findMany({
    include: {
      curso: true,
      docente: true,
      aula: true,
      dias: true,
      periodos: { orderBy: { numeroPeriodo: "asc" } },
    },
    orderBy: [{ activo: "desc" }, { createdAt: "asc" }],
  });
  return raw.map((h) => ({
    id: h.id,
    idCurso: h.idCurso,
    idDocente: h.idDocente,
    idAula: h.idAula,
    numeroGrupo: h.numeroGrupo,
    precioMensual: Number(h.precioMensual),
    cantidadMeses: h.cantidadMeses ?? null,
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
    periodos: h.periodos.map((p) => ({
      id: p.id,
      numeroPeriodo: p.numeroPeriodo,
      fechaInicio: p.fechaInicio.toISOString().slice(0, 10),
      fechaFin: p.fechaFin.toISOString().slice(0, 10),
    })),
  }));
}

async function getSelectData(): Promise<HorarioSelectData> {
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
}

export const dynamic = "force-dynamic";

export default async function CursosPage() {
  if (process.env.NEXT_PHASE === "phase-production-build") return null;

  const [cursos, horarios, selectData] = await Promise.all([
    getCursos(),
    getHorarios(),
    getSelectData(),
  ]);

  return (
    <div className="space-y-4">
      <CursosGruposView cursos={cursos} horarios={horarios} selectData={selectData} />
    </div>
  );
}
