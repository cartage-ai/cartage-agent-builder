/**
 * Logger util migrated from cartage-agent. Same API: logging.info(), .error(), .logXErr(), etc.
 * Uses winston; Sentry used when initSentry() has been called (e.g. in tRPC handler).
 */
import { createLogger, format, transports } from "winston"
import * as Sentry from "@sentry/node"
import {
  getAllErrors,
  getAggregatedMessage,
  getErrorName,
  getCustomFingerPrint,
  getErrorData,
  XError,
  type XErrorParams,
} from "./error.utils"
import { isProductionEnv, isTestEnv } from "./env.utils"
import { getRequestId, getRunId } from "./requestContext.utils"
import { getTraceLink } from "./tracing.utils"

const isProduction = isProductionEnv()

const sysLogLevels = {
  emergency: 0,
  alert: 1,
  critical: 2,
  error: 3,
  warning: 4,
  info: 6,
  debug: 7,
}

const getLogLevel = (): string => (isProduction ? "info" : "info")

const devTransport = new transports.Console({
  silent: isTestEnv(),
  format: format.combine(
    format.errors({ stack: true }),
    format.timestamp({}),
    format.printf((info: Record<string, unknown>) => {
      const { timestamp, level, message, stack, ...rest } = info
      const data = Object.keys(rest).length ? `\n${JSON.stringify(rest, null, 2)}` : ""
      const stackStr = stack ? `\n\n${stack}` : ""
      return `[${timestamp}][${level}]: ${message} ${data}${stackStr}`
    })
  ),
})

const prodTransport = new transports.Console({
  format: format.combine(format.errors({ stack: true }), format.timestamp({}), format.json()),
})

const logger = createLogger({
  level: getLogLevel(),
  levels: sysLogLevels,
  exitOnError: false,
  transports: [isProduction ? prodTransport : devTransport],
})

const sentryLevelMap: Record<string, Sentry.SeverityLevel> = {
  fatal: "fatal",
  error: "error",
  warning: "warning",
  info: "info",
  debug: "debug",
}

function addBreadcrumb(level: string, message: string, data: unknown): void {
  try {
    Sentry.addBreadcrumb({
      category: "logger",
      message,
      data: data as Record<string, unknown>,
      level: (sentryLevelMap[level] ?? "info") as Sentry.SeverityLevel,
    })
  } catch {
    // ignore if Sentry not inited
  }
}

function captureException(level: string, messageOrError: string | Error): void {
  const parentError =
    messageOrError instanceof Error ? messageOrError : new Error(messageOrError)
  const allErrors = getAllErrors(parentError)
  const aggregatedMessage = getAggregatedMessage(allErrors)
  const errorData = getErrorData(allErrors)
  const name = getErrorName(allErrors)
  const customFingerPrint = getCustomFingerPrint(allErrors)
  const sentryLevel = (sentryLevelMap[level] ?? "error") as Sentry.SeverityLevel

  if (parentError instanceof XError) {
    (parentError as Error & { name: string }).name = name
    ;(parentError as Error & { message: string }).message = aggregatedMessage
    ;(parentError as XError).customFingerPrint = customFingerPrint
  }

  try {
    Sentry.withScope((scope) => {
      scope.setContext("errorData", errorData as Record<string, unknown>)
      if (parentError instanceof XError) {
        if (parentError.orgId) scope.setTag("orgId", parentError.orgId)
        if (parentError.sentryTags) {
          Object.entries(parentError.sentryTags).forEach(([k, v]) =>
            scope.setTag(k, v)
          )
        }
        if (parentError.runId) {
          scope.setTag("runId", parentError.runId)
          const url = getTraceLink(parentError.runId)
          if (url) scope.setContext("langsmith", { runId: parentError.runId, url })
        }
        if (parentError.customFingerPrint) {
          scope.setFingerprint([parentError.customFingerPrint])
        }
      }
      scope.setLevel(sentryLevel)
      Sentry.captureException(parentError)
    })
  } catch {
    // Sentry not inited or failed
  }
}

function logWithStacktrace(level: string, messageOrError: string | Error): void {
  const requestId = getRequestId()
  const runId = getRunId()
  const contextData = { requestId, ...(runId && { runId }) }

  if (messageOrError instanceof XError) {
    logger.log({
      level,
      message: `[${messageOrError.code}]: ${messageOrError.message}`,
      stack: messageOrError.stack,
      data: messageOrError.data,
      ...contextData,
    })
    if (Array.isArray(messageOrError.cause)) {
      messageOrError.cause.forEach((cause) => logWithStacktrace(level, cause))
    } else if (messageOrError.cause) {
      logWithStacktrace(level, messageOrError.cause)
    }
  } else if (messageOrError instanceof Error) {
    logger.log({
      level,
      message: `[${messageOrError.name}]: ${messageOrError.message}`,
      stack: messageOrError.stack,
      ...contextData,
    })
  } else {
    logger.log({ level, message: messageOrError, ...contextData })
  }
}

function emergency(messageOrError: Error | string): void {
  captureException("fatal", messageOrError)
  logWithStacktrace("emergency", messageOrError)
}

function alert(messageOrError: Error | string): void {
  captureException("warning", messageOrError)
  logWithStacktrace("alert", messageOrError)
}

function critical(messageOrError: Error | string): void {
  captureException("error", messageOrError)
  logWithStacktrace("critical", messageOrError)
}

function error(messageOrError: Error | string): void {
  captureException("error", messageOrError)
  logWithStacktrace("error", messageOrError)
}

function logXErr(params: XErrorParams | unknown): Error {
  const err = new XError(params as XErrorParams)
  error(err)
  return err
}

function warning(messageOrError: string | Error, data?: unknown): void {
  if (messageOrError instanceof Error) {
    captureException("warning", messageOrError)
    logWithStacktrace("warning", messageOrError)
  } else {
    const enrichedData = enrichWithRequestContext(data)
    addBreadcrumb("warning", messageOrError, enrichedData)
    logger.warning(messageOrError, enrichedData)
  }
}

function enrichWithRequestContext(data?: unknown): unknown {
  const requestId = getRequestId()
  const runId = getRunId()
  return { ...(typeof data === "object" && data !== null ? data : {}), requestId, ...(runId && { runId }) }
}

function info(message: unknown, data?: unknown): void {
  const enrichedData = enrichWithRequestContext(data)
  addBreadcrumb("info", typeof message === "string" ? message : JSON.stringify(message), enrichedData)
  logger.info(message as string, enrichedData)
}

function debug(message: unknown, data?: unknown): void {
  const enrichedData = enrichWithRequestContext(data)
  addBreadcrumb("debug", typeof message === "string" ? message : JSON.stringify(message), enrichedData)
  logger.debug(message as string, enrichedData)
}

export async function emptyQueue(): Promise<null> {
  try {
    const client = Sentry.getClient()
    if (client) await client.close(2000)
  } catch {
    // ignore
  }
  return null
}

const logging = {
  emergency,
  alert,
  critical,
  error,
  logXErr,
  warning,
  info,
  debug,
  emptyQueue,
}

export default logging
