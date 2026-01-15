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
	@echo "$(GREEN)Stopping backend...$(RESET)"
	@# Kill process from PID file if exists
	@if [ -f .backend.pid ]; then \
		PID=$$(cat .backend.pid); \
		if kill -0 $$PID 2>/dev/null; then \
			kill $$PID 2>/dev/null || true; \
			echo "Stopped PID $$PID from .backend.pid"; \
		fi; \
		rm -f .backend.pid; \
	fi
	@# Kill any remaining bun processes running the backend
	@pkill -f "bun.*src/index.ts" 2>/dev/null || true
	@pkill -f "bun run src/index.ts" 2>/dev/null || true
	@pkill -f "bun --watch src/index.ts" 2>/dev/null || true
	@# Also kill any bun run dev processes (which spawn backend)
	@pkill -f "bun run dev:backend" 2>/dev/null || true
	@# Give processes time to die
	@sleep 1
	@# Force kill if still running
	@pkill -9 -f "bun.*src/index.ts" 2>/dev/null || true
	@echo "$(GREEN)Backend stopped$(RESET)"

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

clean: backend-stop ## Stop everything and clean up
	@echo "$(GREEN)Stopping all Docker containers...$(RESET)"
	@docker-compose down 2>/dev/null || true
	@docker-compose -f docker-compose.hybrid.yml down 2>/dev/null || true
	@docker-compose -f docker-compose.ssl.yml down 2>/dev/null || true
	@docker-compose -f docker-compose.hybrid.ssl.yml down 2>/dev/null || true
	@rm -f .backend.pid
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

# =====================
# PWA & SSL (for mobile app access)
# =====================

ssl-certs: ## Generate SSL certificates with mkcert
	@echo "$(GREEN)Generating SSL certificates...$(RESET)"
	@chmod +x scripts/generate-ssl-certs.sh
	@./scripts/generate-ssl-certs.sh

ssl-icons: ## Generate PWA icons from cat.svg
	@echo "$(GREEN)Generating PWA icons...$(RESET)"
	@chmod +x scripts/generate-icons.sh
	@./scripts/generate-icons.sh

ssl-setup: ssl-certs ssl-icons ## Full PWA/SSL setup (certs + icons)
	@echo "$(GREEN)PWA setup complete!$(RESET)"

ssl-up: ## Start with SSL (for PWA/mobile access)
	@echo "$(GREEN)Starting with SSL...$(RESET)"
	@if [ ! -f scripts/ssl/cert.pem ]; then \
		echo "$(YELLOW)SSL certificates not found. Generating...$(RESET)"; \
		$(MAKE) ssl-certs; \
	fi
	docker-compose -f docker-compose.ssl.yml up -d --build
	@echo ""
	@echo "$(GREEN)✅ Home Monitor with SSL started!$(RESET)"
	@echo "  - HTTP:  http://localhost (redirects to HTTPS)"
	@echo "  - HTTPS: https://localhost"
	@echo "  - HTTPS: https://home-monitor.local (add to /etc/hosts)"

ssl-down: ## Stop SSL containers
	docker-compose -f docker-compose.ssl.yml down

ssl-logs: ## Tail SSL Docker logs
	docker-compose -f docker-compose.ssl.yml logs -f

hybrid-ssl: backend-local docker-frontend-hybrid-ssl ## Hybrid mode with SSL (Bluetooth + PWA)
	@echo "$(GREEN)Hybrid SSL mode started:$(RESET)"
	@echo "  - Backend: localhost:$(API_PORT) (with Bluetooth)"
	@echo "  - Frontend: https://localhost (Docker with SSL)"

docker-frontend-hybrid-ssl: ## Start frontend with SSL in Docker (hybrid mode)
	@echo "$(GREEN)Starting frontend with SSL (hybrid mode)...$(RESET)"
	@if [ ! -f scripts/ssl/cert.pem ]; then \
		echo "$(YELLOW)SSL certificates not found. Generating...$(RESET)"; \
		$(MAKE) ssl-certs; \
	fi
	docker-compose -f docker-compose.hybrid.ssl.yml up -d --build

