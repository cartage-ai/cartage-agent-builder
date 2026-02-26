/**
 * Pure utils for getBuildInfoWorkflow. No side effects, no providers.
 * See cartage-agent src/server/workflows/CLAUDE.md "Separate Pure Utility Functions from Workflows".
 */

export type BuildInfo = {
  version: string
  env: string
  timestamp: string
}

export const formatVersion = (version: string): string =>
  version.trim() || "0.0.0"

export const formatBuildInfo = (version: string, env: string): BuildInfo => ({
  version: formatVersion(version),
  env: env || "development",
  timestamp: new Date().toISOString(),
})
