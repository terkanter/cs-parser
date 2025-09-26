# Fastify Turbo Monorepo Starter

This is a starter project for building an API server using Typescript, Fastify v5 and Kysely with Postgres.

## Features

- Fastify v5 with Typescript.
- It is setup as a monorepo using [`turbo`](https://turbo.build/) and [`pnpm`](https://pnpm.io/).
- Outputs OpenAPI schema for the API and has a web UI for viewing it.
- A sample REST test is included using Vitest.
- Sample database migrations / repositories are included using Kysely.
- An client SDK package is included to generate typescript client code from the API schema.
- An error handler package is included to handle errors and return a consistent response.
- Code generators using `turbo gen` to create new API endpoints and database tables.
- Publish packages to npm and generate changelogs and releases using [`changesets`](https://github.com/changesets/changesets).

## Libraries and tools used

- [`typescript`](https://www.typescriptlang.org/)
- [`pnpm`](https://pnpm.io/) for package management
- [`changesets`](https://github.com/changesets/changesets) for version and changelogs
- [`commitlint`](https://commitlint.js.org/) for commit message linting
- [`turbo`](https://turbo.build/) for monorepo management
- [`fastify`](https://www.fastify.io/) for the API server framework
- [`hash-runner`](https://github.com/theogravity/hash-runner) for caching builds
- [`prisma`](https://www.prisma.io/) for the database ORM and migrations
- [`zod`](https://zod.dev/) for runtime type validation
- [`znv`](https://github.com/lostpebble/znv) for environment variable validation
- [`postgres`](https://www.postgresql.org/) + pgAdmin for the database
- [`testcontainers`](https://www.testcontainers.org/) for testing with a sandboxed postgres instance
- [`vitest`](https://vitest.dev/) for endpoint testing
- [`loglayer`](https://github.com/theogravity/loglayer) for formatted logging
- [`biome`](https://biomejs.dev/) for linting and formatting
- [`syncpack`](https://jamiemason.github.io/syncpack/) for keeping package versions in sync
- [`Hey API`](https://heyapi.vercel.app/) for generating the backend SDK using the generated OpenAPI schema from the backend

## Setup

- [Install docker](https://docs.docker.com/engine/install/)
- [Install pnpm](https://pnpm.io/installation)
- `pnpm install turbo --global`
- `pnpm install`
- Copy `apps/backend/.env.example` to `apps/backend/.env`

Start local postgres server:

`docker compose up -d`

Generate Prisma client and setup database:

```bash
# Generate Prisma client
pnpm db:generate

# Run database migrations
pnpm db:migrate

# (Optional) Seed the database
pnpm db:seed
```

In Github settings (to publish packages and changelogs):

- Edit `.changeset/config.json` to your repository
- `Code and Automation > Actions > Workflow permissions`
  - `Read and write permissions`
  - `Allow Github Actions to create and approve pull requests`
- `Secrets and variables > Actions`
  - `Repository Secrets > Actions > create NPM_TOKEN > your npm publish token`

## Development

`turbo watch dev`

- API server: http://localhost:3080
- OpenAPI docs: http://localhost:3080/docs
- PGAdmin: http://localhost:5050

## Testing

Make sure docker is running as it uses `testcontainers` to spin up a
temporary postgres database.

`turbo test`

## Build

`turbo build`

## Generate scaffolding

Generators for the following:

- New API endpoints + tests
- Database tables and repositories

`turbo gen`

## Database operations

- Generate Prisma client: `pnpm db:generate`
- Create and run migration: `pnpm db:migrate`
- Deploy migrations: `pnpm db:deploy`
- Push schema changes: `pnpm db:push`
- Open Prisma Studio: `pnpm db:studio`
- Seed database: `pnpm db:seed`
- Reset database: `pnpm db:reset`

## Update all dependencies

`pnpm syncpack:update`

## Development workflow / Add a new CHANGELOG.md entry + package versioning

- Create a branch and make changes.
- Create a new changeset entry: `pnpm changeset`
- Commit your changes and create a pull request.
- Merge the pull request
- A new PR will be created with the changeset entry/ies.
- When the PR is merged, the package versions will be bumped and published and the changelog updated.

**note: To publish a package, `private: false` must be set in the package.json**

## Troubleshooting

### turbo watch dev failing

```
• Packages in scope: @repo/api, @repo/api-client, @repo/api-errors, @repo/tsconfig
• Running dev in 4 packages
• Remote caching disabled
  × failed to connect to daemon
  ╰─▶ server is unavailable: channel closed
```

Try:

`turbo daemon clean`

Then try running `turbo watch dev` again.

If you get:

```
• Packages in scope: @repo/api, @repo/api-client, @repo/api-errors, @repo/tsconfig
• Running dev in 4 packages
• Remote caching disabled
  × discovery failed: bad grpc status code: The operation was cancelled
```

Wait a few minutes and try again.

Related:

- https://github.com/vercel/turborepo/issues/8491
