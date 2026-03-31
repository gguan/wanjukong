REGISTRY := ghcr.io/gguan/wanjukong
PLATFORM := linux/amd64
APPS     := api web admin

TAG := $(or $(shell git rev-parse --short HEAD 2>/dev/null),latest)

# 服务器连接（从 .env.deploy 读取或环境变量）
DEPLOY_HOST ?= $(shell grep DEPLOY_HOST .env.deploy 2>/dev/null | cut -d= -f2)
DEPLOY_USER ?= $(shell grep DEPLOY_USER .env.deploy 2>/dev/null | cut -d= -f2)

.PHONY: all build push login deploy status logs $(APPS:%=build-%) $(APPS:%=push-%) $(APPS:%=deploy-%) $(APPS:%=logs-%)

# ─── Build & Push ────────────────────────────

all: push

login:
	docker login ghcr.io

build-%:
	docker buildx build \
		--platform $(PLATFORM) \
		-f apps/$*/Dockerfile \
		-t $(REGISTRY)-$*:$(TAG) \
		-t $(REGISTRY)-$*:latest \
		--load \
		.

push-%:
	docker buildx build \
		--platform $(PLATFORM) \
		-f apps/$*/Dockerfile \
		-t $(REGISTRY)-$*:$(TAG) \
		-t $(REGISTRY)-$*:latest \
		--push \
		.

build: $(APPS:%=build-%)
push: $(APPS:%=push-%)

# ─── Deploy ──────────────────────────────────

deploy:
	@echo "▶ Deploying all to $(DEPLOY_HOST)..."
	ssh $(DEPLOY_USER)@$(DEPLOY_HOST) "cd /opt/wanjukong && bash deploy/deploy.sh all"

deploy-%:
	@echo "▶ Deploying $* to $(DEPLOY_HOST)..."
	ssh $(DEPLOY_USER)@$(DEPLOY_HOST) "cd /opt/wanjukong && bash deploy/deploy.sh $*"

rollback:
	@if [ -z "$(TAG)" ]; then echo "Usage: make rollback TAG=<git-short-hash>"; exit 1; fi
	@echo "▶ Rolling back to $(TAG)..."
	ssh $(DEPLOY_USER)@$(DEPLOY_HOST) " \
		cd /opt/wanjukong && \
		docker pull $(REGISTRY)-api:$(TAG) && \
		docker pull $(REGISTRY)-web:$(TAG) && \
		docker pull $(REGISTRY)-admin:$(TAG) && \
		docker tag $(REGISTRY)-api:$(TAG) $(REGISTRY)-api:latest && \
		docker tag $(REGISTRY)-web:$(TAG) $(REGISTRY)-web:latest && \
		docker tag $(REGISTRY)-admin:$(TAG) $(REGISTRY)-admin:latest && \
		docker compose up -d --remove-orphans && \
		echo 'Rollback to $(TAG) complete'"

# ─── Helpers ─────────────────────────────────

status:
	ssh $(DEPLOY_USER)@$(DEPLOY_HOST) "cd /opt/wanjukong && docker compose ps"

logs:
	ssh $(DEPLOY_USER)@$(DEPLOY_HOST) "cd /opt/wanjukong && docker compose logs --tail=50 -f"

logs-%:
	ssh $(DEPLOY_USER)@$(DEPLOY_HOST) "cd /opt/wanjukong && docker compose logs --tail=50 -f $*"
