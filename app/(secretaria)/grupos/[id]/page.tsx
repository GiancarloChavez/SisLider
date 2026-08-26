import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { GrupoPerfilView } from "./GrupoPerfilView";
import { getHorarioSelectData } from "@/lib/actions/horarios";

export const dynamic = "force-dynamic";

export type AsistenciaParaGrupo = {
  id: string;
  fecha: string;
  estado: string;
};

export type MesPagoParaGrupo = {
  id: string;
  anio: number;
  mes: number;
  montoTotal: number;
  montoPagado: number;
  estado: string;
};

export type MatriculaParaGrupo = {
  id: string;
  estado: string;
  precioFinalMensual: number;
  fechaInicio: string;
  fechaFin: string | null;
  alumno: {
    id: string;
    nombre: string;
    apellido: string;
    dni: string | null;
    celular: string | null;
  };
  mesesPago: MesPagoParaGrupo[];
  asistencias: AsistenciaParaGrupo[];
};

export type GrupoPerfilData = {
  id: string;
  idCurso: string;
  idDocente: string;
  idAula: string;
  numeroGrupo: string;
  precioMensual: number;
  cantidadMeses: number | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  horaInicio: string;
  horaFin: string;
  activo: boolean;
  createdAt: string;
  curso: { nombre: string };
  docente: { nombre: string; apellido: string };
  aula: { nombre: string; capacidad: number };
  dias: string[];
  periodos: { id: string; numeroPeriodo: number; fechaInicio: string; fechaFin: string }[];
  matriculas: MatriculaParaGrupo[];
};

export default async function GrupoPerfilPage({
  params,
}: {
  params: { id: string };
}) {
  if (process.env.NEXT_PHASE === "phase-production-build") return null;

  const [raw, selectData] = await Promise.all([
    prisma.horario.findUnique({
      where: { id: params.id },
      include: {
        curso: true,
        docente: true,
        aula: true,
        dias: true,
        periodos: { orderBy: { numeroPeriodo: "asc" } },
        matriculas: {
          include: {
            alumno: true,
            mesesPago: { orderBy: [{ anio: "asc" }, { mes: "asc" }] },
            asistencias: { orderBy: { fecha: "asc" } },
          },
          orderBy: [
            { alumno: { apellido: "asc" } },
            { alumno: { nombre: "asc" } },
          ],
        },
      },
    }),
    getHorarioSelectData(),
  ]);

  if (!raw) notFound();

  const horario: GrupoPerfilData = {
    id: raw.id,
    idCurso: raw.idCurso,
    idDocente: raw.idDocente,
    idAula: raw.idAula,
    numeroGrupo: raw.numeroGrupo,
    precioMensual: Number(raw.precioMensual),
    cantidadMeses: raw.cantidadMeses,
    fechaInicio: raw.fechaInicio ? raw.fechaInicio.toISOString().slice(0, 10) : null,
    fechaFin: raw.fechaFin ? raw.fechaFin.toISOString().slice(0, 10) : null,
    horaInicio: raw.horaInicio.toISOString().slice(11, 16),
    horaFin: raw.horaFin.toISOString().slice(11, 16),
    activo: raw.activo,
    createdAt: raw.createdAt.toISOString(),
    curso: { nombre: raw.curso.nombre },
    docente: { nombre: raw.docente.nombre, apellido: raw.docente.apellido },
    aula: { nombre: raw.aula.nombre, capacidad: raw.aula.capacidad },
    dias: raw.dias.map((d) => d.dia),
    periodos: raw.periodos.map((p) => ({
      id: p.id,
      numeroPeriodo: p.numeroPeriodo,
      fechaInicio: p.fechaInicio.toISOString().slice(0, 10),
      fechaFin: p.fechaFin.toISOString().slice(0, 10),
    })),
    matriculas: raw.matriculas.map((m) => ({
      id: m.id,
      estado: m.estado,
      precioFinalMensual: Number(m.precioFinalMensual),
      fechaInicio: m.fechaInicio.toISOString().slice(0, 10),
      fechaFin: m.fechaFin ? m.fechaFin.toISOString().slice(0, 10) : null,
      alumno: {
        id: m.alumno.id,
        nombre: m.alumno.nombre,
        apellido: m.alumno.apellido,
        dni: m.alumno.dni,
        celular: m.alumno.celular,
      },
      mesesPago: m.mesesPago.map((mp) => ({
        id: mp.id,
        anio: mp.anio,
        mes: mp.mes,
        montoTotal: Number(mp.montoTotal),
        montoPagado: Number(mp.montoPagado),
        estado: mp.estado,
      })),
      asistencias: m.asistencias.map((a) => ({
        id: a.id,
        fecha: a.fecha.toISOString().slice(0, 10),
        estado: a.estado,
      })),
    })),
  };

  return <GrupoPerfilView horario={horario} selectData={selectData} />;
}
