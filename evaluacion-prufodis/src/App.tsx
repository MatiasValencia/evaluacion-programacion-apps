import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { onAuthStateChanged, signOut, type User } from 'firebase/auth'
import './App.css'
import LandingPage from './pages/LandingPage'
import MenuPage from './pages/MenuPage'
import AlumnosPage, { type Student } from './pages/AlumnosPage'
import AsignaturasPage, { type Assignment } from './pages/AsignaturasPage'
import AsistenciaPage, { type AttendanceRecord } from './pages/AsistenciaPage'
import EvaluacionesPage, { type EvaluationGrade } from './pages/EvaluacionesPage'
import AccessDeniedPage from './pages/AccessDeniedPage'
import { authenticateAdmin, firebaseAuth, isAdminUid } from './firebase'

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
  const [authenticatedUser, setAuthenticatedUser] = useState<User | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(firebaseAuth !== null)

  useEffect(() => {
    if (firebaseAuth === null) return

    return onAuthStateChanged(
      firebaseAuth,
      (user) => {
        setAuthenticatedUser(user)
        setIsAuthLoading(false)
      },
      (error) => {
        console.error('No se pudo restaurar la sesión de Firebase.', error)
        setAuthenticatedUser(null)
        setIsAuthLoading(false)
      },
    )
  }, [])

  const handleLogin = async (email: string, password: string) => {
    const user = await authenticateAdmin(email, password)
    setAuthenticatedUser(user)
  }

  const handleLogout = () => {
    if (firebaseAuth === null) return

    void signOut(firebaseAuth).catch((error: unknown) => {
      console.error('No se pudo cerrar la sesión de Firebase.', error)
      window.alert('No se pudo cerrar la sesión. Inténtalo de nuevo.')
    })
  }

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

  if (isAuthLoading) {
    return (
      <main className="auth-loading" role="status">
        Comprobando la sesión…
      </main>
    )
  }

  const isAdmin = authenticatedUser !== null && isAdminUid(authenticatedUser.uid)

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            isAdmin ? <Navigate to="/menu" replace /> : <LandingPage onLogin={handleLogin} />
          }
        />
        <Route
          path="/acceso-denegado"
          element={
            authenticatedUser ? (
              <AccessDeniedPage onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/menu"
          element={
            isAdmin ? (
              <Outlet />
            ) : authenticatedUser ? (
              <Navigate to="/acceso-denegado" replace />
            ) : (
              <Navigate to="/" replace />
            )
          }
        >
          <Route
            path=""
            element={
              <MenuPage
                students={students}
                assignments={assignments}
                attendanceRecords={attendanceRecords}
                evaluationGrades={evaluationGrades}
                onLogout={handleLogout}
              />
            }
          />
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
                onLogout={handleLogout}
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
                onLogout={handleLogout}
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
                onLogout={handleLogout}
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
                onLogout={handleLogout}
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
