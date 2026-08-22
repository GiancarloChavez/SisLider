-- Add numero_grupo to horarios (existing rows default to '1')
ALTER TABLE "horarios" ADD COLUMN IF NOT EXISTS "numero_grupo" VARCHAR(50) NOT NULL DEFAULT '1';

-- Add precio_mensual to horarios (existing rows default to 0; update manually if needed)
ALTER TABLE "horarios" ADD COLUMN IF NOT EXISTS "precio_mensual" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Add optional date range to horarios
ALTER TABLE "horarios" ADD COLUMN IF NOT EXISTS "fecha_inicio" DATE;
ALTER TABLE "horarios" ADD COLUMN IF NOT EXISTS "fecha_fin" DATE;

-- Unique constraint: one group number per course
CREATE UNIQUE INDEX IF NOT EXISTS "horarios_id_curso_numero_grupo_key" ON "horarios"("id_curso", "numero_grupo");

-- Add celular to alumnos
ALTER TABLE "alumnos" ADD COLUMN IF NOT EXISTS "celular" VARCHAR(20);
