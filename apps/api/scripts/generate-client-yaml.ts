import Fastify from "fastify";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stringify } from "yaml";
import { ajvPlugins } from "../src/api-lib/ajv-plugins";

// Import routes directly without auth dependencies for schema generation
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

async function generateOpenAPISchema() {
  // Set environment variable to skip auth initialization during schema generation
  process.env.IS_GENERATING_CLIENT = "true";

  const fastifyOptions: any = {
    ajv: {
      plugins: ajvPlugins,
    },
  };

  const fastify = Fastify(fastifyOptions);

  // Register swagger without auth routes for clean schema generation
  await fastify.register(fastifySwagger, {
    mode: "dynamic",
    openapi: {
      info: {
        title: "Backend API",
        version: "1.0.0",
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
  });

  await fastify.register(fastifySwaggerUi, {
    routePrefix: "/docs",
  });

  // Register a simple health check route for schema generation
  fastify.get("/", async (_, reply) => {
    reply.send("OK");
  });

  await fastify.ready();

  if (fastify.swagger === null || fastify.swagger === undefined) {
    throw new Error("@fastify/swagger plugin is not loaded");
  }

  console.log("Generating backend-client OpenAPI schema...");

  const schema = stringify(fastify.swagger());
  await writeFile(path.join(__dirname, "..", "..", "..", "packages", "backend-client", "openapi.yml"), schema, {
    flag: "w+",
  });

  await fastify.close();

  console.log("Generation of backend-client OpenAPI schema completed.");
}

// Run the generator
generateOpenAPISchema().catch((error) => {
  console.error("Failed to generate OpenAPI schema:", error);
  process.exit(1);
});
