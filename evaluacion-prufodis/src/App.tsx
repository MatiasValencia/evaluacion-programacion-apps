import { useState } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import './App.css'
import LandingPage from './pages/LandingPage'
import MenuPage from './pages/MenuPage'
import AlumnosPage, { type Student } from './pages/AlumnosPage'
import AsignaturasPage from './pages/AsignaturasPage'
import AsistenciaPage from './pages/AsistenciaPage'
import EvaluacionesPage from './pages/EvaluacionesPage'

function App() {
  const [students, setStudents] = useState<Student[]>([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<LandingPage onLogin={() => setIsAuthenticated(true)} />}
        />
        <Route
          path="/menu"
          element={isAuthenticated ? <Outlet /> : <Navigate to="/" replace />}
        >
          <Route path="" element={<MenuPage onLogout={() => setIsAuthenticated(false)} />} />
          <Route
            path="alumnos"
            element={
              <AlumnosPage
                students={students}
                setStudents={setStudents}
                onLogout={() => setIsAuthenticated(false)}
              />
            }
          />
          <Route path="asignaturas" element={<AsignaturasPage />} />
          <Route path="asistencia" element={<AsistenciaPage />} />
          <Route path="evaluaciones" element={<EvaluacionesPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
