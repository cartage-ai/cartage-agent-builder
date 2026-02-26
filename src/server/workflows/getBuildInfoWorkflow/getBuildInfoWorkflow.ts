/**
 * Any services or models used in this workflow must be accessed via d.providers (allProviders).
 * Do not import services or models directly.
 */
import { XError } from "@/utils/error.utils"
import logging from "@/utils/logger.utils"
import { allProviders } from "../kitchenSinkProviders"
import { formatBuildInfo } from "./utils/getBuildInfoWorkflow.utils"

export type GetBuildInfoWorkflowParams = {
  appVersion?: string
  env?: string
}

export type GetBuildInfoWorkflowDependencies = {
  providers: typeof allProviders
}

export type GetBuildInfoWorkflowResult = {
  version: string
  env: string
  timestamp: string
}

export type GetBuildInfoWorkflow = (
  params: GetBuildInfoWorkflowParams
) => Promise<GetBuildInfoWorkflowResult>

export const getBuildInfoWorkflowWithDeps =
  (d: GetBuildInfoWorkflowDependencies): GetBuildInfoWorkflow =>
  async (params) => {
    void d /* services/models via d.providers when needed */
    logging.info("Starting getBuildInfoWorkflow", params)

    try {
      const version = params.appVersion ?? process.env.npm_package_version ?? "0.1.0"
      const env = params.env ?? process.env.NODE_ENV ?? "development"
      return formatBuildInfo(version, env)
    } catch (error) {
      throw new XError({
        message: "getBuildInfoWorkflow generic catch error",
        data: params,
        cause: error as Error,
      })
    }
  }

export const getBuildInfoWorkflow = getBuildInfoWorkflowWithDeps({
  providers: allProviders,
})
