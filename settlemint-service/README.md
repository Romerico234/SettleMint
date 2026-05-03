# SettleMint Service

Backend API for SettleMint.

## Overview

- Handles wallet authentication, persistence, expense and cycle workflows, and backend integrations.
- Main entrypoints live in `cmd`.
- Application code lives in `internal`.
- Feature modules follow `routehandler -> service -> datastore`.
- MongoDB is used for persistence.

## Structure

- `internal/app`: app wiring
- `internal/core`: shared config, database, and server setup
- `internal/modules`: feature modules
- `internal/integrations`: blockchain and IPFS integrations

Feature modules typically use:

- `<feature>_types.go`
- `<feature>_datastore.go`
- `<feature>_service.go`
- `<feature>_routehandler.go`

## Environment

Copy `.env.example` to `.env`, then configure:

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

Common MongoDB values:

- Docker Compose backend: `mongodb://settlemint-mongo:27017`
- Local backend with Docker Mongo: `mongodb://localhost:27017`

## Run

Run everything in Docker:

```bash
docker compose up --build -d
```

Run Mongo in Docker and the backend locally:

```bash
docker compose up -d settlemint-mongo
go run ./cmd/api
```

The API is available at `http://localhost:8080`.

## Notes

- Mongo data is stored in a Docker volume and is usually preserved across normal restarts.
- `docker compose down -v` removes the local Mongo volume.
- Development and production typically use different Mongo database names.

## Build

```bash
go build ./cmd/api
go test ./...
```
