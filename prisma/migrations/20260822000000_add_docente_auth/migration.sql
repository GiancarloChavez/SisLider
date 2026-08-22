-- Add rol column to usuarios (existing rows default to 'admin')
ALTER TABLE "usuarios" ADD COLUMN "rol" VARCHAR(20) NOT NULL DEFAULT 'admin';

-- Add dni column to docentes (nullable, unique)
ALTER TABLE "docentes" ADD COLUMN "dni" VARCHAR(8);
ALTER TABLE "docentes" ADD CONSTRAINT "docentes_dni_key" UNIQUE ("dni");

-- Add id_usuario column to docentes (nullable, unique FK to usuarios)
ALTER TABLE "docentes" ADD COLUMN "id_usuario" TEXT;
ALTER TABLE "docentes" ADD CONSTRAINT "docentes_id_usuario_key" UNIQUE ("id_usuario");
ALTER TABLE "docentes" ADD CONSTRAINT "docentes_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
