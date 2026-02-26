import { getRequestId } from "@/utils/requestContext.utils"

export interface TRPCContext {
  baseUrl: string
  requestId: string
}

export async function createTRPCContext(req: Request): Promise<TRPCContext> {
  const host = req.headers.get("host")
  const protocol = req.headers.get("x-forwarded-proto") ?? "http"
  const baseUrl = `${protocol}://${host ?? "localhost"}`
  const requestId = getRequestId()
  return { baseUrl, requestId }
}
