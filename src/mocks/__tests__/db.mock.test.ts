import { describe, it, expect, afterEach } from "bun:test"
import { mockDB, DEFAULT_ORG_ID } from "../db.mock"

describe("mockDB", () => {
    const db = mockDB((orgId) => ({
        examples: [{ id: "ex-1", orgId, name: "Test Example", status: "draft" as const }],
    }))

    afterEach(() => {
        db.reset()
    })

    it("exposes the default org ID", () => {
        expect(db.orgId).toBe(DEFAULT_ORG_ID)
    })

    it("provides mocked model methods as bun mock functions", () => {
        expect(typeof db.providerMocks.ExampleModel.create).toBe("function")
        expect(typeof db.providerMocks.ExampleModel.getById).toBe("function")
    })

    it("provides mocked service methods as bun mock functions", () => {
        expect(typeof db.providerMocks.GitHubService.getBranchRef).toBe("function")
        expect(typeof db.providerMocks.BlaxelService.createSandbox).toBe("function")
    })

    it("can read seeded data via ExampleModel.getById", async () => {
        const doc = await db.providerMocks.ExampleModel.getById("ex-1")
        expect(doc).toBeDefined()
        expect(doc?.name).toBe("Test Example")
    })

    it("resets mock call counts after db.reset()", async () => {
        await db.providerMocks.ExampleModel.getById("ex-1")
        expect(db.providerMocks.ExampleModel.getById).toHaveBeenCalledTimes(1)
        db.reset()
        expect(db.providerMocks.ExampleModel.getById).toHaveBeenCalledTimes(0)
    })
})
