import fastifyCors from "@fastify/cors";
import type { FastifyInstance } from "fastify";

/**
 * Configure CORS for Better Auth according to:
 * https://www.better-auth.com/docs/integrations/fastify
 */
export async function registerCorsConfig(fastify: FastifyInstance) {
  await fastify.register(fastifyCors, {
    // Разрешаем все origins в development
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
      "Cache-Control",
      "X-HTTP-Method-Override",
    ],
    credentials: true,
  });

  fastify.log.info("CORS configured with explicit headers");
}
