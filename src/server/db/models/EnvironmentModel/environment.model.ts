/**
 * Environment model (Blaxel sandbox + preview). Uses createModel factory.
 */
import { createModel } from "../createModel"
import {
    EnvironmentSchema,
    type Environment,
    type EnvironmentSearchFilters,
} from "@/schemas/environment.schema"

export const EnvironmentModel = createModel<Environment, EnvironmentSearchFilters, "environments">({
    collectionName: "environments",
    ModelSchema: EnvironmentSchema,
    searchConfig: {
        handlers: {
            status: ({ value }, query) => query.where("status", "==", value),
            createdBy: ({ value }, query) => query.where("createdBy", "==", value),
        },
    },
})
