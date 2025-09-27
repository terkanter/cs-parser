import { getPaginationMeta, getPaginationParams } from "@/utils/pagination";
import { Platform } from "@repo/prisma";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

const platformSchema = z.nativeEnum(Platform);

// Query field schema - matches the JSON structure you specified
const queryFieldSchema = z.object({
  price: z
    .array(
      z.object({
        gte: z.number().optional(),
        lte: z.number().optional(),
      }),
    )
    .optional(),
  float: z
    .array(
      z.object({
        gte: z.number().optional(),
        lte: z.number().optional(),
      }),
    )
    .optional(),
  paint_seed: z
    .array(
      z.object({
        gte: z.number().optional(),
        lte: z.number().optional(),
      }),
    )
    .optional(),
  item: z.array(z.string()).optional(),
  quality: z.array(z.enum(["FN", "MW", "FT", "WW", "BS"])).optional(),
});

// BuyRequest schemas
const buyRequestSchema = z.object({
  id: z.string(),
  platform: platformSchema,
  query: queryFieldSchema,
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const createBuyRequestSchema = z.object({
  platform: platformSchema,
  query: queryFieldSchema,
  isActive: z.boolean().default(true),
});

const updateBuyRequestSchema = z.object({
  platform: platformSchema.optional(),
  query: queryFieldSchema.optional(),
  isActive: z.boolean().optional(),
});

export async function registerBuyRequestRoutes(fastify: FastifyInstance) {
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
        params: z.object({
          id: z.string(),
        }),
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
          data,
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
        response: {
          204: z.undefined(),
          404: z.object({
            error: z.string(),
            code: z.string(),
          }),
        },
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
