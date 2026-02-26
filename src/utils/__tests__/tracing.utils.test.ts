import { describe, it, expect, afterEach } from "bun:test"
import { getTraceLink } from "../tracing.utils"

describe("getTraceLink", () => {
    const originalProjectId = process.env.LANGCHAIN_PROJECT_ID

    afterEach(() => {
        if (originalProjectId === undefined) {
            delete process.env.LANGCHAIN_PROJECT_ID
        } else {
            process.env.LANGCHAIN_PROJECT_ID = originalProjectId
        }
    })

    it("returns undefined when LANGCHAIN_PROJECT_ID is not set", () => {
        delete process.env.LANGCHAIN_PROJECT_ID
        expect(getTraceLink("run-123")).toBeUndefined()
    })

    it("returns undefined when runId is not provided", () => {
        process.env.LANGCHAIN_PROJECT_ID = "proj-abc"
        expect(getTraceLink(undefined)).toBeUndefined()
    })

    it("returns a LangSmith URL when both are set", () => {
        process.env.LANGCHAIN_PROJECT_ID = "proj-abc"
        const url = getTraceLink("run-123")
        expect(url).toBe("https://smith.langchain.com/projects/p/proj-abc/r/run-123")
    })
})
