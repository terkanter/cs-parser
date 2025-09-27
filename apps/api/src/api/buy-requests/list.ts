import { getPaginationMeta, getPaginationParams } from "@/utils/pagination";
import type { Platform } from "@repo/prisma";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  perPage: z.coerce.number().min(1).max(100).default(10),
  platform: z.enum(["LIS_SKINS", "CS_MONEY"]).optional(),
  isActive: z.coerce.boolean().optional(),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).optional(),
});

const paramsSchema = z.object({
  id: z.string().uuid("Invalid UUID format"),
});

export async function registerBuyRequestListRoute(fastify: FastifyInstance) {
  // GET /buy-requests - List buy requests
  fastify.withTypeProvider<ZodTypeProvider>().get<{ Querystring: z.infer<typeof querySchema> }>(
    "/",
    {
      schema: {
        description: "List buy requests",
        tags: ["buy-requests"],
        querystring: querySchema,
      },
    },
    async (request) => {
      const { page, perPage, platform, isActive, sort, order } = request.query;

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

      return {
        ...buyRequest,
        createdAt: buyRequest.createdAt.toISOString(),
        updatedAt: buyRequest.updatedAt.toISOString(),
      };
    },
  );
}
