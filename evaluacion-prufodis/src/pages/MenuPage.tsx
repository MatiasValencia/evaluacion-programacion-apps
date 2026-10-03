import { NavLink } from 'react-router-dom'

type MenuPageProps = {
  onLogout: () => void
}

const menuItems = [
  { to: '/menu/alumnos', label: 'Alumnos' },
  { to: '/menu/asignaturas', label: 'Asignaturas' },
  { to: '/menu/asistencia', label: 'Asistencia' },
  { to: '/menu/evaluaciones', label: 'Evaluaciones' },
]

const MenuPage = ({ onLogout }: MenuPageProps) => {
  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">Prufodis</div>
        <nav className="sidebar-nav">
          {menuItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="dashboard-content">
        <header className="dashboard-header students-header">
          <div>
            <p className="eyebrow">Panel principal</p>
            <h1>Dashboard</h1>
          </div>
          <button className="secondary-button" onClick={onLogout}>
            Cerrar sesión
          </button>
        </header>

        <section className="dashboard-summary">
          <div className="summary-card">
            <h2>Resumen general</h2>
            <p>En construcción. Aquí se mostrará la información central del sistema.</p>
          </div>
        </section>
      </main>
    </div>
  )
}

export default MenuPage
