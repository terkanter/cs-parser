import { env } from "@/env";
import fastifyCors from "@fastify/cors";
import type { FastifyInstance } from "fastify";

/**
 * Configure CORS for Better Auth according to:
 * https://www.better-auth.com/docs/integrations/fastify
 */
export async function registerCorsConfig(fastify: FastifyInstance) {
  await fastify.register(fastifyCors, {
    // Allow requests from frontend URL or default localhost
    origin: env.FRONTEND_URL || "http://localhost:3000",

    // Allow necessary HTTP methods
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],

    // Allow necessary headers for authentication
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Cookie", "Set-Cookie"],

    // Enable credentials for session cookies
    credentials: true,

    // Cache preflight requests for 24 hours
    maxAge: 86400,
  });

  fastify.log.info("CORS configured for Better Auth integration");
}
