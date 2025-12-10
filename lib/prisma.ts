// Ensure the env flag is set BEFORE loading PrismaClient (important for pgBouncer)
if (!process.env.PRISMA_DISABLE_PREPARED_STATEMENTS) {
  process.env.PRISMA_DISABLE_PREPARED_STATEMENTS = "true";
}

// Lazy-require Prisma after env is set to avoid prepared statement errors
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require("@prisma/client") as typeof import("@prisma/client");

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: InstanceType<typeof PrismaClient> | undefined;
}

export const prisma: InstanceType<typeof PrismaClient> =
  global.prismaGlobal ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prismaGlobal = prisma;
}


