import { useContext, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import logo from '../assets/logo.png'
import { AuthContext } from '../auth-context'

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
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const user = useContext(AuthContext)
  const accountLabel =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Usuario'

  return (
    <aside className={`sidebar ${isMenuOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-top">
        <NavLink className="sidebar-brand" to="/menu" aria-label="PRUFODIS Ucentral">
          <img src={logo} alt="PRUFODIS Ucentral" />
        </NavLink>
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
        <div className="sidebar-links">
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
        </div>
        <div className="sidebar-account">
          <button
            className="sidebar-account-toggle"
            type="button"
            aria-haspopup="menu"
            aria-expanded={isAccountMenuOpen}
            onClick={() => setIsAccountMenuOpen((open) => !open)}
          >
            {accountLabel}
            <span aria-hidden="true">⌄</span>
          </button>
          {isAccountMenuOpen && (
            <div className="sidebar-account-menu" role="menu">
              <NavLink
                to="/menu/configurar-usuario"
                role="menuitem"
                onClick={() => {
                  setIsAccountMenuOpen(false)
                  setIsMenuOpen(false)
                }}
              >
                Configurar usuario
              </NavLink>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsAccountMenuOpen(false)
                  onLogout()
                }}
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </nav>
    </aside>
  )
}

type DashboardPageTitleProps = {
  children: ReactNode
}

export const DashboardPageTitle = ({ children }: DashboardPageTitleProps) => {
  const { pathname } = useLocation()

  return (
    <div className="dashboard-page-title">
      {pathname !== '/menu' && (
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
      {children}
    </div>
  )
}

export default DashboardSidebar
