import { PrismaClient } from "@prisma/client";

// Mutate env before PrismaClient reads it so the schema's url + directUrl stay intact
// and datasourceUrl override (which conflicts with directUrl in schema) is avoided.
const dbUrl = process.env.DATABASE_URL ?? "";
if (dbUrl.includes("pooler.supabase.com") && !dbUrl.includes("pgbouncer=true")) {
  process.env.DATABASE_URL = dbUrl + (dbUrl.includes("?") ? "&" : "?") + "pgbouncer=true";
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
