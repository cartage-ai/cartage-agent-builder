import { describe, it, expect, afterEach, mock } from "bun:test"
import { mockDB } from "@/mocks/db.mock"
import { spinUpBlaxelSandboxWithCartageAgentWorkflowWithDeps } from "../spinUpBlaxelSandboxWithCartageAgentWorkflow"
import { XError } from "@/utils/error.utils"
import type { SandboxInstance } from "@blaxel/core"

const REQUIRED_ENV: Record<string, string> = {
    BLAXEL_SANDBOX_IMAGE: "blaxel/cartage-agent-sandbox:latest",
    SANDBOX_LINGODOTDEV_API_KEY: "lingo-key",
    SANDBOX_GCP_TEST_PROJECT_ID: "test-proj",
    SANDBOX_GCP_TEST_PROJECT_CLIENT_EMAIL: "test@test.com",
    SANDBOX_GCP_TEST_PROJECT_CLIENT_PRIVATE_KEY: "test-key",
    SANDBOX_GCP_DEV_PROJECT_ID: "dev-proj",
    SANDBOX_GCP_DEV_PROJECT_CLIENT_EMAIL: "dev@dev.com",
    SANDBOX_GCP_DEV_PROJECT_CLIENT_PRIVATE_KEY: "dev-key",
}

const setEnv = (overrides: Partial<Record<string, string>> = {}) => {
    const env = { ...REQUIRED_ENV, ...overrides }
    for (const [k, v] of Object.entries(env)) {
        if (v === undefined) {
            delete process.env[k]
        } else {
            process.env[k] = v
        }
    }
}

const clearEnv = () => {
    for (const k of Object.keys(REQUIRED_ENV)) {
        delete process.env[k]
    }
}

describe("spinUpBlaxelSandboxWithCartageAgentWorkflow", () => {
    const db = mockDB()

    afterEach(() => {
        db.reset()
        clearEnv()
        // db.reset() clears model mocks but not service mocks — clear them manually
        for (const fn of Object.values(db.providerMocks.BlaxelService)) {
            if (typeof fn === "function" && "mockClear" in fn) {
                ;(fn as { mockClear: () => void }).mockClear()
            }
        }
    })

    const makeDeployedSandboxMock = () =>
        mock(() =>
            Promise.resolve({
                status: "DEPLOYED",
                metadata: { name: "mock-sandbox", url: "https://mock-sandbox.blaxel.ai" },
            } as unknown as SandboxInstance),
        )

    const makeReadyExecMock = () =>
        mock(() =>
            Promise.resolve({
                exitCode: 0,
                stdout: "200",
                stderr: "",
                command: "curl",
                completedAt: new Date().toISOString(),
                logs: "",
                name: "test",
                startedAt: new Date().toISOString(),
                status: "completed" as const,
                workingDir: "/",
                pid: "1234",
                close: () => {},
            }),
        )

    it("throws XError when BLAXEL_SANDBOX_IMAGE is missing", async () => {
        setEnv({ BLAXEL_SANDBOX_IMAGE: undefined })
        const workflow = spinUpBlaxelSandboxWithCartageAgentWorkflowWithDeps({
            providers: db.providerMocks,
        })
        await expect(workflow({})).rejects.toBeInstanceOf(XError)
    })

    it("throws XError when a required SANDBOX env key is missing", async () => {
        setEnv({ SANDBOX_LINGODOTDEV_API_KEY: undefined })
        const workflow = spinUpBlaxelSandboxWithCartageAgentWorkflowWithDeps({
            providers: db.providerMocks,
        })
        await expect(workflow({})).rejects.toBeInstanceOf(XError)
    })

    it("returns environment result on success", async () => {
        setEnv()
        db.providerMocks.BlaxelService.getSandbox = makeDeployedSandboxMock()
        db.providerMocks.BlaxelService.execProcess = makeReadyExecMock()

        const workflow = spinUpBlaxelSandboxWithCartageAgentWorkflowWithDeps({
            providers: db.providerMocks,
        })
        const result = await workflow({ orgId: db.orgId, createdBy: "test-user" })

        expect(result.sandboxName).toMatch(/^cartage-agent-/)
        expect(result.previewUrl).toBe("https://mock-preview.blaxel.ai")
        expect(result.status).toBe("active")
        expect(result.environmentId).toBeDefined()
    })

    it("creates the sandbox with the correct image and memory", async () => {
        setEnv()
        db.providerMocks.BlaxelService.getSandbox = makeDeployedSandboxMock()
        db.providerMocks.BlaxelService.execProcess = makeReadyExecMock()

        const workflow = spinUpBlaxelSandboxWithCartageAgentWorkflowWithDeps({
            providers: db.providerMocks,
        })
        await workflow({ orgId: db.orgId })

        expect(db.providerMocks.BlaxelService.createSandbox).toHaveBeenCalledTimes(1)
        const call = (db.providerMocks.BlaxelService.createSandbox as ReturnType<typeof mock>).mock
            .calls[0]![0] as {
            image: string
            memory: number
        }
        expect(call.image).toBe("blaxel/cartage-agent-sandbox:latest")
        expect(call.memory).toBe(8192)
    })

    it("strips SANDBOX_ prefix from env var names passed to the sandbox", async () => {
        setEnv()
        db.providerMocks.BlaxelService.getSandbox = makeDeployedSandboxMock()
        db.providerMocks.BlaxelService.execProcess = makeReadyExecMock()

        const workflow = spinUpBlaxelSandboxWithCartageAgentWorkflowWithDeps({
            providers: db.providerMocks,
        })
        await workflow({ orgId: db.orgId })

        const call = (db.providerMocks.BlaxelService.createSandbox as ReturnType<typeof mock>).mock
            .calls[0]![0] as {
            envs: { name: string; value: string }[]
        }
        const names = call.envs.map((e) => e.name)
        expect(names).toContain("LINGODOTDEV_API_KEY")
        expect(names).not.toContain("SANDBOX_LINGODOTDEV_API_KEY")
    })

    it("defaults orgId to 'default' and createdBy to 'anonymous'", async () => {
        setEnv()
        db.providerMocks.BlaxelService.getSandbox = makeDeployedSandboxMock()
        db.providerMocks.BlaxelService.execProcess = makeReadyExecMock()

        const workflow = spinUpBlaxelSandboxWithCartageAgentWorkflowWithDeps({
            providers: db.providerMocks,
        })
        await workflow({})

        expect(db.providerMocks.EnvironmentModel.create).toHaveBeenCalledTimes(1)
        const call = (db.providerMocks.EnvironmentModel.create as ReturnType<typeof mock>).mock
            .calls[0]![0] as { orgId: string; createdBy: string }
        expect(call.orgId).toBe("default")
        expect(call.createdBy).toBe("anonymous")
    })
})
