import { auth } from "@/auth/index";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

/**
 * Better Auth Fastify integration handler
 * Based on: https://www.better-auth.com/docs/integrations/fastify
 */
export async function registerBetterAuthHandler(fastify: FastifyInstance) {
  // Register authentication endpoint with catch-all route
  fastify.route({
    method: ["GET", "POST", "OPTIONS"],
    url: "/auth/*",
    async handler(request: FastifyRequest, reply: FastifyReply) {
      try {
        // Handle preflight OPTIONS requests
        if (request.method === "OPTIONS") {
          return reply.status(200).send();
        }

        // Construct request URL
        const url = new URL(request.url, `http://${request.headers.host}`);

        // Convert Fastify headers to standard Headers object
        const headers = new Headers();
        for (const [key, value] of Object.entries(request.headers)) {
          if (value) {
            const headerValue = Array.isArray(value) ? value.join(", ") : value.toString();
            headers.append(key, headerValue);
          }
        }

        // Create Fetch API-compatible request
        const req = new Request(url.toString(), {
          method: request.method,
          headers,
          body: request.body ? JSON.stringify(request.body) : undefined,
        });

        // Process authentication request
        const response = await auth.handler(req);

        // Forward response to client
        reply.status(response.status);
        response.headers.forEach((value, key) => {
          reply.header(key, value);
        });

        // Return response body
        const responseBody = response.body ? await response.text() : null;
        return responseBody;
      } catch (error) {
        fastify.log.error("Better Auth Error:", error);
        reply.status(500);
        return {
          error: "Internal authentication error",
          code: "AUTH_FAILURE",
        };
      }
    },
  });

  fastify.log.info("Better Auth handler registered at /auth/*");
}
