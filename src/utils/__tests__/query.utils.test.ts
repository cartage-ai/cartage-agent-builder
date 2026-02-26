import { describe, it, expect, mock } from "bun:test"
import { TypesafeQuery } from "../query.utils"
import type { Query } from "firebase-admin/firestore"
import { XError } from "../error.utils"

type TestRecord = {
    name: string
    tags: string[]
    count: number
}

const makeMockQuery = () => {
    const q: { where: ReturnType<typeof mock> } = {
        where: mock(() => q),
    }
    return q as unknown as Query
}

describe("TypesafeQuery", () => {
    it("getQuery returns the underlying query", () => {
        const raw = makeMockQuery()
        const tq = new TypesafeQuery<TestRecord>(raw)
        expect(tq.getQuery()).toBe(raw)
    })

    it("where calls underlying query.where and returns new TypesafeQuery", () => {
        const raw = makeMockQuery()
        const tq = new TypesafeQuery<TestRecord>(raw)
        const result = tq.where("name", "==", "foo")
        expect(result).toBeInstanceOf(TypesafeQuery)
        expect((raw as unknown as { where: ReturnType<typeof mock> }).where).toHaveBeenCalledWith(
            "name",
            "==",
            "foo",
        )
    })

    it("whereIn calls underlying query.where with 'in'", () => {
        const raw = makeMockQuery()
        const tq = new TypesafeQuery<TestRecord>(raw)
        tq.whereIn("name", ["a", "b"])
        expect((raw as unknown as { where: ReturnType<typeof mock> }).where).toHaveBeenCalledWith(
            "name",
            "in",
            ["a", "b"],
        )
    })

    it("whereNotIn calls underlying query.where with 'not-in'", () => {
        const raw = makeMockQuery()
        const tq = new TypesafeQuery<TestRecord>(raw)
        tq.whereNotIn("name", ["x"])
        expect((raw as unknown as { where: ReturnType<typeof mock> }).where).toHaveBeenCalledWith(
            "name",
            "not-in",
            ["x"],
        )
    })

    it("whereArrayContains calls underlying query.where with 'array-contains'", () => {
        const raw = makeMockQuery()
        const tq = new TypesafeQuery<TestRecord>(raw)
        tq.whereArrayContains("tags", "typescript")
        expect((raw as unknown as { where: ReturnType<typeof mock> }).where).toHaveBeenCalledWith(
            "tags",
            "array-contains",
            "typescript",
        )
    })

    it("whereArrayContainsAny calls underlying query.where with 'array-contains-any'", () => {
        const raw = makeMockQuery()
        const tq = new TypesafeQuery<TestRecord>(raw)
        tq.whereArrayContainsAny("tags", ["a", "b"])
        expect((raw as unknown as { where: ReturnType<typeof mock> }).where).toHaveBeenCalledWith(
            "tags",
            "array-contains-any",
            ["a", "b"],
        )
    })

    it("whereArrayContainsAny throws XError for empty array", () => {
        const raw = makeMockQuery()
        const tq = new TypesafeQuery<TestRecord>(raw)
        expect(() => tq.whereArrayContainsAny("tags", [])).toThrow(XError)
    })
})
