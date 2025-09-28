import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

const paramsSchema = z.object({
  id: z.string().uuid("Invalid UUID format"),
});

export async function registerBuyRequestGetByIdRoute(fastify: FastifyInstance) {
  // GET /buy-requests/:id - Get single buy request
  fastify.withTypeProvider<ZodTypeProvider>().get<{ Params: z.infer<typeof paramsSchema> }>(
    "/:id",
    {
      schema: {
        description: "Get buy request by ID",
        tags: ["buy-requests"],
        params: paramsSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const buyRequest = await request.ctx.prisma.buyRequest.findUnique({
        where: { id },
      });

      if (!buyRequest) {
        return reply.status(404).send({
          error: "Buy request not found",
          code: "NOT_FOUND",
        });
      }

      return reply.status(200).send(buyRequest);
    },
  );
}
