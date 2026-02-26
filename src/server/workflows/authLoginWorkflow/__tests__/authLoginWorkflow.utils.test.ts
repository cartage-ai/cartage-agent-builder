import { describe, it, expect, afterEach } from "bun:test"
import {
    isCartageEmail,
    signSessionToken,
    verifySessionToken,
} from "../utils/authLoginWorkflow.utils"

const env = process.env as Record<string, string | undefined>

describe("isCartageEmail", () => {
    it("returns true for @cartage.ai emails", () => {
        expect(isCartageEmail("josh@cartage.ai")).toBe(true)
    })

    it("returns false for other domains", () => {
        expect(isCartageEmail("user@gmail.com")).toBe(false)
    })

    it("returns false for subdomains of cartage.ai", () => {
        expect(isCartageEmail("user@sub.cartage.ai")).toBe(false)
    })
})

describe("signSessionToken / verifySessionToken", () => {
    const originalSecret = process.env.SESSION_SECRET

    afterEach(() => {
        env.SESSION_SECRET = originalSecret
    })

    it("signs a token and verifies it back", () => {
        env.SESSION_SECRET = "test-secret"
        const token = signSessionToken({ userId: "user-1", email: "test@cartage.ai" })
        const payload = verifySessionToken(token)
        expect(payload?.userId).toBe("user-1")
        expect(payload?.email).toBe("test@cartage.ai")
    })

    it("verifySessionToken returns null for an invalid token", () => {
        env.SESSION_SECRET = "test-secret"
        expect(verifySessionToken("not-a-valid-token")).toBeNull()
    })

    it("verifySessionToken returns null when SESSION_SECRET is not set", () => {
        delete env.SESSION_SECRET
        expect(verifySessionToken("any-token")).toBeNull()
    })

    it("signSessionToken throws when SESSION_SECRET is not set", () => {
        delete env.SESSION_SECRET
        expect(() => signSessionToken({ userId: "u", email: "e@cartage.ai" })).toThrow()
    })
})
