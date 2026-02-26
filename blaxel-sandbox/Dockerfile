# Sandbox template for cartage-agent previews.
# The repo + node_modules are baked in at image build time—no clone or install at sandbox start.
# Rebuild and redeploy this image whenever cartage-agent main is updated.
#
# Deploy:
#   cd blaxel-sandbox && bl deploy --yes
#   (GITHUB_TOKEN must be passed as --build-arg or set as ARG default before deploying)

# ── builder: clone + install (token never lands in the final image) ──────────
FROM oven/bun:alpine AS builder

ARG GITHUB_TOKEN
RUN apk add --no-cache git && rm -rf /var/cache/apk/*

RUN git clone --depth=1 \
      "https://x-access-token:${GITHUB_TOKEN}@github.com/cartage-ai/cartage-agent.git" \
      /app/cartage-agent \
    && cd /app/cartage-agent \
    && bun install --frozen-lockfile \
    && git remote set-url origin https://github.com/cartage-ai/cartage-agent.git

# ── final: runtime image with baked-in repo + node_modules ──────────────────
FROM oven/bun:alpine

WORKDIR /app

# Required: Blaxel sandbox API for process/filesystem control
COPY --from=ghcr.io/blaxel-ai/sandbox:latest /sandbox-api /usr/local/bin/sandbox-api

# CLI tools for health checks (curl, netcat)
RUN apk add --no-cache git curl netcat-openbsd \
  && rm -rf /var/cache/apk/*

# Copy repo + node_modules from builder (no token in this layer)
COPY --from=builder /app/cartage-agent /app/cartage-agent

RUN printf '#!/bin/sh\n# Start the Blaxel sandbox API (required); keep container running.\n# The app (cartage-agent) is baked into the image at /app/cartage-agent and\n# started by the workflow via the process API.\n/usr/local/bin/sandbox-api &\necho "Waiting for sandbox API..."\nwhile ! nc -z 127.0.0.1 8080 2>/dev/null; do\n  sleep 0.1\ndone\necho "Sandbox API ready"\nwait\n' > /entrypoint.sh \
  && chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
