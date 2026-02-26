# Sandbox template for cartage-agent previews: CLI tools and Bun only.
# No repo in the image—workflow clones cartage-agent at sandbox create time so it stays fresh.
# Deploy with: cd blaxel-sandbox && bl deploy

FROM oven/bun:alpine

WORKDIR /app

# Required: Blaxel sandbox API for process/filesystem control
COPY --from=ghcr.io/blaxel-ai/sandbox:latest /sandbox-api /usr/local/bin/sandbox-api

# CLI tools for clone and health checks (git, curl, netcat)
RUN apk add --no-cache git curl netcat-openbsd \
  && rm -rf /var/cache/apk/*

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
