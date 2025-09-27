import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

export async function registerUserUpdateMeRoute(fastify: FastifyInstance) {
  // PUT /me - Update current user profile
  fastify.withTypeProvider<ZodTypeProvider>().put(
    "/me",
    {
      schema: {
        description: "Update current user profile",
        tags: ["users"],
        operationId: "updateUserProfile",
        params: z.object({
          id: z.string(),
        }),
      },
    },
    async (request, reply) => {
      try {
        // Check if user is authenticated
        if (!request.ctx.isAuthenticated) {
          return reply.status(401).send({
            error: "Authentication required",
            code: "UNAUTHORIZED",
          });
        }

        const { user } = request.ctx.requireAuth();
        const { telegramId, liskinsApiKey } = request.body as {
          telegramId: string | null;
          liskinsApiKey: string | null;
        };

        // Check if telegramId is already taken by another user
        if (telegramId) {
          const existingUser = await request.ctx.prisma.user.findFirst({
            where: {
              telegramId,
              NOT: {
                id: user.id,
              },
            },
          });

          if (existingUser) {
            return reply.status(400).send({
              error: "Telegram ID is already linked to another account",
              code: "TELEGRAM_ID_TAKEN",
            });
          }
        }

        // Update user
        const updatedUser = await request.ctx.prisma.user.update({
          where: { id: user!.id },
          data: {
            ...(telegramId !== undefined && { telegramId }),
            ...(liskinsApiKey !== undefined && { liskinsApiKey }),
          },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            telegramId: true,
            liskinsApiKey: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        return reply.status(200).send({
          ...updatedUser,
          createdAt: updatedUser.createdAt.toISOString(),
          updatedAt: updatedUser.updatedAt.toISOString(),
        });
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
