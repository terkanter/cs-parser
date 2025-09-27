import { getPaginationMeta } from "@/utils/pagination";
import { getAllPlatforms, getDefaultCredentials } from "@repo/api-core";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

export async function registerPlatformAccountListRoute(fastify: FastifyInstance) {
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/",
    {
      schema: {
        description: "Get all platform accounts for current user",
        tags: ["platform-accounts"],
      },
    },
    async (request, reply) => {
      try {
        const { user } = request.ctx.requireAuth();

        // Get existing platform accounts
        const existingAccounts = await request.ctx.prisma.platformAccount.findMany({
          where: { userId: user.id },
          select: {
            platform: true,
            credentials: true,
            userId: true,
          },
        });

        // Create map of existing platforms
        const existingMap = new Map(existingAccounts.map((acc) => [acc.platform, acc]));

        // Build complete list with defaults for missing platforms
        const allPlatforms = getAllPlatforms();
        const result = allPlatforms.map((platform) => {
          const existing = existingMap.get(platform);

          if (existing) {
            return {
              id: existing.platform,
              platform: existing.platform,
              credentials: existing.credentials,
              userId: existing.userId,
            };
          }

          // Return default/empty configuration for missing platforms
          return {
            id: platform, // Indicates this platform is not configured
            platform,
            credentials: getDefaultCredentials(platform),
            userId: user.id,
          };
        });

        return reply.status(200).send({
          data: result,
          pagination: getPaginationMeta({ page: 1, perPage: result.length }, result.length),
        });
      } catch (error) {
        request.log.error("Error getting platform accounts:", error);
        return reply.status(500).send({
          error: "Internal server error",
          code: "INTERNAL_ERROR",
        });
      }
    },
  );
}
