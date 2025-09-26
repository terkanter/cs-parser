import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { Platform } from "@repo/prisma";
import {
  paginationParamsSchema,
  getPaginationParams,
  getPaginationMeta,
  paginationMetaSchema,
} from "@/utils/pagination";

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

const listQuerySchema = paginationParamsSchema.extend({
  platform: platformSchema.optional(),
  isActive: z.boolean().optional(),
});

export async function registerBuyRequestRoutes(fastify: FastifyInstance) {
  const prisma = fastify.prisma;

  // GET /buy-requests - List buy requests
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/",
    schema: {
      description: "List buy requests",
      tags: ["buy-requests"],
      querystring: listQuerySchema,
      response: {
        200: z.object({
          data: z.array(buyRequestSchema),
          pagination: paginationMetaSchema,
        }),
      },
    },
    async handler(request) {
      const { page, perPage, platform, isActive } = request.query;
      const { take, skip } = getPaginationParams({ page, perPage });

      const where: any = {};
      if (platform) where.platform = platform;
      if (isActive !== undefined) where.isActive = isActive;

      const [data, total] = await Promise.all([
        prisma.buyRequest.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: "desc" },
        }),
        prisma.buyRequest.count({ where }),
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
  });

  // GET /buy-requests/:id - Get single buy request
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/:id",
    schema: {
      description: "Get buy request by ID",
      tags: ["buy-requests"],
      params: z.object({
        id: z.string(),
      }),
      response: {
        200: buyRequestSchema,
        404: z.object({
          error: z.string(),
          code: z.string(),
        }),
      },
    },
    async handler(request, reply) {
      const { id } = request.params;

      const buyRequest = await prisma.buyRequest.findUnique({
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
  });

  // POST /buy-requests - Create buy request
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/",
    schema: {
      description: "Create new buy request",
      tags: ["buy-requests"],
      body: createBuyRequestSchema,
      response: {
        201: buyRequestSchema,
        400: z.object({
          error: z.string(),
          code: z.string(),
        }),
      },
    },
    async handler(request, reply) {
      const data = request.body;

      try {
        const buyRequest = await prisma.buyRequest.create({
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
  });

  // PUT /buy-requests/:id - Update buy request
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: "PUT",
    url: "/:id",
    schema: {
      description: "Update buy request",
      tags: ["buy-requests"],
      params: z.object({
        id: z.string(),
      }),
      body: updateBuyRequestSchema,
      response: {
        200: buyRequestSchema,
        404: z.object({
          error: z.string(),
          code: z.string(),
        }),
        400: z.object({
          error: z.string(),
          code: z.string(),
        }),
      },
    },
    async handler(request, reply) {
      const { id } = request.params;
      const data = request.body;

      try {
        const buyRequest = await prisma.buyRequest.update({
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
  });

  // DELETE /buy-requests/:id - Delete buy request
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: "DELETE",
    url: "/:id",
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
    async handler(request, reply) {
      const { id } = request.params;

      try {
        await prisma.buyRequest.delete({
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
  });
}
