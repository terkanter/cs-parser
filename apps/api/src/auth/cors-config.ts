import { IS_DEV, env } from "@/env";
import fastifyCors from "@fastify/cors";
import type { FastifyInstance } from "fastify";

/**
 * Configure CORS for Better Auth according to:
 * https://www.better-auth.com/docs/integrations/fastify
 */
export async function registerCorsConfig(fastify: FastifyInstance) {
  await fastify.register(fastifyCors, {
    // In development, allow all origins for easier testing
    origin: IS_DEV
      ? true
      : env.FRONTEND_URL
        ? [env.FRONTEND_URL]
        : [
            "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost:5173", // Vite default
            "http://localhost:5174",
            "http://localhost:4173", // Vite preview
          ],

    // Allow necessary HTTP methods
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],

    // Allow necessary headers for authentication
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Cookie", "Set-Cookie"],

    // Enable credentials for session cookies
    credentials: true,

    // Cache preflight requests for 24 hours
    maxAge: 86400,
  });

  fastify.log.info("CORS configured for Better Auth integration");
}
