import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// DATABASE_URL, sonst die Variable der Vercel-Supabase-Integration
const datasourceUrl = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;

export const prisma = globalForPrisma.prisma ?? new PrismaClient(datasourceUrl ? { datasourceUrl } : undefined);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
