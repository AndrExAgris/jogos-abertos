# Jogos Abertos: atalhos do projeto.
# A porta do site vem de PORTA (padrão 8080): make up PORTA=9000

COMPOSE := docker compose
PNPM := corepack pnpm
PORTA ?= 8080
export PORTA

.PHONY: help up down restart clean update logs status dev test lint typecheck build apk

help: ## Mostra os alvos
	@grep -E '^[a-z]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  %-10s %s\n", $$1, $$2}'

up: ## Sobe o container (faz o build se precisar)
	$(COMPOSE) up -d --build
	@echo "Site em http://localhost:$(PORTA)"

down: ## Para e remove o container
	$(COMPOSE) down

restart: down up ## Para e sobe de novo

clean: ## Remove container, imagem e volumes do projeto
	$(COMPOSE) down --rmi local --volumes --remove-orphans

update: ## git pull, rebuild e sobe
	git pull --ff-only
	$(COMPOSE) build --pull
	$(COMPOSE) up -d

logs: ## Segue os logs
	$(COMPOSE) logs -f

status: ## Estado do container
	$(COMPOSE) ps

dev: ## Servidor de desenvolvimento (Vite)
	$(PNPM) install
	$(PNPM) dev

test: ## Testes dos núcleos
	$(PNPM) test

lint: ## ESLint
	$(PNPM) lint

typecheck: ## Checagem de tipos
	$(PNPM) typecheck

build: ## Build do app web em apps/web/dist
	$(PNPM) build

apk: ## APK de debug (precisa do Android SDK e do Node 22)
	$(PNPM) --filter @ja/web cap:sync
	cd apps/web/android && ./gradlew assembleDebug
	@echo "APK em apps/web/android/app/build/outputs/apk/debug/app-debug.apk"
