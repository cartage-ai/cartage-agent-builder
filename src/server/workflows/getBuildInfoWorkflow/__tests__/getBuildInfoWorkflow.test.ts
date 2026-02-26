import { describe, it, expect, afterEach } from "bun:test"
import { mockDB } from "@/mocks/db.mock"
import { getBuildInfoWorkflowWithDeps } from "../getBuildInfoWorkflow"

const env = process.env as Record<string, string | undefined>

describe("getBuildInfoWorkflow", () => {
    const db = mockDB()

    afterEach(() => {
        db.reset()
    })

    it("returns version from params", async () => {
        const workflow = getBuildInfoWorkflowWithDeps({ providers: db.providerMocks })
        const result = await workflow({ appVersion: "2.3.4", env: "production" })
        expect(result.version).toBe("2.3.4")
        expect(result.env).toBe("production")
    })

    it("falls back to npm_package_version when appVersion is not provided", async () => {
        process.env.npm_package_version = "9.9.9"
        const workflow = getBuildInfoWorkflowWithDeps({ providers: db.providerMocks })
        const result = await workflow({})
        expect(result.version).toBe("9.9.9")
        delete process.env.npm_package_version
    })

    it("falls back to 0.1.0 when no version is available", async () => {
        const saved = process.env.npm_package_version
        delete process.env.npm_package_version
        const workflow = getBuildInfoWorkflowWithDeps({ providers: db.providerMocks })
        const result = await workflow({})
        expect(result.version).toBe("0.1.0")
        if (saved !== undefined) process.env.npm_package_version = saved
    })

    it("falls back to NODE_ENV when env is not provided", async () => {
        env.NODE_ENV = "test"
        const workflow = getBuildInfoWorkflowWithDeps({ providers: db.providerMocks })
        const result = await workflow({ appVersion: "1.0.0" })
        expect(result.env).toBe("test")
    })

    it("returns a timestamp", async () => {
        const workflow = getBuildInfoWorkflowWithDeps({ providers: db.providerMocks })
        const result = await workflow({ appVersion: "1.0.0", env: "test" })
        expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })
})
