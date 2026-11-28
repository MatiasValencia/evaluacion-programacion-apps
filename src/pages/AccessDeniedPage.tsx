type AccessDeniedPageProps = {
  onLogout: () => void
}

const AccessDeniedPage = ({ onLogout }: AccessDeniedPageProps) => (
  <main className="page-shell">
    <section className="login-section" aria-labelledby="access-denied-title">
      <div className="login-card">
        <div className="login-copy">
          <p className="eyebrow">Acceso restringido</p>
          <h1 id="access-denied-title">Acceso denegado</h1>
          <p>Esta cuenta no tiene permisos de administrador para acceder a esta página.</p>
        </div>
        <div>
          <button className="primary-button" onClick={onLogout}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </section>
  </main>
)

export default AccessDeniedPage
