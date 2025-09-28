import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

const paramsSchema = z.object({
  id: z.string().uuid("Invalid UUID format"),
});

export async function registerBuyRequestDeleteRoute(fastify: FastifyInstance) {
  // DELETE /buy-requests/:id - Delete buy request
  fastify.withTypeProvider<ZodTypeProvider>().delete<{ Params: z.infer<typeof paramsSchema> }>(
    "/:id",
    {
      schema: {
        description: "Delete buy request",
        tags: ["buy-requests"],
        params: paramsSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;

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
