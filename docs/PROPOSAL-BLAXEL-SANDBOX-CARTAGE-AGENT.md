# Proposal: Cloud dev environment platform (Blaxel + Cartage Agent)

## Product goal

A **platform** where your team can spin up **many** cloud-hosted dev environments. In each environment:

1. **Talk to Claude Code** – The coding assistant’s context is that environment (that repo, files, and ability to run commands there).
2. **Fully deployed preview instance** – A live, shareable URL where the app is running (e.g. Next.js on port 3000).

So: “infinite” environments, each with **AI coding in context** + **live preview**. Cartage Agent in the sandbox is the **starting template** for each environment (we can add other templates later).

---

## How this affects the proposal

| Aspect          | Before                             | After (with your goal)                                                                                                                                                                                                                                    |
| --------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Scale**       | One-off “spin up a sandbox”        | **Multi-environment**: list, create (many), optional delete; persistence so users see “My environments.”                                                                                                                                                  |
| **Identity**    | No ownership                       | **Per-user or per-team**: who created which environment; list filtered by user (or org).                                                                                                                                                                  |
| **Preview**     | Sandbox exists, clone repo         | **Live preview URL**: expose port (e.g. 3000), **start the dev server** in the sandbox after clone (`bun install && bun run dev` as long-running process), and document/return the **preview URL** (e.g. Blaxel’s URL for that port).                     |
| **Claude Code** | Implicit “you can use the sandbox” | **Explicit**: the environment is the **context for Claude Code** – either (a) Cursor/Claude-in-the-cloud pointed at this Blaxel env, or (b) our own “chat + run in sandbox” (Claude API + Blaxel Process API to run commands). Design choice to call out. |
| **Data model**  | No persistence for MVP             | **Environment (or DevEnvironment) model**: sandbox name, sandbox URL, preview URL, createdBy, createdAt, status; required for “list my environments” and cleanup.                                                                                         |

The rest of the technical flow (Blaxel create → clone repo → run commands) stays; we add **persistence**, **preview startup**, and **multi-env UI**.

---

## Architecture (revised)

### High-level flow per environment

```
[User clicks "New environment" (or "Spin up")]
        ↓
[POST /api/environments]  (or /api/sandbox/create, same idea)
        ↓
[Workflow: spinUpBlaxelSandboxWithCartageAgentWorkflow]
  1. Create Blaxel sandbox (name, image, memory, ports: [3000])
  2. Wait until DEPLOYED
  3. Exec: git clone cartage-agent into sandbox
  4. Exec: cd cartage-agent && bun install && bun run dev  (long-running, waitForCompletion: false)
  5. Persist: save Environment record (sandboxName, sandboxUrl, previewUrl, createdBy, status)
        ↓
[Return environment id + sandbox URL + preview URL]
        ↓
[UI: "My environments" list + new row with "Open preview" + "Open in Claude Code" (or "Open sandbox")]
```

### Components

| Layer             | Responsibility                                                                                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**            | **List** of user’s environments (cards or table: name, preview URL, created, status). **Create**: “New environment” button → loading → new row with preview link. Optional: delete, rename.       |
| **API**           | `POST /api/environments` (create), `GET /api/environments` (list, filter by user). Optionally `DELETE /api/environments/[id]` and `GET /api/environments/[id]`.                                   |
| **Workflow**      | Same workflow, extended: after clone, **start dev server** (exec with waitForCompletion: false), then build **preview URL** (e.g. from Blaxel port mapping). Returns data for Environment record. |
| **Persistence**   | **Environment** model (or reuse/rename Example): sandboxId/name, sandboxUrl, previewUrl, createdBy (userId or email), createdAt, status. Enables list and “infinite” without losing track.        |
| **Blaxel client** | Unchanged: createSandbox, execProcess; add **getSandbox** for polling if needed.                                                                                                                  |

### “Talk to Claude Code”

Two concrete options (to decide product-side):

- **A) Cursor / Claude in the cloud**  
  If Blaxel (or a partner) offers “connect Cursor/Claude to this sandbox,” we link each environment to that. Our app shows “Open in Cursor” / “Open with Claude” and we store the deep link or workspace id.

- **B) Our own chat + run in sandbox**  
  We build a simple chat UI in cartage-agent-builder: user picks an environment, types a request; we send context (file tree, selected file) + request to Claude API, then **run suggested commands in that sandbox** via Blaxel Process API. The “context” of Claude is that environment’s repo + outputs.

Either way, the **environment is the unit of context**; the proposal assumes we have a stable sandbox URL and (optionally) a way to run commands in it so Claude’s context stays tied to that env.

### “Fully deployed preview instance”

- **Port**: Create sandbox with `ports: [{ target: 3000 }]` (or whatever the app uses).
- **Start dev server**: After clone, run in sandbox:  
  `cd /home/user/cartage-agent && bun install && bun run dev`  
  as a **long-running process** (waitForCompletion: false, or Blaxel’s equivalent for background processes) so the app keeps running.
- **Preview URL**: Use Blaxel’s public URL for that port (e.g. `https://<sandbox>-<workspace>.<region>.bl.run` with port 3000, or the URL format Blaxel documents). Return and store this as `previewUrl` so the UI can show “Open preview.”

---

## Implementation plan (revised)

### Phase 1 – One environment + preview (MVP)

- Env vars: `BL_API_KEY`, `BL_WORKSPACE`.
- **BlaxelService**: createSandbox, getSandbox (poll), execProcess.
- **Workflow**: create sandbox → wait DEPLOYED → clone cartage-agent → `bun install && bun run dev` (background) → compute preview URL → return sandbox + preview URLs.
- **Environment model**: sandboxName, sandboxUrl, previewUrl, createdBy, createdAt, status. Add to kitchenSinkProviders (or keep a minimal “Environment” table/store).
- **API**: `POST /api/environments` (create), `GET /api/environments` (list for current user; if no auth yet, list all or use a placeholder user).
- **UI**: “New environment” button; loading; on success show link to **preview** and link to **sandbox** (and later “Open in Claude Code” when we integrate).

### Phase 2 – Multi-environment + team

- **List view**: “My environments” page with cards/table; each row: name, preview link, created, status; optional delete.
- **Auth**: Associate environments with a user (session or API key) so list is scoped; optional per-team or org.
- **Quotas**: Optional cap per user/workspace (e.g. max N environments); Blaxel workspace limits may apply.

### Phase 3 – Claude Code integration

- **Option A**: Integrate Cursor/Claude cloud with Blaxel env (links or SSO).
- **Option B**: In-app chat: select environment → chat with Claude → run commands in that sandbox via Blaxel exec; show outputs and update context (files, terminal) for next turn.

---

## File changes summary (revised)

| Action | Path                                                                                                                                                |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add    | `src/server/services/BlaxelService.ts`                                                                                                              |
| Add    | `src/server/workflows/spinUpBlaxelSandboxWithCartageAgentWorkflow/` (create → clone → start dev server → return URLs)                               |
| Add    | **Environment** schema + model (e.g. `src/schemas/environment.schema.ts`, `src/server/db/models/EnvironmentModel/`) and add to kitchenSinkProviders |
| Add    | `src/app/api/environments/route.ts` (GET list, POST create)                                                                                         |
| Add    | `src/app/api/environments/[id]/route.ts` (optional GET, DELETE)                                                                                     |
| Modify | `kitchenSinkProviders.ts` — BlaxelService + Environment model                                                                                       |
| Modify | UI — “My environments” list + “New environment” + preview link (+ later “Open in Claude Code”)                                                      |
| Add    | `.env.example` — `BL_API_KEY`, `BL_WORKSPACE`                                                                                                       |

---

## Risks / unknowns (unchanged + one more)

1. **Blaxel create response and exec URL** – Still need to confirm `metadata.url` and `POST {baseUrl}/process`.
2. **Base image and git** – Image must have git (and ideally bun/node) for clone + install + dev.
3. **Auth format** – Blaxel API key and workspace usage.
4. **Async create** – Poll until DEPLOYED.
5. **Long-running dev server** – Blaxel’s process API: how to run a process that stays alive (waitForCompletion: false?) and whether the sandbox keeps it running across “scale to zero” resume; may need to confirm with Blaxel.

---

## Success criteria (revised)

- Team members can create **multiple** environments from the same app.
- Each environment has the **Cartage Agent repo** and a **live preview URL** (app running in sandbox).
- Users see **“My environments”** with at least: preview link, sandbox/env link, created time.
- Later: **“Talk to Claude Code”** in that environment is clearly supported (either via Cursor/Claude cloud or in-app chat + Blaxel exec).

This keeps the original technical plan and adds persistence, preview startup, and multi-environment UX so the product matches the goal of infinite cloud dev environments with Claude Code and a deployed preview per env.
