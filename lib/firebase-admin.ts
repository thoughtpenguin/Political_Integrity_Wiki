import 'server-only'
import { initializeApp, getApps, type App } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { getAuth, type Auth } from 'firebase-admin/auth'

function getAdminApp(): App {
  const existingApps = getApps()
  if (existingApps.length > 0) {
    return existingApps[0]
  }

  // In development/emulator mode, initialize without credentials
  // In production, use application default credentials
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    return initializeApp({ projectId: 'political-integrity-wiki' })
  }

  // For production, use the service account if available
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return initializeApp()
  }

  // Default initialization (works with Firebase App Hosting)
  return initializeApp({ projectId: 'political-integrity-wiki' })
}

const app = getAdminApp()

export const adminDb: Firestore = getFirestore(app)
export const adminAuth: Auth = getAuth(app)
