# Kinetic Time Machine

A race-day photo tracker for the [Kinetic Grand Championship](https://kineticgrandchampionship.com) — a three-day, human-powered sculpture race through Humboldt County, California.

## What it does

Spectators and crew submit geotagged photos from the course. Each photo is plotted on an interactive map showing the race route across three days (Arcata → Eureka → Crab Park → Ferndale). A gallery view lets anyone browse all submissions in real time, filter by team, and sort chronologically.

## The race

The KGC is one of the most joyfully absurd events in California — human-powered kinetic sculptures racing 42 miles over three days through sand dunes, mud, and open water. It's been running since 1969 out of Humboldt Bay.

I lived in Arcata from 2004–2009 and have been fascinated by the race ever since. Participating in it in some fashion has been a dream for a long time. I moved back to the area in September 2025 — this app is part of making that happen.

## Stack

- **Backend:** FastAPI, SQLite, SQLAlchemy, Pillow (EXIF extraction), Docker
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Leaflet, Zustand
- **Dev:** `make up` starts both services with hot reload

## Running locally

```bash
make build   # build Docker images (once)
make up      # start backend :8000 + frontend :5173
make seed    # populate the 2026 racer list
make test    # run backend tests
```

Open `http://localhost:5173`.
