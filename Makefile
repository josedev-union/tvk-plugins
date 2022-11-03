APP_ENV?=staging
COMMIT_HASH?=$(shell git rev-parse HEAD)
IMAGE_NAME=gcr.io/dentrino-production/dentrino-simulations-api
COMMIT_IMAGE?=$(IMAGE_NAME):$(COMMIT_HASH)
LATEST_IMAGE=$(IMAGE_NAME):latest
APP_PATH?=.
BASE_IMAGE_NAME=$(IMAGE_NAME)-base

build:
	docker build -t $(COMMIT_IMAGE) .

push: build
	docker push $(COMMIT_IMAGE)

update_latest: push
	$(call update-latest)

deploy: update_latest
	$(call update-cloud)

rollback:
	$(call update-latest)
	$(call update-cloud)

build_base: check_base_version
	docker build -t $(BASE_IMAGE_NAME):$(VERSION) -f Dockerfile.base .
	docker build -t $(BASE_IMAGE_NAME):latest -f Dockerfile.base .

push_base: build_base
	docker push $(BASE_IMAGE_NAME):$(VERSION)
	docker push $(BASE_IMAGE_NAME):latest

check_base_version:
ifndef VERSION
	$(error VERSION env var must be passed e.g VERSION=1.0.5)
endif
	@if ! grep -q ${VERSION} Dockerfile.base; then \
		echo "Dockerfile.base is not labeled as version ${VERSION}, please change and commit it."; \
		exit 0; \
	fi

define update-latest
	docker tag $(COMMIT_IMAGE) $(LATEST_IMAGE)
	docker push $(LATEST_IMAGE)
endef

define update-cloud
  kubectl -n$(APP_ENV) set image deployment/dentrino-simulations-api dentrino-simulations-api=$(COMMIT_IMAGE)
  kubectl -n$(APP_ENV) set image deployment/dentrino-instant-simulations dentrino-instant-simulations=$(COMMIT_IMAGE)
endef
