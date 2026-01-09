.PHONY: help dev backend-local backend-stop docker-up docker-down docker-build logs

# Colors
GREEN  := $(shell tput -Txterm setaf 2)
YELLOW := $(shell tput -Txterm setaf 3)
RESET  := $(shell tput -Txterm sgr0)

# Load API_PORT from .env if exists, default to 3033
API_PORT ?= $(shell grep -E '^API_PORT=' .env 2>/dev/null | cut -d'=' -f2 || echo 3033)

help: ## Show this help
	@echo 'Usage:'
	@echo '  ${YELLOW}make${RESET} ${GREEN}<target>${RESET}'
	@echo ''
	@echo 'Targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  ${YELLOW}%-20s${RESET} %s\n", $$1, $$2}'

# =====================
# Local Development
# =====================

dev: ## Start backend and frontend in dev mode (foreground)
	@echo "$(GREEN)Starting dev servers...$(RESET)"
	bun run dev

backend-local: ## Start backend locally with Bluetooth support (background, persistent)
	@echo "$(GREEN)Starting backend with Bluetooth support...$(RESET)"
	@mkdir -p logs
	@if [ -f .backend.pid ] && kill -0 $$(cat .backend.pid) 2>/dev/null; then \
		echo "$(YELLOW)Backend already running (PID: $$(cat .backend.pid))$(RESET)"; \
	else \
		nohup bun run src/index.ts > logs/backend.log 2>&1 & echo $$! > .backend.pid; \
		echo "$(GREEN)Backend started (PID: $$(cat .backend.pid))$(RESET)"; \
		echo "Logs: tail -f logs/backend.log"; \
	fi

backend-stop: ## Stop the local backend
	@if [ -f .backend.pid ]; then \
		PID=$$(cat .backend.pid); \
		if kill -0 $$PID 2>/dev/null; then \
			kill $$PID; \
			echo "$(GREEN)Backend stopped (PID: $$PID)$(RESET)"; \
		else \
			echo "$(YELLOW)Backend not running$(RESET)"; \
		fi; \
		rm -f .backend.pid; \
	else \
		echo "$(YELLOW)No PID file found$(RESET)"; \
	fi

backend-restart: backend-stop backend-local ## Restart the local backend

backend-logs: ## Tail backend logs
	@tail -f logs/backend.log

# =====================
# Docker (without Bluetooth)
# =====================

docker-build: ## Build Docker images
	@echo "$(GREEN)Building Docker images...$(RESET)"
	docker-compose build

docker-up: ## Start Docker containers (without Bluetooth)
	@echo "$(GREEN)Starting Docker containers...$(RESET)"
	@echo "$(YELLOW)Note: Bluetooth/Hue lamps disabled in Docker$(RESET)"
	docker-compose up -d

docker-down: ## Stop Docker containers
	@echo "$(GREEN)Stopping Docker containers...$(RESET)"
	docker-compose down

docker-logs: ## Tail Docker logs
	docker-compose logs -f

# =====================
# Hybrid Mode (recommended for Bluetooth)
# =====================

hybrid: backend-local docker-frontend-hybrid ## Start local backend + Docker frontend (for Bluetooth support)
	@echo "$(GREEN)Hybrid mode started:$(RESET)"
	@echo "  - Backend: localhost:$(API_PORT) (with Bluetooth)"
	@echo "  - Frontend: localhost:80 (Docker)"

docker-frontend-hybrid: ## Start only the frontend in Docker (pointing to local backend)
	@echo "$(GREEN)Starting frontend container (hybrid mode)...$(RESET)"
	docker-compose -f docker-compose.hybrid.yml up -d --build

docker-frontend: ## Start only the frontend in Docker
	@echo "$(GREEN)Starting frontend container only...$(RESET)"
	docker-compose up -d frontend

# =====================
# Utilities
# =====================

clean: backend-stop docker-down ## Stop everything and clean up
	@rm -f .backend.pid
	@rm -rf logs
	@echo "$(GREEN)Cleaned up$(RESET)"

status: ## Show status of services
	@echo "$(GREEN)=== Backend ===$(RESET)"
	@if [ -f .backend.pid ] && kill -0 $$(cat .backend.pid) 2>/dev/null; then \
		echo "Running (PID: $$(cat .backend.pid))"; \
	else \
		echo "Not running"; \
	fi
	@echo ""
	@echo "$(GREEN)=== Docker ===$(RESET)"
	@docker-compose ps 2>/dev/null || echo "Docker not available"
