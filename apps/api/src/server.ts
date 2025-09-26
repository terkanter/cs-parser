import { errorHandler } from "@/api-lib/error-handler";
import routes from "@/api/index";
import { registerCorsConfig } from "@/auth/cors-config";
import { plugins } from "@/plugins/index";
import { asyncLocalStorage } from "@/utils/async-local-storage";
import { getLogger } from "@/utils/logger";
import Fastify from "fastify";
import fp from "fastify-plugin";
import { type ZodTypeProvider, serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { nanoid } from "nanoid";

export async function startServer({ port }: { port: number }) {
  const logger = getLogger();

  const fastify = Fastify({
    // @ts-ignore
    loggerInstance: logger,
    disableRequestLogging: true,
    genReqId: () => nanoid(12),
  })
    .withTypeProvider<ZodTypeProvider>()
    .setValidatorCompiler(validatorCompiler)
    .setSerializerCompiler(serializerCompiler);

  fastify.addHook("onRequest", (request, _reply, done) => {
    const logger = fastify.log.withContext({ reqId: request.id });

    asyncLocalStorage.run({ logger }, done);
  });

  // Register Better Auth specific CORS configuration FIRST
  fastify.register(registerCorsConfig);

  fastify.register(fp(plugins));

  fastify.setErrorHandler(errorHandler);

  fastify.register(routes);
  fastify.log.disableLogging();

  fastify.listen({ port }, (err, address) => {
    if (err) {
      fastify.log.error(err);
      process.exit(1);
    }

    fastify.log.enableLogging();

    fastify.log.info(`Server: ${address}`);
    fastify.log.info(`Server docs: ${address}/docs`);
  });
}
