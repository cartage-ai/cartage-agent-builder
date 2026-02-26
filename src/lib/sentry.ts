import * as Sentry from "@sentry/node"
import { XError } from "@/utils/error.utils"

/**
 * Initialize Sentry for server-side error tracking.
 * Call once at app startup (e.g. in tRPC route handler).
 */
export function initSentry(): void {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    normalizeDepth: 10,
    maxValueLength: 1000,
    beforeSend(event, hint) {
      const exception = hint.originalException as Error
      if (exception instanceof XError && exception.customFingerPrint) {
        event.fingerprint = [exception.customFingerPrint]
      }
      return event
    },
  })
}
