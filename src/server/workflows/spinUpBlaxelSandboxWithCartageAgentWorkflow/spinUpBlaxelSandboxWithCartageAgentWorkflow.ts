/**
 * Services and models used in this workflow are accessed only via d.providers (allProviders).
 * Do not import BlaxelService, EnvironmentModel, or other services/models directly.
 *
 * Flow: create sandbox → start dev server (repo + node_modules are baked into the image).
 * No volume, no clone, no install at runtime—all of that happens at image build time.
 */
import { XError } from "@/utils/error.utils"
import logging from "@/utils/logger.utils"
import { allProviders } from "../kitchenSinkProviders"
import {
    generateSandboxName,
    waitUntilAppReady,
    waitUntilDeployed,
} from "./utils/spinUpBlaxelSandboxWithCartageAgentWorkflow.utils"

/** Path where cartage-agent is baked into the sandbox image. */
const CARTAGE_AGENT_PATH = "/app/cartage-agent"
/** Port the cartage-agent app listens on inside the sandbox. */
const SANDBOX_APP_PORT = 3000

export type SpinUpBlaxelSandboxWithCartageAgentWorkflowParams = {
    createdBy?: string
    orgId?: string
}

export type SpinUpBlaxelSandboxWithCartageAgentWorkflowResult = {
    environmentId: string
    sandboxName: string
    sandboxUrl: string
    previewUrl: string
    status: string
}

export type SpinUpBlaxelSandboxWithCartageAgentWorkflowDependencies = {
    providers: typeof allProviders
}

export type SpinUpBlaxelSandboxWithCartageAgentWorkflow = (
    params: SpinUpBlaxelSandboxWithCartageAgentWorkflowParams,
) => Promise<SpinUpBlaxelSandboxWithCartageAgentWorkflowResult>

export const spinUpBlaxelSandboxWithCartageAgentWorkflowWithDeps =
    (
        d: SpinUpBlaxelSandboxWithCartageAgentWorkflowDependencies,
    ): SpinUpBlaxelSandboxWithCartageAgentWorkflow =>
    async (params) => {
        logging.info("Starting spinUpBlaxelSandboxWithCartageAgentWorkflow", params)

        const sandboxImage = process.env.BLAXEL_SANDBOX_IMAGE
        if (!sandboxImage) {
            throw new XError({
                message:
                    "BLAXEL_SANDBOX_IMAGE is required (set to 'cartage-agent-sandbox' in Secret Manager)",
                code: "BLAXEL_SANDBOX_IMAGE_MISSING",
            })
        }

        // Env vars the cartage-agent dev server needs to start (loaded from Secret Manager).
        const SANDBOX_ENV_KEYS = [
            "SANDBOX_LINGODOTDEV_API_KEY",
            "SANDBOX_GCP_TEST_PROJECT_ID",
            "SANDBOX_GCP_TEST_PROJECT_CLIENT_EMAIL",
            "SANDBOX_GCP_TEST_PROJECT_CLIENT_PRIVATE_KEY",
            "SANDBOX_GCP_DEV_PROJECT_ID",
            "SANDBOX_GCP_DEV_PROJECT_CLIENT_EMAIL",
            "SANDBOX_GCP_DEV_PROJECT_CLIENT_PRIVATE_KEY",
        ] as const

        const missingEnvKey = SANDBOX_ENV_KEYS.find((k) => !process.env[k])
        if (missingEnvKey) {
            throw new XError({
                message: `${missingEnvKey} is required (set in Secret Manager for the sandbox app)`,
                code: "SANDBOX_ENV_MISSING",
                data: { missingEnvKey },
            })
        }

        const sandboxEnvs = SANDBOX_ENV_KEYS.map((name) => ({
            name: name.replace(/^SANDBOX_/, ""),
            value: process.env[name] as string,
        }))

        try {
            const orgId = params.orgId ?? "default"
            const createdBy = params.createdBy ?? "anonymous"
            const sandboxName = generateSandboxName()

            // 1. Create sandbox (repo + node_modules are baked into the image)
            logging.info("Creating sandbox", { sandboxName })
            const sandbox = await d.providers.BlaxelService.createSandbox({
                name: sandboxName,
                image: sandboxImage,
                memory: 8192,
                ports: [{ target: SANDBOX_APP_PORT }],
                ttl: "24h",
                envs: sandboxEnvs,
            })

            const sandboxUrl = await waitUntilDeployed(
                (name) => d.providers.BlaxelService.getSandbox(name),
                sandboxName,
            )

            const preview = await d.providers.BlaxelService.createPreview(sandbox, {
                port: SANDBOX_APP_PORT,
                public: true,
            })
            const previewUrlDisplay =
                preview.spec?.url ??
                `${sandboxUrl.replace(/\/$/, "").replace(new RegExp(`:${SANDBOX_APP_PORT}$`), "")}:${SANDBOX_APP_PORT}`

            // 2. Start dev server (repo + node_modules already in image at CARTAGE_AGENT_PATH)
            logging.info("Starting dev server", { sandboxName })
            await d.providers.BlaxelService.execProcess(sandbox, {
                name: "dev-server",
                command: `sh -c "PORT=${SANDBOX_APP_PORT} bun run dev -- --hostname 0.0.0.0"`,
                workingDir: CARTAGE_AGENT_PATH,
                waitForCompletion: false,
            })
            logging.info("Dev server started", { sandboxName })

            await waitUntilAppReady(
                (sbx, req) => d.providers.BlaxelService.execProcess(sbx, req),
                sandbox,
                SANDBOX_APP_PORT,
            )
            logging.info("App ready", { sandboxName })

            const envRecord = await d.providers.EnvironmentModel.create({
                orgId,
                sandboxName,
                sandboxUrl,
                previewUrl: previewUrlDisplay,
                createdBy,
                status: "active",
            })

            return {
                environmentId: envRecord.id,
                sandboxName,
                sandboxUrl,
                previewUrl: previewUrlDisplay,
                status: envRecord.status,
            }
        } catch (error) {
            throw new XError({
                message: "spinUpBlaxelSandboxWithCartageAgentWorkflow generic catch error",
                data: params,
                cause: error as Error,
            })
        }
    }

export const spinUpBlaxelSandboxWithCartageAgentWorkflow =
    spinUpBlaxelSandboxWithCartageAgentWorkflowWithDeps({
        providers: allProviders,
    })
