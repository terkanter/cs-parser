import { getPaginationMeta, getPaginationParams } from "@/utils/pagination";
import type { Platform } from "@repo/prisma";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

export async function registerBuyRequestListRoute(fastify: FastifyInstance) {
  // GET /buy-requests - List buy requests
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/",
    {
      schema: {
        description: "List buy requests",
        tags: ["buy-requests"],
      },
    },
    async (request) => {
      const query = request.query as any;
      const page = Number(query.page) || 1;
      const perPage = Number(query.perPage) || 10;
      const platform = query.platform as Platform | undefined;
      const isActive = query.isActive !== undefined ? query.isActive === "true" : undefined;
      const sort = query.sort as string | undefined;
      const order = query.order as "asc" | "desc" | undefined;

      const { take, skip } = getPaginationParams({ page, perPage });

      const where: any = {};
      if (platform) where.platform = platform;
      if (isActive !== undefined) where.isActive = isActive;

      // Build order by clause
      const orderBy: any = {};
      if (sort && order) {
        orderBy[sort] = order.toLowerCase();
      } else {
        orderBy.createdAt = "desc";
      }

      const [data, total] = await Promise.all([
        request.ctx.prisma.buyRequest.findMany({
          where,
          skip,
          take,
          orderBy,
        }),
        request.ctx.prisma.buyRequest.count({ where }),
      ]);

      return {
        data: data.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
        pagination: getPaginationMeta({ page, perPage }, total),
      };
    },
  );

  // GET /buy-requests/:id - Get single buy request
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/:id",
    {
      schema: {
        description: "Get buy request by ID",
        tags: ["buy-requests"],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const buyRequest = await request.ctx.prisma.buyRequest.findUnique({
        where: { id },
      });

      if (!buyRequest) {
        return reply.status(404).send({
          error: "Buy request not found",
          code: "NOT_FOUND",
        });
      }

      return {
        ...buyRequest,
        createdAt: buyRequest.createdAt.toISOString(),
        updatedAt: buyRequest.updatedAt.toISOString(),
      };
    },
  );
}
