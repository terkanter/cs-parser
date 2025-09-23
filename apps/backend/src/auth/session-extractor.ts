import { auth } from "@/auth/index";
import type { FastifyRequest } from "fastify";

/**
 * Extract session data from Fastify request using Better Auth
 * Based on Better Auth Fastify integration patterns
 */
export async function extractSessionFromRequest(request: FastifyRequest) {
  try {
    // Convert Fastify headers to Web API Headers for Better Auth
    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers)) {
      if (value) {
        const headerValue = Array.isArray(value) ? value.join(", ") : value.toString();
        headers.append(key, headerValue);
      }
    }

    // Create Web API Request compatible with Better Auth
    const url = new URL(request.url, `http://${request.headers.host}`);
    const webRequest = new Request(url.toString(), {
      method: request.method,
      headers,
    });

    // Get session from Better Auth API
    const sessionData = await auth.api.getSession({
      headers: webRequest.headers,
    });

    if (sessionData) {
      return {
        user: sessionData.user,
        session: sessionData.session,
        userId: sessionData.user?.id,
      };
    }

    return {
      user: null,
      session: null,
      userId: undefined,
    };
  } catch (error) {
    // Session validation failed, return null values
    return {
      user: null,
      session: null,
      userId: undefined,
      error: error instanceof Error ? error.message : "Unknown session error",
    };
  }
}
