import { z } from "zod";

export const paintSeedTierSchema = z.object({
  value: z.array(z.number()).optional(),
  name: z.string().optional(),
});

export const queryFieldSchema = z.object({
  price: z
    .object({
      gte: z.number().optional(),
      lte: z.number().optional(),
    })
    .optional(),
  float: z
    .object({
      gte: z.number().optional(),
      lte: z.number().optional(),
    })
    .optional(),
  paint_seed: z.array(paintSeedTierSchema).optional(),
  item: z.string(),
});

export const buyRequestSchema = z.object({
  id: z.string(),
  query: queryFieldSchema,
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createBuyRequestSchema = z.object({
  query: queryFieldSchema,
  isActive: z.boolean().default(true),
});

export const updateBuyRequestSchema = z.object({
  query: queryFieldSchema.optional(),
  isActive: z.boolean().optional(),
});

export type BuyRequest = z.infer<typeof buyRequestSchema>;
export type CreateBuyRequest = z.infer<typeof createBuyRequestSchema>;
export type UpdateBuyRequest = z.infer<typeof updateBuyRequestSchema>;
export type QueryField = z.infer<typeof queryFieldSchema>;
