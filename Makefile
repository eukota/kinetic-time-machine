IMAGE  = kgc-backend
ROOT   = $(shell pwd)

.PHONY: help build run test stop fe

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

build: ## Build the backend Docker image
	docker build -t $(IMAGE) ./backend

run: ## Run backend on :8000 with persistent data volumes
	docker run --rm -p 8000:8000 \
	  -v $(ROOT)/data:/data \
	  -e PHOTOS_DIR=/data/photos \
	  -e DATABASE_URL=sqlite:////data/kgc_race.db \
	  $(IMAGE)

test: ## Run backend tests inside the container
	docker run --rm \
	  -e DATABASE_URL=sqlite:///:memory: \
	  $(IMAGE) python -m pytest tests/ -v

stop: ## Stop any running backend container
	-docker ps -q --filter ancestor=$(IMAGE) | xargs docker stop 2>/dev/null

fe: ## Start the frontend dev server (requires backend running)
	cd frontend && npm run dev
