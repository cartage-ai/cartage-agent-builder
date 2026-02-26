---
name: Blaxel
description: Use when building, deploying, and managing AI agents, sandboxes, batch jobs, and MCP servers. Reach for this skill when agents need secure compute environments, serverless hosting, background task processing, or tool servers for autonomous AI workflows.
metadata:
    mintlify-proj: blaxel
    version: "1.0"
---

# Blaxel Skill Reference

## Product summary

Blaxel is a perpetual sandbox platform built for AI agents. It provides serverless infrastructure for running agents, sandboxes (instant-launching VMs), batch jobs, and MCP servers with sub-25ms cold starts and automatic scale-to-zero. Key files: `blaxel.toml` (deployment config), `.env` (credentials: `BL_WORKSPACE`, `BL_API_KEY`). Primary CLI: `bl` (login, deploy, serve, run, get, logs). SDKs available in Python (`blaxel`) and TypeScript (`@blaxel/core`). Primary docs: https://docs.blaxel.ai

## When to use

- **Deploying agents**: Use when you need to host AI agents as serverless HTTP endpoints (sync or async).
- **Creating sandboxes**: Use when agents need isolated compute environments to run code, execute processes, or access filesystems securely.
- **Scheduling batch jobs**: Use when agents need to run parallel background tasks with specific input parameters.
- **Hosting MCP servers**: Use when you need to deploy tool servers that expose capabilities via Model Context Protocol.
- **Local development**: Use `bl serve` to test agents/jobs/MCPs locally before deployment.
- **Managing resources**: Use CLI commands to list, monitor, delete, and configure deployed resources.

## Quick reference

### Essential CLI commands

| Command                                        | Purpose                               |
| ---------------------------------------------- | ------------------------------------- |
| `bl login`                                     | Authenticate to Blaxel workspace      |
| `bl new agent\|job\|mcp\|sandbox`              | Initialize new resource from template |
| `bl serve [--hotreload]`                       | Run resource locally on port 1338     |
| `bl deploy [-d directory]`                     | Build and deploy to production        |
| `bl get agents\|jobs\|functions\|sandboxes`    | List deployed resources               |
| `bl logs resource-type resource-name`          | View logs for a resource              |
| `bl delete agent\|job\|function\|sandbox name` | Delete a resource                     |
| `bl chat agent-name`                           | Interactive chat with deployed agent  |
| `bl run job job-name --data '{...}'`           | Execute a batch job                   |
| `bl connect sandbox sandbox-name`              | Open interactive terminal in sandbox  |

### Configuration file: blaxel.toml

```toml
type = "agent"              # agent, job, function, sandbox, volume-template
name = "my-resource"        # defaults to directory name
public = false              # agents only; public access

[build]
slim = true                 # automatic image slimming

[entrypoint]
prod = "python main.py"     # production command
dev = "python main.py --dev" # dev command

[env]
MY_VAR = "value"            # environment variables (not secrets)

[runtime]
memory = 4096               # MB
timeout = 900               # seconds
maxConcurrentTasks = 10     # jobs only

[[volumes]]
name = "my-volume"
mountPath = "/data"
defaultSize = 1024          # MB

[[triggers]]
id = "my-trigger"
type = "http"               # http, http-async, schedule
[triggers.configuration]
path = "/webhook"           # endpoint path
schedule = "0 * * * *"      # cron (schedule type only)
```

### SDK authentication (priority order)

1. Automatic (when running on Blaxel)
2. `.env` file: `BL_WORKSPACE`, `BL_API_KEY`
3. Environment variables: `BL_WORKSPACE`, `BL_API_KEY`
4. Local config (created by `bl login`)

### Sandbox creation (SDK)

```typescript
import { SandboxInstance } from "@blaxel/core"

const sandbox = await SandboxInstance.create({
    name: "my-sandbox",
    image: "blaxel/base-image:latest",
    memory: 4096,
    ports: [{ target: 3000, protocol: "HTTP" }],
    labels: { env: "dev" },
    region: "us-pdx-1",
})
```

```python
from blaxel.core import SandboxInstance

sandbox = await SandboxInstance.create({
  "name": "my-sandbox",
  "image": "blaxel/base-image:latest",
  "memory": 4096,
  "ports": [{ "target": 3000 }],
  "labels": {"env": "dev"},
  "region": "us-pdx-1"
})
```

## Decision guidance

| Scenario                              | Use                    | Why                                                    |
| ------------------------------------- | ---------------------- | ------------------------------------------------------ |
| Agent needs to run code/scripts       | Sandbox                | Full OS access, filesystem, processes; <25ms resume    |
| Agent API with <100s requests         | Agents Hosting (sync)  | Optimized for fast HTTP endpoints                      |
| Agent API with 100s-10min requests    | Agents Hosting (async) | Maintains connection without timeout                   |
| Background tasks, parallel processing | Batch Jobs             | Designed for multi-task execution, longer runtimes     |
| Agent needs tool capabilities         | MCP Server             | Standardized tool interface, separate from agent logic |
| Data must survive sandbox deletion    | Volumes                | Persistent storage independent of compute              |
| Sandbox should auto-cleanup           | TTL/Expiration         | Prevents digital clutter, reduces storage costs        |

## Workflow

### Deploy an agent

1. **Initialize**: Run `bl new agent` to scaffold project with `main.py`/`main.ts` and `blaxel.toml`.
2. **Develop**: Write agent logic in `main.py`/`main.ts`; use Blaxel SDK to access other resources (models, sandboxes, jobs).
3. **Test locally**: Run `bl serve --hotreload` and make POST requests to `http://localhost:1338` with payload `{"inputs": "..."}`.
4. **Configure**: Edit `blaxel.toml` to set name, memory, timeout, environment variables, triggers.
5. **Deploy**: Run `bl deploy` (or `bl deploy -d directory` for subdirectory).
6. **Query**: Use `bl chat agent-name` or POST to the global endpoint `https://run.blaxel.ai/{WORKSPACE}/agents/{NAME}`.

### Create and use a sandbox

1. **Create**: Use SDK (`SandboxInstance.create()`) or CLI (`bl new sandbox && bl deploy`).
2. **Connect**: Use SDK to interact, or `bl connect sandbox-name` for terminal access.
3. **Manage state**: Let sandbox auto-suspend after inactivity (~25ms resume); don't delete unless cleanup needed.
4. **Persist data**: Attach volumes for data that must survive sandbox deletion.
5. **Cleanup**: Set TTL in `blaxel.toml` or manually delete when done.

### Deploy a batch job

1. **Initialize**: Run `bl new job` to scaffold with `index.py`/`index.ts` and `blaxel.toml`.
2. **Develop**: Write job logic; define task structure and parameters.
3. **Test**: Run `bl serve` and POST `{"tasks": [{...}, {...}]}` to `http://localhost:1338`.
4. **Configure**: Set `maxConcurrentTasks`, `timeout`, `maxRetries` in `blaxel.toml`.
5. **Deploy**: Run `bl deploy`.
6. **Execute**: Use `bl run job job-name --data '{...}'` or POST to endpoint.

### Deploy an MCP server

1. **Initialize**: Run `bl new mcp` to scaffold with `server.py`/`server.ts`.
2. **Develop**: Implement MCP tools using framework (e.g., `mcp` Python package).
3. **Test**: Run `bl serve` or `pnpm inspect` (TypeScript) to launch MCP Inspector.
4. **Deploy**: Run `bl deploy`.
5. **Invoke**: Connect agents to endpoint `https://run.blaxel.ai/{WORKSPACE}/functions/{NAME}/mcp`.

## Common gotchas

- **Preview URLs return 502**: Server must bind to `0.0.0.0` (not `localhost`). Use `HOST` environment variable: `app.listen(process.env.PORT, process.env.HOST)`.
- **Sandbox API returns 502 after creation**: Retry the request; sandbox API may still be starting. If persistent, delete and recreate.
- **Deployment fails with `STARTUP TCP probe failed`**: Server not binding to `HOST` and `PORT` env vars. Blaxel injects these; use them.
- **Sandbox runs out of storage**: Sandboxes reserve ~50% of memory for filesystem. Increase memory or attach volumes (requires sandbox recreation).
- **Sandbox state lost after deletion**: Deletion is permanent and immediate. Use volumes for persistent data; use TTL for auto-cleanup instead of manual deletion.
- **Agent timeout on long-running tasks**: Sync endpoint max 100s (resets per streamed chunk); async max 10 min. Use async or batch jobs for longer tasks.
- **SDK authentication fails**: Ensure `bl login` was run, or set `BL_WORKSPACE` and `BL_API_KEY` in `.env`. Check priority order.
- **Multiple resources in one repo**: Use `bl deploy -d directory` or custom Dockerfile to deploy multiple agents/jobs/MCPs with shared dependencies.
- **Sandbox doesn't auto-suspend**: Suspension happens after ~5s of inactivity (no active connections). Ensure client disconnects properly.
- **Quota exceeded**: Account tier limits RAM and concurrent resources. Check `https://app.blaxel.ai/account/quotas` and upgrade if needed.

## Verification checklist

Before deploying or submitting work:

- [ ] `blaxel.toml` exists and specifies correct `type`, `name`, and `workspace`.
- [ ] Server binds to `HOST` and `PORT` environment variables (not hardcoded `localhost`).
- [ ] `.env` file (if used) contains `BL_WORKSPACE` and `BL_API_KEY`; never commit secrets.
- [ ] `bl serve` runs locally without errors; test with sample request.
- [ ] All required dependencies listed in `package.json` or `requirements.txt`.
- [ ] Environment variables in `[env]` section are non-secret config only.
- [ ] Sensitive data uses `Variables-and-secrets` (not `[env]`).
- [ ] Sandbox/job/agent has appropriate memory and timeout settings.
- [ ] TTL or expiration policy set if resource should auto-cleanup.
- [ ] Volumes attached if data must persist beyond sandbox lifecycle.
- [ ] `bl deploy` completes without errors; check status with `bl get agents|jobs|functions|sandboxes`.
- [ ] Resource is reachable: test endpoint or use `bl chat` / `bl run` / `bl connect`.

## Resources

- **Comprehensive navigation**: https://docs.blaxel.ai/llms.txt
- **Overview & architecture**: https://docs.blaxel.ai/Overview
- **Sandboxes guide**: https://docs.blaxel.ai/Sandboxes/Overview
- **Agents Hosting**: https://docs.blaxel.ai/Agents/Overview
- **Batch Jobs**: https://docs.blaxel.ai/Jobs/Overview
- **MCP Servers**: https://docs.blaxel.ai/Functions/Overview
- **Deployment reference**: https://docs.blaxel.ai/deployment-reference
- **CLI reference**: https://docs.blaxel.ai/cli-reference/introduction
- **SDK reference**: https://docs.blaxel.ai/sdk-reference/introduction
- **Troubleshooting**: https://docs.blaxel.ai/troubleshooting
- **Best practices**: https://docs.blaxel.ai/Sandboxes/best-practices

---

> For additional documentation and navigation, see: https://docs.blaxel.ai/llms.txt
