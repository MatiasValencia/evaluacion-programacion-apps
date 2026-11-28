import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { FirebaseError } from 'firebase/app'
import { createAccount, isFirebaseConfigured } from '../firebase'
import heroImage from '../assets/image1.jpeg'
import logo from '../assets/logo.png'

type LandingPageProps = {
  onLogin: (email: string, password: string) => Promise<void>
}

const LandingPage = ({ onLogin }: LandingPageProps) => {
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
    const confirmPassword = String(formData.get('confirmPassword') ?? '')

    try {
      if (!email || !password || !confirmPassword) {
        throw new Error('Completa todos los campos para crear la cuenta.')
      }

      if (password !== confirmPassword) {
        throw new Error('Las contraseñas no coinciden.')
      }

      if (password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres.')
      }

      await createAccount(email, password)
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
                ? 'Crea tu cuenta para acceder a la información académica.'
                : 'Accede a la plataforma para consultar y gestionar la información académica.'}
            </p>
          </div>

          {isCreatingAccount ? (
            <form className="login-form" onSubmit={handleCreateAccount}>
              {!isFirebaseConfigured && (
                <p className="login-message login-error" role="alert">
                  Firebase no está configurado. Completa las variables de entorno del archivo
                  <code> .env.local</code> y reinicia la aplicación.
                </p>
              )}
              {registerError && (
                <p className="login-message login-error" role="alert">
                  {registerError}
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
                  autoComplete="new-password"
                  required
                />
              </label>

              <div className="login-form-actions">
                <button type="submit" disabled={isRegisteringAccount || !isFirebaseConfigured}>
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
              {!isFirebaseConfigured && (
                <p className="login-message login-error" role="alert">
                  Firebase no está configurado. Completa las variables de entorno del archivo
                  <code> .env.local</code> y reinicia la aplicación.
                </p>
              )}
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

              <button type="submit" disabled={isSubmitting || !isFirebaseConfigured}>
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

const getLoginErrorMessage = (error: unknown) => {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/email-already-in-use':
        return 'Este correo ya está registrado.'
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'El correo electrónico o la contraseña no son correctos.'
      case 'auth/invalid-email':
        return 'Introduce un correo electrónico válido.'
      case 'auth/weak-password':
        return 'La contraseña debe tener al menos 6 caracteres.'
      case 'auth/too-many-requests':
        return 'Hubo demasiados intentos. Espera un momento e inténtalo de nuevo.'
      case 'auth/network-request-failed':
        return 'No se pudo conectar con Firebase. Comprueba tu conexión e inténtalo de nuevo.'
      case 'auth/operation-not-allowed':
        return 'El inicio de sesión con correo y contraseña no está habilitado en Firebase.'
      case 'functions/already-exists':
        return 'Este correo ya está registrado.'
      case 'functions/invalid-argument':
        return 'Introduce un correo válido y una contraseña de al menos 6 caracteres.'
      case 'functions/resource-exhausted':
        return 'Se está creando otra cuenta. Inténtalo de nuevo en un momento.'
      case 'functions/failed-precondition':
        return 'Cierra la sesión antes de crear una cuenta.'
      case 'functions/unavailable':
      case 'functions/deadline-exceeded':
        return 'No se pudo conectar con el servicio de registro. Inténtalo de nuevo.'
      case 'functions/internal':
        return 'El servicio de registro falló. Revisa los registros de registerAccount en Firebase Console.'
      case 'functions/not-found':
        return 'No se encontró registerAccount en el proyecto Firebase configurado para esta aplicación.'
      default:
        return `No se pudo completar la operación. Inténtalo de nuevo. (Código Firebase: ${error.code})`
    }
  }

  return error instanceof Error ? error.message : 'No se pudo completar la operación. Inténtalo de nuevo.'
}

const getRegisterErrorMessage = (error: unknown) => getLoginErrorMessage(error)

export default LandingPage
