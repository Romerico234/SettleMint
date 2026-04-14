# SettleMint Service

This service is the backend API for SettleMint. It is responsible for app coordination, wallet-based authentication, MongoDB persistence, and backend-side integrations such as blockchain verification and IPFS/archive workflows.

## Service Structure

At the top level:

- `cmd` → Executable entrypoints
- `internal` → Application code

Inside `internal`:
- `app` → Composition root and module wiring
- `core` → Shared config, database, and HTTP server infrastructure
- `modules` → Feature modules 
- `integrations` → Integration clients and types for blockchain and IPFS

The request flow is:

1. `cmd/api/main.go` loads config and starts the HTTP server
2. `internal/app/app.go` connects to MongoDB and builds the application modules
3. `internal/core/server/http_router.go` mounts all modules
4. Each feature follows `routehandler -> service -> datastore`

## Module Convention

Each feature module should follow this layout:

- `<feature>_types.go`
- `<feature>_datastore.go`
- `<feature>_service.go`
- `<feature>_routehandler.go`

Example:

- `internal/modules/user/user_types.go`
- `internal/modules/user/user_datastore.go`
- `internal/modules/user/user_service.go`
- `internal/modules/user/user_routehandler.go`

This keeps the backend consistent as more domains are added.

## Database

The service uses MongoDB.

Environment Split:
- local development: `settlemint_dev`
- production: `settlemint_prod`

For development, using local Docker Mongo is enough. You do not need a hosted dev cluster unless your team wants a shared remote environment.

## Environment Setup

Copy the example file:

```bash
cp settlemint-service/.env.example settlemint-service/.env
```

The example file contains the important runtime settings:

- `APP_ENV`
- `PORT`
- `MONGODB_URI`
- `MONGODB_DATABASE`
- `AUTH_TOKEN_SECRET`
- `CORS_ALLOWED_ORIGIN`

Development Notes:

- if you run the backend inside Docker Compose, `MONGODB_URI` should be `mongodb://settlemint-mongo:27017`
- if you run the backend locally against Docker Mongo, `MONGODB_URI` can be `mongodb://localhost:27017`

## Docker Setup

`docker-compose.yml` starts:

- `settlemint-mongo` → Local MongoDB for development
- `settlemint-service` → The backend API container

Mongo data is stored in a named Docker volume, so rebuilding the backend does not wipe your local database.

Your data is normally preserved across:

- `docker compose up --build`
- `docker compose restart`
- `docker compose down`

Your data is removed only if you explicitly remove the volume, such as with:

```bash
docker compose down -v
```

## Build And Run

### Option 1: Run Everything In Docker

From `settlemint-service`:

```bash
docker compose up --build -d
```

The API should then be available at:

```text
http://localhost:8080
```

To stop it:

```bash
docker compose down
```

### Option 2: Mongo In Docker, Backend Local

This is usually the best developer experience.

Start Mongo only:

```bash
docker compose up -d settlemint-mongo
```

Then run the backend locally from `settlemint-service`:

```bash
go run ./cmd/api
```

If you use this approach, set:

```env
MONGODB_URI=mongodb://localhost:27017
```

in your local `.env`.

## Build Details

If you want to build without Docker:

```bash
go build ./cmd/api
```

To run tests:

```bash
go test ./...
```

---