import { getRequestId } from "@/utils/requestContext.utils"
import { verifySessionToken } from "@/server/workflows/authLoginWorkflow/utils/authLoginWorkflow.utils"
import { SESSION_COOKIE_KEY } from "@/constants/app.constants"

export interface TRPCContext {
    baseUrl: string
    requestId: string
    userId: string | null
    userEmail: string | null
}

export async function createTRPCContext(req: Request): Promise<TRPCContext> {
    const host = req.headers.get("host")
    const protocol = req.headers.get("x-forwarded-proto") ?? "http"
    const baseUrl = `${protocol}://${host ?? "localhost"}`
    const requestId = getRequestId()

    const cookieHeader = req.headers.get("cookie") ?? ""
    const sessionToken = parseCookie(cookieHeader, SESSION_COOKIE_KEY)
    const session = sessionToken ? verifySessionToken(sessionToken) : null

    return {
        baseUrl,
        requestId,
        userId: session?.userId ?? null,
        userEmail: session?.email ?? null,
    }
}

const parseCookie = (cookieHeader: string, key: string): string | null => {
    const match = cookieHeader
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith(`${key}=`))
    return match ? (match.split("=").slice(1).join("=") ?? null) : null
}
