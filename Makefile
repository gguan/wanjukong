REGISTRY := ghcr.io/gguan/wanjukong
PLATFORM := linux/amd64
APPS     := api web admin

# Use git short hash as tag, fallback to "latest"
TAG := $(or $(shell git rev-parse --short HEAD 2>/dev/null),latest)

.PHONY: all build push login $(APPS:%=build-%) $(APPS:%=push-%)

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
