import { randomUUID } from 'node:crypto'
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { Timestamp, getFirestore } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions'
import { HttpsError, onCall } from 'firebase-functions/v2/https'

initializeApp()

const auth = getAuth()
const db = getFirestore()
const registrationLock = db.doc('metadata/accountRegistrationLock')
const lockDurationMs = 120_000

const acquireRegistrationLock = async (token) => {
  const expiresAt = Timestamp.fromMillis(Date.now() + lockDurationMs)

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(registrationLock)
    const activeExpiry = snapshot.get('expiresAt')

    if (activeExpiry instanceof Timestamp && activeExpiry.toMillis() > Date.now()) {
      throw new HttpsError(
        'resource-exhausted',
        'Se está creando otra cuenta. Inténtalo de nuevo en un momento.',
      )
    }

    transaction.set(registrationLock, { token, expiresAt })
  })
}

const releaseRegistrationLock = async (token) => {
  try {
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(registrationLock)
      if (snapshot.get('token') === token) {
        transaction.delete(registrationLock)
      }
    })
  } catch (error) {
    logger.error('No se pudo liberar el bloqueo de registro.', error)
  }
}

const toHttpsError = (error) => {
  if (error instanceof HttpsError) return error

  switch (error?.code) {
    case 'auth/email-already-exists':
      return new HttpsError('already-exists', 'Este correo ya está registrado.')
    case 'auth/invalid-email':
      return new HttpsError('invalid-argument', 'Introduce un correo electrónico válido.')
    case 'auth/invalid-password':
      return new HttpsError('invalid-argument', 'La contraseña debe tener al menos 6 caracteres.')
    default:
      logger.error('No se pudo crear la cuenta.', error)
      return new HttpsError('internal', 'No se pudo crear la cuenta. Inténtalo de nuevo.')
  }
}

export const registerAccount = onCall({ timeoutSeconds: 60 }, async (request) => {
  if (request.auth !== undefined) {
    throw new HttpsError('failed-precondition', 'Cierra la sesión antes de crear una cuenta.')
  }

  const email =
    typeof request.data?.email === 'string' ? request.data.email.trim().toLowerCase() : ''
  const password = typeof request.data?.password === 'string' ? request.data.password : ''

  if (!email || password.length < 6) {
    throw new HttpsError(
      'invalid-argument',
      'Introduce un correo válido y una contraseña de al menos 6 caracteres.',
    )
  }

  const lockToken = randomUUID()
  await acquireRegistrationLock(lockToken)

  let createdUid
  try {
    const existingUsers = await auth.listUsers(1)
    const role = existingUsers.users.length === 0 ? 'admin' : 'readOnly'
    createdUid = randomUUID()

    await db.doc(`users/${createdUid}`).create({
      uid: createdUid,
      email,
      role,
      createdAt: Timestamp.now(),
    })

    const user = await auth.createUser({ uid: createdUid, email, password })
    return { uid: user.uid, role }
  } catch (error) {
    if (createdUid !== undefined) {
      try {
        await db.doc(`users/${createdUid}`).delete()
      } catch (cleanupError) {
        logger.error('No se pudo eliminar el perfil incompleto de Firestore.', {
          uid: createdUid,
          error: cleanupError,
        })
      }
    }

    throw toHttpsError(error)
  } finally {
    await releaseRegistrationLock(lockToken)
  }
})
