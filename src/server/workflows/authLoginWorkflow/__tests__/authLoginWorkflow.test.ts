import { describe, it, expect, afterEach, beforeAll, mock } from "bun:test"
import { mockDB } from "@/mocks/db.mock"
import { authLoginWorkflowWithDeps } from "../authLoginWorkflow"
import { XError } from "@/utils/error.utils"
import { verifySessionToken } from "../utils/authLoginWorkflow.utils"

const env = process.env as Record<string, string | undefined>

describe("authLoginWorkflow", () => {
    const db = mockDB()

    afterEach(() => {
        db.reset()
        for (const fn of Object.values(db.providerMocks.PropelAuthService)) {
            if (typeof fn === "function" && "mockClear" in fn) {
                ;(fn as { mockClear: () => void }).mockClear()
            }
        }
        env.SESSION_SECRET = "test-secret"
    })

    beforeAll(() => {
        env.SESSION_SECRET = "test-secret"
    })

    it("creates a new user and returns a session token for a valid cartage.ai login", async () => {
        const workflow = authLoginWorkflowWithDeps({ providers: db.providerMocks })
        const result = await workflow({ accessToken: "valid-token" })

        expect(result.sessionToken).toBeDefined()
        const payload = verifySessionToken(result.sessionToken)
        expect(payload?.email).toBe("test@cartage.ai")
    })

    it("reuses an existing user on subsequent logins", async () => {
        const workflow = authLoginWorkflowWithDeps({ providers: db.providerMocks })
        const first = await workflow({ accessToken: "valid-token" })
        const second = await workflow({ accessToken: "valid-token" })

        const p1 = verifySessionToken(first.sessionToken)
        const p2 = verifySessionToken(second.sessionToken)
        expect(p1?.email).toBe(p2?.email)
        // create called once for the first login; second login reuses the existing user
        expect(db.providerMocks.UserModel.create).toHaveBeenCalledTimes(1)
    })

    it("throws 403 XError for non-cartage.ai emails", async () => {
        db.providerMocks.PropelAuthService.validateAccessToken = mock(() =>
            Promise.resolve({ propelAuthUserId: "uid-2", email: "hacker@gmail.com" }),
        )
        const workflow = authLoginWorkflowWithDeps({ providers: db.providerMocks })
        const err = await workflow({ accessToken: "valid-token" }).catch((e) => e)

        expect(err).toBeInstanceOf(XError)
        expect((err as XError).statusCode).toBe(403)
    })

    it("throws XError when PropelAuth token validation fails", async () => {
        db.providerMocks.PropelAuthService.validateAccessToken = mock(() =>
            Promise.reject(
                new XError({ message: "Invalid PropelAuth access token", statusCode: 401 }),
            ),
        )
        const workflow = authLoginWorkflowWithDeps({ providers: db.providerMocks })
        await expect(workflow({ accessToken: "bad-token" })).rejects.toBeInstanceOf(XError)
    })
})
