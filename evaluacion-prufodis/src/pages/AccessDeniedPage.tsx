const AccessDeniedPage = () => (
  <main className="page-shell">
    <section className="login-section" aria-labelledby="access-denied-title">
      <div className="login-card">
        <div className="login-copy">
          <p className="eyebrow">Acceso restringido</p>
          <h1 id="access-denied-title">Acceso denegado</h1>
          <p>Debes iniciar sesión para acceder a esta página.</p>
        </div>
        <div>
          <a className="primary-button" href="/#login">
            Ir a iniciar sesión
          </a>
        </div>
      </div>
    </section>
  </main>
)

export default AccessDeniedPage
