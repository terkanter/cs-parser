import { PostgreSqlContainer } from "@testcontainers/postgresql";

global.containers = [];

export async function setup(_config: any) {
  console.log("Setting up global environment");
  const postgresContainer = await initializePostgres();
  global.containers.push(postgresContainer);
}

async function initializePostgres() {
  console.log("Starting postgres container");
  const postgresContainer = await new PostgreSqlContainer().start();

  process.env.DATABASE_URL = postgresContainer.getConnectionUri();

  return postgresContainer;
}
