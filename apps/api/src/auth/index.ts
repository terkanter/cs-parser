import { IS_DEV, env } from "@/env";
import { prisma } from "@repo/prisma";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Disable for development
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  user: {
    additionalFields: {
      telegramId: {
        type: "string",
        required: false,
      },
      liskinsApiKey: {
        type: "string",
        required: false,
      },
    },
  },
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3080",
    "http://localhost:5173", // Vite default
    "http://localhost:5174",
    "http://localhost:4173", // Vite preview
    env.FRONTEND_URL || "",
  ].filter(Boolean),
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  logger: {
    disabled: false,
    verboseLogging: IS_DEV,
  },
});
