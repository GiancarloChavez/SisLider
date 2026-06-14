import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function buildUrl() {
  const url = process.env.DATABASE_URL ?? "";
  if (!url) return url;
  // Supabase transaction pooler requires pgbouncer=true to disable prepared statements
  if (url.includes("pooler.supabase.com") && !url.includes("pgbouncer=true")) {
    return url + (url.includes("?") ? "&" : "?") + "pgbouncer=true";
  }
  return url;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: buildUrl() } },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
