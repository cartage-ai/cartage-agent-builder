import { validateAccessToken as propelValidateAccessToken } from "@propelauth/nextjs/server"
import { XError } from "@/utils/error.utils"

export type PropelAuthUser = {
    propelAuthUserId: string
    email: string
}

const validateAccessToken = async (accessToken: string): Promise<PropelAuthUser> => {
    try {
        const user = await propelValidateAccessToken(`Bearer ${accessToken}`)
        if (!user.email) {
            throw new XError({
                message: "PropelAuth user has no email address",
                code: "PROPELAUTH_NO_EMAIL",
                statusCode: 401,
            })
        }
        return { propelAuthUserId: user.userId, email: user.email }
    } catch (error) {
        if (error instanceof XError) throw error
        throw new XError({
            message: "Invalid PropelAuth access token",
            code: "PROPELAUTH_INVALID_TOKEN",
            statusCode: 401,
            cause: error as Error,
        })
    }
}

export const PropelAuthService = { validateAccessToken }
