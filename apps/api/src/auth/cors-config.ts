import fastifyCors from "@fastify/cors";
import type { FastifyInstance } from "fastify";

/**
 * Configure CORS for Better Auth according to:
 * https://www.better-auth.com/docs/integrations/fastify
 */
export async function registerCorsConfig(fastify: FastifyInstance) {
  await fastify.register(fastifyCors, {
    // Простая настройка - разрешаем все в development
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
    allowedHeaders: "*",
    credentials: true,
  });

  fastify.log.info("CORS configured with simple settings");
}
