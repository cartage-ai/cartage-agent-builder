import { describe, it, expect, afterEach } from "bun:test"
import { isDevelopmentEnv, isTestEnv, isProductionEnv } from "../env.utils"

const env = process.env as Record<string, string | undefined>

describe("env.utils", () => {
    const originalNodeEnv = process.env.NODE_ENV

    afterEach(() => {
        env.NODE_ENV = originalNodeEnv
    })

    describe("isDevelopmentEnv", () => {
        it("returns true when NODE_ENV is development", () => {
            env.NODE_ENV = "development"
            expect(isDevelopmentEnv()).toBe(true)
        })

        it("returns false when NODE_ENV is production", () => {
            env.NODE_ENV = "production"
            expect(isDevelopmentEnv()).toBe(false)
        })

        it("returns false when NODE_ENV is test", () => {
            env.NODE_ENV = "test"
            expect(isDevelopmentEnv()).toBe(false)
        })
    })

    describe("isTestEnv", () => {
        it("returns true when NODE_ENV is test", () => {
            env.NODE_ENV = "test"
            expect(isTestEnv()).toBe(true)
        })

        it("returns false when NODE_ENV is development", () => {
            env.NODE_ENV = "development"
            expect(isTestEnv()).toBe(false)
        })

        it("returns false when NODE_ENV is production", () => {
            env.NODE_ENV = "production"
            expect(isTestEnv()).toBe(false)
        })
    })

    describe("isProductionEnv", () => {
        it("returns true when NODE_ENV is production", () => {
            env.NODE_ENV = "production"
            expect(isProductionEnv()).toBe(true)
        })

        it("returns false when NODE_ENV is development", () => {
            env.NODE_ENV = "development"
            expect(isProductionEnv()).toBe(false)
        })

        it("returns false when NODE_ENV is test", () => {
            env.NODE_ENV = "test"
            expect(isProductionEnv()).toBe(false)
        })
    })
})
