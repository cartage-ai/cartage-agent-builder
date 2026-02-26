import { mock } from "bun:test"

export const createMockPropelAuthService = () => ({
    validateAccessToken: mock(() =>
        Promise.resolve({
            propelAuthUserId: "mock-propel-user-id",
            email: "test@cartage.ai",
        }),
    ),
})
