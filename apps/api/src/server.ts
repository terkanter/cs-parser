import { errorHandler } from "@/api-lib/error-handler";
import routes from "@/api/index";
import { plugins } from "@/plugins/index";
import { asyncLocalStorage } from "@/utils/async-local-storage";
import { getLogger } from "@/utils/logger";
import fastifyCors from "@fastify/cors";
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
  }).withTypeProvider<ZodTypeProvider>()

  fastify.setValidatorCompiler(validatorCompiler)
  fastify.setSerializerCompiler(serializerCompiler);

  // Register CORS directly as THE FIRST PLUGIN
  await fastify.register(fastifyCors, {
    origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
      "Cache-Control",
      "X-HTTP-Method-Override",
    ],
    credentials: true,
  });

  fastify.log.info("CORS registered directly in server.ts");

  fastify.addHook("onRequest", (request, _reply, done) => {
    const logger = fastify.log.withContext({ reqId: request.id });

    asyncLocalStorage.run({ logger }, done);
  });

  fastify.register(fp(plugins));

  fastify.setErrorHandler(errorHandler);

  fastify.register(routes);
  fastify.log.disableLogging();

  fastify.listen({ port, host: '0.0.0.0' }, (err, address) => {
    if (err) {
      fastify.log.error(err);
      process.exit(1);
    }

    fastify.log.enableLogging();

    fastify.log.info(`Server: ${address}`);
    fastify.log.info(`Server docs: ${address}/docs`);
  });
}
