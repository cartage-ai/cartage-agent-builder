/**
 * Type-safe Firestore query wrapper. Mirrors cartage-agent src/utils/query.utils.ts.
 */
import type { Query } from "firebase-admin/firestore"
import { XError } from "./error.utils"

export class TypesafeQuery<TReturn> {
  private query: Query

  constructor(query: Query) {
    this.query = query
  }

  where<K extends keyof TReturn>(
    fieldPath: K,
    opStr: "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "not-in" | "array-contains" | "array-contains-any",
    value: unknown
  ): TypesafeQuery<TReturn> {
    const newQuery = this.query.where(fieldPath as string, opStr, value)
    return new TypesafeQuery<TReturn>(newQuery)
  }

  whereIn<K extends keyof TReturn>(fieldPath: K, value: TReturn[K][]): TypesafeQuery<TReturn> {
    const newQuery = this.query.where(fieldPath as string, "in", value)
    return new TypesafeQuery<TReturn>(newQuery)
  }

  whereNotIn<K extends keyof TReturn>(fieldPath: K, value: TReturn[K][]): TypesafeQuery<TReturn> {
    const newQuery = this.query.where(fieldPath as string, "not-in", value)
    return new TypesafeQuery<TReturn>(newQuery)
  }

  whereArrayContains<K extends keyof TReturn>(
    fieldPath: K,
    value: NonNullable<TReturn[K]> extends (infer U)[] ? U : never
  ): TypesafeQuery<TReturn> {
    const newQuery = this.query.where(fieldPath as string, "array-contains", value)
    return new TypesafeQuery<TReturn>(newQuery)
  }

  whereArrayContainsAny<K extends keyof TReturn>(
    fieldPath: K,
    value: NonNullable<TReturn[K]> extends (infer U)[] ? U[] : never
  ): TypesafeQuery<TReturn> {
    if (value.length === 0) {
      throw new XError({
        message: `Array of values must not be empty for ${String(fieldPath)}`,
      })
    }
    const newQuery = this.query.where(fieldPath as string, "array-contains-any", value)
    return new TypesafeQuery<TReturn>(newQuery)
  }

  getQuery(): Query {
    return this.query
  }
}
