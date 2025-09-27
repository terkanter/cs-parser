import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

export async function registerBuyRequestEditRoute(fastify: FastifyInstance) {
  // PUT /buy-requests/:id - Update buy request
  fastify.withTypeProvider<ZodTypeProvider>().put(
    "/:id",
    {
      schema: {
        description: "Update buy request",
        tags: ["buy-requests"],
        params: z.object({
          id: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const data = request.body as any;

      try {
        const buyRequest = await request.ctx.prisma.buyRequest.update({
          where: { id },
          data,
        });

        return {
          ...buyRequest,
          createdAt: buyRequest.createdAt.toISOString(),
          updatedAt: buyRequest.updatedAt.toISOString(),
        };
      } catch (error: any) {
        request.log.error("Error updating buy request:", error);

        if (error.code === "P2025") {
          return reply.status(404).send({
            error: "Buy request not found",
            code: "NOT_FOUND",
          });
        }

        return reply.status(400).send({
          error: "Failed to update buy request",
          code: "UPDATE_FAILED",
        });
      }
    },
  );
}
