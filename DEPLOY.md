# Deployment

Production setup for the Kinetic Time Machine app.

## Architecture

```
Internet (port 443)
       │
       ▼
   ┌─────────┐
   │  Caddy  │  ◄── auto-issues Let's Encrypt cert
   └─────────┘
    /api  /photos  /static → backend (FastAPI on :8000)
    everything else        → frontend (nginx serving React static build)
```

All three services run as Docker containers on a single host via `docker-compose.prod.yml`.
Persistent data (SQLite DB + photo storage) lives in `./data` on the host.

## Requirements

- Linux host with Docker + Docker Compose
- A domain name pointing at the host's public IP
- Ports 80 and 443 reachable from the internet (for Let's Encrypt)
- ~1 GB RAM, ~5 GB disk

## Setup

1. Install Docker:
   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker $USER
   # log out and back in
   ```

2. Clone the repo:
   ```bash
   git clone https://github.com/eukota/kinetic-time-machine.git
   cd kinetic-time-machine
   ```

3. Edit `Caddyfile` and replace `kinetic.eukota.com` with your own domain.

4. Make sure DNS resolves to the host's public IP: `dig your.domain.com`.

5. Bring it up:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```

   Caddy will automatically request a TLS cert from Let's Encrypt on first request.

6. Seed the racer list:
   ```bash
   docker compose -f docker-compose.prod.yml run --rm backend python seed_teams.py
   ```

7. Visit your domain. Done.

## Updating

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

The SQLite DB and `data/photos/` survive rebuilds because they're host-mounted.

## Backups

Everything important lives under `./data/`:

```bash
tar czf kinetic-backup-$(date +%F).tar.gz data/
```
