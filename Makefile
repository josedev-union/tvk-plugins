APP_ENV?=staging
COMMIT_HASH?=$(shell git rev-parse HEAD)
PROJECT_ID?=dentrino-staging
IMAGE_NAME?=gcr.io/$(PROJECT_ID)/dentrino-simulations-api
COMMIT_IMAGE?=$(IMAGE_NAME):$(COMMIT_HASH)
LATEST_IMAGE=$(IMAGE_NAME):latest-$(APP_ENV)
APP_PATH?=.

image_tag:
	@echo $(COMMIT_IMAGE)

build:
	docker build -t $(COMMIT_IMAGE) .

push: build
	docker push $(COMMIT_IMAGE)

update_latest: push
	$(call update-latest)

deploy_api:
	kubectl -n$(APP_ENV) set image deployment/dentrino-simulations-api dentrino-simulations-api=$(COMMIT_IMAGE)

deploy_webapp:
	kubectl -n$(APP_ENV) set image deployment/dentrino-instant-simulations dentrino-instant-simulations=$(COMMIT_IMAGE)

deploy: deploy_api deploy_webapp

rollback:
	$(call update-latest)
	deploy

define update-latest
	docker tag $(COMMIT_IMAGE) $(LATEST_IMAGE)
	docker push $(LATEST_IMAGE)
endef
