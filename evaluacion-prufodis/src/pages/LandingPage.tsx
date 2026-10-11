import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { FirebaseError } from 'firebase/app'
import { hasConfiguredAdministrators, isFirebaseConfigured } from '../firebase'

type LandingPageProps = {
  onLogin: (email: string, password: string) => Promise<void>
}

const LandingPage = ({ onLogin }: LandingPageProps) => {
  const navigate = useNavigate()
  const [loginError, setLoginError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoginError('')
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

  return (
    <div className="page-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">P</span>
          <span>PRUFODIS - Universidad Central</span>
        </div>

        <button
          className="menu-toggle landing-menu-toggle"
          type="button"
          aria-label={isMenuOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
          aria-expanded={isMenuOpen}
          aria-controls="landing-navigation"
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav
          className={`nav ${isMenuOpen ? 'nav-open' : ''}`}
          id="landing-navigation"
          aria-label="Navegación principal"
        >
          <a href="#features" onClick={() => setIsMenuOpen(false)}>Funcionalidades</a>
          <a href="#benefits" onClick={() => setIsMenuOpen(false)}>Ventajas</a>
          <a href="#login" onClick={() => setIsMenuOpen(false)}>Iniciar sesión</a>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Sistema de gestión educativa</p>
            <h1>Organiza alumnos, asignaturas, evaluaciones y asistencias en un solo lugar.</h1>
            <p className="lead">
              Centraliza la información académica de tu centro y agiliza la toma de decisiones con
              herramientas pensadas para docentes y gestores.
            </p>

            <div className="hero-actions">
              <a className="primary-button" href="#login">
                Iniciar sesión
              </a>
              <a className="secondary-button" href="#features">
                Ver funcionalidades
              </a>
            </div>

            <ul className="stats" aria-label="Estadísticas de la plataforma">
              <li>
                <strong>1.000+</strong>
                <span>alumnos gestionados</span>
              </li>
              <li>
                <strong>25+</strong>
                <span>asignaturas online</span>
              </li>
            </ul>
          </div>

          <div className="hero-panel" aria-label="Resumen del sistema">
            <div className="panel-card card-main">
              <div className="card-header">
                <span className="dot green" />
                <span className="dot yellow" />
                <span className="dot red" />
              </div>
              <div className="card-body">
                <div className="metric">
                  <span>Promedio general</span>
                  <strong>6,4</strong>
                </div>
                <div className="progress">
                  <div className="progress-bar" />
                </div>
                <div className="mini-grid">
                  <div>
                    <small>Asistencia</small>
                    <strong>92%</strong>
                  </div>
                  <div>
                    <small>Evaluaciones</small>
                    <strong>8</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="features">
          <div className="section-heading">
            <p className="eyebrow">Funcionalidades</p>
            <h2>Todo lo que necesitas para gestionar la vida académica</h2>
          </div>

          <div className="feature-grid">
            <article className="feature-card">
              <h3>Alumnos</h3>
              <p>Consulta perfiles, historiales y evolución académica de cada estudiante.</p>
            </article>
            <article className="feature-card">
              <h3>Asignaturas</h3>
              <p>Organiza cursos, docentes y contenidos con una visión clara del plan de estudios.</p>
            </article>
            <article className="feature-card">
              <h3>Evaluaciones</h3>
              <p>Registra notas, seguimiento de rendimiento y análisis por trimestre o curso.</p>
            </article>
            <article className="feature-card">
              <h3>Asistencias</h3>
              <p>Controla faltas y presencias con informes rápidos y actualizados en tiempo real.</p>
            </article>
          </div>
        </section>

        <section id="benefits" className="benefits">
          <div className="benefits-copy">
            <p className="eyebrow">¿Por qué elegir el Sistema de Gestión de PRUFODIS?</p>
            <h2>Una solución clara, eficiente y centrada en el rendimiento escolar.</h2>
          </div>

          <ul className="benefits-list">
            <li>Automatización de tareas repetitivas</li>
            <li>Visibilidad real del progreso académico</li>
            <li>Gestión centralizada de información</li>
            <li>Acceso rápido desde cualquier dispositivo</li>
          </ul>
        </section>
      </main>

      <section id="login" className="login-section">
        <div className="login-card">
          <div className="login-copy">
            <p className="eyebrow">Acceso</p>
            <h2>Inicia sesión</h2>
            <p>Accede al panel de administración para gestionar alumnos, asignaturas y seguimiento.</p>
          </div>

          <form className="login-form" onSubmit={handleLogin}>
            {!isFirebaseConfigured && (
              <p className="login-message login-error" role="alert">
                Firebase no está configurado. Completa las variables de entorno del archivo
                <code> .env.local</code> y reinicia la aplicación.
              </p>
            )}
            {isFirebaseConfigured && !hasConfiguredAdministrators && (
              <p className="login-message login-error" role="alert">
                No hay UID de administradores configurados. Añádelos a{' '}
                <code>VITE_FIREBASE_ADMIN_UIDS</code>.
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

            <button
              type="submit"
              disabled={isSubmitting || !isFirebaseConfigured || !hasConfiguredAdministrators}
            >
              {isSubmitting ? 'Iniciando sesión…' : 'Entrar'}
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}

const getLoginErrorMessage = (error: unknown) => {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'El correo electrónico o la contraseña no son correctos.'
      case 'auth/invalid-email':
        return 'Introduce un correo electrónico válido.'
      case 'auth/too-many-requests':
        return 'Hubo demasiados intentos. Espera un momento e inténtalo de nuevo.'
      case 'auth/network-request-failed':
        return 'No se pudo conectar con Firebase. Comprueba tu conexión e inténtalo de nuevo.'
      case 'auth/operation-not-allowed':
        return 'El inicio de sesión con correo y contraseña no está habilitado en Firebase.'
      default:
        return 'No se pudo iniciar sesión. Inténtalo de nuevo.'
    }
  }

  return error instanceof Error ? error.message : 'No se pudo iniciar sesión. Inténtalo de nuevo.'
}

export default LandingPage
