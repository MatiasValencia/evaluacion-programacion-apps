import { getApp, getApps, initializeApp } from 'firebase/app'
import {
  EmailAuthProvider,
  getAuth,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  type User,
  updateEmail,
  updatePassword,
  updateProfile,
} from 'firebase/auth'
import { doc, getDoc, getFirestore, updateDoc } from 'firebase/firestore'
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

export type UserProfile = {
  firstName: string
  lastName: string
}

export type UserProfileChanges = UserProfile & {
  email: string
  currentPassword: string
  newPassword: string
}

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

export const getUserProfile = async (user: User): Promise<UserProfile> => {
  if (firebaseDb === null) {
    throw new Error('Firebase no está configurado. Completa las variables de entorno.')
  }

  const profileSnapshot = await getDoc(doc(firebaseDb, 'users', user.uid))
  const profile = profileSnapshot.data()
  const displayName = user.displayName?.trim() ?? ''

  return {
    firstName:
      typeof profile?.firstName === 'string'
        ? profile.firstName
        : displayName,
    lastName: typeof profile?.lastName === 'string' ? profile.lastName : '',
  }
}

export const updateUserProfile = async (
  user: User,
  changes: UserProfileChanges,
): Promise<void> => {
  if (firebaseDb === null) {
    throw new Error('Firebase no está configurado. Completa las variables de entorno.')
  }

  const email = changes.email.trim()
  const firstName = changes.firstName.trim()
  const lastName = changes.lastName.trim()
  const emailChanged = email.toLowerCase() !== (user.email ?? '').toLowerCase()
  const passwordChanged = changes.newPassword.length > 0

  if (passwordChanged && changes.newPassword === changes.currentPassword) {
    throw new Error('La contraseña nueva debe ser distinta de la contraseña actual.')
  }

  if ((emailChanged || passwordChanged) && changes.currentPassword.length === 0) {
    throw new Error('Introduce tu contraseña actual para cambiar tus credenciales.')
  }

  if (emailChanged || passwordChanged) {
    if (user.email === null) {
      throw new Error('La cuenta no tiene un correo electrónico para revalidar la sesión.')
    }

    const credential = EmailAuthProvider.credential(user.email, changes.currentPassword)
    await reauthenticateWithCredential(user, credential)
  }

  if (emailChanged) {
    await updateEmail(user, email)
    await user.reload()
    await user.getIdToken(true)
  }

  const displayName = [firstName, lastName].filter(Boolean).join(' ')
  await updateProfile(user, { displayName: displayName || null })
  await updateDoc(doc(firebaseDb, 'users', user.uid), {
    firstName,
    lastName,
    email: user.email,
  })

  if (passwordChanged) {
    await updatePassword(user, changes.newPassword)
  }
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
