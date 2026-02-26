import { XError } from "@/utils/error.utils"
import logging from "@/utils/logger.utils"
import { allProviders } from "../kitchenSinkProviders"
import { isCartageEmail, signSessionToken } from "./utils/authLoginWorkflow.utils"

export type AuthLoginWorkflowParams = {
    accessToken: string
}

export type AuthLoginWorkflowResult = {
    sessionToken: string
}

export type AuthLoginWorkflowDependencies = {
    providers: typeof allProviders
}

export type AuthLoginWorkflow = (
    params: AuthLoginWorkflowParams,
) => Promise<AuthLoginWorkflowResult>

export const authLoginWorkflowWithDeps =
    (d: AuthLoginWorkflowDependencies): AuthLoginWorkflow =>
    async (params) => {
        logging.info("Starting authLoginWorkflow")

        try {
            const { propelAuthUserId, email } =
                await d.providers.PropelAuthService.validateAccessToken(params.accessToken)

            if (!isCartageEmail(email)) {
                throw new XError({
                    message: "Access restricted to @cartage.ai accounts",
                    code: "UNAUTHORIZED_DOMAIN",
                    statusCode: 403,
                })
            }

            let user = await d.providers.UserModel.UNSAFE_findOne((q) =>
                q.where("propelAuthUserId", "==", propelAuthUserId),
            )

            if (!user) {
                logging.info("Creating new user", { email })
                user = await d.providers.UserModel.create({ propelAuthUserId, email })
            }

            const sessionToken = signSessionToken({ userId: user.id, email: user.email })

            return { sessionToken }
        } catch (error) {
            if (error instanceof XError) throw error
            throw new XError({
                message: "authLoginWorkflow generic catch error",
                data: { email: "redacted" },
                cause: error as Error,
            })
        }
    }

export const authLoginWorkflow = authLoginWorkflowWithDeps({ providers: allProviders })
