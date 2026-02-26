import { describe, it, expect } from "bun:test"
import {
    XError,
    xerr,
    getAllErrors,
    getAggregatedMessage,
    getErrorName,
    getCustomFingerPrint,
    getErrorData,
    getFirstLetters,
} from "../error.utils"

describe("getFirstLetters", () => {
    it("returns first letter of each word lowercased", () => {
        expect(getFirstLetters("Hello World")).toBe("hw")
    })

    it("filters empty strings from extra spaces", () => {
        expect(getFirstLetters("  foo  bar  ")).toBe("fb")
    })

    it("returns empty string for empty input", () => {
        expect(getFirstLetters("")).toBe("")
    })
})

describe("XError", () => {
    it("sets message and code", () => {
        const err = new XError({ message: "something went wrong", code: "ERR_001" })
        expect(err.message).toBe("something went wrong")
        expect(err.code).toBe("ERR_001")
    })

    it("derives name from code when provided", () => {
        const err = new XError({ message: "oops", code: "MY_CODE" })
        expect(err.name).toBe("MY_CODE")
    })

    it("derives customFingerPrint from first letters when no code", () => {
        const err = new XError({ message: "something bad happened" })
        expect(err.customFingerPrint).toBe("sbh")
    })

    it("sets cause to null by default", () => {
        const err = new XError({ message: "no cause" })
        expect(err.cause).toBeNull()
    })

    it("accepts a single Error as cause", () => {
        const cause = new Error("root cause")
        const err = new XError({ message: "wrapper", cause })
        expect(err.cause).toBe(cause)
    })

    it("accepts an array of Errors as cause", () => {
        const causes = [new Error("a"), new Error("b")]
        const err = new XError({ message: "multi cause", cause: causes })
        expect(Array.isArray(err.cause)).toBe(true)
        expect((err.cause as Error[]).length).toBe(2)
    })

    it("sets optional fields", () => {
        const err = new XError({
            message: "test",
            orgId: "org-1",
            statusCode: 404,
            data: { foo: "bar" },
        })
        expect(err.orgId).toBe("org-1")
        expect(err.statusCode).toBe(404)
        expect(err.data).toEqual({ foo: "bar" })
    })

    it("is an instance of Error", () => {
        const err = new XError({ message: "test" })
        expect(err instanceof Error).toBe(true)
    })
})

describe("xerr", () => {
    it("returns an XError instance", () => {
        const err = xerr({ message: "test" })
        expect(err instanceof XError).toBe(true)
        expect(err.message).toBe("test")
    })
})

describe("getAllErrors", () => {
    it("returns single error for plain Error", () => {
        const err = new Error("plain")
        expect(getAllErrors(err)).toEqual([err])
    })

    it("returns single error for XError with no cause", () => {
        const err = new XError({ message: "no cause" })
        expect(getAllErrors(err)).toEqual([err])
    })

    it("flattens single cause chain", () => {
        const root = new XError({ message: "root" })
        const mid = new XError({ message: "mid", cause: root })
        const top = new XError({ message: "top", cause: mid })
        const all = getAllErrors(top)
        expect(all).toEqual([top, mid, root])
    })

    it("flattens array cause", () => {
        const a = new XError({ message: "a" })
        const b = new XError({ message: "b" })
        const top = new XError({ message: "top", cause: [a, b] })
        const all = getAllErrors(top)
        expect(all).toEqual([top, a, b])
    })
})

describe("getAggregatedMessage", () => {
    it("joins messages with arrow", () => {
        const errors = [new Error("first"), new Error("second")]
        expect(getAggregatedMessage(errors)).toBe("first -> second")
    })

    it("returns single message for one error", () => {
        expect(getAggregatedMessage([new Error("only")])).toBe("only")
    })
})

describe("getErrorName", () => {
    it("returns 'No errors' for empty array", () => {
        expect(getErrorName([])).toBe("No errors")
    })

    it("returns message for single error", () => {
        expect(getErrorName([new Error("oops")])).toBe("oops")
    })

    it("returns first and last message for multiple errors", () => {
        const errors = [new Error("first"), new Error("middle"), new Error("last")]
        expect(getErrorName(errors)).toBe("first: last")
    })
})

describe("getCustomFingerPrint", () => {
    it("joins error names with dash", () => {
        const a = new Error("a")
        a.name = "ErrorA"
        const b = new Error("b")
        b.name = "ErrorB"
        expect(getCustomFingerPrint([a, b])).toBe("ErrorA-ErrorB")
    })
})

describe("getErrorData", () => {
    it("includes XError fields", () => {
        const err = new XError({ message: "bad", code: "ERR", data: { x: 1 } })
        const result = getErrorData([err])
        const key = Object.keys(result)[0]!
        expect(result[key]?.message).toBe("bad")
        expect(result[key]?.data).toEqual({ x: 1 })
    })

    it("includes plain Error fields", () => {
        const err = new Error("plain error")
        const result = getErrorData([err])
        const key = Object.keys(result)[0]!
        expect(result[key]?.message).toBe("plain error")
    })

    it("keys are 1-indexed with message", () => {
        const err = new Error("msg")
        const result = getErrorData([err])
        expect(Object.keys(result)[0]).toBe("1: msg")
    })
})
