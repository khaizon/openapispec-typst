NPM ?= npm
SPEC ?= specs/pocketdex.yaml
NAME ?= pocketdex
MODE ?= reference
BUILD_DATE ?=

.PHONY: all build check typecheck fmt fmt-check serve watch tools clean

all: build

build:
	SPEC="$(SPEC)" NAME="$(NAME)" MODE="$(MODE)" BUILD_DATE="$(BUILD_DATE)" $(NPM) run build

check:
	$(NPM) run check

typecheck:
	$(NPM) run typecheck

fmt:
	typstyle -i templates/

fmt-check:
	typstyle --check templates/

serve:
	$(NPM) run serve

watch:
	npx typst watch --root . templates/main.typ dist/$(NAME).pdf

tools:
	./scripts/install-tools.sh

clean:
	$(NPM) run clean
	rm -f dist/$(NAME).pdf dist/index.html
