import { z } from "zod";

// User response schema
export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  image: z.string().nullable(),
  telegramId: z.string().nullable(),
  liskinsApiKey: z.string().nullable(),
  emailVerified: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Update user schema for PUT /users/me
export const updateUserBodySchema = z.object({
  name: z.string().optional(),
  telegramId: z.string().nullable().optional(),
  liskinsApiKey: z.string().nullable().optional(),
});

// Error response schemas
export const userErrorSchema = z.object({
  error: z.string(),
  code: z.string(),
});

// Export types
export type User = z.infer<typeof userSchema>;
export type UpdateUserBody = z.infer<typeof updateUserBodySchema>;
