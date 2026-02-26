/**
 * Firestore helpers for createModel. Mirrors cartage-agent src/utils/firestore.utils.ts.
 */
import type { DocumentReference } from "firebase-admin/firestore"
import { XError } from "./error.utils"
import { ARCHIVE_COLLECTION_NAME } from "@/constants/app.constants"
import { getFirestore } from "@/server/firebase"

export const archiveAndDelete = async (docRef: DocumentReference): Promise<void> => {
  try {
    const firestore = getFirestore()
    const docSnapshot = await docRef.get()
    if (!docSnapshot.exists) {
      throw new Error(`Document with path ${docRef.path} not found`)
    }
    const docData = docSnapshot.data()
    const archiveDocRef = firestore.collection(ARCHIVE_COLLECTION_NAME).doc()
    await archiveDocRef.set({
      ...docData,
      originalPath: docRef.path,
      archivedAt: new Date().toISOString(),
    })
    await docRef.delete()
  } catch (error) {
    throw new XError({
      message: "archiveAndDelete Error archiving and deleting document",
      data: { path: docRef.path },
      cause: error as Error,
    })
  }
}
