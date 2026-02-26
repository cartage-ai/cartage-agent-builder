/**
 * Request-scoped context for log correlation (requestId, runId).
 * Mirrors cartage-agent src/utils/requestContext.utils.ts.
 * Uses Node AsyncLocalStorage when available (server); no-op fallback for edge.
 */
import { AsyncLocalStorage } from "async_hooks"

/** Header for propagating request ID across boundaries (e.g. tRPC handler). */
export const REQUEST_ID_HEADER = "x-request-id"

export interface RequestContext {
    requestId: string
    runId?: string
    orgId?: string
    userId?: string
    startTime: number
}

const requestContextStorage = new AsyncLocalStorage<RequestContext>()

export function generateRequestId(): string {
    const id =
        typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID().slice(0, 8)
            : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    return `req_${id}`
}

export function getRequestId(): string {
    const context = requestContextStorage.getStore()
    return context?.requestId ?? "no-request-context"
}

export function getRunId(): string | undefined {
    return requestContextStorage.getStore()?.runId
}

export function setRunId(runId: string): void {
    const context = requestContextStorage.getStore()
    if (context) context.runId = runId
}

export function getRequestContext(): RequestContext | undefined {
    return requestContextStorage.getStore()
}

export function setRequestContextValue<K extends keyof RequestContext>(
    key: K,
    value: RequestContext[K],
): void {
    const context = requestContextStorage.getStore()
    if (context) context[key] = value
}

export function runWithRequestContext<T>(fn: () => T, existingRequestId?: string): T {
    const context: RequestContext = {
        requestId: existingRequestId ?? generateRequestId(),
        startTime: Date.now(),
    }
    return requestContextStorage.run(context, fn)
}

export async function runWithRequestContextAsync<T>(
    fn: () => Promise<T>,
    existingRequestId?: string,
): Promise<T> {
    const context: RequestContext = {
        requestId: existingRequestId ?? generateRequestId(),
        startTime: Date.now(),
    }
    return requestContextStorage.run(context, fn)
}
