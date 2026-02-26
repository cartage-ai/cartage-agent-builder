# Model architecture (createModel)

All models use the **createModel** factory. Full guidelines: [cartage-agent src/server/db/models/CLAUDE.md](https://github.com/cartage-ai/cartage-agent/blob/main/src/server/db/models/CLAUDE.md).

## Summary

- **createModel** (`src/server/db/models/createModel.ts`) – factory for type-safe Firestore models (create, getById, getByIdOrThrow, getManyByIds, findMany, updateById, updateByIdWithTx, patchById, deleteById, bulkDeleteByIds, UNSAFE_findMany, UNSAFE_findOne, search).
- **Schemas** – live in `src/schemas/[modelName].schema.ts` (Zod + inferred types + search filters). Import in the model file.
- **Example** – `ExampleModel/` (index.ts + exampleModel.ts) uses createModel with ExampleSchema and ExampleSearchFilters; register in kitchenSinkProviders.

## Folder structure

Each model lives in its own folder with an `index.ts` that exports the model:

```
src/server/db/models/
├── createModel.ts
├── ExampleModel/
│   ├── index.ts          # export { ExampleModel } from "./exampleModel"
│   └── exampleModel.ts   # createModel(...)
└── CLAUDE.md
```

## Firebase

Set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (or `GOOGLE_APPLICATION_CREDENTIALS`). Firebase is initialized on first `getFirestore()` (see `src/server/firebase.ts`).

## Adding a new model

1. Add schema and search filters in `src/schemas/[name].schema.ts`.
2. Add folder `src/server/db/models/[Name]Model/` with:
   - `[name]Model.ts` – createModel(...) with that schema and searchConfig.handlers.
   - `index.ts` – `export { [Name]Model } from "./[name]Model"`.
3. Add the model to `modelsMap` in `src/server/workflows/kitchenSinkProviders.ts`.
