import { XError } from "@/utils/error.utils"

const DEPLOYED_STATUS = "DEPLOYED"
const POLL_INTERVAL_MS = 3000
const POLL_TIMEOUT_MS = 120_000
const APP_READINESS_INITIAL_WAIT_MS = 20_000
const APP_READINESS_POLL_MS = 5_000
const APP_READINESS_TIMEOUT_MS = 90_000

export const waitUntilDeployed = async (
  getSandbox: (name: string) => Promise<{ status?: string; metadata?: { url?: string } }>,
  sandboxName: string
): Promise<string> => {
  const start = Date.now()
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    const sandbox = await getSandbox(sandboxName)
    if (sandbox.status === DEPLOYED_STATUS && sandbox.metadata?.url) {
      return sandbox.metadata.url
    }
    if (sandbox.status === "FAILED" || sandbox.status === "TERMINATED") {
      throw new XError({
        message: `Sandbox ${sandboxName} entered ${sandbox.status}`,
        code: "BLAXEL_SANDBOX_FAILED",
        data: { sandboxName, status: sandbox.status },
      })
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
  }
  throw new XError({
    message: `Sandbox ${sandboxName} did not reach DEPLOYED within timeout`,
    code: "BLAXEL_SANDBOX_TIMEOUT",
    data: { sandboxName },
  })
}

export const generateSandboxName = (): string => {
  const t = Date.now().toString(36)
  const r = Math.random().toString(36).slice(2, 8)
  return `cartage-agent-${t}-${r}`
}

export const waitUntilAppReady = async (
  execProcess: (
    url: string,
    req: { command: string; waitForCompletion: boolean; timeout: number }
  ) => Promise<{ exitCode: number; stdout?: string; stderr?: string }>,
  sandboxUrl: string,
  sandboxAppPort: number
): Promise<void> => {
  await new Promise((r) => setTimeout(r, APP_READINESS_INITIAL_WAIT_MS))
  const start = Date.now()
  while (Date.now() - start < APP_READINESS_TIMEOUT_MS) {
    const res = await execProcess(sandboxUrl, {
      command: `curl -sf -o /dev/null -w "%{http_code}" http://127.0.0.1:${sandboxAppPort}/ || echo "failed"`,
      waitForCompletion: true,
      timeout: 10,
    })
    const code = (res.stdout ?? "").trim()
    if (code === "200") return
    await new Promise((r) => setTimeout(r, APP_READINESS_POLL_MS))
  }
  const psRes = await execProcess(sandboxUrl, {
    command: "ps aux 2>/dev/null | head -30",
    waitForCompletion: true,
    timeout: 5,
  })
  throw new XError({
    message: `App did not respond with 200 on port ${sandboxAppPort} within timeout`,
    code: "BLAXEL_APP_NOT_READY",
    data: {
      processList: psRes.stdout ?? undefined,
      stderr: psRes.stderr ?? undefined,
    },
  })
}
