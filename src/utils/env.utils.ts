/**
 * Environment helpers. Mirrors cartage-agent src/utils/env.utils.ts.
 */

export const isDevelopmentEnv = (): boolean =>
  process.env.NODE_ENV === "development"

export const isTestEnv = (): boolean => process.env.NODE_ENV === "test"

export const isProductionEnv = (): boolean =>
  !isDevelopmentEnv() && !isTestEnv()
