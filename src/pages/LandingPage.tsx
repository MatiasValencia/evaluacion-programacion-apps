import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../api'
import heroImage from '../assets/image1.jpeg'
import logo from '../assets/logo.png'

type LandingPageProps = {
  onLogin: (email: string, password: string) => Promise<void>
  onRegister: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) => Promise<void>
}

const LandingPage = ({ onLogin, onRegister }: LandingPageProps) => {
  const navigate = useNavigate()
  const [loginError, setLoginError] = useState('')
  const [registerError, setRegisterError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCreatingAccount, setIsCreatingAccount] = useState(false)
  const [isRegisteringAccount, setIsRegisteringAccount] = useState(false)

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoginError('')
    setRegisterError('')
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') ?? '').trim()
    const password = String(formData.get('password') ?? '')

    try {
      await onLogin(email, password)
      navigate('/menu', { replace: true })
    } catch (error) {
      setLoginError(getLoginErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoginError('')
    setRegisterError('')
    setIsRegisteringAccount(true)

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') ?? '').trim()
    const password = String(formData.get('password') ?? '')
    const firstName = String(formData.get('firstName') ?? '').trim()
    const lastName = String(formData.get('lastName') ?? '').trim()
    const confirmPassword = String(formData.get('confirmPassword') ?? '')

    try {
      if (!email || !password || !confirmPassword) {
        throw new Error('Completa todos los campos para crear la cuenta.')
      }

      if (password !== confirmPassword) {
        throw new Error('Las contraseñas no coinciden.')
      }

      if (password.length < 8) {
        throw new Error('La contraseña debe tener al menos 8 caracteres.')
      }

      await onRegister(email, password, firstName, lastName)
      navigate('/menu', { replace: true })
    } catch (error) {
      setRegisterError(getRegisterErrorMessage(error))
    } finally {
      setIsRegisteringAccount(false)
    }
  }

  return (
    <main className="landing-layout">
      <nav className="landing-mobile-nav" aria-label="Navegación principal">
        <img src={logo} alt="PRUFODIS - Universidad Central" />
      </nav>
      <section className="landing-visual" style={{ backgroundImage: `url(${heroImage})` }}>
        <div className="landing-visual-shade" />
        <div className="landing-brand">
          <img src={logo} alt="PRUFODIS - Universidad Central" />
        </div>
        <div className="landing-message">
          <p className="landing-eyebrow">Sistema de gestión educativa</p>
          <h1>Todo lo académico, en un solo lugar.</h1>
          <p>Gestiona alumnos, asignaturas, evaluaciones y asistencias de forma sencilla y centralizada.</p>
        </div>
      </section>

      <section id="login" className="landing-login">
        <div className="landing-login-content">
          <div className="login-copy">
            <p className="landing-eyebrow">PRUFODIS</p>
            <h2>{isCreatingAccount ? 'Crear cuenta' : 'Inicia sesión'}</h2>
            <p>
              {isCreatingAccount
                ? 'Crea una cuenta de consulta. Un administrador puede asignarte otro rol.'
                : 'Accede a la plataforma para consultar y gestionar la información académica.'}
            </p>
          </div>

          {isCreatingAccount ? (
            <form className="login-form" onSubmit={handleCreateAccount}>
              {registerError && (
                <p className="login-message login-error" role="alert">
                  {registerError}
                </p>
              )}

              <label>
                Nombre
                <input
                  type="text"
                  name="firstName"
                  autoComplete="given-name"
                  maxLength={150}
                />
              </label>

              <label>
                Apellido
                <input
                  type="text"
                  name="lastName"
                  autoComplete="family-name"
                  maxLength={150}
                />
              </label>

              <label>
                Correo electrónico
                <input
                  type="email"
                  name="email"
                  placeholder="nombre@ejemplo.com"
                  autoComplete="email"
                  required
                />
              </label>

              <label>
                Contraseña
                <input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  minLength={8}
                  autoComplete="new-password"
                  required
                />
              </label>

              <label>
                Repite la contraseña
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="••••••••"
                  minLength={8}
                  autoComplete="new-password"
                  required
                />
              </label>

              <div className="login-form-actions">
                <button type="submit" disabled={isRegisteringAccount}>
                  {isRegisteringAccount ? 'Creando cuenta…' : 'Crear cuenta'}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={isRegisteringAccount}
                  onClick={() => {
                    setRegisterError('')
                    setIsCreatingAccount(false)
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <form className="login-form" onSubmit={handleLogin}>
              {loginError && (
                <p className="login-message login-error" role="alert">
                  {loginError}
                </p>
              )}
              <label>
                Correo electrónico
                <input
                  type="email"
                  name="email"
                  placeholder="nombre@ejemplo.com"
                  autoComplete="email"
                  required
                />
              </label>

              <label>
                Contraseña
                <input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </label>

              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Iniciando sesión…' : 'Iniciar sesión'}
              </button>

              <p className="login-link">
                ¿No tienes cuenta?{' '}
                <a
                  href="#register"
                  onClick={(event) => {
                    event.preventDefault()
                    setLoginError('')
                    setRegisterError('')
                    setIsCreatingAccount(true)
                  }}
                >
                  Crea una aquí
                </a>
              </p>
            </form>
          )}
        </div>
      </section>
    </main>
  )
}

const getLoginErrorMessage = (error: unknown) =>
  error instanceof ApiError && error.status === 401
    ? 'El correo electrónico o la contraseña no son correctos.'
    : error instanceof Error
      ? error.message
      : 'No se pudo completar la operación. Inténtalo de nuevo.'

const getRegisterErrorMessage = (error: unknown) => getLoginErrorMessage(error)

export default LandingPage
