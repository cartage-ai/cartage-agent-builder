import { describe, it, expect } from "bun:test"
import {
    generateRequestId,
    getRequestId,
    getRunId,
    setRunId,
    getRequestContext,
    setRequestContextValue,
    runWithRequestContext,
    runWithRequestContextAsync,
} from "../requestContext.utils"

describe("generateRequestId", () => {
    it("returns a string starting with req_", () => {
        expect(generateRequestId().startsWith("req_")).toBe(true)
    })

    it("returns unique ids", () => {
        expect(generateRequestId()).not.toBe(generateRequestId())
    })
})

describe("getRequestId outside context", () => {
    it("returns 'no-request-context' when no context is set", () => {
        expect(getRequestId()).toBe("no-request-context")
    })
})

describe("getRunId outside context", () => {
    it("returns undefined when no context is set", () => {
        expect(getRunId()).toBeUndefined()
    })
})

describe("getRequestContext outside context", () => {
    it("returns undefined when no context is set", () => {
        expect(getRequestContext()).toBeUndefined()
    })
})

describe("runWithRequestContext", () => {
    it("provides a requestId inside the context", () => {
        runWithRequestContext(() => {
            expect(getRequestId().startsWith("req_")).toBe(true)
        })
    })

    it("uses the provided requestId when given", () => {
        runWithRequestContext(() => {
            expect(getRequestId()).toBe("req_custom")
        }, "req_custom")
    })

    it("provides a startTime inside the context", () => {
        runWithRequestContext(() => {
            expect(getRequestContext()?.startTime).toBeGreaterThan(0)
        })
    })

    it("returns the value from the callback", () => {
        const result = runWithRequestContext(() => 42)
        expect(result).toBe(42)
    })
})

describe("runWithRequestContextAsync", () => {
    it("provides a requestId inside the async context", async () => {
        await runWithRequestContextAsync(async () => {
            expect(getRequestId().startsWith("req_")).toBe(true)
        })
    })

    it("returns the resolved value from the async callback", async () => {
        const result = await runWithRequestContextAsync(async () => "hello")
        expect(result).toBe("hello")
    })
})

describe("setRunId", () => {
    it("sets runId on the current context", () => {
        runWithRequestContext(() => {
            setRunId("run-xyz")
            expect(getRunId()).toBe("run-xyz")
        })
    })

    it("does nothing outside context", () => {
        setRunId("ignored")
        expect(getRunId()).toBeUndefined()
    })
})

describe("setRequestContextValue", () => {
    it("sets an arbitrary context value", () => {
        runWithRequestContext(() => {
            setRequestContextValue("orgId", "org-1")
            expect(getRequestContext()?.orgId).toBe("org-1")
        })
    })

    it("does nothing outside context", () => {
        setRequestContextValue("orgId", "org-1")
        expect(getRequestContext()).toBeUndefined()
    })
})
