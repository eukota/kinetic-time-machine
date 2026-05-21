IMAGE = kgc-backend

.PHONY: help build up down test

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
