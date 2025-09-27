import { Platform } from "@repo/prisma";
import { z } from "zod";

export const platformSchema = z.nativeEnum(Platform);

// Query field schema - matches the JSON structure for buy request queries
export const queryFieldSchema = z.object({
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

// BuyRequest response schema
export const buyRequestSchema = z.object({
  id: z.string(),
  platform: platformSchema,
  query: queryFieldSchema,
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Create buy request schema
export const createBuyRequestSchema = z.object({
  platform: platformSchema,
  query: queryFieldSchema,
  isActive: z.boolean().default(true),
});

// Update buy request schema
export const updateBuyRequestSchema = z.object({
  platform: platformSchema.optional(),
  query: queryFieldSchema.optional(),
  isActive: z.boolean().optional(),
});

// Export types
export type BuyRequest = z.infer<typeof buyRequestSchema>;
export type CreateBuyRequest = z.infer<typeof createBuyRequestSchema>;
export type UpdateBuyRequest = z.infer<typeof updateBuyRequestSchema>;
export type QueryField = z.infer<typeof queryFieldSchema>;
