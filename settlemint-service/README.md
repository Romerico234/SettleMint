# SettleMint Service Backend Setup

## Prerequisites

To run the backend in its current setup, you only need **Docker Desktop** installed and running.


## Environment Setup

Inside `settlemint-service`, create a `.env` file. You can copy from `.env.example`:

```bash
cp settlemint-service/.env.example settlemint-service/.env
```

Replace the environment variables with the correct values.

For Supabase-backed auth and database access, set:

- `DATABASE_URL` to your Supabase Postgres pooler/session-mode connection string
- `SUPABASE_URL` to your project URL
- `SUPABASE_PUBLISHABLE_KEY` for token verification requests from this service
- `CORS_ALLOWED_ORIGIN` to your frontend dev URL, usually `http://localhost:5173`

After that, authenticated frontend requests can call `GET /auth/me` with a Supabase bearer token to verify the wallet-backed session inside this service.

The backend also provisions a `user_profiles` table automatically on startup and exposes:

- `GET /users/me` to load the signed-in user's profile
- `PUT /users/me` to update `displayName`

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
