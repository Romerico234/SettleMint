# Settlement Service Backend Setup

## Prerequisites

To run the backend in its current setup, you only need **Docker Desktop** installed and running.


## Environment Setup

Inside `settlement-service`, create a `.env` file. You can copy from `.env.example`:

```bash
cp settlement-service/.env.example settlement-service/.env
```

Replace the environment variables with the correct secrets.

## Running the Backend

Inside `settlement-service`, run:

```bash
docker compose up --build
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
docker compose up --build
```

If needed, do a fresh restart:

```bash
docker compose down
docker compose up --build
```

## Using the Makefile (Optional)

Use this only if you want to run the backend outside Docker. Inside `settlement-service`, run Make commands like this:

```bash
make <target>
```

**Available Commands:**
- run
- build
- tidy