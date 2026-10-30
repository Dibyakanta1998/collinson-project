IMAGE_NAME ?= claimlens-ai-test

.PHONY: setup dev docker-up docker-down build test lint typecheck verify

setup:
	@test -f .env || cp .env.example .env
	npm install

dev: docker-up

docker-up:
	docker compose up --build

docker-down:
	docker compose down

build:
	docker build --target builder -t $(IMAGE_NAME)-build .

test:
	docker build --target test -t $(IMAGE_NAME) .
	docker run --rm $(IMAGE_NAME) npm test

lint:
	docker build --target test -t $(IMAGE_NAME) .
	docker run --rm $(IMAGE_NAME) npm run lint

typecheck:
	docker build --target test -t $(IMAGE_NAME) .
	docker run --rm $(IMAGE_NAME) npm run typecheck

verify: lint typecheck test build
