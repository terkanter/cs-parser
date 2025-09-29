import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

export async function registerUserGetMeRoute(fastify: FastifyInstance) {
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/",
    {
      schema: {
        description: "Get current user profile",
        tags: ["users"],
      },
    },
    async (request, reply) => {
      try {
        const { user } = request.ctx.requireAuth();

        const userData = await request.ctx.prisma.user.findUnique({
          where: { id: user.id },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            telegramId: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
            steamTradeUrl: true,
          },
        });

        if (!userData) {
          return reply.status(404).send({
            error: "User not found",
            code: "USER_NOT_FOUND",
          });
        }

        return reply.status(200).send(userData);
      } catch (error) {
        request.log.error("Error getting user profile:", error);
        return reply.status(500).send({
          error: "Internal server error",
          code: "INTERNAL_ERROR",
        });
      }
    },
  );
}
