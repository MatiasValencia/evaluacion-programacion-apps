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

export const getUserRole = async (uid: string): Promise<UserRole> => {
  if (firebaseDb === null) {
    throw new Error('Firebase no está configurado. Completa las variables de entorno.')
  }

  const fallbackRole = isAdminUid(uid) ? 'admin' : isReadOnlyUid(uid) ? 'readOnly' : null

  let userSnapshot
  try {
    userSnapshot = await getDoc(doc(firebaseDb, 'users', uid))
  } catch (error) {
    if (fallbackRole !== null) return fallbackRole
    throw error
  }

  if (!userSnapshot.exists()) {
    if (fallbackRole !== null) return fallbackRole
    throw new Error('La cuenta no tiene un rol asignado para acceder a esta aplicación.')
  }

  const role = userSnapshot.data().role
  if (role === 'admin' || role === 'readOnly') {
    return role
  }

  throw new Error('La cuenta tiene un rol no válido.')
}

export const createAccount = async (email: string, password: string): Promise<User> => {
  if (firebaseAuth === null || firebaseFunctions === null) {
    throw new Error('Firebase no está configurado. Completa las variables de entorno.')
  }

  const registerAccount = httpsCallable<
    { email: string; password: string },
    { uid: string; role: UserRole }
  >(firebaseFunctions, 'registerAccount')
  await registerAccount({ email: email.trim().toLowerCase(), password })

  try {
    return (await signInWithEmailAndPassword(firebaseAuth, email, password)).user
  } catch {
    throw new Error('La cuenta se creó, pero no se pudo iniciar sesión. Vuelve al acceso e inténtalo.')
  }
}

export const authenticateUser = async (
  email: string,
  password: string,
): Promise<{ user: User; role: UserRole }> => {
  if (firebaseAuth === null) {
    throw new Error('Firebase no está configurado. Completa las variables de entorno.')
  }

  const credential = await signInWithEmailAndPassword(firebaseAuth, email, password)

  try {
    const role = await getUserRole(credential.user.uid)
    return { user: credential.user, role }
  } catch (error) {
    try {
      await signOut(firebaseAuth)
    } catch (signOutError) {
      console.error('No se pudo cerrar la sesión de una cuenta sin rol autorizado.', signOutError)
    }

    throw error
  }
}
