import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AppUser, UserProfileChanges } from '../api'
import DashboardSidebar, { DashboardPageTitle } from '../components/DashboardSidebar'

type UserSettingsPageProps = {
  user: AppUser
  onUserUpdate: (changes: UserProfileChanges) => Promise<AppUser>
  onLogout: () => void
}

const getSettingsErrorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : 'No se pudieron guardar los cambios. Inténtalo de nuevo.'

const UserSettingsPage = ({ user, onUserUpdate, onLogout }: UserSettingsPageProps) => {
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState(user.firstName)
  const [lastName, setLastName] = useState(user.lastName)
  const [email, setEmail] = useState(user.email)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')

    if (newPassword && newPassword.length < 8) {
      setErrorMessage('La contraseña nueva debe tener al menos 8 caracteres.')
      return
    }

    if (newPassword && newPassword === currentPassword) {
      setErrorMessage('La contraseña nueva debe ser distinta de la contraseña actual.')
      return
    }

    setIsSaving(true)
    try {
      await onUserUpdate({
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
                disabled={isSaving}
              />
            </label>

            <label>
              Apellido
              <input
                type="text"
                autoComplete="family-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                disabled={isSaving}
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
                disabled={isSaving}
              />
            </label>

            <label>
              Contraseña actual
              <input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                disabled={isSaving}
                aria-describedby="password-change-help"
              />
            </label>

            <label>
              Nueva contraseña
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                disabled={isSaving}
                aria-describedby="password-change-help"
              />
            </label>
            <p className="user-settings-help" id="password-change-help">
              Para cambiar el correo o la contraseña, introduce tu contraseña actual. Deja la
              contraseña nueva vacía si no deseas cambiarla.
            </p>

            <div className="login-form-actions">
              <button type="submit" disabled={isSaving}>
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
