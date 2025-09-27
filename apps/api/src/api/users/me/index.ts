import type { FastifyInstance } from "fastify";
import { registerUserGetMeRoute } from "./get";
import { registerPlatformAccountRoutes } from "./platform-accounts/index";
import { registerUserUpdateMeRoute } from "./update";

export async function registerUserMeRoutes(fastify: FastifyInstance) {
  fastify.register(
    async function meRoutes(fastify) {
      await registerUserGetMeRoute(fastify);
      await registerUserUpdateMeRoute(fastify);

      fastify.register(
        async function userPlatformAccountRoutes(fastify) {
          await registerPlatformAccountRoutes(fastify);
        },
        { prefix: "/platform-accounts" },
      );
    },
    { prefix: "/me" },
  );
}
