import { Platform } from "@repo/api-core";
import { z } from "zod";

// Platform-specific credentials schemas
export const liskinsCredentialsSchema = z.object({
  userId: z.coerce.number().int().positive({
    message: "User ID must be a positive number",
  }),
  apiKey: z
    .string()
    .min(1, {
      message: "API Key is required",
    })
    .max(255, {
      message: "API Key too long",
    }),
});

export const csMoneyCredentialsSchema = z.object({});

// Union type for platform credentials with discriminated union
export const platformCredentialsSchema = z.discriminatedUnion("platform", [
  z.object({
    platform: z.literal(Platform.LIS_SKINS),
    credentials: liskinsCredentialsSchema,
  }),
  z.object({
    platform: z.literal(Platform.CS_MONEY),
    credentials: csMoneyCredentialsSchema,
  }),
]);

// Platform account response schema
export const platformAccountSchema = z.object({
  id: z.string().uuid().nullable(), // null means not configured yet
  platform: z.nativeEnum(Platform),
  credentials: z.union([liskinsCredentialsSchema, csMoneyCredentialsSchema]),
  userId: z.string().uuid(),
});

// Upsert request schema - only credentials, platform comes from URL
export const upsertPlatformAccountBodySchema = z.union([liskinsCredentialsSchema, csMoneyCredentialsSchema]);

// Platform account list response
export const platformAccountListSchema = z.object({
  data: z.array(platformAccountSchema),
});

// Validation helpers for specific platforms
export const validatePlatformCredentials = (platform: Platform, credentials: any) => {
  switch (platform) {
    case Platform.LIS_SKINS:
      return liskinsCredentialsSchema.parse(credentials);
    case Platform.CS_MONEY:
      return csMoneyCredentialsSchema.parse(credentials);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
};

// Error schemas
export const platformAccountErrorSchema = z.object({
  error: z.string(),
  code: z.enum([
    "UNAUTHORIZED",
    "PLATFORM_NOT_FOUND",
    "INVALID_CREDENTIALS",
    "INVALID_USER_ID",
    "TELEGRAM_ID_TAKEN",
    "INTERNAL_ERROR",
  ]),
  details: z.record(z.any()).optional(),
});

// Export types
export type PlatformAccountResponse = z.infer<typeof platformAccountSchema>;
export type UpsertPlatformAccountBody = z.infer<typeof upsertPlatformAccountBodySchema>;
export type LiskinsCredentials = z.infer<typeof liskinsCredentialsSchema>;
export type CsMoneyCredentials = z.infer<typeof csMoneyCredentialsSchema>;
export type PlatformCredentials = z.infer<typeof platformCredentialsSchema>;
export type PlatformAccountError = z.infer<typeof platformAccountErrorSchema>;
