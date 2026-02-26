# Blaxel sandbox template (cartage-agent previews)

This directory defines a **custom Blaxel sandbox template** with **Bun and CLI tools only** (no repo in the image). The workflow clones cartage-agent and runs `bun install` when each sandbox is created, so the repo stays fresh.

## One-time setup: deploy the template

1. **From this directory**, ensure you're logged in to Blaxel (`bl login`), then:

    ```bash
    cd blaxel-sandbox
    bl deploy
    ```

2. **Get the image ID** and set it in your app:
    ```bash
    bl get sandbox cartage-agent-sandbox -o json | jq -r '.spec.runtime.image'
    ```
    Add **`BLAXEL_SANDBOX_IMAGE`** to Secret Manager (or env) with that value. Set **`GITHUB_TOKEN`** (env or Secret Manager) so the workflow can clone cartage-agent in the sandbox.

## What’s in the image

- **Base:** `oven/bun:alpine` (Bun pre-installed)
- **Blaxel:** sandbox API binary (required for process exec and filesystem)
- **Tools:** git, curl, netcat (for clone and health checks)

The workflow clones cartage-agent, runs `bun install`, and starts `bun run dev` when creating each sandbox.

## Updating the template

Edit `Dockerfile` or `blaxel.toml`, then run `bl deploy` again. New sandboxes will use the new image.

## Local test (optional)

```bash
make build
make run
```
