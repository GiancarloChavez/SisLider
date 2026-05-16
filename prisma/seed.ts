import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─── Helpers ────────────────────────────────────────────────────────────────

function date(y: number, m: number, d: number) {
  return new Date(y, m - 1, d);
}

function time(h: number, min: number) {
  const t = new Date(1970, 0, 1, h, min, 0);
  return t;
}

// ISO date string → Date (midnight local)
function isoDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Day-of-week index (0=Sun) → Spanish name used in the app
const DOW: Record<number, string> = {
  0: "Domingo",
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
};

function dowName(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return DOW[new Date(y, m - 1, d).getDay()];
}

/** Returns the past N weeks of dates (mon–sat, excluding sun), relative to today */
function pastSchoolDates(weeksBack: number): string[] {
  // today = 2026-05-16 (Saturday)
  const today = new Date(2026, 4, 16); // month is 0-indexed
  const dates: string[] = [];
  for (let w = weeksBack; w >= 0; w--) {
    for (let offset = 0; offset <= 5; offset++) {
      // Mon of the week that is `w` weeks ago
      const dayOfWeek = today.getDay(); // 6 = Sat
      const startOfThisWeek = new Date(today);
      startOfThisWeek.setDate(today.getDate() - dayOfWeek + 1); // Monday
      const d = new Date(startOfThisWeek);
      d.setDate(startOfThisWeek.getDate() - w * 7 + offset);
      if (d > today) continue; // no future dates
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      dates.push(iso);
    }
  }
  return dates;
}

// ─── IDs (fixed, so seed is re-runnable) ────────────────────────────────────

const IDS = {
  // Usuarios
  u1: "usr-secretaria-01",
  u2: "usr-admin-02",

  // Docentes
  d1: "doc-valentina-rios",
  d2: "doc-diego-paredes",
  d3: "doc-roberto-huanca",
  d4: "doc-andrea-lazo",
  d5: "doc-patricia-torres",
  d6: "doc-felipe-mendoza",
  d7: "doc-sergio-castro",

  // Aulas
  a1: "aula-salon-principal",
  a2: "aula-estudio-foto",
  a3: "aula-sala-ajedrez",
  a4: "aula-sala-multifuncional",
  a5: "aula-taller-arte",
  a6: "aula-sala-musica",
  a7: "aula-sala-eventos",
  a8: "aula-lab-multimedia",

  // Cursos
  c1: "cur-modelaje",
  c2: "cur-fotografia",
  c3: "cur-ajedrez",
  c4: "cur-oratoria",
  c5: "cur-pintura",
  c6: "cur-violin",
  c7: "cur-edicion-video",

  // Horarios
  h1: "hor-modelaje-sabatino",
  h2: "hor-modelaje-nocturno",
  h3: "hor-fotografia-sabatino",
  h4: "hor-fotografia-nocturno",
  h5: "hor-ajedrez-iniciacion",
  h6: "hor-ajedrez-competitivo",
  h7: "hor-oratoria-intensivo",
  h8: "hor-oratoria-nocturno",
  h9: "hor-pintura-acuarela",
  h10: "hor-pintura-oleo",
  h11: "hor-violin-principiantes",
  h12: "hor-violin-intermedio",
  h13: "hor-edicion-basico",
  h14: "hor-edicion-pro",

  // Grupos descuento
  gd1: "gdesc-beneficios-fam",
  gd2: "gdesc-becas",

  // Descuentos
  desc1: "desc-hermanos",
  desc2: "desc-pronto-pago",
  desc3: "desc-beca-excelencia",
  desc4: "desc-beca-socioeconomica",

  // Tutores
  t1: "tut-carmen-garcia",
  t2: "tut-roberto-torres",
  t3: "tut-patricia-vega",
  t4: "tut-juan-flores",
  t5: "tut-rosa-mendoza",
  t6: "tut-carlos-salas",
  t7: "tut-lucia-castro",
  t8: "tut-omar-condori",
  t9: "tut-elena-apaza",
  t10: "tut-mario-ccari",
  t11: "tut-ana-quispe",
  t12: "tut-pedro-mamani",
  t13: "tut-gloria-tapia",

  // Alumnos (20)
  al1:  "alm-sofia-ramos",
  al2:  "alm-valentina-ramos",
  al3:  "alm-mateo-torres",
  al4:  "alm-diego-torres",
  al5:  "alm-camila-vega",
  al6:  "alm-luciana-vega",
  al7:  "alm-sebastian-flores",
  al8:  "alm-gabriela-mendoza",
  al9:  "alm-andre-salas",
  al10: "alm-valeria-castro",
  al11: "alm-rodrigo-condori",
  al12: "alm-isabella-apaza",
  al13: "alm-fernando-ccari",
  al14: "alm-daniela-quispe",
  al15: "alm-alejandro-mamani",
  al16: "alm-paula-tapia",
  al17: "alm-nicolas-vargas",
  al18: "alm-ariana-caceres",
  al19: "alm-tomas-linares",
  al20: "alm-renata-soto",

  // Matrículas (1 por alumno)
  m1:  "mat-sofia",
  m2:  "mat-valentina",
  m3:  "mat-mateo",
  m4:  "mat-diego",
  m5:  "mat-camila",
  m6:  "mat-luciana",
  m7:  "mat-sebastian",
  m8:  "mat-gabriela",
  m9:  "mat-andre",
  m10: "mat-valeria",
  m11: "mat-rodrigo",
  m12: "mat-isabella",
  m13: "mat-fernando",
  m14: "mat-daniela",
  m15: "mat-alejandro",
  m16: "mat-paula",
  m17: "mat-nicolas",
  m18: "mat-ariana",
  m19: "mat-tomas",
  m20: "mat-renata",
};

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🗑️  Eliminando data existente...");
  await limpiarDB();

  console.log("👤  Creando usuarios...");
  await crearUsuarios();

  console.log("🏫  Creando docentes, aulas y cursos...");
  await crearInfraestructura();

  console.log("📅  Creando horarios...");
  await crearHorarios();

  console.log("🏷️  Creando descuentos...");
  await crearDescuentos();

  console.log("👨‍👩‍👧  Creando tutores y alumnos...");
  await crearTutoresYAlumnos();

  console.log("📋  Creando matrículas...");
  await crearMatriculas();

  console.log("💳  Creando meses de pago y abonos...");
  await crearMesPagoYAbonos();

  console.log("✅  Creando asistencias y recuperaciones...");
  await crearAsistencias();

  console.log("🔄  Actualizando estado habilitado de alumnos...");
  await actualizarHabilitado();

  console.log("\n✅  Seed completado exitosamente.");
  await printResumen();
  await revalidarCacheVercel();
}

// ─── Limpieza ────────────────────────────────────────────────────────────────

async function limpiarDB() {
  await prisma.recuperacion.deleteMany();
  await prisma.asistencia.deleteMany();
  await prisma.abono.deleteMany();
  await prisma.mesPago.deleteMany();
  await prisma.matriculaDia.deleteMany();
  await prisma.matricula.deleteMany();
  await prisma.tutorAlumno.deleteMany();
  await prisma.alumno.deleteMany();
  await prisma.tutor.deleteMany();
  await prisma.horarioDia.deleteMany();
  await prisma.horario.deleteMany();
  await prisma.descuento.deleteMany();
  await prisma.grupoDescuento.deleteMany();
  await prisma.aula.deleteMany();
  await prisma.curso.deleteMany();
  await prisma.docente.deleteMany();
  await prisma.usuario.deleteMany();
}

// ─── Usuarios ────────────────────────────────────────────────────────────────

async function crearUsuarios() {
  const hash1 = await bcrypt.hash("demo123", 10);
  const hash2 = await bcrypt.hash("admin123", 10);

  await prisma.usuario.createMany({
    data: [
      { id: IDS.u1, nombre: "María Flores", email: "secretaria@sislider.pe", passwordHash: hash1 },
      { id: IDS.u2, nombre: "Carlos Ríos",  email: "admin@sislider.pe",      passwordHash: hash2 },
    ],
  });
}

// ─── Infraestructura base ────────────────────────────────────────────────────

async function crearInfraestructura() {
  await prisma.docente.createMany({
    data: [
      { id: IDS.d1, nombre: "Valentina", apellido: "Ríos Sandoval",    celular: "987123001", especialidad: "Modelaje y Pasarela", activo: true },
      { id: IDS.d2, nombre: "Diego",     apellido: "Paredes Luna",     celular: "987123002", especialidad: "Fotografía Digital",  activo: true },
      { id: IDS.d3, nombre: "Roberto",   apellido: "Huanca Quispe",    celular: "987123003", especialidad: "Ajedrez Competitivo", activo: true },
      { id: IDS.d4, nombre: "Andrea",    apellido: "Lazo Mendoza",     celular: "987123004", especialidad: "Oratoria y Debate",   activo: true },
      { id: IDS.d5, nombre: "Patricia",  apellido: "Torres Mamani",    celular: "987123005", especialidad: "Pintura y Bellas Artes", activo: true },
      { id: IDS.d6, nombre: "Felipe",    apellido: "Mendoza Arce",     celular: "987123006", especialidad: "Violín y Música Clásica", activo: true },
      { id: IDS.d7, nombre: "Sergio",    apellido: "Castro Villanueva",celular: "987123007", especialidad: "Edición de Video y Motion", activo: true },
    ],
  });

  await prisma.aula.createMany({
    data: [
      { id: IDS.a1, nombre: "Salón Principal",      capacidad: 30, activa: true },
      { id: IDS.a2, nombre: "Estudio Fotográfico",  capacidad: 15, activa: true },
      { id: IDS.a3, nombre: "Sala de Ajedrez",       capacidad: 20, activa: true },
      { id: IDS.a4, nombre: "Sala Multifuncional",   capacidad: 25, activa: true },
      { id: IDS.a5, nombre: "Taller de Arte",        capacidad: 18, activa: true },
      { id: IDS.a6, nombre: "Sala de Música",        capacidad: 12, activa: true },
      { id: IDS.a7, nombre: "Sala de Eventos",       capacidad: 35, activa: true },
      { id: IDS.a8, nombre: "Lab Multimedia",        capacidad: 16, activa: true },
    ],
  });

  await prisma.curso.createMany({
    data: [
      { id: IDS.c1, nombre: "Modelaje",        nivel: "Básico–Avanzado", precioMensual: 250, activo: true },
      { id: IDS.c2, nombre: "Fotografía",      nivel: "Básico–Avanzado", precioMensual: 230, activo: true },
      { id: IDS.c3, nombre: "Ajedrez",         nivel: "Iniciación–Competitivo", precioMensual: 150, activo: true },
      { id: IDS.c4, nombre: "Oratoria",        nivel: "Básico–Intensivo", precioMensual: 180, activo: true },
      { id: IDS.c5, nombre: "Pintura",         nivel: "Básico–Avanzado", precioMensual: 200, activo: true },
      { id: IDS.c6, nombre: "Violín",          nivel: "Principiantes–Intermedio", precioMensual: 280, activo: true },
      { id: IDS.c7, nombre: "Edición de Video",nivel: "Básico–Profesional", precioMensual: 260, activo: true },
    ],
  });
}

// ─── Horarios ────────────────────────────────────────────────────────────────

async function crearHorarios() {
  const horarios = [
    // Modelaje
    { id: IDS.h1,  idCurso: IDS.c1, idDocente: IDS.d1, idAula: IDS.a7, horaInicio: time(9,0),  horaFin: time(12,0), cupoMaximo: 20, dias: ["Sábado"] },
    { id: IDS.h2,  idCurso: IDS.c1, idDocente: IDS.d1, idAula: IDS.a7, horaInicio: time(19,0), horaFin: time(21,0), cupoMaximo: 18, dias: ["Miércoles", "Viernes"] },
    // Fotografía
    { id: IDS.h3,  idCurso: IDS.c2, idDocente: IDS.d2, idAula: IDS.a2, horaInicio: time(10,0), horaFin: time(13,0), cupoMaximo: 12, dias: ["Sábado"] },
    { id: IDS.h4,  idCurso: IDS.c2, idDocente: IDS.d2, idAula: IDS.a2, horaInicio: time(19,30), horaFin: time(21,30), cupoMaximo: 12, dias: ["Martes", "Jueves"] },
    // Ajedrez
    { id: IDS.h5,  idCurso: IDS.c3, idDocente: IDS.d3, idAula: IDS.a3, horaInicio: time(16,0), horaFin: time(17,30), cupoMaximo: 20, dias: ["Lunes", "Miércoles"] },
    { id: IDS.h6,  idCurso: IDS.c3, idDocente: IDS.d3, idAula: IDS.a3, horaInicio: time(8,0),  horaFin: time(10,0), cupoMaximo: 16, dias: ["Sábado"] },
    // Oratoria
    { id: IDS.h7,  idCurso: IDS.c4, idDocente: IDS.d4, idAula: IDS.a4, horaInicio: time(9,0),  horaFin: time(10,30), cupoMaximo: 25, dias: ["Martes", "Jueves", "Sábado"] },
    { id: IDS.h8,  idCurso: IDS.c4, idDocente: IDS.d4, idAula: IDS.a4, horaInicio: time(20,0), horaFin: time(21,30), cupoMaximo: 25, dias: ["Lunes", "Miércoles", "Viernes"] },
    // Pintura
    { id: IDS.h9,  idCurso: IDS.c5, idDocente: IDS.d5, idAula: IDS.a5, horaInicio: time(14,0), horaFin: time(17,0), cupoMaximo: 18, dias: ["Sábado"] },
    { id: IDS.h10, idCurso: IDS.c5, idDocente: IDS.d5, idAula: IDS.a5, horaInicio: time(17,0), horaFin: time(19,0), cupoMaximo: 18, dias: ["Martes", "Jueves"] },
    // Violín
    { id: IDS.h11, idCurso: IDS.c6, idDocente: IDS.d6, idAula: IDS.a6, horaInicio: time(8,0),  horaFin: time(9,0),  cupoMaximo: 10, dias: ["Lunes", "Miércoles", "Viernes"] },
    { id: IDS.h12, idCurso: IDS.c6, idDocente: IDS.d6, idAula: IDS.a6, horaInicio: time(18,0), horaFin: time(20,0), cupoMaximo: 10, dias: ["Martes", "Jueves"] },
    // Edición de Video
    { id: IDS.h13, idCurso: IDS.c7, idDocente: IDS.d7, idAula: IDS.a8, horaInicio: time(15,0), horaFin: time(18,0), cupoMaximo: 16, dias: ["Sábado"] },
    { id: IDS.h14, idCurso: IDS.c7, idDocente: IDS.d7, idAula: IDS.a8, horaInicio: time(19,0), horaFin: time(22,0), cupoMaximo: 16, dias: ["Lunes", "Viernes"] },
  ];

  for (const h of horarios) {
    const { dias, ...horarioData } = h;
    await prisma.horario.create({
      data: {
        ...horarioData,
        activo: true,
        dias: {
          create: dias.map((dia) => ({ dia })),
        },
      },
    });
  }
}

// ─── Descuentos ──────────────────────────────────────────────────────────────

async function crearDescuentos() {
  await prisma.grupoDescuento.createMany({
    data: [
      { id: IDS.gd1, nombre: "Beneficios Familiares", descripcion: "Descuentos para familias con más de un alumno matriculado", activo: true },
      { id: IDS.gd2, nombre: "Becas",                  descripcion: "Becas por mérito académico y situación socioeconómica",      activo: true },
    ],
  });

  await prisma.descuento.createMany({
    data: [
      { id: IDS.desc1, idGrupo: IDS.gd1, nombre: "Descuento Hermanos",       tipo: "porcentaje", valor: 10, automatico: true,  activo: true },
      { id: IDS.desc2, idGrupo: IDS.gd1, nombre: "Pronto Pago",              tipo: "monto",      valor: 15, automatico: true,  activo: true },
      { id: IDS.desc3, idGrupo: IDS.gd2, nombre: "Beca Excelencia",          tipo: "porcentaje", valor: 20, automatico: false, activo: true },
      { id: IDS.desc4, idGrupo: IDS.gd2, nombre: "Beca Socioeconómica",      tipo: "porcentaje", valor: 15, automatico: false, activo: true },
    ],
  });
}

// ─── Tutores y Alumnos ───────────────────────────────────────────────────────

async function crearTutoresYAlumnos() {
  await prisma.tutor.createMany({
    data: [
      // Tutores de hermanos (compartidos)
      { id: IDS.t1,  nombre: "Carmen",   apellido: "García Ruiz",    celular: "951001001", relacion: "Madre" },
      { id: IDS.t2,  nombre: "Roberto",  apellido: "Torres Vega",    celular: "951001002", relacion: "Padre" },
      { id: IDS.t3,  nombre: "Patricia", apellido: "Vega León",      celular: "951001003", relacion: "Madre" },
      // Tutores individuales
      { id: IDS.t4,  nombre: "Juan",     apellido: "Flores Silva",   celular: "951001004", relacion: "Padre" },
      { id: IDS.t5,  nombre: "Rosa",     apellido: "Mendoza Arce",   celular: "951001005", relacion: "Madre" },
      { id: IDS.t6,  nombre: "Carlos",   apellido: "Salas Quispe",   celular: "951001006", relacion: "Padre" },
      { id: IDS.t7,  nombre: "Lucía",    apellido: "Castro Mamani",  celular: "951001007", relacion: "Madre" },
      { id: IDS.t8,  nombre: "Omar",     apellido: "Condori Apaza",  celular: "951001008", relacion: "Padre" },
      { id: IDS.t9,  nombre: "Elena",    apellido: "Apaza Torres",   celular: "951001009", relacion: "Madre" },
      { id: IDS.t10, nombre: "Mario",    apellido: "Ccari Huanca",   celular: "951001010", relacion: "Padre" },
      { id: IDS.t11, nombre: "Ana",      apellido: "Quispe Vargas",  celular: "951001011", relacion: "Madre" },
      { id: IDS.t12, nombre: "Pedro",    apellido: "Mamani Flores",  celular: "951001012", relacion: "Padre" },
      { id: IDS.t13, nombre: "Gloria",   apellido: "Tapia Cruz",     celular: "951001013", relacion: "Madre" },
    ],
  });

  await prisma.alumno.createMany({
    data: [
      // Par hermanos 1 (tutor: Carmen García)
      { id: IDS.al1,  nombre: "Sofía",      apellido: "Ramos García",    dni: "75100001", celular: "987200001", fechaNacimiento: date(2010,3,14), habilitado: false },
      { id: IDS.al2,  nombre: "Valentina",  apellido: "Ramos García",    dni: "75100002", celular: "987200002", fechaNacimiento: date(2012,7,22), habilitado: false },
      // Par hermanos 2 (tutor: Roberto Torres)
      { id: IDS.al3,  nombre: "Mateo",      apellido: "Torres Díaz",     dni: "75100003", celular: "987200003", fechaNacimiento: date(2008,11,5), habilitado: false },
      { id: IDS.al4,  nombre: "Diego",      apellido: "Torres Díaz",     dni: "75100004", celular: "987200004", fechaNacimiento: date(2011,2,18), habilitado: false },
      // Par hermanos 3 (tutor: Patricia Vega)
      { id: IDS.al5,  nombre: "Camila",     apellido: "Vega Paredes",    dni: "75100005", celular: "987200005", fechaNacimiento: date(2009,6,30), habilitado: false },
      { id: IDS.al6,  nombre: "Luciana",    apellido: "Vega Paredes",    dni: "75100006", celular: "987200006", fechaNacimiento: date(2013,9,11), habilitado: false },
      // Alumnos individuales
      { id: IDS.al7,  nombre: "Sebastián",  apellido: "Flores Quispe",   dni: "75100007", celular: "987200007", fechaNacimiento: date(2007,4,25), habilitado: false },
      { id: IDS.al8,  nombre: "Gabriela",   apellido: "Mendoza Mamani",  dni: "75100008", celular: "987200008", fechaNacimiento: date(2009,8,3),  habilitado: false },
      { id: IDS.al9,  nombre: "André",      apellido: "Salas Huanca",    dni: "75100009", celular: "987200009", fechaNacimiento: date(2006,1,17), habilitado: false },
      { id: IDS.al10, nombre: "Valeria",    apellido: "Castro Luna",     dni: "75100010", celular: "987200010", fechaNacimiento: date(2010,12,8), habilitado: false },
      { id: IDS.al11, nombre: "Rodrigo",    apellido: "Condori Tito",    dni: "75100011", celular: "987200011", fechaNacimiento: date(2011,5,20), habilitado: false },
      { id: IDS.al12, nombre: "Isabella",   apellido: "Apaza Ccoa",      dni: "75100012", celular: "987200012", fechaNacimiento: date(2008,10,2), habilitado: false },
      { id: IDS.al13, nombre: "Fernando",   apellido: "Ccari Pilco",     dni: "75100013", celular: "987200013", fechaNacimiento: date(2007,3,15), habilitado: false },
      { id: IDS.al14, nombre: "Daniela",    apellido: "Quispe Lazo",     dni: "75100014", celular: "987200014", fechaNacimiento: date(2012,6,9),  habilitado: false },
      { id: IDS.al15, nombre: "Alejandro",  apellido: "Mamani Cruz",     dni: "75100015", celular: "987200015", fechaNacimiento: date(2009,2,27), habilitado: false },
      { id: IDS.al16, nombre: "Paula",      apellido: "Tapia Herrera",   dni: "75100016", celular: "987200016", fechaNacimiento: date(2010,7,13), habilitado: false },
      { id: IDS.al17, nombre: "Nicolás",    apellido: "Vargas Puma",     dni: "75100017", celular: "987200017", fechaNacimiento: date(2011,11,1), habilitado: false },
      { id: IDS.al18, nombre: "Ariana",     apellido: "Cáceres Inca",    dni: "75100018", celular: "987200018", fechaNacimiento: date(2008,4,7),  habilitado: false },
      { id: IDS.al19, nombre: "Tomás",      apellido: "Linares Bejar",   dni: "75100019", celular: "987200019", fechaNacimiento: date(2007,9,22), habilitado: false },
      { id: IDS.al20, nombre: "Renata",     apellido: "Soto Ccoa",       dni: "75100020", celular: "987200020", fechaNacimiento: date(2013,1,30), habilitado: false },
    ],
  });

  // TutorAlumno
  await prisma.tutorAlumno.createMany({
    data: [
      { idTutor: IDS.t1,  idAlumno: IDS.al1,  esPrincipal: true },
      { idTutor: IDS.t1,  idAlumno: IDS.al2,  esPrincipal: true },
      { idTutor: IDS.t2,  idAlumno: IDS.al3,  esPrincipal: true },
      { idTutor: IDS.t2,  idAlumno: IDS.al4,  esPrincipal: true },
      { idTutor: IDS.t3,  idAlumno: IDS.al5,  esPrincipal: true },
      { idTutor: IDS.t3,  idAlumno: IDS.al6,  esPrincipal: true },
      { idTutor: IDS.t4,  idAlumno: IDS.al7,  esPrincipal: true },
      { idTutor: IDS.t5,  idAlumno: IDS.al8,  esPrincipal: true },
      { idTutor: IDS.t6,  idAlumno: IDS.al9,  esPrincipal: true },
      { idTutor: IDS.t7,  idAlumno: IDS.al10, esPrincipal: true },
      { idTutor: IDS.t8,  idAlumno: IDS.al11, esPrincipal: true },
      { idTutor: IDS.t9,  idAlumno: IDS.al12, esPrincipal: true },
      { idTutor: IDS.t10, idAlumno: IDS.al13, esPrincipal: true },
      { idTutor: IDS.t11, idAlumno: IDS.al14, esPrincipal: true },
      { idTutor: IDS.t12, idAlumno: IDS.al15, esPrincipal: true },
      { idTutor: IDS.t13, idAlumno: IDS.al16, esPrincipal: true },
    ],
  });
}

// ─── Matrículas ──────────────────────────────────────────────────────────────

async function crearMatriculas() {
  //  alumnoId, horarioId, descuentoId, precioFinal, dias, fechaInicio
  const matriculas: Array<{
    id: string; idAlumno: string; idHorario: string;
    idDescuento?: string; precioFinal: number;
    dias: string[]; fechaInicio: Date;
  }> = [
    // Hermanos 1 → Modelaje Sabatino (10% desc hermanos)
    { id: IDS.m1,  idAlumno: IDS.al1,  idHorario: IDS.h1,  idDescuento: IDS.desc1, precioFinal: 225, dias: ["Sábado"],                         fechaInicio: date(2026,1,6)  },
    { id: IDS.m2,  idAlumno: IDS.al2,  idHorario: IDS.h1,  idDescuento: IDS.desc1, precioFinal: 225, dias: ["Sábado"],                         fechaInicio: date(2026,1,6)  },
    // Hermanos 2: Mateo con Beca Excelencia, Diego sin descuento
    { id: IDS.m3,  idAlumno: IDS.al3,  idHorario: IDS.h6,  idDescuento: IDS.desc3, precioFinal: 120, dias: ["Sábado"],                         fechaInicio: date(2026,1,6)  },
    { id: IDS.m4,  idAlumno: IDS.al4,  idHorario: IDS.h5,  idDescuento: undefined, precioFinal: 150, dias: ["Lunes", "Miércoles"],             fechaInicio: date(2026,1,6)  },
    // Hermanas 3 → Pintura (10% desc hermanos) en horarios distintos
    { id: IDS.m5,  idAlumno: IDS.al5,  idHorario: IDS.h9,  idDescuento: IDS.desc1, precioFinal: 180, dias: ["Sábado"],                         fechaInicio: date(2026,1,13) },
    { id: IDS.m6,  idAlumno: IDS.al6,  idHorario: IDS.h10, idDescuento: IDS.desc1, precioFinal: 180, dias: ["Martes", "Jueves"],               fechaInicio: date(2026,1,13) },
    // Individuales
    { id: IDS.m7,  idAlumno: IDS.al7,  idHorario: IDS.h4,  idDescuento: undefined, precioFinal: 230, dias: ["Martes", "Jueves"],               fechaInicio: date(2026,1,6)  },
    { id: IDS.m8,  idAlumno: IDS.al8,  idHorario: IDS.h8,  idDescuento: undefined, precioFinal: 180, dias: ["Lunes", "Miércoles", "Viernes"],  fechaInicio: date(2026,1,6)  },
    { id: IDS.m9,  idAlumno: IDS.al9,  idHorario: IDS.h14, idDescuento: undefined, precioFinal: 260, dias: ["Lunes", "Viernes"],               fechaInicio: date(2026,1,6)  },
    { id: IDS.m10, idAlumno: IDS.al10, idHorario: IDS.h11, idDescuento: undefined, precioFinal: 280, dias: ["Lunes", "Miércoles", "Viernes"],  fechaInicio: date(2026,1,6)  },
    { id: IDS.m11, idAlumno: IDS.al11, idHorario: IDS.h5,  idDescuento: undefined, precioFinal: 150, dias: ["Lunes", "Miércoles"],             fechaInicio: date(2026,2,3)  },
    { id: IDS.m12, idAlumno: IDS.al12, idHorario: IDS.h9,  idDescuento: IDS.desc4, precioFinal: 170, dias: ["Sábado"],                         fechaInicio: date(2026,2,3)  },
    { id: IDS.m13, idAlumno: IDS.al13, idHorario: IDS.h13, idDescuento: undefined, precioFinal: 260, dias: ["Sábado"],                         fechaInicio: date(2026,2,3)  },
    { id: IDS.m14, idAlumno: IDS.al14, idHorario: IDS.h2,  idDescuento: undefined, precioFinal: 250, dias: ["Miércoles", "Viernes"],           fechaInicio: date(2026,2,3)  },
    { id: IDS.m15, idAlumno: IDS.al15, idHorario: IDS.h3,  idDescuento: undefined, precioFinal: 230, dias: ["Sábado"],                         fechaInicio: date(2026,2,3)  },
    { id: IDS.m16, idAlumno: IDS.al16, idHorario: IDS.h7,  idDescuento: undefined, precioFinal: 180, dias: ["Martes", "Jueves", "Sábado"],     fechaInicio: date(2026,3,3)  },
    { id: IDS.m17, idAlumno: IDS.al17, idHorario: IDS.h12, idDescuento: undefined, precioFinal: 280, dias: ["Martes", "Jueves"],               fechaInicio: date(2026,3,3)  },
    { id: IDS.m18, idAlumno: IDS.al18, idHorario: IDS.h4,  idDescuento: undefined, precioFinal: 230, dias: ["Martes", "Jueves"],               fechaInicio: date(2026,3,3)  },
    { id: IDS.m19, idAlumno: IDS.al19, idHorario: IDS.h8,  idDescuento: undefined, precioFinal: 180, dias: ["Lunes", "Miércoles", "Viernes"],  fechaInicio: date(2026,3,3)  },
    { id: IDS.m20, idAlumno: IDS.al20, idHorario: IDS.h11, idDescuento: undefined, precioFinal: 280, dias: ["Lunes", "Miércoles", "Viernes"],  fechaInicio: date(2026,3,3)  },
  ];

  for (const m of matriculas) {
    const { dias, fechaInicio, precioFinal, idDescuento, ...rest } = m;
    await prisma.matricula.create({
      data: {
        ...rest,
        idDescuento: idDescuento ?? null,
        precioFinalMensual: precioFinal,
        fechaInicio,
        estado: "activa",
        dias: { create: dias.map((dia) => ({ dia })) },
      },
    });
  }
}

// ─── Meses de Pago y Abonos ──────────────────────────────────────────────────

async function crearMesPagoYAbonos() {
  // Grupos de pago según comportamiento
  // GRUPO A (1-10): pagan bien → ene✓ feb✓ mar✓ abr✓ may✓/parcial
  // GRUPO B (11-15): algo retrasados → ene✓ feb✓ mar=parcial abr=parcial may=pendiente
  // GRUPO C (16-20): morosos → ene✓ feb✓ mar✓ abr=pendiente may=pendiente → habilitado=false

  const matriculaIds = [
    IDS.m1,  IDS.m2,  IDS.m3,  IDS.m4,  IDS.m5,
    IDS.m6,  IDS.m7,  IDS.m8,  IDS.m9,  IDS.m10,
    IDS.m11, IDS.m12, IDS.m13, IDS.m14, IDS.m15,
    IDS.m16, IDS.m17, IDS.m18, IDS.m19, IDS.m20,
  ];

  const precios: Record<string, number> = {
    [IDS.m1]:  225, [IDS.m2]:  225, [IDS.m3]:  120, [IDS.m4]:  150,
    [IDS.m5]:  180, [IDS.m6]:  180, [IDS.m7]:  230, [IDS.m8]:  180,
    [IDS.m9]:  260, [IDS.m10]: 280, [IDS.m11]: 150, [IDS.m12]: 170,
    [IDS.m13]: 260, [IDS.m14]: 250, [IDS.m15]: 230, [IDS.m16]: 180,
    [IDS.m17]: 280, [IDS.m18]: 230, [IDS.m19]: 180, [IDS.m20]: 280,
  };

  // Meses a crear: ene–may 2026
  const meses = [
    { anio: 2026, mes: 1, vencimiento: date(2026,1,10) },
    { anio: 2026, mes: 2, vencimiento: date(2026,2,10) },
    { anio: 2026, mes: 3, vencimiento: date(2026,3,10) },
    { anio: 2026, mes: 4, vencimiento: date(2026,4,10) },
    { anio: 2026, mes: 5, vencimiento: date(2026,5,10) },
  ];

  // Estado por grupo y mes (índice 0=ene, 4=may)
  function estadoPara(idx: number, mes: number): "pagado" | "parcial" | "pendiente" {
    const i = idx; // 0-based alumno index
    if (i < 5) {
      // Grupo A excelente: ene-abr pagado, may: 0-3=pagado, 4=parcial
      if (mes <= 4) return "pagado";
      return i < 4 ? "pagado" : "parcial";
    }
    if (i < 10) {
      // Grupo A bueno: ene-abr pagado, may=parcial
      if (mes <= 4) return "pagado";
      return "parcial";
    }
    if (i < 15) {
      // Grupo B retrasado
      if (mes <= 2) return "pagado";
      if (mes === 3) return i < 12 ? "pagado" : "parcial";
      if (mes === 4) return "parcial";
      return "pendiente"; // may
    }
    // Grupo C moroso (16-20)
    if (mes <= 3) return "pagado";
    return "pendiente";
  }

  for (const matId of matriculaIds) {
    const idx = matriculaIds.indexOf(matId);
    const precio = precios[matId];

    for (let mi = 0; mi < meses.length; mi++) {
      const { anio, mes, vencimiento } = meses[mi];
      const estado = estadoPara(idx, mi + 1);

      // Solo crear el mes si ya comenzó la matrícula
      // m1-m15 empezaron en ene/feb 2026, m16-m20 en mar 2026
      const inicioMat = idx < 10 ? 1 : idx < 15 ? 2 : 3;
      if (mes < inicioMat) continue;

      const montoPagado =
        estado === "pagado"   ? precio :
        estado === "parcial"  ? Math.round(precio * 0.6) :
        0;

      const mpId = `mp-${matId}-${anio}-${mes}`;

      const mp = await prisma.mesPago.create({
        data: {
          id: mpId,
          idMatricula: matId,
          anio,
          mes,
          montoTotal: precio,
          montoPagado,
          estado,
          fechaVencimiento: vencimiento,
        },
      });

      // Crear abono si hay monto pagado
      if (montoPagado > 0) {
        const fechaAbono = new Date(anio, mes - 1, estado === "pagado" ? 5 : 12);
        await prisma.abono.create({
          data: {
            id: `ab-${matId}-${anio}-${mes}`,
            idMesPago: mp.id,
            idUsuario: IDS.u1,
            monto: montoPagado,
            metodoPago: idx % 3 === 0 ? "transferencia" : idx % 3 === 1 ? "yape" : "efectivo",
            fechaPago: fechaAbono,
          },
        });
      }
    }
  }
}

// ─── Asistencias y Recuperaciones ────────────────────────────────────────────

async function crearAsistencias() {
  // Fechas de las últimas 3 semanas (lun-sáb, excluyendo domingo)
  const fechas = pastSchoolDates(2);

  // Cargar todas las matrículas con sus días
  const matriculas = await prisma.matricula.findMany({
    include: { dias: true },
  });

  let idCounter = 1;
  const ausencias: string[] = []; // ids de asistencias ausentes para recuperaciones

  for (const fecha of fechas) {
    const diaNombre = dowName(fecha);
    if (diaNombre === "Domingo") continue;

    for (const mat of matriculas) {
      const diasMat = mat.dias.map((d) => d.dia);
      if (!diasMat.includes(diaNombre)) continue;

      // Probabilidad: 80% presente, 12% ausente, 5% tarde, 3% justificado
      const r = (idCounter * 7 + fechas.indexOf(fecha) * 13) % 100;
      const estado =
        r < 80 ? "presente" :
        r < 92 ? "ausente"  :
        r < 97 ? "tarde"    :
        "justificado";

      const asistId = `ast-${idCounter++}`;

      await prisma.asistencia.create({
        data: {
          id: asistId,
          idMatricula: mat.id,
          idUsuario: IDS.u1,
          fecha: isoDate(fecha),
          estado,
        },
      });

      if (estado === "ausente") {
        ausencias.push(asistId);
      }
    }
  }

  // Recuperaciones para las ausencias (algunas programadas, otras pendientes)
  let recCounter = 1;
  for (const asistId of ausencias) {
    const idx = ausencias.indexOf(asistId);
    const esProgramada = idx % 3 !== 0; // 2 de cada 3 tienen fecha programada
    await prisma.recuperacion.create({
      data: {
        id: `rec-${recCounter++}`,
        idAsistencia: asistId,
        idHorarioRecuperacion: esProgramada ? IDS.h4 : null,
        fechaRecuperacion: esProgramada ? date(2026, 5, 23) : null,
        estado: esProgramada ? "programada" : "pendiente",
      },
    });
  }
}

// ─── Actualizar habilitado ────────────────────────────────────────────────────

async function actualizarHabilitado() {
  // Alumnos 1-15: habilitado = true (tienen pagos al día o máximo 1 mes pendiente)
  const alumnosHabilitados = [
    IDS.al1,  IDS.al2,  IDS.al3,  IDS.al4,  IDS.al5,
    IDS.al6,  IDS.al7,  IDS.al8,  IDS.al9,  IDS.al10,
    IDS.al11, IDS.al12, IDS.al13, IDS.al14, IDS.al15,
  ];
  // Alumnos 16-20: habilitado = false (abril Y mayo pendientes)
  const alumnosMorosos = [
    IDS.al16, IDS.al17, IDS.al18, IDS.al19, IDS.al20,
  ];

  await prisma.alumno.updateMany({
    where: { id: { in: alumnosHabilitados } },
    data: { habilitado: true },
  });

  await prisma.alumno.updateMany({
    where: { id: { in: alumnosMorosos } },
    data: { habilitado: false },
  });
}

// ─── Resumen ─────────────────────────────────────────────────────────────────

async function printResumen() {
  const usuarios       = await prisma.usuario.count();
  const docentes       = await prisma.docente.count();
  const aulas          = await prisma.aula.count();
  const cursos         = await prisma.curso.count();
  const horarios       = await prisma.horario.count();
  const tutores        = await prisma.tutor.count();
  const alumnos        = await prisma.alumno.count();
  const matriculas     = await prisma.matricula.count();
  const mesesPago      = await prisma.mesPago.count();
  const abonos         = await prisma.abono.count();
  const asistencias    = await prisma.asistencia.count();
  const recuperaciones = await prisma.recuperacion.count();

  console.log("\n📊  Resumen de registros creados:");
  console.log(`   Usuarios:       ${usuarios}`);
  console.log(`   Docentes:       ${docentes}`);
  console.log(`   Aulas:          ${aulas}`);
  console.log(`   Cursos:         ${cursos}`);
  console.log(`   Horarios:       ${horarios}`);
  console.log(`   Tutores:        ${tutores}`);
  console.log(`   Alumnos:        ${alumnos}`);
  console.log(`   Matrículas:     ${matriculas}`);
  console.log(`   Meses de pago:  ${mesesPago}`);
  console.log(`   Abonos:         ${abonos}`);
  console.log(`   Asistencias:    ${asistencias}`);
  console.log(`   Recuperaciones: ${recuperaciones}`);
  console.log("\n🔑  Credenciales de acceso:");
  console.log("   secretaria@sislider.pe  /  demo123");
  console.log("   admin@sislider.pe       /  admin123");
}

// ─── Run ─────────────────────────────────────────────────────────────────────

async function revalidarCacheVercel() {
  const appUrl = process.env.NEXTAUTH_URL || process.env.APP_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!appUrl || !secret || appUrl.includes("localhost")) return;

  try {
    const res = await fetch(`${appUrl}/api/revalidate`, {
      method: "POST",
      headers: { "x-revalidate-secret": secret },
    });
    if (res.ok) {
      console.log("🔄  Caché de Vercel invalidado correctamente.");
    } else {
      console.warn("⚠️   No se pudo invalidar el caché:", res.status);
    }
  } catch {
    console.warn("⚠️   Error al contactar el endpoint de revalidación.");
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
