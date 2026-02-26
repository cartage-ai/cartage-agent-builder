import { initTRPC } from "@trpc/server"
import superjson from "superjson"
import type { TRPCContext } from "./context"
import logging from "@/utils/logger.utils"

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter(opts) {
    const { shape, error } = opts
    // Single place: log and send to Sentry (error() calls captureException)
    const toLog = error.cause instanceof Error ? error.cause : error
    logging.error(toLog instanceof Error ? toLog : new Error(String(toLog)))
    return shape
  },
})

export const router = t.router
export const publicProcedure = t.procedure
