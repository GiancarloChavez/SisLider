-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tutores" (
    "id" TEXT NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "apellido" VARCHAR(100) NOT NULL,
    "celular" VARCHAR(20) NOT NULL,
    "celular_adicional" VARCHAR(20),
    "relacion" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tutores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alumnos" (
    "id" TEXT NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "apellido" VARCHAR(100) NOT NULL,
    "dni" VARCHAR(8),
    "fecha_nacimiento" DATE,
    "habilitado" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alumnos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tutor_alumno" (
    "id" TEXT NOT NULL,
    "id_tutor" TEXT NOT NULL,
    "id_alumno" TEXT NOT NULL,
    "es_principal" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tutor_alumno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "docentes" (
    "id" TEXT NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "apellido" VARCHAR(100) NOT NULL,
    "celular" VARCHAR(20),
    "especialidad" VARCHAR(100),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "docentes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aulas" (
    "id" TEXT NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "capacidad" INTEGER NOT NULL DEFAULT 20,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "aulas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cursos" (
    "id" TEXT NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "nivel" VARCHAR(50),
    "precio_mensual" DECIMAL(10,2) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cursos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "horarios" (
    "id" TEXT NOT NULL,
    "id_curso" TEXT NOT NULL,
    "id_docente" TEXT NOT NULL,
    "id_aula" TEXT NOT NULL,
    "hora_inicio" TIME NOT NULL,
    "hora_fin" TIME NOT NULL,
    "cupo_maximo" INTEGER NOT NULL DEFAULT 20,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "horarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "horario_dias" (
    "id" TEXT NOT NULL,
    "id_horario" TEXT NOT NULL,
    "dia" VARCHAR(10) NOT NULL,

    CONSTRAINT "horario_dias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grupo_descuentos" (
    "id" TEXT NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "grupo_descuentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "descuentos" (
    "id" TEXT NOT NULL,
    "id_grupo" TEXT,
    "nombre" VARCHAR(100) NOT NULL,
    "tipo" VARCHAR(20) NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "automatico" BOOLEAN NOT NULL DEFAULT true,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "descuentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matriculas" (
    "id" TEXT NOT NULL,
    "id_alumno" TEXT NOT NULL,
    "id_horario" TEXT NOT NULL,
    "id_descuento" TEXT,
    "precio_final_mensual" DECIMAL(10,2) NOT NULL,
    "fecha_inicio" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_fin" DATE,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'activa',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matriculas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matricula_dias" (
    "id" TEXT NOT NULL,
    "id_matricula" TEXT NOT NULL,
    "dia" VARCHAR(10) NOT NULL,

    CONSTRAINT "matricula_dias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meses_pago" (
    "id" TEXT NOT NULL,
    "id_matricula" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "monto_total" DECIMAL(10,2) NOT NULL,
    "monto_pagado" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    "fecha_vencimiento" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meses_pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abonos" (
    "id" TEXT NOT NULL,
    "id_mes_pago" TEXT NOT NULL,
    "id_usuario" TEXT NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "metodo_pago" VARCHAR(20) NOT NULL DEFAULT 'efectivo',
    "fecha_pago" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "abonos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asistencias" (
    "id" TEXT NOT NULL,
    "id_matricula" TEXT NOT NULL,
    "id_usuario" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'presente',
    "observacion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asistencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recuperaciones" (
    "id" TEXT NOT NULL,
    "id_asistencia" TEXT NOT NULL,
    "id_horario_recuperacion" TEXT,
    "fecha_recuperacion" DATE,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    "observacion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recuperaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "alumnos_dni_key" ON "alumnos"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "tutor_alumno_id_tutor_id_alumno_key" ON "tutor_alumno"("id_tutor", "id_alumno");

-- CreateIndex
CREATE UNIQUE INDEX "matriculas_id_alumno_id_horario_key" ON "matriculas"("id_alumno", "id_horario");

-- CreateIndex
CREATE UNIQUE INDEX "meses_pago_id_matricula_anio_mes_key" ON "meses_pago"("id_matricula", "anio", "mes");

-- CreateIndex
CREATE UNIQUE INDEX "asistencias_id_matricula_fecha_key" ON "asistencias"("id_matricula", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "recuperaciones_id_asistencia_key" ON "recuperaciones"("id_asistencia");

-- AddForeignKey
ALTER TABLE "tutor_alumno" ADD CONSTRAINT "tutor_alumno_id_tutor_fkey" FOREIGN KEY ("id_tutor") REFERENCES "tutores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_alumno" ADD CONSTRAINT "tutor_alumno_id_alumno_fkey" FOREIGN KEY ("id_alumno") REFERENCES "alumnos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horarios" ADD CONSTRAINT "horarios_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "cursos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horarios" ADD CONSTRAINT "horarios_id_docente_fkey" FOREIGN KEY ("id_docente") REFERENCES "docentes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horarios" ADD CONSTRAINT "horarios_id_aula_fkey" FOREIGN KEY ("id_aula") REFERENCES "aulas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horario_dias" ADD CONSTRAINT "horario_dias_id_horario_fkey" FOREIGN KEY ("id_horario") REFERENCES "horarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "descuentos" ADD CONSTRAINT "descuentos_id_grupo_fkey" FOREIGN KEY ("id_grupo") REFERENCES "grupo_descuentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matriculas" ADD CONSTRAINT "matriculas_id_alumno_fkey" FOREIGN KEY ("id_alumno") REFERENCES "alumnos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matriculas" ADD CONSTRAINT "matriculas_id_horario_fkey" FOREIGN KEY ("id_horario") REFERENCES "horarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matriculas" ADD CONSTRAINT "matriculas_id_descuento_fkey" FOREIGN KEY ("id_descuento") REFERENCES "descuentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matricula_dias" ADD CONSTRAINT "matricula_dias_id_matricula_fkey" FOREIGN KEY ("id_matricula") REFERENCES "matriculas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meses_pago" ADD CONSTRAINT "meses_pago_id_matricula_fkey" FOREIGN KEY ("id_matricula") REFERENCES "matriculas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abonos" ADD CONSTRAINT "abonos_id_mes_pago_fkey" FOREIGN KEY ("id_mes_pago") REFERENCES "meses_pago"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abonos" ADD CONSTRAINT "abonos_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_id_matricula_fkey" FOREIGN KEY ("id_matricula") REFERENCES "matriculas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recuperaciones" ADD CONSTRAINT "recuperaciones_id_asistencia_fkey" FOREIGN KEY ("id_asistencia") REFERENCES "asistencias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recuperaciones" ADD CONSTRAINT "recuperaciones_id_horario_recuperacion_fkey" FOREIGN KEY ("id_horario_recuperacion") REFERENCES "horarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
