APP_ENV?=staging
COMMIT_HASH?=v07
IMAGE_NAME=gcr.io/dentrino-production/api-stress-test
COMMIT_IMAGE?=$(IMAGE_NAME):$(COMMIT_HASH)
LATEST_IMAGE=$(IMAGE_NAME):latest
APP_PATH?=.

build:
	docker build -t $(COMMIT_IMAGE) .

push: build
	docker push $(COMMIT_IMAGE)

update_latest: push
	$(call update-latest)

deploy: update_latest
	$(call update-cloud)

define update-latest
	docker tag $(COMMIT_IMAGE) $(LATEST_IMAGE)
	docker push $(LATEST_IMAGE)
endef

define update-cloud
  kubectl -n$(APP_ENV) set image deployment/api-stress-test api-stress-test=$(COMMIT_IMAGE)
endef
