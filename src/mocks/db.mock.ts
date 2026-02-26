import { mock, type Mock } from "bun:test"
import { FakeFirestore } from "firestore-jest-mock"
import merge from "merge"
import { modelsMap, type AllProviders } from "@/server/workflows/kitchenSinkProviders"
import { createMockGitHubService } from "./services/GitHubService.mock"
import { createMockBlaxelService } from "./services/BlaxelService.mock"
import { createMockPropelAuthService } from "./services/PropelAuthService.mock"

type AnyMock = Mock<(...args: unknown[]) => unknown>

/**
 * Type for FakeFirestore parent parameter in DocumentReference constructor.
 */
interface FakeFirestoreParent {
    path?: string
    id?: string
    firestore?: FakeFirestoreParent & { database?: Record<string, unknown> }
    database?: Record<string, unknown>
}

/**
 * Extended DocumentReference with delete support.
 * Ported from cartage-agent src/mocks/db.mock.ts.
 */
class DocumentReferenceExtended extends FakeFirestore.DocumentReference {
    path?: string
    firestore: InstanceType<typeof FakeFirestore>

    constructor(id: string, parent: FakeFirestoreParent) {
        const safeParent = {
            ...parent,
            path: parent.path || parent.id || "",
            firestore: parent.firestore || parent,
        }
        super(id, safeParent)
        this.firestore = parent.firestore?.database
            ? parent.firestore
            : parent.database
              ? parent
              : parent.firestore || parent
        this.path = parent.path
            ? parent.path.split("/").concat(id).join("/")
            : parent.id
              ? `${parent.id}/${id}`
              : id
    }

    delete() {
        if (!this.path) throw new Error("Path not found")
        const { collection, document } = this.findCurrentCollectionAndDoc()
        collection.splice(
            collection.findIndex((doc: { id: string }) => doc.id === document.id),
            1,
        )
        return super.delete()
    }

    findCurrentCollectionAndDoc(
        currRef = this.firestore.database,
        paths = this.path?.replace(/^\/+/, "").split("/") ?? [],
    ): { collection: { id: string }[]; document: { id: string } } {
        const [currPath, ...restPath] = paths
        if (!currPath) throw new Error(`Current path not found in "${this.path}".`)

        let nextRef
        if (currRef[currPath]) {
            nextRef = currRef[currPath]
        } else if (currRef._collections && currRef._collections[currPath]) {
            nextRef = currRef._collections[currPath]
        } else if (Array.isArray(currRef)) {
            nextRef = currRef.find((doc: { id: string }) => doc.id === currPath)
        }

        if (!nextRef) {
            throw new Error(
                `Could not traverse path "${this.path}". Path part "${currPath}" does not exist.`,
            )
        }

        if (restPath.length > 0) {
            return this.findCurrentCollectionAndDoc(nextRef, restPath)
        }

        const collection = currRef
        if (!Array.isArray(collection)) {
            throw new Error(
                `Could not traverse path "${this.path}". Path part "${currPath}" is not a collection.`,
            )
        }
        const document = nextRef
        if (!document.id) {
            throw new Error(
                `Could not traverse path "${this.path}". Path part "${currPath}" is not a document.`,
            )
        }
        return { collection, document }
    }
}

FakeFirestore.DocumentReference = DocumentReferenceExtended

interface FakeFirestoreOptions {
    includeIdsInData?: boolean
    mutable?: boolean
    simulateQueryFilters?: boolean
}

class ExtendedFakeFirestore extends FakeFirestore {
    constructor(seedData?: Record<string, unknown[]>, options?: FakeFirestoreOptions) {
        super(seedData, options)
    }

    batch() {
        const original = super.batch()
        original.delete = (docRef: DocumentReferenceExtended) => {
            docRef.delete()
            return original._ref
        }
        return original
    }
}

/**
 * Wraps all model methods in bun mock() so tests can spy on calls.
 */
const getModelMock = (model: Record<string, unknown>): Record<string, AnyMock> => {
    const mockedModel: Record<string, AnyMock> = {}
    for (const propName in model) {
        if (typeof model[propName] === "function") {
            const originalFn = model[propName] as (...args: unknown[]) => unknown
            mockedModel[propName] = mock((...args: unknown[]) => originalFn(...args))
        }
    }
    const proto = Object.getPrototypeOf(model) as Record<string, unknown>
    for (const propName of Object.getOwnPropertyNames(proto)) {
        const descriptor = Object.getOwnPropertyDescriptor(proto, propName)!
        if (typeof descriptor.value === "function" && propName !== "constructor") {
            const originalFn = proto[propName] as (...args: unknown[]) => unknown
            mockedModel[propName] = mock((...args: unknown[]) => originalFn(...args))
        }
    }
    return mockedModel
}

type MockedModelsMap = {
    [K in keyof typeof modelsMap]: Record<string, AnyMock>
}

const mockedModelsMap: MockedModelsMap = Object.entries(modelsMap).reduce((acc, [key, value]) => {
    ;(acc as Record<string, Record<string, AnyMock>>)[key] = getModelMock(
        value as Record<string, unknown>,
    )
    return acc
}, {} as MockedModelsMap)

const mockedAllProvidersMap = {
    ...mockedModelsMap,
    GitHubService: createMockGitHubService() as Partial<AllProviders["GitHubService"]>,
    BlaxelService: createMockBlaxelService() as Partial<AllProviders["BlaxelService"]>,
    PropelAuthService: createMockPropelAuthService() as Partial<AllProviders["PropelAuthService"]>,
} as unknown as AllProviders

type ExtractModelCreateShape<T> = T extends {
    create: (arg1: infer R, ...args: unknown[]) => unknown
}
    ? R extends object
        ? R
        : never
    : never

type Seed = {
    examples?: (ExtractModelCreateShape<typeof modelsMap.ExampleModel> & { id: string })[]
    environments?: (ExtractModelCreateShape<typeof modelsMap.EnvironmentModel> & { id: string })[]
    users?: (ExtractModelCreateShape<typeof modelsMap.UserModel> & { id: string })[]
}

export const DEFAULT_ORG_ID = "testOrgId"

/**
 * Creates a mock database for workflow tests.
 *
 * Usage:
 *   const db = mockDB(orgId => ({ examples: [{ id: "e1", orgId, ... }] }))
 *   const providers = db.providerMocks
 *   afterEach(() => db.reset())
 */
export const mockDB = (seedFn?: (orgId: string) => Seed) => {
    const initialSeed = seedFn ? seedFn(DEFAULT_ORG_ID) : {}
    const originalSeed = merge.recursive(true, {}, initialSeed)

    const createFirestoreWithSeed = (seed?: Seed) =>
        new ExtendedFakeFirestore(seed as Record<string, unknown[]>, {
            includeIdsInData: true,
            mutable: true,
            simulateQueryFilters: true,
        })

    let firestore = createFirestoreWithSeed(merge.recursive(true, {}, originalSeed))
    ;(globalThis as Record<string, unknown>).__mockFirestore = firestore

    return {
        orgId: DEFAULT_ORG_ID,
        providerMocks: mockedAllProvidersMap,
        reset: () => {
            firestore = createFirestoreWithSeed(merge.recursive(true, {}, originalSeed))
            ;(globalThis as Record<string, unknown>).__mockFirestore = firestore

            for (const modelKey of Object.keys(mockedModelsMap) as Array<keyof MockedModelsMap>) {
                const model = mockedModelsMap[modelKey]
                for (const mockKey of Object.keys(model)) {
                    model[mockKey]?.mockClear?.()
                }
            }
        },
        getFirestore: () => firestore,
    }
}
