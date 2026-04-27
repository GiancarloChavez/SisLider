import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

config();

const prisma = new PrismaClient();

const NOMBRE = "Secretaria";
const EMAIL = "secretaria@sislider.com";
const PASSWORD = "sislider2024";

async function main() {
  const existe = await prisma.usuario.findUnique({ where: { email: EMAIL } });

  if (existe) {
    console.log("El usuario ya existe:", EMAIL);
    return;
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const usuario = await prisma.usuario.create({
    data: { nombre: NOMBRE, email: EMAIL, passwordHash },
  });

  console.log("Usuario creado:");
  console.log("  Email:     ", EMAIL);
  console.log("  Contraseña:", PASSWORD);
  console.log("  ID:        ", usuario.id);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
