/**
 * Kitchen sink providers – single registry for workflow dependency injection.
 * Mirrors cartage-agent src/server/workflows/kitchenSinkProviders.ts.
 * Workflows use allProviders so models and services are injected consistently.
 */

import { ExampleModel } from "@/server/db/models/ExampleModel"
import { EnvironmentModel } from "@/server/db/models/EnvironmentModel"
import { GitHubService } from "@/server/services/GitHubService"
import { BlaxelService } from "@/server/services/BlaxelService"

export const modelsMap = {
  ExampleModel,
  EnvironmentModel,
} as const

export const servicesMap = {
  GitHubService,
  BlaxelService,
} as const

export const allProviders = {
  ...modelsMap,
  ...servicesMap,
} as const

export type AllProviders = typeof allProviders
export type ModelsMap = typeof modelsMap
