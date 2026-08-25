-- AlterTable: agregar cantidad_meses a horarios
ALTER TABLE "horarios" ADD COLUMN "cantidad_meses" INTEGER;

-- CreateTable: horario_periodos
CREATE TABLE "horario_periodos" (
    "id" TEXT NOT NULL,
    "id_horario" TEXT NOT NULL,
    "numero_periodo" INTEGER NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE NOT NULL,

    CONSTRAINT "horario_periodos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "horario_periodos_id_horario_numero_periodo_key" ON "horario_periodos"("id_horario", "numero_periodo");

-- AddForeignKey
ALTER TABLE "horario_periodos" ADD CONSTRAINT "horario_periodos_id_horario_fkey"
    FOREIGN KEY ("id_horario") REFERENCES "horarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: agregar id_periodo opcional a meses_pago
ALTER TABLE "meses_pago" ADD COLUMN "id_periodo" TEXT;

-- AddForeignKey
ALTER TABLE "meses_pago" ADD CONSTRAINT "meses_pago_id_periodo_fkey"
    FOREIGN KEY ("id_periodo") REFERENCES "horario_periodos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
