import { prisma } from "@/lib/prisma";

const MESES_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

function fmtDate(d: Date): string {
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" });
}
function fmtDateShort(d: Date): string {
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type ReporteAlumnoData = {
  generadoEn: string;
  alumno: {
    nombre: string;
    apellido: string;
    dni: string | null;
    celular: string | null;
    fechaNacimiento: string | null;
  };
  tutor: {
    nombre: string;
    apellido: string;
    celular: string;
    celularAdicional: string | null;
    relacion: string;
  } | null;
  matriculas: {
    id: string;
    curso: string;
    dias: string[];
    horaInicio: string;
    horaFin: string;
    docente: string;
    aula: string;
    descuento: string | null;
    precioFinal: number;
    estado: string;
    fechaInicio: string;
    mesesPago: {
      mes: number;
      anio: number;
      montoTotal: number;
      montoPagado: number;
      saldo: number;
      estado: string;
    }[];
    asistencias: {
      presente: number;
      tarde: number;
      ausente: number;
      justificado: number;
      total: number;
    };
  }[];
};

export type ReporteIngresosMensualData = {
  anio: number;
  mes: number;
  mesNombre: string;
  generadoEn: string;
  abonos: {
    alumno: string;
    curso: string;
    monto: number;
    metodoPago: string;
    fecha: string;
  }[];
  totalEfectivo: number;
  totalTransferencia: number;
  totalYapePlin: number;
  totalGeneral: number;
  deudaMes: number;
  alumnosUnicos: number;
};

export type ReporteIngresosAnualData = {
  anio: number;
  generadoEn: string;
  meses: {
    mes: number;
    mesNombre: string;
    totalCobrado: number;
    totalEfectivo: number;
    totalTransferencia: number;
    pendiente: number;
    cantidadAbonos: number;
  }[];
  totalAnual: number;
  totalPendiente: number;
};

export type ReporteCursosData = {
  generadoEn: string;
  totalCursos: number;
  totalAlumnosActivos: number;
  cursos: {
    nombre: string;
    precioMensual: number;
    activo: boolean;
    horarios: {
      id: string;
      dias: string[];
      horaInicio: string;
      horaFin: string;
      docente: string;
      aula: string;
      capacidad: number;
      alumnosActivos: number;
      alumnos: { nombre: string; apellido: string; dni: string | null }[];
    }[];
  }[];
};

export type AlumnoListItem = {
  id: string;
  nombre: string;
  apellido: string;
  dni: string | null;
};

export type NotaPagoData = {
  numero: string;
  fechaEmision: string;
  alumno: { nombre: string; apellido: string; dni: string | null };
  descripcion: string;
  monto: number;
  metodoPago: string;
};

// ── Queries ───────────────────────────────────────────────────────────────────

const DIA_ABREV_NOTA: Record<string, string> = {
  Lunes: "L", Martes: "M", "Miércoles": "X", Jueves: "J", Viernes: "V", Sábado: "S", Domingo: "D",
};

export async function getNotaPagoData(abonoId: string): Promise<NotaPagoData | null> {
  const abono = await prisma.abono.findUnique({
    where: { id: abonoId },
    include: {
      mesPago: {
        include: {
          matricula: {
            include: {
              alumno: { select: { nombre: true, apellido: true, dni: true } },
              horario: { include: { curso: { select: { nombre: true } } } },
              dias: true,
            },
          },
        },
      },
    },
  });

  if (!abono) return null;

  const count = await prisma.abono.count({ where: { createdAt: { lte: abono.createdAt } } });
  const numero = `001-${String(count).padStart(4, "0")}`;
  const fechaEmision = new Date(abono.fechaPago).toLocaleDateString("es-PE", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

  const m = abono.mesPago.matricula;
  const DIA_ORDER = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const diasStr = [...m.dias]
    .sort((a, b) => DIA_ORDER.indexOf(a.dia) - DIA_ORDER.indexOf(b.dia))
    .map((d) => DIA_ABREV_NOTA[d.dia] ?? d.dia)
    .join("/");
  const hi = m.horario.horaInicio.toISOString().slice(11, 16);
  const hf = m.horario.horaFin.toISOString().slice(11, 16);
  const periodo = `${MESES_ES[abono.mesPago.mes - 1]} ${abono.mesPago.anio}`;
  const descripcion = `${m.horario.curso.nombre} — ${diasStr} ${hi}/${hf} — ${periodo}`;

  return {
    numero,
    fechaEmision,
    alumno: { nombre: m.alumno.nombre, apellido: m.alumno.apellido, dni: m.alumno.dni },
    descripcion,
    monto: Number(abono.monto),
    metodoPago: abono.metodoPago,
  };
}

export async function getAlumnosList(): Promise<AlumnoListItem[]> {
  return prisma.alumno.findMany({
    select: { id: true, nombre: true, apellido: true, dni: true },
    orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
  });
}

export async function getReporteAlumnoData(
  alumnoId: string
): Promise<ReporteAlumnoData | null> {
  const alumno = await prisma.alumno.findUnique({
    where: { id: alumnoId },
    include: {
      tutorAlumnos: {
        where: { esPrincipal: true },
        include: { tutor: true },
        take: 1,
      },
      matriculas: {
        orderBy: [{ estado: "asc" }, { fechaInicio: "desc" }],
        include: {
          dias: true,
          descuento: { select: { nombre: true } },
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
            select: { estado: true },
          },
        },
      },
    },
  });

  if (!alumno) return null;

  const tutor = alumno.tutorAlumnos[0]?.tutor ?? null;

  return {
    generadoEn: fmtDate(new Date()),
    alumno: {
      nombre: alumno.nombre,
      apellido: alumno.apellido,
      dni: alumno.dni,
      celular: alumno.celular,
      fechaNacimiento: alumno.fechaNacimiento ? fmtDate(alumno.fechaNacimiento) : null,
    },
    tutor: tutor
      ? {
          nombre: tutor.nombre,
          apellido: tutor.apellido,
          celular: tutor.celular,
          celularAdicional: tutor.celularAdicional,
          relacion: tutor.relacion,
        }
      : null,
    matriculas: alumno.matriculas.map((m) => {
      const counts: Record<string, number> = {};
      for (const a of m.asistencias) {
        counts[a.estado] = (counts[a.estado] ?? 0) + 1;
      }
      return {
        id: m.id,
        curso: m.horario.curso.nombre,
        dias: m.dias.map((d) => d.dia),
        horaInicio: m.horario.horaInicio.toISOString().slice(11, 16),
        horaFin: m.horario.horaFin.toISOString().slice(11, 16),
        docente: `${m.horario.docente.apellido}, ${m.horario.docente.nombre}`,
        aula: m.horario.aula.nombre,
        descuento: m.descuento?.nombre ?? null,
        precioFinal: Number(m.precioFinalMensual),
        estado: m.estado,
        fechaInicio: fmtDate(m.fechaInicio),
        mesesPago: m.mesesPago.map((mp) => ({
          mes: mp.mes,
          anio: mp.anio,
          montoTotal: Number(mp.montoTotal),
          montoPagado: Number(mp.montoPagado),
          saldo: Math.max(0, Number(mp.montoTotal) - Number(mp.montoPagado)),
          estado: mp.estado,
        })),
        asistencias: {
          presente: counts["presente"] ?? 0,
          tarde: counts["tarde"] ?? 0,
          ausente: counts["ausente"] ?? 0,
          justificado: counts["justificado"] ?? 0,
          total: m.asistencias.length,
        },
      };
    }),
  };
}

export async function getReporteIngresosMensual(
  anio: number,
  mes: number
): Promise<ReporteIngresosMensualData> {
  const desde = new Date(anio, mes - 1, 1);
  const hasta = new Date(anio, mes, 0, 23, 59, 59, 999);

  const [abonos, deudas] = await Promise.all([
    prisma.abono.findMany({
      where: { fechaPago: { gte: desde, lte: hasta } },
      include: {
        mesPago: {
          include: {
            matricula: {
              include: {
                alumno: { select: { id: true, nombre: true, apellido: true } },
                horario: { include: { curso: { select: { nombre: true } } } },
              },
            },
          },
        },
      },
      orderBy: { fechaPago: "asc" },
    }),
    prisma.mesPago.findMany({
      where: { anio, mes, estado: { in: ["pendiente", "parcial"] } },
      select: { montoTotal: true, montoPagado: true },
    }),
  ]);

  const efectivo = abonos.filter((a) => a.metodoPago === "efectivo").reduce((s, a) => s + Number(a.monto), 0);
  const transferencia = abonos.filter((a) => a.metodoPago === "transferencia").reduce((s, a) => s + Number(a.monto), 0);
  const yapePlin = abonos.filter((a) => a.metodoPago === "yape" || a.metodoPago === "plin").reduce((s, a) => s + Number(a.monto), 0);
  const deudaMes = deudas.reduce((s, d) => s + Math.max(0, Number(d.montoTotal) - Number(d.montoPagado)), 0);
  const alumnosUnicos = new Set(abonos.map((a) => a.mesPago.matricula.alumno.id)).size;

  return {
    anio,
    mes,
    mesNombre: MESES_ES[mes - 1],
    generadoEn: fmtDate(new Date()),
    abonos: abonos.map((a) => ({
      alumno: `${a.mesPago.matricula.alumno.apellido}, ${a.mesPago.matricula.alumno.nombre}`,
      curso: a.mesPago.matricula.horario.curso.nombre,
      monto: Number(a.monto),
      metodoPago: a.metodoPago,
      fecha: fmtDateShort(new Date(a.fechaPago)),
    })),
    totalEfectivo: efectivo,
    totalTransferencia: transferencia,
    totalYapePlin: yapePlin,
    totalGeneral: efectivo + transferencia + yapePlin,
    deudaMes,
    alumnosUnicos,
  };
}

export async function getReporteIngresosAnual(
  anio: number
): Promise<ReporteIngresosAnualData> {
  const desde = new Date(anio, 0, 1);
  const hasta = new Date(anio, 11, 31, 23, 59, 59, 999);

  const [abonos, deudas] = await Promise.all([
    prisma.abono.findMany({
      where: { fechaPago: { gte: desde, lte: hasta } },
      select: { monto: true, metodoPago: true, fechaPago: true },
    }),
    prisma.mesPago.findMany({
      where: { anio, estado: { in: ["pendiente", "parcial"] } },
      select: { mes: true, montoTotal: true, montoPagado: true },
    }),
  ]);

  const byMes: Record<number, { cobrado: number; efectivo: number; transferencia: number; count: number }> = {};
  for (let i = 1; i <= 12; i++) byMes[i] = { cobrado: 0, efectivo: 0, transferencia: 0, count: 0 };

  for (const a of abonos) {
    const m = new Date(a.fechaPago).getMonth() + 1;
    byMes[m].cobrado += Number(a.monto);
    byMes[m].count++;
    if (a.metodoPago === "efectivo") byMes[m].efectivo += Number(a.monto);
    else byMes[m].transferencia += Number(a.monto); // transferencia, yape, plin agrupados como "digital"
  }

  const deudaPorMes: Record<number, number> = {};
  for (const d of deudas) {
    deudaPorMes[d.mes] = (deudaPorMes[d.mes] ?? 0) + Math.max(0, Number(d.montoTotal) - Number(d.montoPagado));
  }

  const meses = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    return {
      mes: m,
      mesNombre: MESES_ES[i],
      totalCobrado: byMes[m].cobrado,
      totalEfectivo: byMes[m].efectivo,
      totalTransferencia: byMes[m].transferencia,
      pendiente: deudaPorMes[m] ?? 0,
      cantidadAbonos: byMes[m].count,
    };
  });

  return {
    anio,
    generadoEn: fmtDate(new Date()),
    meses,
    totalAnual: meses.reduce((s, m) => s + m.totalCobrado, 0),
    totalPendiente: meses.reduce((s, m) => s + m.pendiente, 0),
  };
}

export async function getReporteCursosData(): Promise<ReporteCursosData> {
  const DIA_ORDER = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];

  const cursos = await prisma.curso.findMany({
    orderBy: [{ activo: "desc" }, { nombre: "asc" }],
    include: {
      horarios: {
        where: { activo: true },
        include: {
          dias: true,
          docente: true,
          aula: true,
          matriculas: {
            where: { estado: "activa" },
            include: {
              alumno: { select: { nombre: true, apellido: true, dni: true } },
            },
            orderBy: [{ alumno: { apellido: "asc" } }, { alumno: { nombre: "asc" } }],
          },
        },
        orderBy: { horaInicio: "asc" },
      },
    },
  });

  const totalAlumnos = cursos.reduce(
    (s, c) => s + c.horarios.reduce((ss, h) => ss + h.matriculas.length, 0),
    0
  );

  return {
    generadoEn: fmtDate(new Date()),
    totalCursos: cursos.length,
    totalAlumnosActivos: totalAlumnos,
    cursos: cursos.map((c) => ({
      nombre: c.nombre,
      precioMensual: Number(c.precioMensual),
      activo: c.activo,
      horarios: c.horarios.map((h) => ({
        id: h.id,
        dias: [...h.dias.map((d) => d.dia)].sort(
          (a, b) => DIA_ORDER.indexOf(a) - DIA_ORDER.indexOf(b)
        ),
        horaInicio: h.horaInicio.toISOString().slice(11, 16),
        horaFin: h.horaFin.toISOString().slice(11, 16),
        docente: `${h.docente.apellido}, ${h.docente.nombre}`,
        aula: h.aula.nombre,
        capacidad: h.aula.capacidad,
        alumnosActivos: h.matriculas.length,
        alumnos: h.matriculas.map((m) => ({
          nombre: m.alumno.nombre,
          apellido: m.alumno.apellido,
          dni: m.alumno.dni,
        })),
      })),
    })),
  };
}
