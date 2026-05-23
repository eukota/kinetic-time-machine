IMAGE = kgc-backend
# Override at call time: make pull-data HOST=root@1.2.3.4
HOST  ?= root@kinetic.eukota.com
LOCAL_BACKUP ?= ~/Backups/kinetic-data

.PHONY: help build up down test seed pull-data push-data

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

build: ## Build all Docker images
	docker compose build

up: ## Start backend + frontend with hot-reload (Ctrl+C to stop)
	docker compose up

down: ## Stop and remove containers
	docker compose down

test: ## Run backend tests inside container
	docker compose run --rm -e DATABASE_URL=sqlite:///:memory: backend python -m pytest tests/ -v

seed: ## Seed database with 2026 KGC racers
	docker compose run --rm backend python seed_teams.py

orient-photos: ## Fix EXIF rotation on disk and regenerate variants
	docker compose run --rm backend python backfill_orientation.py

pull-data: ## Backup data/ from production host to local (override: HOST=user@ip)
	mkdir -p $(LOCAL_BACKUP)
	rsync -avz --info=progress2 $(HOST):~/kinetic-time-machine/data/ $(LOCAL_BACKUP)/

push-data: ## Restore local data/ back up to production host
	rsync -avz --info=progress2 $(LOCAL_BACKUP)/ $(HOST):~/kinetic-time-machine/data/
