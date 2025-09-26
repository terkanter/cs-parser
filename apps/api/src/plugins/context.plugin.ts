import { ApiContext } from "@/api-lib/context";
import { extractSessionFromRequest } from "@/auth/session-extractor";
import type { AuthSession, AuthUser } from "@/auth/types";
import { removeQueryParametersFromPath } from "@/utils/remove-query-params";
import type { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import type { LogLayer } from "loglayer";

declare module "fastify" {
  interface FastifyRequest {
    ctx: ApiContext;
    user?: AuthUser | null;
    session?: AuthSession | null;
  }
}

async function plugin(fastify: FastifyInstance, _opts) {
  fastify.addHook("onRequest", async (request: FastifyRequest) => {
    // Setup enhanced logging with API path context
    if (request.url) {
      // @ts-ignore
      request.log = request.log.withContext({
        apiPath: removeQueryParametersFromPath(request.url),
      });
    }

    // Extract session data using Better Auth integration
    const sessionResult = await extractSessionFromRequest(request);

    // Log session extraction issues (but don't fail the request)
    if (sessionResult.error) {
      fastify.log.debug("Session validation failed:", sessionResult.error);
    }

    // Set userId for easy access
    request.user = sessionResult.user;
    request.session = sessionResult.session;

    // Create API context with session data
    request.ctx = new ApiContext({
      log: request.log as unknown as LogLayer,
      user: sessionResult.user,
      session: sessionResult.session,
    });
  });
}

export const contextPlugin = fp(plugin);
