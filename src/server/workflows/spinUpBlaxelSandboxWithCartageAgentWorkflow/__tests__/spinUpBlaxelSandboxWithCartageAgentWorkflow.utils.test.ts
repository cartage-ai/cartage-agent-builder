import { describe, it, expect, mock } from "bun:test"
import {
    generateSandboxName,
    waitUntilDeployed,
    waitUntilAppReady,
} from "../utils/spinUpBlaxelSandboxWithCartageAgentWorkflow.utils"
import { XError } from "@/utils/error.utils"
import type { SandboxInstance } from "@blaxel/core"

describe("generateSandboxName", () => {
    it("starts with 'cartage-agent-'", () => {
        expect(generateSandboxName().startsWith("cartage-agent-")).toBe(true)
    })

    it("returns unique names", () => {
        expect(generateSandboxName()).not.toBe(generateSandboxName())
    })
})

describe("waitUntilDeployed", () => {
    it("resolves with sandbox URL when status is DEPLOYED", async () => {
        const getSandbox = mock(() =>
            Promise.resolve({
                status: "DEPLOYED",
                metadata: { url: "https://sandbox.example.com" },
            } as unknown as SandboxInstance),
        )
        const url = await waitUntilDeployed(getSandbox, "my-sandbox")
        expect(url).toBe("https://sandbox.example.com")
    })

    it("polls until DEPLOYED", async () => {
        let calls = 0
        const getSandbox = mock(() => {
            calls++
            if (calls < 3) {
                return Promise.resolve({
                    status: "PENDING",
                    metadata: {},
                } as unknown as SandboxInstance)
            }
            return Promise.resolve({
                status: "DEPLOYED",
                metadata: { url: "https://sandbox.example.com" },
            } as unknown as SandboxInstance)
        })
        const url = await waitUntilDeployed(getSandbox, "my-sandbox")
        expect(url).toBe("https://sandbox.example.com")
        expect(calls).toBe(3)
    })

    it("throws XError when status is FAILED", async () => {
        const getSandbox = mock(() =>
            Promise.resolve({
                status: "FAILED",
                metadata: {},
            } as unknown as SandboxInstance),
        )
        await expect(waitUntilDeployed(getSandbox, "my-sandbox")).rejects.toBeInstanceOf(XError)
    })

    it("throws XError when status is TERMINATED", async () => {
        const getSandbox = mock(() =>
            Promise.resolve({
                status: "TERMINATED",
                metadata: {},
            } as unknown as SandboxInstance),
        )
        await expect(waitUntilDeployed(getSandbox, "my-sandbox")).rejects.toBeInstanceOf(XError)
    })
})

describe("waitUntilAppReady", () => {
    const mockSandbox = {} as SandboxInstance

    it("resolves when curl returns 200", async () => {
        const execProcess = mock(() => Promise.resolve({ exitCode: 0, stdout: "200", stderr: "" }))
        await expect(waitUntilAppReady(execProcess, mockSandbox, 3000)).resolves.toBeUndefined()
    })

    it("retries until 200 is returned", async () => {
        let calls = 0
        const execProcess = mock(() => {
            calls++
            if (calls < 3) {
                return Promise.resolve({ exitCode: 0, stdout: "502", stderr: "" })
            }
            return Promise.resolve({ exitCode: 0, stdout: "200", stderr: "" })
        })
        await waitUntilAppReady(execProcess, mockSandbox, 3000)
        expect(calls).toBe(3)
    })

    it("throws XError when app never returns 200 within timeout", async () => {
        const execProcess = mock(() =>
            Promise.resolve({ exitCode: 0, stdout: "failed", stderr: "" }),
        )

        // Patch Date.now to fast-forward past timeout immediately after first check
        const realDateNow = Date.now
        let callIndex = 0
        Date.now = () => {
            callIndex++
            // First call (start): 0, subsequent calls: past timeout
            return callIndex === 1 ? 0 : 200_000
        }

        try {
            await expect(waitUntilAppReady(execProcess, mockSandbox, 3000)).rejects.toBeInstanceOf(
                XError,
            )
        } finally {
            Date.now = realDateNow
        }
    })
})
