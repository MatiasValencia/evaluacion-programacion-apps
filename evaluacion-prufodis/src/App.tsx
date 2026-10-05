import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import './App.css'
import LandingPage from './pages/LandingPage'
import MenuPage from './pages/MenuPage'
import AlumnosPage, { type Student } from './pages/AlumnosPage'
import AsignaturasPage, { type Assignment } from './pages/AsignaturasPage'
import AsistenciaPage, { type AttendanceRecord } from './pages/AsistenciaPage'
import EvaluacionesPage, { type EvaluationGrade } from './pages/EvaluacionesPage'

const studentsStorageKey = 'prufodis-students'
const assignmentsStorageKey = 'prufodis-assignments'
const attendanceStorageKey = 'prufodis-attendance'
const evaluationGradesStorageKey = 'prufodis-evaluation-grades'

const readStoredArray = <T,>(key: string): T[] => {
  const storedValue = localStorage.getItem(key)
  if (storedValue === null) return []

  const parsedValue: unknown = JSON.parse(storedValue)
  if (!Array.isArray(parsedValue)) {
    throw new Error(`Los datos guardados en "${key}" no tienen un formato válido.`)
  }

  return parsedValue as T[]
}

function App() {
  const [students, setStudents] = useState<Student[]>(() => readStoredArray<Student>(studentsStorageKey))
  const [assignments, setAssignments] = useState<Assignment[]>(() =>
    readStoredArray<Assignment>(assignmentsStorageKey),
  )
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() =>
    readStoredArray<AttendanceRecord>(attendanceStorageKey),
  )
  const [evaluationGrades, setEvaluationGrades] = useState<EvaluationGrade[]>(() =>
    readStoredArray<EvaluationGrade>(evaluationGradesStorageKey),
  )
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    localStorage.setItem(studentsStorageKey, JSON.stringify(students))
  }, [students])

  useEffect(() => {
    localStorage.setItem(assignmentsStorageKey, JSON.stringify(assignments))
  }, [assignments])

  useEffect(() => {
    localStorage.setItem(attendanceStorageKey, JSON.stringify(attendanceRecords))
  }, [attendanceRecords])

  useEffect(() => {
    localStorage.setItem(evaluationGradesStorageKey, JSON.stringify(evaluationGrades))
  }, [evaluationGrades])

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
                onStudentDelete={(studentId) => {
                  setStudents((currentStudents) =>
                    currentStudents.filter((student) => student.id !== studentId),
                  )
                  setAssignments((currentAssignments) =>
                    currentAssignments.map((assignment) => ({
                      ...assignment,
                      studentIds: assignment.studentIds.filter((id) => id !== studentId),
                    })),
                  )
                }}
                onLogout={() => setIsAuthenticated(false)}
              />
            }
          />
          <Route
            path="asignaturas"
            element={
              <AsignaturasPage
                students={students}
                assignments={assignments}
                setAssignments={setAssignments}
                onLogout={() => setIsAuthenticated(false)}
              />
            }
          />
          <Route
            path="asistencia"
            element={
              <AsistenciaPage
                students={students}
                assignments={assignments}
                records={attendanceRecords}
                setRecords={setAttendanceRecords}
                onLogout={() => setIsAuthenticated(false)}
              />
            }
          />
          <Route
            path="evaluaciones"
            element={
              <EvaluacionesPage
                students={students}
                assignments={assignments}
                grades={evaluationGrades}
                setGrades={setEvaluationGrades}
                onLogout={() => setIsAuthenticated(false)}
              />
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
