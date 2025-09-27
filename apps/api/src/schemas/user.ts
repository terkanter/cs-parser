import { z } from "zod";

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
