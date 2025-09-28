import { getPaginationMeta, getPaginationParams } from "@/utils/pagination";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

const querySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  perPage: z.coerce.number().min(1).max(100).optional().default(10),
  platform: z.enum(["LIS_SKINS", "CS_MONEY"]).optional(),
  isActive: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  sort: z.string().optional(),
  order: z.enum(["ASC", "DESC"]).optional(),
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
        data: data,
        pagination: getPaginationMeta({ page, perPage }, total),
      };
    },
  );
}
