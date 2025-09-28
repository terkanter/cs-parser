import { updateBuyRequestSchema } from "@/schemas/buy-request";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

const paramsSchema = z.object({
  id: z.string().uuid("Invalid UUID format"),
});

export async function registerBuyRequestEditRoute(fastify: FastifyInstance) {
  // PUT /buy-requests/:id - Update buy request
  fastify
    .withTypeProvider<ZodTypeProvider>()
    .put<{ Params: z.infer<typeof paramsSchema>; Body: z.infer<typeof updateBuyRequestSchema> }>(
      "/:id",
      {
        schema: {
          description: "Update buy request",
          tags: ["buy-requests"],
          params: paramsSchema,
          body: updateBuyRequestSchema,
        },
      },
      async (request, reply) => {
        const { id } = request.params;
        const data = request.body;

        try {
          const buyRequest = await request.ctx.prisma.buyRequest.update({
            where: { id },
            data,
          });

          reply.status(200).send(buyRequest);
        } catch (error: any) {
          request.log.error("Error updating buy request:", error);

          if (error.code === "P2025") {
            reply.status(404).send({
              error: "Buy request not found",
              code: "NOT_FOUND",
            });
          }

          reply.status(400).send({
            error: "Failed to update buy request",
            code: "UPDATE_FAILED",
          });
        }
      },
    );
}
