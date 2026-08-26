import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AlumnoPerfilView } from "./AlumnoPerfilView";

export const dynamic = "force-dynamic";

export type TutorParaAlumno = {
  id: string;
  esPrincipal: boolean;
  nombre: string;
  apellido: string;
  celular: string;
  celularAdicional: string | null;
  relacion: string;
};

export type MesPagoParaAlumno = {
  id: string;
  anio: number;
  mes: number;
  montoTotal: number;
  montoPagado: number;
  estado: string;
};

export type AsistenciaParaAlumno = {
  id: string;
  fecha: string;
  estado: string;
};

export type MatriculaParaAlumno = {
  id: string;
  estado: string;
  precioFinalMensual: number;
  fechaInicio: string;
  fechaFin: string | null;
  horario: {
    id: string;
    numeroGrupo: string;
    fechaInicio: string | null;
    fechaFin: string | null;
    horaInicio: string;
    horaFin: string;
    cantidadMeses: number | null;
    curso: { nombre: string };
    docente: { nombre: string; apellido: string };
    aula: { nombre: string };
    dias: string[];
  };
  mesesPago: MesPagoParaAlumno[];
  asistencias: AsistenciaParaAlumno[];
};

export type AlumnoPerfilData = {
  id: string;
  nombre: string;
  apellido: string;
  dni: string | null;
  celular: string | null;
  fechaNacimiento: string | null;
  habilitado: boolean;
  createdAt: string;
  tutores: TutorParaAlumno[];
  matriculas: MatriculaParaAlumno[];
};

export default async function AlumnoPerfilPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (process.env.NEXT_PHASE === "phase-production-build") return null;

  const { id } = await params;

  const raw = await prisma.alumno.findUnique({
    where: { id },
    include: {
      tutorAlumnos: {
        include: { tutor: true },
        orderBy: { esPrincipal: "desc" },
      },
      matriculas: {
        include: {
          horario: {
            include: {
              curso: true,
              docente: true,
              aula: true,
              dias: true,
            },
          },
          mesesPago: {
            orderBy: [{ anio: "asc" }, { mes: "asc" }],
          },
          asistencias: {
            orderBy: { fecha: "asc" },
          },
        },
        orderBy: { fechaInicio: "desc" },
      },
    },
  });

  if (!raw) notFound();

  const alumno: AlumnoPerfilData = {
    id: raw.id,
    nombre: raw.nombre,
    apellido: raw.apellido,
    dni: raw.dni,
    celular: raw.celular,
    fechaNacimiento: raw.fechaNacimiento?.toISOString() ?? null,
    habilitado: raw.habilitado,
    createdAt: raw.createdAt.toISOString(),
    tutores: raw.tutorAlumnos.map((ta) => ({
      id: ta.tutor.id,
      esPrincipal: ta.esPrincipal,
      nombre: ta.tutor.nombre,
      apellido: ta.tutor.apellido,
      celular: ta.tutor.celular,
      celularAdicional: ta.tutor.celularAdicional,
      relacion: ta.tutor.relacion,
    })),
    matriculas: raw.matriculas.map((m) => ({
      id: m.id,
      estado: m.estado,
      precioFinalMensual: Number(m.precioFinalMensual),
      fechaInicio: m.fechaInicio.toISOString().slice(0, 10),
      fechaFin: m.fechaFin ? m.fechaFin.toISOString().slice(0, 10) : null,
      horario: {
        id: m.horario.id,
        numeroGrupo: m.horario.numeroGrupo,
        fechaInicio: m.horario.fechaInicio
          ? m.horario.fechaInicio.toISOString().slice(0, 10)
          : null,
        fechaFin: m.horario.fechaFin
          ? m.horario.fechaFin.toISOString().slice(0, 10)
          : null,
        horaInicio: m.horario.horaInicio.toISOString().slice(11, 16),
        horaFin: m.horario.horaFin.toISOString().slice(11, 16),
        cantidadMeses: m.horario.cantidadMeses,
        curso: { nombre: m.horario.curso.nombre },
        docente: { nombre: m.horario.docente.nombre, apellido: m.horario.docente.apellido },
        aula: { nombre: m.horario.aula.nombre },
        dias: m.horario.dias.map((d) => d.dia),
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

  return <AlumnoPerfilView alumno={alumno} />;
}
