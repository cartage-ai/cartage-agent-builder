/**
 * Tracing helpers. Mirrors cartage-agent src/utils/tracing.utils.ts (getTraceLink only).
 */

export function getTraceLink(runId?: string): string | undefined {
    if (!process.env.LANGCHAIN_PROJECT_ID || !runId) return undefined
    return `https://smith.langchain.com/projects/p/${process.env.LANGCHAIN_PROJECT_ID}/r/${runId}`
}
