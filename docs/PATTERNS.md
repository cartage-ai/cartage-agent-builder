# Cartage patterns – source of truth for coding agents

This app mirrors **cartage-agent** patterns for **workflows**, **utils**, and **models** so coding agents have a single reference.

- **Full guidelines:** See the [cartage-agent](https://github.com/cartage-ai/cartage-agent) repo:
    - Root: `CLAUDE.md` (architecture, auth, naming, XError, etc.)
    - Workflows: `src/server/workflows/CLAUDE.md`
    - Models: `src/server/db/models/CLAUDE.md`
    - Services: `src/server/services/CLAUDE.md`

## Reference implementations in this repo

| Concept       | Reference implementation                                                                                                                    | Purpose                                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Workflow**  | `src/server/workflows/getBuildInfoWorkflow/`                                                                                                | Folder layout, WithDeps, single start log, try/catch XError, optional workflow-scoped utils                               |
| **Util**      | `src/utils/error.utils.ts` + `getBuildInfoWorkflow/utils/getBuildInfoWorkflow.utils.ts`                                                     | Shared util (XError); workflow-scoped pure utils in `workflowName/utils/`                                                 |
| **Model**     | `src/schemas/example.schema.ts` + `src/server/db/models/createModel.ts` + `src/server/db/models/ExampleModel/` (index.ts + exampleModel.ts) | Shared Zod schema in `src/schemas/`; each model in its own folder with index.ts; all use **createModel** (Firestore).     |
| **Providers** | `src/server/workflows/kitchenSinkProviders.ts`                                                                                              | Single registry: `modelsMap`, `servicesMap`, `allProviders`. Workflows inject `providers: typeof allProviders`.           |
| **Service**   | `src/server/services/GitHubService.ts` + `src/server/services/CLAUDE.md`                                                                    | Thin wrapper: singleton client, default export object, try/catch + XError with `[ServiceName].[functionName]: Error ...`. |

## Quick rules (from cartage-agent)

- **Workflows:** Business logic only (transform, filter, aggregate, orchestrate). One `logging.info("Starting [workflowName]")` at top. Wrap in try/catch, throw `XError` with message `"[workflowName] generic catch error"`. Put pure helpers in `workflowName/utils/workflowName.utils.ts`. Use dependency injection (WithDeps + providers).
- **Utils:** Shared utils in `src/utils/`. Per-workflow pure functions in `workflowName/utils/`; no business logic in workflow files.
- **Models:** Schemas live in `src/schemas/`. Use `.search()` for lists (org-scoped); avoid `UNSAFE_findMany`. All models use **createModel()** (Firestore) in `src/server/db/models/createModel.ts`.

When adding or changing workflows, utils, or models, copy these patterns and align with the CLAUDE.md files in cartage-agent.
