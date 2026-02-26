/**
 * Filter operators and search param types for createModel search.
 * Mirrors cartage-agent src/types/search.types.ts.
 */
export const SEARCH_FILTER_OPERATORS = {
    is: "is",
    isNot: "isNot",
    contains: "contains",
    greaterThanOrEqualTo: "greaterThanOrEqualTo",
} as const

export type FilterValue = object & { operator: unknown }

export type FiltersMap = Record<string, FilterValue>

export type ModelSearchParams<TFilters extends FiltersMap> = {
    orgId: string
    limit: number
    offset?: number
    filters?: Partial<TFilters>
    orderBy?: string
    orderByDirection?: "desc" | "asc"
}

export type SearchAPIParams<TFilters extends FiltersMap> = Omit<
    ModelSearchParams<TFilters>,
    "orgId"
>

export type SearchAPI<TRow, TFilters extends FiltersMap> = (
    params: SearchAPIParams<TFilters>,
) => Promise<{ result: TRow[]; total: number }>
