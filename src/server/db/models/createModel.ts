/**
 * Model factory for type-safe Firestore models. Migrated from cartage-agent src/server/db/models/createModel.ts.
 */
import { z } from "zod"
import type {
  Query,
  QueryDocumentSnapshot,
  DocumentReference,
  Transaction,
} from "firebase-admin/firestore"
import { XError } from "@/utils/error.utils"
import { archiveAndDelete } from "@/utils/firestore.utils"
import { makeSearchQuery } from "@/utils/search.utils"
import type { FiltersMap, ModelSearchParams } from "@/types/search.types"
import merge from "merge"
import { getFirestore } from "@/server/firebase"
import logging from "@/utils/logger.utils"

export type BaseModel<
  ModelType,
  FiltersType extends FiltersMap,
  CollectionNameType extends string,
> = {
  create: (
    data: Omit<ModelType, "id" | "createdAt" | "updatedAt">
  ) => Promise<ModelType>
  bulkCreate: (
    data: Omit<ModelType, "id" | "createdAt" | "updatedAt">[]
  ) => Promise<ModelType[]>
  getById: (id: string) => Promise<ModelType | undefined>
  getByIdOrThrow: (id: string) => Promise<ModelType>
  getManyByIds: (ids: string[]) => Promise<ModelType[]>
  findMany: (
    orgId: string,
    queryFn?: (query: Query) => Query
  ) => Promise<ModelType[]>
  updateById: <TUpdateStrategy extends "merge" | "replace" = "merge">(
    id: string,
    newData: TUpdateStrategy extends "merge" ? Partial<ModelType> : ModelType,
    opts?: { updateStrategy?: TUpdateStrategy }
  ) => Promise<ModelType>
  updateByIdWithTx: (
    id: string,
    func: (model: ModelType) => Partial<ModelType> | null | undefined
  ) => Promise<ModelType>
  patchById: (id: string, fields: Partial<ModelType>) => Promise<ModelType>
  deleteById: (id: string) => Promise<void>
  bulkDeleteByIds: (ids: string[]) => Promise<void>
  UNSAFE_findMany: (queryFn?: (query: Query) => Query) => Promise<ModelType[]>
  UNSAFE_findOne: (
    queryFn: (query: Query) => Query
  ) => Promise<ModelType | undefined>
  search: (
    args: ModelSearchParams<FiltersType>
  ) => Promise<{ result: ModelType[]; total: number }>
  meta: { collectionName: CollectionNameType }
}

type CreateModelProps<
  ModelType,
  FiltersType extends FiltersMap,
  CollectionNameType extends string,
> = {
  collectionName: CollectionNameType
  ModelSchema: z.ZodObject<z.ZodRawShape> | z.ZodUnion<[z.ZodTypeAny, ...z.ZodTypeAny[]]>
  searchConfig: {
    handlers: Parameters<
      typeof makeSearchQuery<ModelType, FiltersType>
    >[0]["handlers"]
    select?: Parameters<
      typeof makeSearchQuery<ModelType, FiltersType>
    >[0]["select"]
    customOrgIDQuery?: Parameters<
      typeof makeSearchQuery<ModelType, FiltersType>
    >[0]["customOrgIDQuery"]
  }
  mutateOnCreate?: (
    data: Omit<ModelType, "id" | "createdAt" | "updatedAt">
  ) => Omit<ModelType, "id" | "createdAt" | "updatedAt">
  mutateOnUpdate?: (data: ModelType) => ModelType
  mutateOnPreUpdate?: (oldData: ModelType, newData: ModelType) => ModelType
}

export function createModel<
  ModelType,
  FiltersType extends FiltersMap,
  CollectionNameType extends string,
>(
  props: CreateModelProps<ModelType, FiltersType, CollectionNameType>
): BaseModel<ModelType, FiltersType, CollectionNameType> {
  const {
    collectionName,
    ModelSchema,
    searchConfig,
    mutateOnCreate,
    mutateOnUpdate,
    mutateOnPreUpdate,
  } = props

  const getCollection = () => {
    return getFirestore().collection(collectionName)
  }

  const create = async (
    data: Omit<ModelType, "id" | "createdAt" | "updatedAt">
  ): Promise<ModelType> => {
    const now = new Date().toISOString()
    let dataWithTimestamp: Record<string, unknown> = {
      ...data,
      createdAt: now,
      updatedAt: now,
    }
    if (mutateOnCreate) {
      dataWithTimestamp = {
        ...mutateOnCreate(merge.recursive(true, {}, data) as Omit<ModelType, "id" | "createdAt" | "updatedAt">),
        createdAt: now,
        updatedAt: now,
      }
    }
    ModelSchema.parse({ ...dataWithTimestamp, id: "pass" })
    const collection = getCollection()
    const ref = await collection.add(dataWithTimestamp)
    const newDoc = await ref.get()
    return { ...newDoc.data(), id: newDoc.id } as ModelType
  }

  const bulkCreate = async (
    dataArray: Omit<ModelType, "id" | "createdAt" | "updatedAt">[]
  ): Promise<ModelType[]> => {
    if (!dataArray?.length) return []
    const firestore = getFirestore()
    const collection = getCollection()
    const now = new Date().toISOString()
    const results: ModelType[] = []
    const batchSize = 500
    for (let i = 0; i < dataArray.length; i += batchSize) {
      logging.info(`Processing batch of ${batchSize} items at index ${i}`)
      const batchData = dataArray.slice(i, i + batchSize)
      const batch = firestore.batch()
      const docRefs: { ref: DocumentReference; data: Record<string, unknown> }[] = []
      for (const data of batchData) {
        let dataWithTimestamp: Record<string, unknown> = {
          ...data,
          createdAt: now,
          updatedAt: now,
        }
        if (mutateOnCreate) {
          dataWithTimestamp = {
            ...mutateOnCreate(merge.recursive(true, {}, data) as Omit<ModelType, "id" | "createdAt" | "updatedAt">),
            createdAt: now,
            updatedAt: now,
          }
        }
        ModelSchema.parse({ ...dataWithTimestamp, id: "pass" })
        const docRef = collection.doc()
        docRefs.push({ ref: docRef, data: dataWithTimestamp })
        batch.set(docRef, dataWithTimestamp)
      }
      await batch.commit()
      for (const { ref: docRef, data } of docRefs) {
        results.push({ ...data, id: docRef.id } as ModelType)
      }
    }
    return results
  }

  const getById = async (id: string): Promise<ModelType | undefined> => {
    const doc = await getCollection().doc(id).get()
    if (!doc.exists) return undefined
    return { ...doc.data(), id: doc.id } as ModelType
  }

  const getByIdOrThrow = async (id: string): Promise<ModelType> => {
    const document = await getById(id)
    if (!document) {
      throw new XError({
        message: "Model not found",
        data: { id, collectionName },
      })
    }
    return document
  }

  const getManyByIds = async (ids: string[]): Promise<ModelType[]> => {
    if (!ids?.length) return []
    const collection = getCollection()
    const firestore = getFirestore()
    const docRefs = ids.map((id) => collection.doc(id))
    const docs = await firestore.getAll(...docRefs)
    const results: ModelType[] = []
    docs.forEach((doc) => {
      if (doc.exists) {
        results.push({ ...doc.data(), id: doc.id } as ModelType)
      }
    })
    return results
  }

  const updateById = async <TUpdateStrategy extends "merge" | "replace" = "merge">(
    id: string,
    newData: TUpdateStrategy extends "merge" ? Partial<ModelType> : ModelType,
    opts?: { updateStrategy?: TUpdateStrategy }
  ): Promise<ModelType> => {
    const updateStrategy = opts?.updateStrategy ?? "merge"
    let oldData = {} as ModelType
    if (updateStrategy === "merge") {
      oldData = await getByIdOrThrow(id)
    }
    if (mutateOnPreUpdate) {
      newData = mutateOnPreUpdate(oldData, newData as ModelType) as TUpdateStrategy extends "merge" ? Partial<ModelType> : ModelType
    }
    let updatedData = merge.recursive(true, {}, oldData, newData, {
      updatedAt: new Date().toISOString(),
    }) as ModelType
    if (mutateOnUpdate) {
      updatedData = mutateOnUpdate(updatedData)
    }
    ModelSchema.parse(updatedData)
    const docRef = getCollection().doc(id)
    await docRef.update(updatedData as Record<string, unknown>)
    const snapshot = await docRef.get()
    if (!snapshot.exists) {
      throw new XError({ message: "Could not get document after update" })
    }
    return { ...snapshot.data(), id: snapshot.id } as ModelType
  }

  const updateByIdWithTx = async (
    id: string,
    func: (model: ModelType) => Partial<ModelType> | null | undefined
  ): Promise<ModelType> => {
    const collection = getCollection()
    const docRef = collection.doc(id)
    const firestore = getFirestore()
    const updatedModel = await firestore.runTransaction(
      async (transaction: Transaction) => {
        const doc = await transaction.get(docRef)
        if (!doc.exists) {
          throw new XError({
            message: "Transaction run: Item not found.",
            data: { id, collectionName },
          })
        }
        const docData = { ...doc.data(), id: doc.id } as ModelType
        const updateData = func(docData)
        if (!updateData) return docData
        const updatedDocument = merge.recursive(
          true,
          {},
          docData,
          updateData,
          { updatedAt: new Date().toISOString() }
        ) as ModelType
        ModelSchema.parse(updatedDocument)
        transaction.update(docRef, updateData as Record<string, unknown>)
        return updatedDocument
      }
    )
    return updatedModel
  }

  const patchById = async (
    id: string,
    fields: Partial<ModelType>
  ): Promise<ModelType> => {
    const docRef = getCollection().doc(id)
    await docRef.update({
      ...fields,
      updatedAt: new Date().toISOString(),
    } as Record<string, unknown>)
    const snapshot = await docRef.get()
    if (!snapshot.exists) {
      throw new XError({
        message: "Could not get document after patch",
        data: { id, collectionName },
      })
    }
    return { ...snapshot.data(), id: snapshot.id } as ModelType
  }

  const findMany = async (
    orgId: string,
    queryFn?: (query: Query) => Query
  ): Promise<ModelType[]> => {
    if (!orgId) throw new XError({ message: "Org ID is required" })
    const collection = getCollection()
    let query = collection.where("orgId", "==", orgId) as Query
    if (queryFn) query = queryFn(query)
    const querySnapshot = await query.get()
    const docs: ModelType[] = []
    querySnapshot.forEach((doc: QueryDocumentSnapshot) => {
      docs.push({ ...doc.data(), id: doc.id } as ModelType)
    })
    return docs
  }

  const deleteById = async (id: string): Promise<void> => {
    await getByIdOrThrow(id)
    const docRef = getCollection().doc(id)
    await archiveAndDelete(docRef)
  }

  const bulkDeleteByIds = async (ids: string[]): Promise<void> => {
    if (!ids?.length) return
    const firestore = getFirestore()
    const collection = getCollection()
    const batchSize = 500
    for (let i = 0; i < ids.length; i += batchSize) {
      logging.info(`Processing batch of ${batchSize} items at index ${i}`)
      const batch = firestore.batch()
      ids.slice(i, i + batchSize).forEach((id) => {
        batch.delete(collection.doc(id))
      })
      await batch.commit()
    }
  }

  const UNSAFE_findMany = async (
    queryFn?: (query: Query) => Query
  ): Promise<ModelType[]> => {
    const collection = getCollection()
    let snapshot = await collection.get()
    if (queryFn) {
      snapshot = await queryFn(collection as unknown as Query).get()
    }
    const result: ModelType[] = []
    snapshot.forEach((doc: QueryDocumentSnapshot) => {
      result.push({ ...doc.data(), id: doc.id } as ModelType)
    })
    return result
  }

  const UNSAFE_findOne = async (
    queryFn: (query: Query) => Query
  ): Promise<ModelType | undefined> => {
    const results = await UNSAFE_findMany((q) => queryFn(q).limit(1))
    return results[0]
  }

  const search = async (
    searchParams: ModelSearchParams<FiltersType>
  ): Promise<{ result: ModelType[]; total: number }> => {
    let select = searchConfig.select
    const schemaDef = ModelSchema._def as { catchall?: unknown; shape?: Record<string, unknown> }
    const hasPassthrough = schemaDef?.catchall != null
    if (hasPassthrough) {
      select = undefined
    } else if (!select?.length) {
      if (ModelSchema instanceof z.ZodObject) {
        select = Object.keys(ModelSchema.shape) as (keyof ModelType)[]
      } else if (ModelSchema instanceof z.ZodUnion) {
        select = ModelSchema.options.flatMap((schema: z.ZodTypeAny) =>
          schema instanceof z.ZodObject ? Object.keys(schema.shape) : []
        ) as (keyof ModelType)[]
      } else {
        throw new Error("Unsupported ModelSchema type for select keys extraction.")
      }
    }
    const collection = getCollection()
    return makeSearchQuery<ModelType, FiltersType>({
      collection,
      searchParams,
      select,
      handlers: searchConfig.handlers,
      customOrgIDQuery: searchConfig.customOrgIDQuery,
    })
  }

  return {
    create,
    bulkCreate,
    getById,
    getByIdOrThrow,
    getManyByIds,
    findMany,
    updateById,
    updateByIdWithTx,
    patchById,
    deleteById,
    bulkDeleteByIds,
    UNSAFE_findMany,
    UNSAFE_findOne,
    search,
    meta: { collectionName },
  }
}
