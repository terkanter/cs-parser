import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  image: z.string().nullable(),
  telegramId: z.string().nullable(),
  role: z.string(),
  emailVerified: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const updateUserSchema = z.object({
  name: z.string().optional(),
  telegramId: z.string().nullable().optional(),
});

export async function registerUserMeRoute(fastify: FastifyInstance) {
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/me",
    schema: {
      description: "Get current user profile",
      tags: ["users"],
      response: {
        200: userSchema,
        401: z.object({
          error: z.string(),
          code: z.string(),
        }),
      },
    },
    async handler(request, reply) {
      try {
        // Check if user is authenticated through our context
        if (!request.ctx.isAuthenticated) {
          return reply.status(401).send({
            error: "Authentication required",
            code: "UNAUTHORIZED",
          });
        }

        const { user } = request.ctx.requireAuth();

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          telegramId: user.telegramId,
          role: user.role || "user",
          emailVerified: user.emailVerified,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        };
      } catch (error) {
        request.log.error("Error getting user profile:", error);
        return reply.status(500).send({
          error: "Internal server error",
          code: "INTERNAL_ERROR",
        });
      }
    },
  });

  // PUT /me - Update current user profile
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: "PUT",
    url: "/me",
    schema: {
      description: "Update current user profile",
      tags: ["users"],
      body: updateUserSchema,
      response: {
        200: userSchema,
        401: z.object({
          error: z.string(),
          code: z.string(),
        }),
        400: z.object({
          error: z.string(),
          code: z.string(),
        }),
      },
    },
    async handler(request, reply) {
      try {
        // Check if user is authenticated
        if (!request.ctx.isAuthenticated) {
          return reply.status(401).send({
            error: "Authentication required",
            code: "UNAUTHORIZED",
          });
        }

        const { user } = request.ctx.requireAuth();
        const updateData = request.body;

        // Check if telegramId is already taken by another user
        if (updateData.telegramId) {
          const existingUser = await fastify.prisma.user.findFirst({
            where: {
              telegramId: updateData.telegramId,
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
        const updatedUser = await fastify.prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });

        return {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          image: updatedUser.image,
          telegramId: updatedUser.telegramId,
          role: updatedUser.role || "user",
          emailVerified: updatedUser.emailVerified,
          createdAt: updatedUser.createdAt.toISOString(),
          updatedAt: updatedUser.updatedAt.toISOString(),
        };
      } catch (error) {
        request.log.error("Error updating user profile:", error);
        return reply.status(500).send({
          error: "Internal server error",
          code: "INTERNAL_ERROR",
        });
      }
    },
  });
}
