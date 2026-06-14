import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function buildUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  if (url.includes("pooler.supabase.com") && !url.includes("pgbouncer=true")) {
    return url + (url.includes("?") ? "&" : "?") + "pgbouncer=true";
  }
  return url;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ datasourceUrl: buildUrl() });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
