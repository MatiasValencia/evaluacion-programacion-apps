import { useState } from 'react'
import { NavLink } from 'react-router-dom'

const menuItems = [
  { to: '/menu/alumnos', label: 'Alumnos' },
  { to: '/menu/asignaturas', label: 'Asignaturas' },
  { to: '/menu/asistencia', label: 'Asistencia' },
  { to: '/menu/evaluaciones', label: 'Evaluaciones' },
]

const DashboardSidebar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <aside className={`sidebar ${isMenuOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-top">
        <div className="sidebar-brand">PRUFODIS Ucentral</div>
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
      </nav>
    </aside>
  )
}

export default DashboardSidebar
