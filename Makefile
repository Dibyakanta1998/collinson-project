IMAGE_NAME ?= claimlens-ai-test

.PHONY: setup dev docker-up docker-down build test test-integration test-e2e lint typecheck eval eval-seed eval-live studio verify

setup:
	@test -f .env || cp .env.example .env
	npm install

dev:
	npx next dev

docker-up:
	docker compose up --build

docker-down:
	docker compose down

build:
	docker build --target builder -t $(IMAGE_NAME)-build .

test:
	docker build --target test -t $(IMAGE_NAME) .
	docker run --rm $(IMAGE_NAME) npm test

test-integration:
	docker build --target test -t $(IMAGE_NAME) .
	docker run --rm $(IMAGE_NAME) npm run test:integration

test-e2e:
	npm run test:e2e

lint:
	docker build --target test -t $(IMAGE_NAME) .
	docker run --rm $(IMAGE_NAME) npm run lint

typecheck:
	docker build --target test -t $(IMAGE_NAME) .
	docker run --rm $(IMAGE_NAME) npm run typecheck

eval:
	npm run eval

eval-seed:
	npm run eval:seed

eval-live:
	npm run eval:live

studio:
	npx mastra dev --dir src/mastra

verify: lint typecheck test eval
