import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { createBuyRequestSchema } from "@/schemas/buy-request";
import { z } from "zod";

export async function registerBuyRequestCreateRoute(fastify: FastifyInstance) {
  // POST /buy-requests - Create buy request
  fastify.withTypeProvider<ZodTypeProvider>().post<{ Body: z.infer<typeof createBuyRequestSchema> }>(
    "/",
    {
      schema: {
        description: "Create new buy request",
        tags: ["buy-requests"],
        body: createBuyRequestSchema,
      },
    },
    async (request, reply) => {
      const data = request.body;

      const auth = request.ctx.requireAuth()

      try {
        const buyRequest = await request.ctx.prisma.buyRequest.create({
          data: {
            ...data,
            createdByUserId: auth.user.id,
          },
        });

        return reply.status(201).send({
          ...buyRequest,
          createdAt: buyRequest.createdAt.toISOString(),
          updatedAt: buyRequest.updatedAt.toISOString(),
        });
      } catch (error) {
        request.log.error("Error creating buy request:", error);
        return reply.status(400).send({
          error: "Failed to create buy request",
          code: "CREATE_FAILED",
        });
      }
    },
  );
}
