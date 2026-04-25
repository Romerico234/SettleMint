# SettleMint Service

Backend API for SettleMint. The service coordinates wallet-based authentication, MongoDB persistence, expense and cycle workflows, and backend-side integrations such as blockchain verification and IPFS/archive handling.

## Service Structure

Top-level directories:

- `cmd` → Executable entrypoints
- `internal` → Application code

Inside `internal`:
- `app` → Composition root and module wiring
- `core` → Shared config, database, and HTTP server infrastructure
- `modules` → Feature modules 
- `integrations` → Integration clients and types for blockchain and IPFS

Request flow:

1. `cmd/api/main.go` loads config and starts the HTTP server
2. `internal/app/app.go` connects to MongoDB and builds the application modules
3. `internal/core/server/http_router.go` mounts all modules
4. Each feature follows `routehandler -> service -> datastore`

## Module Convention

Feature module layout:

- `<feature>_types.go`
- `<feature>_datastore.go`
- `<feature>_service.go`
- `<feature>_routehandler.go`

Example:

- `internal/modules/user/user_types.go`
- `internal/modules/user/user_datastore.go`
- `internal/modules/user/user_service.go`
- `internal/modules/user/user_routehandler.go`

This module structure keeps feature code consistent across the service.

## Database

The service uses MongoDB.

Environment split:
- local development: `settlemint_db_dev`
- production: `settlemint_db_prod`

## Environment Setup

Copy the example file:

```bash
cp settlemint-service/.env.example settlemint-service/.env
```

Primary runtime settings:

- `APP_ENV`
- `PORT`
- `MONGODB_URI`
- `MONGODB_DATABASE`
- `AUTH_TOKEN_SECRET`
- `CORS_ALLOWED_ORIGIN`
- `SETTLEMENT_NETWORK`
- `SETTLEMENT_RPC_URL`
- `SETTLEMENT_CHAIN_ID`
- `SETTLEMENT_PROOF_ADDRESS`

Development notes:

- Docker Compose backend: `MONGODB_URI=mongodb://settlemint-mongo:27017`
- Local backend against Docker Mongo: `MONGODB_URI=mongodb://localhost:27017`

## Docker Setup

`docker-compose.yml` starts:

- `settlemint-mongo` → Local MongoDB for development
- `settlemint-service` → The backend API container

Mongo data is stored in a named Docker volume, so rebuilding the backend does not wipe the local database.

Data is normally preserved across:

- `docker compose up --build`
- `docker compose restart`
- `docker compose down`

Data is removed only when the volume is explicitly removed, for example:

```bash
docker compose down -v
```

## Build And Run

### Option 1: Run Everything In Docker

From `settlemint-service`:

```bash
docker compose up --build -d
```

The API is available at:

```text
http://localhost:8080
```

Stop the stack:

```bash
docker compose down
```

### Option 2: Mongo In Docker, Backend Local

Start Mongo only:

```bash
docker compose up -d settlemint-mongo
```

Run the backend locally from `settlemint-service`:

```bash
go run ./cmd/api
```

Use this setting in `.env` for this mode:

```env
MONGODB_URI=mongodb://localhost:27017
```

## Build Details

Build without Docker:

```bash
go build ./cmd/api
```

Run tests:

```bash
go test ./...
```

---
