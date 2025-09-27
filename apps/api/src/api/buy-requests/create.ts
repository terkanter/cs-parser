import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

export async function registerBuyRequestCreateRoute(fastify: FastifyInstance) {
  // POST /buy-requests - Create buy request
  fastify.withTypeProvider<ZodTypeProvider>().post(
    "/",
    {
      schema: {
        description: "Create new buy request",
        tags: ["buy-requests"],
      },
    },
    async (request, reply) => {
      const data = request.body as any;

      try {
        const buyRequest = await request.ctx.prisma.buyRequest.create({
          data: {
            ...data,
            createdByUserId: request.ctx.requireAuth().user.id,
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
