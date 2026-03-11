.PHONY: build-python build-js build publish-python publish-js publish install-js clean

# ── Python ──────────────────────────────────────────────────────────

build-python:
	cd python && python -m build

publish-python:
	cd python && twine upload dist/*

# ── JavaScript ──────────────────────────────────────────────────────

install-js:
	cd js && npm install

build-js:
	cd js && npm run build

publish-js:
	cd js && npm publish

# ── All ─────────────────────────────────────────────────────────────

build: build-python build-js

publish: publish-python publish-js

clean:
	rm -rf python/dist python/*.egg-info js/dist js/node_modules
