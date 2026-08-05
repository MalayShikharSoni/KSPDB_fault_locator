# Deployment Guide

This guide is designed for reviewers cloning the repository with no prior context. 

## Prerequisites
- **Docker Engine**: Version 20.10.0+
- **Docker Compose**: Version 2.0.0+
- *No Node.js or PostgreSQL installations are required on the host machine.*

## Quick Start (One Command)
To launch the entire stack (Database, Redis, Backend API, Telemetry Worker, and React UI):

```bash
docker compose up --build
```

### Verification
- **Frontend UI**: Open `http://localhost:5173`. You should immediately see the 1,200 pole grid rendered, proving the database successfully seeded and the SSE stream is connected.
- **Backend API**: Accessible at `http://localhost:3000`.

To safely tear down the environment and wipe volumes:
```bash
docker compose down -v
```

## Environment Variables
The system uses default values optimized for Docker Compose. A `.env` file is purely optional unless you are tearing the system out of Docker.

| Variable | Default Value | Purpose |
|----------|---------------|---------|
| `PORT` | `3000` | Backend Express HTTP port. |
| `DATABASE_URL` | `postgresql://postgres:postgres@db:5432/kspdb` | Connection string to Postgres. |
| `REDIS_URL` | `redis://redis:6379` | BullMQ and Pub/Sub connection. |
| `VITE_API_URL` | *(empty string)* | Used by the frontend. In Docker, relative proxying is handled natively. |

## Troubleshooting Guide

### 1. The Windows Entrypoint Trap (exec format error)
**Symptom:** When running `docker compose up`, the backend container instantly crashes with a cryptic error like `exec format error`, `SIGBUS`, or `start.sh not found`, despite the file existing.
**Cause:** If the repository was cloned on a Windows machine, Git will often convert line endings from LF (Linux) to CRLF (Windows). Alpine Linux cannot interpret the carriage returns inside `start.sh`, causing immediate failure.
**The Fix:** This has already been patched natively in the Dockerfile using `RUN sed -i 's/\r$//' /start.sh`. If you add new shell scripts to the repo, you must apply the same `sed` sanitization or enforce `core.autocrlf false` in your git config.

### 2. Port Conflicts
**Symptom:** `bind: address already in use` error for ports `5432` or `6379`.
**Cause:** You have a local PostgreSQL or Redis instance running on the host machine.
**The Fix:** 
Run `sudo lsof -i :5432` to find the blocking PID, or temporarily map Docker to different ports in `docker-compose.yml` (e.g., `"5433:5432"`).

### 3. Ghost Tickets (Stale Redis Cache)
**Symptom:** You restarted the containers using `docker compose restart`, but the UI shows ghost incident tickets for poles that don't exist in the current seed.
**Cause:** Docker compose preserves named volumes (`pgdata`) and Redis state by default across restarts. 
**The Fix:** Completely flush the state.
```bash
docker compose down -v
docker compose up --build
```
Or flush the Redis cache manually: `docker compose exec redis redis-cli FLUSHALL`.
