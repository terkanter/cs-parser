declare global {
  // eslint-disable-next-line no-var
  var __prisma: any | undefined;
}

// Re-export types and client from Prisma
export * from "@prisma/client";

let prisma: any;

try {
  // Dynamically import PrismaClient
  const { PrismaClient } = require("@prisma/client");

  // Prevent multiple instances of Prisma Client in development
  prisma = globalThis.__prisma ?? new PrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalThis.__prisma = prisma;
  }
} catch (error) {
  console.warn(
    "Prisma client not available, make sure to run `prisma generate`"
  );
  prisma = null;
}

export { prisma };
