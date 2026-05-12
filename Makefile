# FlowAssist — cross-platform tasks (GNU Make)
#
# Requires: GNU Make + Node.js + npm on PATH.
#   Windows PowerShell (no Make installed): run .\make.ps1 <target> or .\make.cmd <target>
#   Windows: Git Bash / MSYS2 / WSL: use `make` where `sh` and `uname` are available
#   (Visual Studio `nmake` is a different tool and will not run this file.)
#
# Run from the repository root (the directory that contains this Makefile).

.DEFAULT_GOAL := help

# OS label for messages (Darwin / Linux / *-NT-* / etc.)
UNAME := $(shell uname -s 2>/dev/null || echo Unknown)

.PHONY: help check-tools check-deps install start start-debug pack dist dist-local \
	test-e2e test-ui-map test-regression test clean-dist doctor

help:
	@echo "FlowAssist — $(UNAME)"
	@echo ""
	@echo "Setup:"
	@echo "  make install          Install npm dependencies (runs check-tools first)"
	@echo "  make doctor           Print OS, Node, npm, and whether node_modules exists"
	@echo "  make check-tools      Require node + npm on PATH"
	@echo "  make check-deps       Require node + npm + node_modules + electron"
	@echo ""
	@echo "Run app:"
	@echo "  make start            npm run start"
	@echo "  make start-debug      npm run start:debug"
	@echo ""
	@echo "Build:"
	@echo "  make pack             Unpacked app under dist/ (electron-builder --dir)"
	@echo "  make dist             Interactive release + Windows dist (see README)"
	@echo "  make dist-local       Dist without bumping version"
	@echo ""
	@echo "Tests:"
	@echo "  make test-regression  Playwright regression suite"
	@echo "  make test-e2e         Full Playwright config"
	@echo "  make test-ui-map      UI map discovery spec"
	@echo ""
	@echo "Other:"
	@echo "  make clean-dist       Remove dist/ directory"
	@echo ""

# --- dependency gates ----------------------------------------------------------

check-tools:
	@test -f package.json || (echo "ERROR: package.json not found. Run make from the repo root." && exit 1)
	@command -v node >/dev/null 2>&1 || (echo "ERROR: Node.js (node) is not installed or not on PATH." && exit 1)
	@command -v npm >/dev/null 2>&1 || (echo "ERROR: npm is not installed or not on PATH." && exit 1)

check-deps: check-tools
	@test -d node_modules || (echo "ERROR: node_modules missing. Run: make install" && exit 1)
	@test -f node_modules/electron/package.json || (echo "ERROR: Electron package missing. Run: make install" && exit 1)

doctor: check-tools
	@echo "== FlowAssist doctor =="
	@echo "UNAME_S : $(UNAME)"
	@echo "PWD     : $$(pwd)"
	@node -p "'node    : ' + process.version"
	@npm -v | sed 's/^/npm     : /'
	@if [ -d node_modules ]; then echo "node_modules: present"; else echo "node_modules: MISSING (make install)"; fi
	@if [ -d node_modules ]; then \
		if [ -f node_modules/electron/package.json ]; then echo "electron    : present"; else echo "electron    : MISSING"; fi; \
	fi
	@echo "======================="

# --- setup -------------------------------------------------------------------

install: check-tools
	npm install

# --- app ---------------------------------------------------------------------

start: check-deps
	npm run start

start-debug: check-deps
	npm run start:debug

# --- build -------------------------------------------------------------------

pack: check-deps
	npx electron-builder --dir

dist: check-deps
	npm run dist

dist-local: check-deps
	npm run dist:local

clean-dist:
	@echo "Removing dist/"
	@rm -rf dist

# --- tests -------------------------------------------------------------------

test-e2e: check-deps
	npm run test:e2e

test-ui-map: check-deps
	npm run test:ui-map

test-regression: check-deps
	npm run test:regression

test: check-deps test-regression
