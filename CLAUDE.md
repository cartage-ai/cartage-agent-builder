# Claude instructions – cartage-agent-builder

This app is a **reference implementation** for cartage-agent patterns. Use it as the source of truth when coding agents need to match cartage-agent conventions.

## Patterns and reference files

- **Overview:** [docs/PATTERNS.md](docs/PATTERNS.md) – links to cartage-agent and lists reference implementations in this repo.
- **Workflow:** `src/server/workflows/getBuildInfoWorkflow/` – folder layout, WithDeps, single start log, try/catch XError, workflow-scoped utils in `utils/getBuildInfoWorkflow.utils.ts`.
- **Utils:**  
  - Shared: `src/utils/error.utils.ts` (XError).  
  - Workflow-scoped: `src/server/workflows/getBuildInfoWorkflow/utils/getBuildInfoWorkflow.utils.ts` (pure functions only).
- **Model:** `src/schemas/example.schema.ts` (Zod schema + types), `src/server/db/models/createModel.ts` (factory), and `src/server/db/models/ExampleModel/`. All models use **createModel()** + Firestore. See `src/server/db/models/CLAUDE.md`.
- **Service:** `src/server/services/GitHubService.ts` – thin wrapper (singleton Octokit, default export object, try/catch + XError). See `src/server/services/CLAUDE.md`.

## Contributing guidelines (from cartage-agent)

- **Workflows:** Business logic only. One `logging.info("Starting [workflowName]")` at top. Try/catch and throw `XError` with message `"[workflowName] generic catch error"`. Put pure helpers in `workflowName/utils/workflowName.utils.ts`. Inject dependencies via WithDeps.
- **Utils:** Shared utils in `src/utils/`. Per-workflow pure functions in `workflowName/utils/`; no business logic in workflow files.
- **Models:** Schemas in `src/schemas/`. Use `.search()` for lists; never rely on an un-scoped “find all”. In cartage-agent, use `createModel()` and Firestore.

For full rules (auth, naming, services, etc.), see the [cartage-agent](https://github.com/cartage-ai/cartage-agent) repo and its `CLAUDE.md` and `src/server/workflows/CLAUDE.md`, `src/server/db/models/CLAUDE.md`, `src/server/services/CLAUDE.md`.
