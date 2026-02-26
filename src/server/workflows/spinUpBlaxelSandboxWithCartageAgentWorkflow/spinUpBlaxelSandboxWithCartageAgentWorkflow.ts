/**
 * Services and models used in this workflow are accessed only via d.providers (allProviders).
 * Do not import BlaxelService, EnvironmentModel, or other services/models directly.
 *
 * Flow: create volume (2GB) → create sandbox with volume at /workspace → clone + bun install
 * on volume (avoids tmpfs NoSpaceLeft and avoids 413 on large file upload). Then start dev server.
 */
import { XError } from "@/utils/error.utils"
import logging from "@/utils/logger.utils"
import { allProviders } from "../kitchenSinkProviders"
import {
  generateSandboxName,
  waitUntilAppReady,
  waitUntilDeployed,
} from "./utils/spinUpBlaxelSandboxWithCartageAgentWorkflow.utils"

const CARTAGE_AGENT_REPO = "https://github.com/cartage-ai/cartage-agent.git"
/** Install and run on volume to avoid tmpfs NoSpaceLeft. */
const WORKSPACE_MOUNT = "/workspace"
const CARTAGE_AGENT_PATH = `${WORKSPACE_MOUNT}/cartage-agent`
/** Tier 1 max volume size (MiB). */
const VOLUME_SIZE_MB = 2048
/** Port the cartage-agent app listens on inside the sandbox. This repo runs on 3001. */
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
  params: SpinUpBlaxelSandboxWithCartageAgentWorkflowParams
) => Promise<SpinUpBlaxelSandboxWithCartageAgentWorkflowResult>

export const spinUpBlaxelSandboxWithCartageAgentWorkflowWithDeps =
  (
    d: SpinUpBlaxelSandboxWithCartageAgentWorkflowDependencies
  ): SpinUpBlaxelSandboxWithCartageAgentWorkflow =>
  async (params) => {
    logging.info("Starting spinUpBlaxelSandboxWithCartageAgentWorkflow", params)

    const githubToken = process.env.GITHUB_TOKEN
    if (!githubToken) {
      throw new XError({
        message:
          "GITHUB_TOKEN is required to clone cartage-agent in the sandbox (set in env or Secret Manager)",
        code: "GITHUB_TOKEN_MISSING",
      })
    }

    const sandboxImage = process.env.BLAXEL_SANDBOX_IMAGE
    if (!sandboxImage) {
      throw new XError({
        message:
          "BLAXEL_SANDBOX_IMAGE is required (deploy blaxel-sandbox template and set in Secret Manager)",
        code: "BLAXEL_SANDBOX_IMAGE_MISSING",
      })
    }

    try {
      const orgId = params.orgId ?? "default"
      const createdBy = params.createdBy ?? "anonymous"
      const sandboxName = generateSandboxName()
      const volumeName = `vol-${sandboxName}`

      // 1. Create volume (2GB) so clone + bun install have space (avoids tmpfs NoSpaceLeft)
      logging.info("Creating volume and sandbox", { volumeName })
      await d.providers.BlaxelService.createVolume(volumeName, VOLUME_SIZE_MB)

      // 2. Create sandbox with volume at /workspace
      await d.providers.BlaxelService.createSandbox({
        metadata: { name: sandboxName },
        spec: {
          runtime: {
            image: sandboxImage,
            memory: 4096,
            ports: [{ target: SANDBOX_APP_PORT }],
            ttl: "24h",
          },
          volumes: [
            { name: volumeName, mountPath: WORKSPACE_MOUNT, readOnly: false },
          ],
        },
      })

      const sandboxUrl = await waitUntilDeployed(
        (name) => d.providers.BlaxelService.getSandbox(name),
        sandboxName
      )

      const preview = await d.providers.BlaxelService.createPreview(sandboxName, {
        port: SANDBOX_APP_PORT,
        public: true,
      })
      const previewUrlDisplay =
        preview.spec?.url ??
        `${sandboxUrl.replace(/\/$/, "").replace(new RegExp(`:${SANDBOX_APP_PORT}$`), "")}:${SANDBOX_APP_PORT}`

      // 4. Clone into volume (no large upload; avoids 413)
      const cloneCmd = `git -c credential.helper='!f() { echo "username=x-access-token"; echo "password=$GITHUB_TOKEN"; }; f' clone ${CARTAGE_AGENT_REPO} ${CARTAGE_AGENT_PATH}`
      const cloneResult = await d.providers.BlaxelService.execProcess(sandboxUrl, {
        command: cloneCmd,
        env: { GITHUB_TOKEN: githubToken },
        waitForCompletion: true,
        timeout: 120,
      })
      if (cloneResult.exitCode !== 0) {
        throw new XError({
          message: "Git clone failed in sandbox",
          code: "BLAXEL_CLONE_FAILED",
          data: { stderr: cloneResult.stderr, stdout: cloneResult.stdout },
        })
      }

      // 5. bun install on volume — force temp/cache onto volume so node-gyp doesn't use tmpfs
      logging.info("Running bun install in sandbox (on volume)", {
        step: "bun-install",
      })
      const installResult = await d.providers.BlaxelService.execProcess(
        sandboxUrl,
        {
          name: "bun-install",
          command:
            "mkdir -p /workspace/tmp /workspace/.cache && TMPDIR=/workspace/tmp XDG_CACHE_HOME=/workspace/.cache bun install 2>&1",
          workingDir: CARTAGE_AGENT_PATH,
          waitForCompletion: true,
          timeout: 180,
        }
      )
      if (installResult.exitCode !== 0) {
        throw new XError({
          message:
            "bun install failed in sandbox. To see full output: bl logs sandbox <sandboxName> bun-install",
          code: "BLAXEL_INSTALL_FAILED",
          data: {
            sandboxName,
            exitCode: installResult.exitCode,
            stdout: installResult.stdout,
            stderr: installResult.stderr,
            logs: installResult.logs,
          },
        })
      }

      // 6. Start dev server
      await d.providers.BlaxelService.execProcess(sandboxUrl, {
        name: "dev-server",
        command: "bun run dev -- --hostname 0.0.0.0",
        workingDir: CARTAGE_AGENT_PATH,
        waitForCompletion: false,
      })

      await waitUntilAppReady(
        (url, req) => d.providers.BlaxelService.execProcess(url, req),
        sandboxUrl,
        SANDBOX_APP_PORT
      )

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
