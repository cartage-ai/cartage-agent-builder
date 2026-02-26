# Optional: build and run the image locally for testing.
# Production: deploy with `bl deploy` from this directory.

.PHONY: build run

build:
	docker build -t cartage-agent-sandbox .

run:
	docker run --rm -p 8080:8080 -p 3000:3000 cartage-agent-sandbox
