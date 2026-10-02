import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import LandingPage from './pages/LandingPage'
import MenuPage from './pages/MenuPage'
import AlumnosPage from './pages/AlumnosPage'
import AsignaturasPage from './pages/AsignaturasPage'
import AsistenciaPage from './pages/AsistenciaPage'
import EvaluacionesPage from './pages/EvaluacionesPage'

function App() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (username === 'admin' && password === '1234') {
      setMessage('Inicio de sesión correcto. Bienvenido al panel de gestión.')
    } else {
      setMessage('Usuario o contraseña incorrectos. Prueba con admin / 1234.')
    }
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/menu/alumnos" element={<AlumnosPage />} />
        <Route path="/menu/asignaturas" element={<AsignaturasPage />} />
        <Route path="/menu/asistencia" element={<AsistenciaPage />} />
        <Route path="/menu/evaluaciones" element={<EvaluacionesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <div className="page-shell">
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark">P</span>
            <span>PRUFODIS - Universidad Central</span>
          </div>

          <nav className="nav">
            <a href="#features">Funcionalidades</a>
            <a href="#benefits">Ventajas</a>
            <a href="#login">Login</a>
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
                  <strong>1k+</strong>
                  <span>alumnos gestionados</span>
                </li>
                <li>
                  <strong>25+</strong>
                  <span>asignaturas</span>
                </li>
                <li>
                  <strong>98%</strong>
                  <span>satisfacción docente</span>
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
                    <strong>6,5</strong>
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
                      <strong>9</strong>
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
              <p className="eyebrow">¿Por qué elegir este sistema?</p>
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

            <form className="login-form" onSubmit={handleSubmit}>
              <label>
                Usuario
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Nombre de usuario"
                />
              </label>

              <label>
                Contraseña
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Contraseña"
                />
              </label>

              <button type="submit">Entrar</button>

              {message && <p className="login-message">{message}</p>}
            </form>
          </div>
        </section>
      </div>
    </BrowserRouter>
  )
}

export default App
