import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

const menuItems = [
  { to: '/menu/alumnos', label: 'Alumnos' },
  { to: '/menu/asignaturas', label: 'Asignaturas' },
  { to: '/menu/asistencia', label: 'Asistencia' },
  { to: '/menu/evaluaciones', label: 'Evaluaciones' },
]

type DashboardSidebarProps = {
  onLogout: () => void
}

const DashboardSidebar = ({ onLogout }: DashboardSidebarProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const isDashboardSection = pathname !== '/menu'

  return (
    <aside className={`sidebar ${isMenuOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-top">
        <div className="sidebar-brand-group">
          {isDashboardSection && (
            <NavLink
              className="sidebar-back-button"
              to="/menu"
              aria-label="Volver al dashboard"
              title="Volver al dashboard"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </NavLink>
          )}
          <div className="sidebar-brand">PRUFODIS Ucentral</div>
        </div>
        <button
          className="menu-toggle dashboard-menu-toggle"
          type="button"
          aria-label={isMenuOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
          aria-expanded={isMenuOpen}
          aria-controls="dashboard-navigation"
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
      <nav
        className="sidebar-nav"
        id="dashboard-navigation"
        aria-label="Navegación principal"
      >
        {menuItems.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={() => setIsMenuOpen(false)}
          >
            {label}
          </NavLink>
        ))}
        <button className="sidebar-logout" type="button" onClick={onLogout}>
          Cerrar sesión
        </button>
      </nav>
    </aside>
  )
}

export default DashboardSidebar
