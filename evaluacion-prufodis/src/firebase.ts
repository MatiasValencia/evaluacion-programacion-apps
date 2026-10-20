import { getApp, getApps, initializeApp } from 'firebase/app'
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { doc, getDoc, getFirestore } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'

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
const firebaseFunctions = firebaseApp === null ? null : getFunctions(firebaseApp)

const parseUidList = (value: string | undefined) =>
  (value ?? '')
    .split(',')
    .map((uid) => uid.trim())
    .filter(Boolean)

const adminUids = parseUidList(import.meta.env.VITE_FIREBASE_ADMIN_UIDS)
const readOnlyUids = parseUidList(import.meta.env.VITE_FIREBASE_READONLY_UIDS)

export type UserRole = 'admin' | 'readOnly'

export const isAdminUid = (uid: string) => adminUids.includes(uid)
export const isReadOnlyUid = (uid: string) => readOnlyUids.includes(uid)

const getLegacyRole = (uid: string): UserRole | null =>
  isAdminUid(uid) ? 'admin' : isReadOnlyUid(uid) ? 'readOnly' : null

export const getUserRole = async (uid: string): Promise<UserRole> => {
  const legacyRole = getLegacyRole(uid)

  if (firebaseDb === null) {
    if (legacyRole !== null) return legacyRole
    throw new Error('Firebase no está configurado. Completa las variables de entorno.')
  }

  let userSnapshot
  try {
    userSnapshot = await getDoc(doc(firebaseDb, 'users', uid))
  } catch (error) {
    if (legacyRole !== null) return legacyRole
    throw error
  }

  if (!userSnapshot.exists()) {
    if (legacyRole !== null) return legacyRole
    throw new Error('La cuenta no tiene un rol asignado para usar esta aplicación.')
  }

  const role = userSnapshot.data().role
  if (role !== 'admin' && role !== 'readOnly') {
    throw new Error('El perfil de la cuenta contiene un rol no válido.')
  }

  return role
}

export const createAccount = async (email: string, password: string): Promise<User> => {
  if (firebaseAuth === null || firebaseFunctions === null) {
    throw new Error('Firebase no está configurado. Completa las variables de entorno.')
  }

  const registerAccount = httpsCallable<
    { email: string; password: string },
    { uid: string; role: UserRole }
  >(firebaseFunctions, 'registerAccount')
  const result = await registerAccount({ email: email.trim(), password })
  const credential = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password)

  if (credential.user.uid !== result.data.uid) {
    await signOut(firebaseAuth)
    throw new Error('La cuenta se creó, pero no se pudo validar la sesión. Inicia sesión manualmente.')
  }

  return credential.user
}

export const authenticateUser = async (email: string, password: string): Promise<User> => {
  if (firebaseAuth === null) {
    throw new Error('Firebase no está configurado. Completa las variables de entorno.')
  }

  const credential = await signInWithEmailAndPassword(firebaseAuth, email, password)

  try {
    await getUserRole(credential.user.uid)
  } catch (error) {
    await signOut(firebaseAuth)
    throw error
  }

  return credential.user
}
