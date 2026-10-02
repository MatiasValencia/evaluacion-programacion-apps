import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import LandingPage from './pages/LandingPage'
import MenuPage from './pages/MenuPage'
import AlumnosPage, { type Student } from './pages/AlumnosPage'
import AsignaturasPage from './pages/AsignaturasPage'
import AsistenciaPage from './pages/AsistenciaPage'
import EvaluacionesPage from './pages/EvaluacionesPage'

function App() {
  const [students, setStudents] = useState<Student[]>([])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route
          path="/menu/alumnos"
          element={<AlumnosPage students={students} setStudents={setStudents} />}
        />
        <Route path="/menu/asignaturas" element={<AsignaturasPage />} />
        <Route path="/menu/asistencia" element={<AsistenciaPage />} />
        <Route path="/menu/evaluaciones" element={<EvaluacionesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
