/**
 * Schema for Environment (Blaxel sandbox + cartage-agent clone + preview).
 */
import { z } from "zod"
import { SEARCH_FILTER_OPERATORS } from "@/types/search.types"

export const EnvironmentStatusSchema = z.enum([
    "creating",
    "deploying",
    "cloning",
    "starting",
    "active",
    "failed",
])
export type EnvironmentStatus = z.infer<typeof EnvironmentStatusSchema>

export type EnvironmentSearchFilters = {
    status: {
        value: EnvironmentStatus
        operator: (typeof SEARCH_FILTER_OPERATORS)["is"]
    }
    createdBy: {
        value: string
        operator: (typeof SEARCH_FILTER_OPERATORS)["is"]
    }
}

export const EnvironmentSchema = z.object({
    id: z.string(),
    orgId: z.string(),
    sandboxName: z.string(),
    sandboxUrl: z.string(),
    previewUrl: z.string(),
    createdBy: z.string(),
    status: EnvironmentStatusSchema,
    createdAt: z.string(),
    updatedAt: z.string().optional(),
})
export type Environment = z.infer<typeof EnvironmentSchema>
