# Common commands for the shared Firebase backend. Run `make` to list them.

PROJECT ?= campusfind-26ac2
# Rules tests run against the emulator (needs Java 21+) with a demo project,
# never the real one.
TEST_PROJECT := demo-campusfind
# Function name for deploy-fn and logs, e.g. FN=aggregateFeatureUsage
FN ?=

.DEFAULT_GOAL := help
.PHONY: help deps test test-rules test-storage test-functions deploy-rules deploy-fn logs emulators

help: ## List the commands
	@grep -E '^[a-z0-9-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  make %-15s %s\n", $$1, $$2}'

deps: ## Install the packages of the rules tests and the functions
	cd firebase && npm ci
	cd firebase/functions && npm ci

test: test-rules test-storage test-functions ## Every test

test-rules: ## Firestore rules on the emulator
	cd firebase && firebase emulators:exec --only firestore --project $(TEST_PROJECT) 'node rules.test.cjs'

test-storage: ## Storage rules on the emulator
	cd firebase && firebase emulators:exec --only firestore,storage --project $(TEST_PROJECT) 'node storage.test.cjs'

test-functions: ## Cloud Functions unit tests
	cd firebase/functions && npm test

deploy-rules: ## Publish the Firestore and Storage rules
	cd firebase && firebase deploy --only firestore:rules,storage --project $(PROJECT)

deploy-fn: ## Deploy one function (FN=<name>)
	$(if $(FN),,$(error Set FN=<function name>))
	cd firebase && firebase deploy --only functions:$(FN) --project $(PROJECT) --non-interactive

logs: ## Recent logs of one function (FN=<name>)
	$(if $(FN),,$(error Set FN=<function name>))
	cd firebase && firebase functions:log --only $(FN) --project $(PROJECT)

emulators: ## Local emulators for Firestore, Storage and Functions
	cd firebase && firebase emulators:start --only firestore,storage,functions --project $(TEST_PROJECT)
