# SettleMint Service Backend Setup

## Architecture

At the top level of the service:

- `cmd`: executable entrypoints
- `internal`: all application code

Inside `internal`:
- `app`: composition root
- `core`: grouped shared infrastructure
- `modules`: feature modules grouped together

The idea is: `app` is the composition/orchestration concern, `core` groups shared infrastructure concerns like config, db, and server, and `modules` contains business features.

The current request flow is:

1. `cmd/api/main.go` loads config and starts the HTTP server.
2. `internal/app/app.go` creates the Postgres pool, ensures schema, and builds modules.
3. `internal/core/server/http_router.go` mounts every module onto the shared router.
4. Inside a feature module, requests move through:
   `routehandler -> service -> datastore`
    - Routehandler files own route registration and request/response handling
    - Services own business logic
    - Datastores own SQL/persistence

## Module Convention

Each feature inside `internal/modules/<feature>` should follow the same naming pattern:

- `<feature>_types.go`
  - DTOs and domain shapes
- `<feature>_datastore.go`
  - persistence and SQL access
- `<feature>_service.go`
  - business logic
- `<feature>_routehandler.go`
  - route registration and request/response handling

Example:

- `internal/modules/user/user_types.go`
- `internal/modules/user/user_datastore.go`
- `internal/modules/user/user_service.go`
- `internal/modules/user/user_routehandler.go`

When adding a new feature like `groups`, `expenses`, or `cycles`, follow the same structure so the only new work is the feature logic itself.

## Prerequisites

To run the backend in its current setup, you only need **Docker Desktop** installed and running.

## Environment Setup

Inside `settlemint-service`, create a `.env` file. You can copy from `.env.example`:

```bash
cp settlemint-service/.env.example settlemint-service/.env
```

Replace the environment variables with the correct values.

Set the application environment with:

- `APP_ENV=development` for local development
- `APP_ENV=production` for deployed production

For Supabase-backed auth and database access, set:

- `DATABASE_URL` to your Supabase Postgres pooler/session-mode connection string
- `DB_MIN_CONNS` to the minimum number of pooled Postgres connections
- `DB_MAX_CONNS` to the maximum number of pooled Postgres connections
- `SUPABASE_URL` to your project URL
- `SUPABASE_PUBLISHABLE_KEY` for token verification requests from this service
- `CORS_ALLOWED_ORIGIN` to your frontend dev URL, usually `http://localhost:5173`

The backend now validates configuration explicitly:

- in development, `APP_ENV` defaults to `development`
- in development, `CORS_ALLOWED_ORIGIN` defaults to `http://localhost:5173`
- in production, `CORS_ALLOWED_ORIGIN` must be set explicitly
- in production, `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` must be set explicitly

After that, authenticated frontend requests can call `GET /auth/me` with a Supabase bearer token to verify the wallet-backed session inside this service.

The backend also provisions a `user_profiles` table automatically on startup and exposes:

- `GET /users/me` to load the signed-in user's profile
- `PUT /users/me` to update `displayName`

## Database Notes

The Postgres pool is configured explicitly in `internal/core/db/postgres_pool.go` and currently defaults to:

- `DB_MIN_CONNS=1`
- `DB_MAX_CONNS=5`

The schema bootstrap lives in `internal/core/db/schema_bootstrap.go`. It is structured as an ordered list of schema steps so future tables can be added intentionally instead of expanding one large SQL blob.

As the backend grows, the recommended pattern is:

- keep `EnsureSchema(...)` as the single bootstrap entrypoint
- add one named schema step per table or schema concern
- keep table creation SQL grouped by domain concern

For example, future additions can look like:

- `ensureGroupsTable`
- `ensureGroupMembershipsTable`
- `ensureCyclesTable`
- `ensureExpensesTable`

## Running the Backend

Inside `settlemint-service`, run:

```bash
docker compose up --build -d
```
If successful, the API should be available at: `http://localhost:8080`.

## Stopping the Backend

To stop the backend container:

```bash
docker compose down
```

## Rebuilding After Changes

If you change backend code, rebuild and restart with:

```bash
docker compose up --build -d
```

If needed, do a fresh restart:

```bash
docker compose down
docker compose up --build -d
```

## Using the Makefile (Optional)

Use this only if you want to run the backend outside Docker. Inside `settlemint-service`, run Make commands like this:

```bash
make <target>
```

**Available Commands:**
- run
- build
- tidy
