import { fetchRequestHandler } from "@trpc/server/adapters/fetch"
import { NextRequest } from "next/server"
import { appRouter } from "@/server/api/root"
import { createTRPCContext } from "@/server/api/context"
import { initSentry } from "@/lib/sentry"
import {
    runWithRequestContextAsync,
    getRequestId,
    REQUEST_ID_HEADER,
} from "@/utils/requestContext.utils"
import * as Sentry from "@sentry/node"

initSentry()

const handler = async (req: NextRequest) => {
    const existingRequestId = req.headers.get(REQUEST_ID_HEADER) ?? undefined

    return runWithRequestContextAsync(async () => {
        const requestId = getRequestId()

        return Sentry.withIsolationScope((scope) => {
            scope.setTag("requestId", requestId)
            return fetchRequestHandler({
                endpoint: "/api/trpc",
                req,
                router: appRouter,
                createContext: () => createTRPCContext(req),
            })
        })
    }, existingRequestId)
}

export { handler as GET, handler as POST }
