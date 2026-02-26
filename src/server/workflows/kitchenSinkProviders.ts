/**
 * Kitchen sink providers – single registry for workflow dependency injection.
 * Mirrors cartage-agent src/server/workflows/kitchenSinkProviders.ts.
 * Workflows use allProviders so models and services are injected consistently.
 */

import { ExampleModel } from "@/server/db/models/ExampleModel"
import { EnvironmentModel } from "@/server/db/models/EnvironmentModel"
import { UserModel } from "@/server/db/models/UserModel"
import { GitHubService } from "@/server/services/GitHubService"
import { BlaxelService } from "@/server/services/BlaxelService"
import { PropelAuthService } from "@/server/services/PropelAuthService"

export const modelsMap = {
    ExampleModel,
    EnvironmentModel,
    UserModel,
} as const

export const servicesMap = {
    GitHubService,
    BlaxelService,
    PropelAuthService,
} as const

export const allProviders = {
    ...modelsMap,
    ...servicesMap,
} as const

export type AllProviders = typeof allProviders
export type ModelsMap = typeof modelsMap
