import { describe, it, expect } from "bun:test"
import { formatVersion, formatBuildInfo } from "../utils/getBuildInfoWorkflow.utils"

describe("formatVersion", () => {
    it("returns the version trimmed", () => {
        expect(formatVersion("  1.2.3  ")).toBe("1.2.3")
    })

    it("returns '0.0.0' for empty string", () => {
        expect(formatVersion("")).toBe("0.0.0")
    })

    it("returns '0.0.0' for whitespace-only string", () => {
        expect(formatVersion("   ")).toBe("0.0.0")
    })
})

describe("formatBuildInfo", () => {
    it("returns a BuildInfo with the given version and env", () => {
        const result = formatBuildInfo("1.0.0", "production")
        expect(result.version).toBe("1.0.0")
        expect(result.env).toBe("production")
    })

    it("falls back to 'development' when env is empty", () => {
        const result = formatBuildInfo("1.0.0", "")
        expect(result.env).toBe("development")
    })

    it("includes a timestamp in ISO format", () => {
        const result = formatBuildInfo("1.0.0", "test")
        expect(() => new Date(result.timestamp)).not.toThrow()
        expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it("applies formatVersion to the version", () => {
        const result = formatBuildInfo("", "test")
        expect(result.version).toBe("0.0.0")
    })
})
