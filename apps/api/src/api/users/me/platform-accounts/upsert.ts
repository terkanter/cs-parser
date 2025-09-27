import { upsertPlatformAccountBodySchema, validatePlatformCredentials } from "@/schemas/platform-account";
import { Platform } from "@repo/api-core";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

const paramsSchema = z.object({
  platform: z.nativeEnum(Platform),
});

export async function registerPlatformAccountUpsertRoute(fastify: FastifyInstance) {
  fastify
    .withTypeProvider<ZodTypeProvider>()
    .put<{ Params: z.infer<typeof paramsSchema>; Body: z.infer<typeof upsertPlatformAccountBodySchema> }>(
      "/:platform",
      {
        schema: {
          description: "Create or update platform account",
          tags: ["platform-accounts"],
          params: paramsSchema,
          body: upsertPlatformAccountBodySchema,
        },
      },
      async (request, reply) => {
        try {
          const { user } = request.ctx.requireAuth();
          const { platform } = request.params;
          const credentialsData = request.body;

          let validatedCredentials;
          try {
            validatedCredentials = validatePlatformCredentials(platform, credentialsData);
          } catch (error: any) {
            return reply.status(400).send({
              error: `Invalid credentials for ${platform}`,
              code: "INVALID_CREDENTIALS",
              details: error.issues || error.errors || [{ message: error.message }],
            });
          }

          // Upsert platform account
          const platformAccount = await request.ctx.prisma.platformAccount.upsert({
            where: {
              platform_userId: {
                platform,
                userId: user.id,
              },
            },
            update: {
              credentials: validatedCredentials,
            },
            create: {
              platform,
              credentials: validatedCredentials,
              userId: user.id,
            },
          });

          return reply.status(200).send({
            id: platformAccount.id,
            platform: platformAccount.platform,
            credentials: platformAccount.credentials,
            userId: platformAccount.userId,
          });
        } catch (error) {
          request.log.error("Error upserting platform account:", error);
          return reply.status(500).send({
            error: "Internal server error",
            code: "INTERNAL_ERROR",
          });
        }
      },
    );
}
