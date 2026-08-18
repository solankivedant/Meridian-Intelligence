import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * `pg` currently treats `sslmode=prefer|require|verify-ca` as aliases for
 * `verify-full` and warns on every boot that pg 9 will give them libpq's
 * weaker semantics instead. Neon hands out URLs ending in `sslmode=require`,
 * so the mode is rewritten to the one it already means: the connection
 * behaves exactly as it does today, the warning goes away, and the certificate
 * check won't silently disappear when the major version lands. Done here
 * rather than only in `.env` so a hosted DATABASE_URL is covered too.
 */
function pinSslMode(url: string | undefined): string | undefined {
  if (!url) return url;
  return url.replace(/([?&]sslmode=)(require|prefer|verify-ca)(&|$)/i, "$1verify-full$3");
}

function createClient() {
  const adapter = new PrismaPg({ connectionString: pinSslMode(process.env.DATABASE_URL) });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
