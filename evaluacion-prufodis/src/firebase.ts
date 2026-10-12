import { getApp, getApps, initializeApp } from 'firebase/app'
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId,
)

const firebaseApp = isFirebaseConfigured
  ? getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig)
  : null

export const firebaseAuth = firebaseApp === null ? null : getAuth(firebaseApp)
export const firebaseDb = firebaseApp === null ? null : getFirestore(firebaseApp)

const adminUids = (import.meta.env.VITE_FIREBASE_ADMIN_UIDS ?? '')
  .split(',')
  .map((uid) => uid.trim())
  .filter(Boolean)

export const hasConfiguredAdministrators = adminUids.length > 0

export const isAdminUid = (uid: string) => adminUids.includes(uid)

export const authenticateAdmin = async (email: string, password: string): Promise<User> => {
  if (firebaseAuth === null) {
    throw new Error('Firebase no está configurado. Completa las variables de entorno.')
  }

  if (!hasConfiguredAdministrators) {
    throw new Error('No hay administradores configurados. Añade sus UID a la configuración.')
  }

  const credential = await signInWithEmailAndPassword(firebaseAuth, email, password)
  if (!isAdminUid(credential.user.uid)) {
    await signOut(firebaseAuth)
    throw new Error('La cuenta inició sesión, pero no tiene permisos de administrador.')
  }

  return credential.user
}
