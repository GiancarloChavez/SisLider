import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { type HorarioSerialized, type HorarioSelectData } from "@/lib/actions/horarios";
import { HorariosTable } from "./HorariosTable";

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
      horaInicio: h.horaInicio.toISOString().slice(11, 16),
      horaFin: h.horaFin.toISOString().slice(11, 16),
      cupoMaximo: h.cupoMaximo,
      activo: h.activo,
      createdAt: h.createdAt.toISOString(),
      curso: { nombre: h.curso.nombre, nivel: h.curso.nivel },
      docente: { nombre: h.docente.nombre, apellido: h.docente.apellido },
      aula: { nombre: h.aula.nombre },
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
      cursos: cursos.map((c) => ({
        id: c.id,
        label: c.nivel ? `${c.nombre} (${c.nivel})` : c.nombre,
      })),
      docentes: docentes.map((d) => ({ id: d.id, label: `${d.apellido}, ${d.nombre}` })),
      aulas: aulas.map((a) => ({ id: a.id, label: a.nombre })),
    };
  },
  ["horarios-select"],
  { tags: ["cursos", "docentes", "aulas"] }
);

export default async function HorariosPage() {
  const [horarios, selectData] = await Promise.all([getHorarios(), getSelectData()]);
  return <HorariosTable horarios={horarios} selectData={selectData} />;
}
