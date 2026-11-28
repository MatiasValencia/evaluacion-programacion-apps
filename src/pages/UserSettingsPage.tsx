import { useEffect, useState, type FormEvent } from 'react'
import type { User } from 'firebase/auth'
import { FirebaseError } from 'firebase/app'
import { useNavigate } from 'react-router-dom'
import DashboardSidebar, { DashboardPageTitle } from '../components/DashboardSidebar'
import { getUserProfile, updateUserProfile } from '../firebase'

type UserSettingsPageProps = {
  user: User
  onLogout: () => void
}

const getSettingsErrorMessage = (error: unknown) => {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
        return 'La contraseña actual no es correcta.'
      case 'auth/email-already-in-use':
        return 'Ese correo electrónico ya está asociado a otra cuenta.'
      case 'auth/invalid-email':
        return 'Introduce un correo electrónico válido.'
      case 'auth/requires-recent-login':
        return 'Vuelve a iniciar sesión e inténtalo de nuevo.'
      case 'auth/weak-password':
        return 'La contraseña nueva debe tener al menos 6 caracteres.'
      case 'firestore/permission-denied':
        return 'No tienes permiso para guardar los cambios del perfil.'
      default:
        return `No se pudieron guardar los cambios. ${error.message}`
    }
  }

  return error instanceof Error
    ? error.message
    : 'No se pudieron guardar los cambios. Inténtalo de nuevo.'
}

const UserSettingsPage = ({ user, onLogout }: UserSettingsPageProps) => {
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState(user.email ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let isActive = true

    void getUserProfile(user)
      .then((profile) => {
        if (!isActive) return
        setFirstName(profile.firstName)
        setLastName(profile.lastName)
      })
      .catch((error: unknown) => {
        if (!isActive) return
        setErrorMessage(getSettingsErrorMessage(error))
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [user])

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')

    if (newPassword && newPassword.length < 6) {
      setErrorMessage('La contraseña nueva debe tener al menos 6 caracteres.')
      return
    }

    if (newPassword && newPassword === currentPassword) {
      setErrorMessage('La contraseña nueva debe ser distinta de la contraseña actual.')
      return
    }

    setIsSaving(true)
    try {
      await updateUserProfile(user, {
        firstName,
        lastName,
        email,
        currentPassword,
        newPassword,
      })
      navigate('/menu', { replace: true })
    } catch (error) {
      setErrorMessage(getSettingsErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="dashboard-shell">
      <DashboardSidebar onLogout={onLogout} />
      <main className="dashboard-content">
        <header className="dashboard-header students-header">
          <DashboardPageTitle>
            <h1>Configurar usuario</h1>
          </DashboardPageTitle>
        </header>

        <section className="user-settings-panel" aria-labelledby="user-settings-title">
          <h2 id="user-settings-title">Datos de usuario</h2>
          <p>Actualiza tu información personal y las credenciales de tu cuenta.</p>

          <form className="login-form user-settings-form" onSubmit={handleSave}>
            {errorMessage && (
              <p className="login-message login-error" role="alert">
                {errorMessage}
              </p>
            )}

            <label>
              Nombre
              <input
                type="text"
                autoComplete="given-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                disabled={isLoading || isSaving}
              />
            </label>

            <label>
              Apellido
              <input
                type="text"
                autoComplete="family-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                disabled={isLoading || isSaving}
              />
            </label>

            <label>
              Correo electrónico
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isLoading || isSaving}
              />
            </label>

            <label>
              Contraseña actual
              <input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                disabled={isLoading || isSaving}
                aria-describedby="password-change-help"
              />
            </label>

            <label>
              Nueva contraseña
              <input
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                disabled={isLoading || isSaving}
                aria-describedby="password-change-help"
              />
            </label>
            <p className="user-settings-help" id="password-change-help">
              Para cambiar el correo o la contraseña, introduce tu contraseña actual. Deja la
              contraseña nueva vacía si no deseas cambiarla.
            </p>

            <div className="login-form-actions">
              <button type="submit" disabled={isLoading || isSaving}>
                {isSaving ? 'Guardando…' : 'Guardar cambios'}
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={isSaving}
                onClick={() => navigate('/menu')}
              >
                Descartar cambios
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  )
}

export default UserSettingsPage
