/**
 * Example model using createModel factory. Mirrors cartage-agent model pattern.
 */
import { createModel } from "../createModel"
import {
  ExampleSchema,
  type Example,
  type ExampleSearchFilters,
} from "@/schemas/example.schema"

export const ExampleModel = createModel<
  Example,
  ExampleSearchFilters,
  "examples"
>({
  collectionName: "examples",
  ModelSchema: ExampleSchema,
  searchConfig: {
    handlers: {
      status: ({ value }, query) => query.where("status", "==", value),
    },
  },
})
