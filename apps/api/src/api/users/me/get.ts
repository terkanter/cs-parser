import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

export async function registerUserGetMeRoute(fastify: FastifyInstance) {
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/me",
    {
      schema: {
        description: "Get current user profile",
        tags: ["users"],
      },
    },
    async (request, reply) => {
      try {
        // Check if user is authenticated through our context
        if (!request.ctx.isAuthenticated) {
          return reply.status(401).send({
            error: "Authentication required",
            code: "UNAUTHORIZED",
          });
        }

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
          },
        });

        if (!userData) {
          return reply.status(404).send({
            error: "User not found",
            code: "USER_NOT_FOUND",
          });
        }

        return reply.status(200).send({
          ...userData,
          createdAt: userData.createdAt.toISOString(),
          updatedAt: userData.updatedAt.toISOString(),
        });
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
