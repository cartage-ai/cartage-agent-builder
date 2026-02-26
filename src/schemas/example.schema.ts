/**
 * Shared schema for Example entity. All model schemas live in src/schemas/
 * so they can be used by both API and UI. See cartage-agent src/server/db/models/CLAUDE.md.
 */
import { z } from "zod"
import { SEARCH_FILTER_OPERATORS } from "@/types/search.types"

export const ExampleStatusSchema = z.enum(["draft", "active", "archived"])
export type ExampleStatus = z.infer<typeof ExampleStatusSchema>

export type ExampleSearchFilters = {
  status: {
    value: ExampleStatus
    operator: (typeof SEARCH_FILTER_OPERATORS)["is"]
  }
}

export const ExampleSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  status: ExampleStatusSchema.default("draft"),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
})
export type Example = z.infer<typeof ExampleSchema>
