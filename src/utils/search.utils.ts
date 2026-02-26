/**
 * Builds Firestore search query from filters and handlers. Mirrors cartage-agent src/utils/search.utils.ts (makeSearchQuery).
 */
import type { CollectionReference } from "firebase-admin/firestore"
import { XError } from "./error.utils"
import type { FiltersMap, ModelSearchParams } from "@/types/search.types"
import { TypesafeQuery } from "./query.utils"

export const makeSearchQuery = async <TReturn, TFilters extends FiltersMap>(args: {
  hasDeletedAt?: boolean
  collection: CollectionReference
  searchParams: ModelSearchParams<TFilters>
  select?: (keyof TReturn)[]
  customOrgIDQuery?: (
    orgId: string,
    query: TypesafeQuery<TReturn>
  ) => TypesafeQuery<TReturn>
  handlers: {
    [K in keyof TFilters]: (
      value: TFilters[K],
      query: TypesafeQuery<TReturn>
    ) => TypesafeQuery<TReturn>
  }
}): Promise<{ result: TReturn[]; total: number }> => {
  const { handlers, collection, select, searchParams, customOrgIDQuery } = args
  const {
    limit,
    offset = 0,
    orgId,
    filters,
    orderByDirection = "desc",
    orderBy = "createdAt",
  } = searchParams

  if (!orgId) {
    throw new XError({ message: "Org ID is required" })
  }

  let tquery = customOrgIDQuery
    ? customOrgIDQuery(orgId, new TypesafeQuery<TReturn>(collection))
    : new TypesafeQuery<TReturn>(collection.where("orgId", "==", orgId))

  if (filters) {
    for (const handlerKey of Object.keys(filters)) {
      const handler = handlers[handlerKey as keyof TFilters]
      if (!handler) {
        throw new Error(`No query handler found for filter '${handlerKey}'`)
      }
      const filter = filters[handlerKey as keyof TFilters]!
      tquery = handler(filter, tquery)
    }
  }

  let query = tquery.getQuery().orderBy(orderBy, orderByDirection)
  const countSnapshot = await (query as { count?: () => { get: () => Promise<{ data: () => { count: number } }> } }).count?.()?.get?.()
  const total = countSnapshot?.data?.()?.count ?? 0

  if (limit === 0) {
    return { result: [], total }
  }

  query = query.offset(offset).limit(limit)
  const querySnapshot =
    select && select.length > 0
      ? await query.select(...(select as string[])).get()
      : await query.get()

  const result: TReturn[] = []
  querySnapshot.docs.forEach((doc) => {
    result.push({ ...doc.data(), id: doc.id } as TReturn)
  })

  return { result, total }
}
