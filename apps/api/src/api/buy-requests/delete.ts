import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

export async function registerBuyRequestDeleteRoute(fastify: FastifyInstance) {
  // DELETE /buy-requests/:id - Delete buy request
  fastify.withTypeProvider<ZodTypeProvider>().delete(
    "/:id",
    {
      schema: {
        description: "Delete buy request",
        tags: ["buy-requests"],
        params: z.object({
          id: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      try {
        await request.ctx.prisma.buyRequest.delete({
          where: { id },
        });

        return reply.status(204).send();
      } catch (error: any) {
        request.log.error("Error deleting buy request:", error);

        if (error.code === "P2025") {
          return reply.status(404).send({
            error: "Buy request not found",
            code: "NOT_FOUND",
          });
        }

        return reply.status(500).send({
          error: "Failed to delete buy request",
          code: "DELETE_FAILED",
        });
      }
    },
  );
}
