import { z } from "zod";

export const queryFieldSchema = z.object({
  price:
      z.object({
        gte: z.number().optional(),
        lte: z.number().optional(),
      }).optional(),
  float: z.object({
      gte: z.number().optional(),
      lte: z.number().optional(),
    }).optional(),
  paint_seed: z
    .array(
      z.object({
        value: z.number().optional(),
        tier: z.number().optional(),
      }),
    )
    .optional(),
  item: z.string()
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
