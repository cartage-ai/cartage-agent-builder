/**
 * Thin wrapper around GCP Secret Manager. Loads secrets as env-style key/value.
 * Uses Application Default Credentials (gcloud auth application-default login).
 * Single project: GCP_PROJECT_ID or "cartage-agent-builder-dev".
 */
import { XError } from "@/utils/error.utils"
import { SecretManagerServiceClient } from "@google-cloud/secret-manager"

const DEFAULT_PROJECT_ID = "cartage-agent-builder-dev"

let client: SecretManagerServiceClient | null = null

function getSecretManagerClient(): SecretManagerServiceClient {
  if (!client) {
    const projectId = process.env.GCP_PROJECT_ID ?? DEFAULT_PROJECT_ID
    client = new SecretManagerServiceClient({ projectId })
  }
  return client
}

function getProjectId(): string {
  return process.env.GCP_PROJECT_ID ?? DEFAULT_PROJECT_ID
}

/**
 * Retrieves all secrets from the project as env-style Record.
 * Secret name = key, secret value = value.
 */
const getSecrets = async (): Promise<Record<string, string>> => {
  try {
    const secretClient = getSecretManagerClient()
    const projectId = getProjectId()
    const parent = `projects/${projectId}`
    const [secrets] = await secretClient.listSecrets({ parent })
    const allEnvVars: Record<string, string> = {}

    for (const secret of secrets) {
      if (!secret.name) continue
      const secretName = secret.name.split("/").pop()
      if (!secretName) continue
      try {
        const [version] = await secretClient.accessSecretVersion({
          name: `${secret.name}/versions/latest`,
        })
        const data = version.payload?.data
        const secretValue =
          data instanceof Uint8Array
            ? Buffer.from(data).toString("utf-8")
            : (data as Buffer | undefined)?.toString?.()
        if (secretValue) allEnvVars[secretName] = secretValue
      } catch (error) {
        console.warn(
          `SecretService: Failed to fetch secret ${secretName}:`,
          error
        )
      }
    }

    return allEnvVars
  } catch (error) {
    throw new XError({
      message:
        "SecretService.getSecrets: Error retrieving secrets from GCP Secret Manager",
      cause: error as Error,
    })
  }
}

/**
 * Fetches only the given secret names. Use when you know exactly which secrets you need.
 */
const getSecretsByNames = async <T extends string>({
  secretNames,
}: {
  secretNames: readonly T[]
}): Promise<Record<T, string>> => {
  try {
    const secretClient = getSecretManagerClient()
    const projectId = getProjectId()
    const result = {} as Record<T, string>

    for (const secretName of secretNames) {
      try {
        const [version] = await secretClient.accessSecretVersion({
          name: `projects/${projectId}/secrets/${secretName}/versions/latest`,
        })
        const data = version.payload?.data
        const secretValue =
          data instanceof Uint8Array
            ? Buffer.from(data).toString("utf-8")
            : (data as Buffer | undefined)?.toString?.()
        if (secretValue) result[secretName as T] = secretValue
      } catch (error) {
        console.warn(
          `SecretService: Failed to fetch secret ${secretName}:`,
          error
        )
      }
    }

    return result
  } catch (error) {
    throw new XError({
      message:
        "SecretService.getSecretsByNames: Error retrieving secrets from GCP Secret Manager",
      cause: error as Error,
    })
  }
}

export const SecretService = {
  getSecrets,
  getSecretsByNames,
}
