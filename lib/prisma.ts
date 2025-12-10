// Ensure the env flag is set BEFORE loading PrismaClient (important for pgBouncer)
if (!process.env.PRISMA_DISABLE_PREPARED_STATEMENTS) {
  process.env.PRISMA_DISABLE_PREPARED_STATEMENTS = "true";
}

// Lazy-require Prisma after env is set to avoid prepared statement errors
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require("@prisma/client") as typeof import("@prisma/client");

function withPgbouncerParams(url?: string | null) {
  if (!url) return url;
  try {
    const u = new URL(url);
    u.searchParams.set("pgbouncer", "true");
    // Keep pool small per function/container
    u.searchParams.set("connection_limit", "1");
    u.searchParams.set("pool_timeout", "5");
    return u.toString();
  } catch {
    return url;
  }
}

const dbUrl = withPgbouncerParams(process.env.DATABASE_URL);

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: InstanceType<typeof PrismaClient> | undefined;
}

export const prisma: InstanceType<typeof PrismaClient> =
  global.prismaGlobal ??
  new PrismaClient({
    datasources: dbUrl
      ? {
          db: {
            url: dbUrl,
          },
        }
      : undefined,
  });

if (process.env.NODE_ENV !== "production") {
  global.prismaGlobal = prisma;
}


