/**
 * Firebase Admin SDK init and getFirestore. Mirrors cartage-agent src/server/firebase.ts (simplified: no SecretService, single project).
 * Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in env (or use GOOGLE_APPLICATION_CREDENTIALS for default creds).
 */
import admin from "firebase-admin"
import { XError } from "@/utils/error.utils"

export function initializeFirebase(): void {
  try {
    if (admin.apps.some((app) => app?.name === "[DEFAULT]")) {
      return
    }
    const projectId = process.env.FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const privateKey = process.env.FIREBASE_PRIVATE_KEY

    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        projectId,
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, "\n"),
        }),
      })
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID })
    } else {
      throw new XError({
        message:
          "Firebase not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY or GOOGLE_APPLICATION_CREDENTIALS.",
        code: "FIREBASE_NOT_CONFIGURED",
      })
    }
  } catch (error) {
    throw new XError({
      message: "Failed to initialize Firebase Admin SDK",
      code: "FIREBASE_INIT_ERROR",
      cause: error as Error,
    })
  }
}

export function getFirebaseApp(): admin.app.App {
  if (admin.apps.length === 0) {
    initializeFirebase()
  }
  return admin.app()
}

export function getFirestore(): admin.firestore.Firestore {
  return getFirebaseApp().firestore()
}
