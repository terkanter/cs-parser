import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

export async function registerUserUpdateMeRoute(fastify: FastifyInstance) {
  fastify.withTypeProvider<ZodTypeProvider>().put(
    "/",
    {
      schema: {
        description: "Update current user profile",
        tags: ["users"],
        operationId: "updateUserProfile",
      },
    },
    async (request, reply) => {
      try {
        const { user } = request.ctx.requireAuth();

        const { telegramId } = request.body as {
          telegramId: string | null;
        };

        const updatedUser = await request.ctx.prisma.user.update({
          where: { id: user!.id },
          data: {
            ...(telegramId !== undefined && { telegramId }),
          },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            telegramId: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        return reply.status(200).send(updatedUser);
      } catch (error) {
        request.log.error("Error updating user profile:", error);
        return reply.status(500).send({
          error: "Internal server error",
          code: "INTERNAL_ERROR",
        });
      }
    },
  );
}
