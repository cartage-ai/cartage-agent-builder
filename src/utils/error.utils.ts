/**
 * XError – canonical error type for workflows and APIs.
 * Use instead of Error so errors have codes, context (data), and cause chaining.
 * See cartage-agent CLAUDE.md "Error Handling" and workflows/CLAUDE.md.
 */

export type XErrorCategory = "something"

export type XErrorParams = {
    orgId?: string | null
    message: string
    code?: string
    category?: XErrorCategory
    data?: unknown
    cause?: Error | Error[] | null
    sentryTags?: Record<string, string>
    runId?: string
    statusCode?: number
}

export class XError extends Error {
    orgId?: string | null
    override message: string
    code?: string
    category?: XErrorCategory
    data?: unknown
    cause: Error | Error[] | null
    sentryTags?: Record<string, string>
    runId?: string
    statusCode?: number
    customFingerPrint: string

    constructor({
        orgId,
        code,
        cause = null,
        message,
        category,
        data,
        sentryTags,
        runId,
        statusCode,
    }: XErrorParams) {
        super(message)
        const derivedCode = code ?? getFirstLetters(message)
        this.name = derivedCode ?? this.constructor.name
        this.message = message
        this.orgId = orgId
        this.code = code
        this.category = category
        this.data = data
        this.sentryTags = sentryTags
        this.runId = runId
        this.statusCode = statusCode
        this.cause =
            Array.isArray(cause) || cause instanceof Error || cause === null
                ? cause
                : (cause as Error)
        this.customFingerPrint = derivedCode
        if (typeof Error.captureStackTrace === "function") {
            Error.captureStackTrace(this, XError)
        }
    }
}

export const xerr = (params: XErrorParams): XError => new XError(params)

export type ErrorDetails = {
    name: string
    message: string
    data?: unknown
    stack?: string
}

export type ErrorData = Record<string, ErrorDetails>

export const getAllErrors = (error: Error): Error[] => {
    const errors = [error]
    if (!(error instanceof XError)) return errors
    if (Array.isArray(error.cause)) {
        error.cause.forEach((cause) => errors.push(...getAllErrors(cause)))
    } else if (error.cause) {
        errors.push(...getAllErrors(error.cause))
    }
    return errors
}

export const getAggregatedMessage = (errors: Error[]): string =>
    errors.map((e) => e.message ?? e.name ?? JSON.stringify(e)).join(" -> ")

const errorToString = (error: Error): string => error.message ?? JSON.stringify(error)

export const getErrorName = (errors: Error[]): string => {
    if (errors.length === 0) return "No errors"
    if (errors.length === 1) return errorToString(errors[0]!)
    const last = errors[errors.length - 1]!
    return `${errorToString(errors[0]!)}: ${errorToString(last)}`
}

export const getCustomFingerPrint = (errors: Error[]): string => errors.map((e) => e.name).join("-")

export const getErrorData = (allErrors: Error[]): ErrorData => {
    const result: ErrorData = {}
    allErrors.forEach((error, i) => {
        const errorData: ErrorDetails =
            error instanceof XError
                ? {
                      name: error.name,
                      data: error.data,
                      message: error.message,
                      stack: error.stack,
                  }
                : {
                      name: error.name,
                      message: error.message,
                      stack: error.stack,
                  }
        result[`${i + 1}: ${error.message}`] = errorData
    })
    return result
}

export const getFirstLetters = (inputString: string): string =>
    inputString
        .split(" ")
        .filter(Boolean)
        .map((word) => word[0]!.toLowerCase())
        .join("")
