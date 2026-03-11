.PHONY: build-python build-js build publish-python publish-js publish \
       install-js test-python test-js test demo clean

# ── Python ──────────────────────────────────────────────────────────

build-python:
	cd python && python -m build

test-python:
	cd python && pytest -v

publish-python:
	cd python && twine upload dist/*

# ── JavaScript ──────────────────────────────────────────────────────

install-js:
	cd js && npm install

build-js:
	cd js && npm run build

test-js:
	cd js && npm test

publish-js:
	cd js && npm publish

# ── All ─────────────────────────────────────────────────────────────

build: build-python build-js

test: test-python test-js

publish: publish-python publish-js

# ── Demo ────────────────────────────────────────────────────────────

demo:
	@echo "Starting PythonMonkey demo server on http://localhost:8000"
	@echo "Open examples/index.html in your browser and check DevTools Console."
	python examples/server.py

clean:
	rm -rf python/dist python/*.egg-info js/dist js/node_modules
