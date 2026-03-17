import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prismaDatasourceUrl = process.env.PRISMA_DATABASE_URL;

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(prismaDatasourceUrl ? { datasourceUrl: prismaDatasourceUrl } : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
