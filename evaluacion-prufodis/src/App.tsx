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
import {
  authenticateUser,
  firebaseAuth,
  firebaseDb,
  isAdminUid,
  isReadOnlyUid,
} from './firebase'
import {
  deleteRecord,
  deleteStudentAndUnlinkFromAssignments,
  initializeFirestoreData,
  saveEvaluationGrades,
  saveRecord,
  subscribeToCollection,
} from './firebase-store'

function App() {
  const [students, setStudents] = useState<Student[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [evaluationGrades, setEvaluationGrades] = useState<EvaluationGrade[]>([])
  const [authenticatedUser, setAuthenticatedUser] = useState<User | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(firebaseAuth !== null)
  const [loadedUserUid, setLoadedUserUid] = useState<string | null>(null)
  const [dataError, setDataError] = useState<string | null>(null)
  const [dataRetry, setDataRetry] = useState(0)

  useEffect(() => {
    if (firebaseAuth === null) return

    return onAuthStateChanged(
      firebaseAuth,
      (user) => {
        setAuthenticatedUser(user)
        setLoadedUserUid(null)
        setDataError(null)
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
    const user = await authenticateUser(email, password)
    setAuthenticatedUser(user)
  }

  const handleLogout = () => {
    if (firebaseAuth === null) return

    void signOut(firebaseAuth).catch((error: unknown) => {
      console.error('No se pudo cerrar la sesión de Firebase.', error)
      window.alert('No se pudo cerrar la sesión. Inténtalo de nuevo.')
    })
  }

  const isAdmin = authenticatedUser !== null && isAdminUid(authenticatedUser.uid)
  const isReadOnly = authenticatedUser !== null && isReadOnlyUid(authenticatedUser.uid)
  const isAuthorized = isAdmin || isReadOnly
  const authorizedUid = isAuthorized ? authenticatedUser?.uid ?? null : null

  useEffect(() => {
    if (authorizedUid === null || firebaseDb === null) return

    let isActive = true
    let hasStartedInitialization = false
    const receivedCollections = new Set<string>()

    const handleDataError = (error: Error) => {
      console.error('No se pudieron sincronizar los datos con Firestore.', error)
      if (!isActive) return
      setDataError(error.message)
    }

    const initializeWhenReady = () => {
      if (receivedCollections.size !== 4 || hasStartedInitialization) return
      hasStartedInitialization = true

      if (!isAdmin) {
        setLoadedUserUid(authorizedUid)
        return
      }

      void initializeFirestoreData()
        .then((data) => {
          if (!isActive) return
          setStudents(data.students)
          setAssignments(data.assignments)
          setAttendanceRecords(data.attendanceRecords)
          setEvaluationGrades(data.evaluationGrades)
          setLoadedUserUid(authorizedUid)
        })
        .catch((error: unknown) => {
          handleDataError(
            error instanceof Error ? error : new Error('Error inesperado al cargar los datos.'),
          )
        })
    }

    const subscriptions = [
      subscribeToCollection(
        'students',
        (records) => {
          if (!isActive) return
          setStudents(records)
          receivedCollections.add('students')
          initializeWhenReady()
        },
        handleDataError,
      ),
      subscribeToCollection(
        'assignments',
        (records) => {
          if (!isActive) return
          setAssignments(records)
          receivedCollections.add('assignments')
          initializeWhenReady()
        },
        handleDataError,
      ),
      subscribeToCollection(
        'attendanceRecords',
        (records) => {
          if (!isActive) return
          setAttendanceRecords(records)
          receivedCollections.add('attendanceRecords')
          initializeWhenReady()
        },
        handleDataError,
      ),
      subscribeToCollection(
        'evaluationGrades',
        (records) => {
          if (!isActive) return
          setEvaluationGrades(records)
          receivedCollections.add('evaluationGrades')
          initializeWhenReady()
        },
        handleDataError,
      ),
    ]

    return () => {
      isActive = false
      subscriptions.forEach((unsubscribe) => unsubscribe())
    }
  }, [authorizedUid, isAdmin, dataRetry])

  const isDataLoading = isAuthorized && loadedUserUid !== authorizedUid && dataError === null

  if (isAuthLoading) {
    return (
      <main className="auth-loading" role="status">
        Comprobando la sesión…
      </main>
    )
  }

  if (isAuthorized && isDataLoading) {
    return (
      <main className="auth-loading" role="status">
        Sincronizando los datos…
      </main>
    )
  }

  if (isAuthorized && dataError !== null) {
    return (
      <main className="auth-loading" role="alert">
        <p>No se pudieron cargar los datos de Firebase: {dataError}</p>
        <button
          className="secondary-button"
          onClick={() => {
            setDataError(null)
            setLoadedUserUid(null)
            setDataRetry((retry) => retry + 1)
          }}
        >
          Reintentar
        </button>
        <button className="secondary-button" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </main>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            isAuthorized ? <Navigate to="/menu" replace /> : <LandingPage onLogin={handleLogin} />
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
            isAuthorized ? (
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
                canEdit={isAdmin}
                onStudentSave={(student) => saveRecord('students', student)}
                onStudentDelete={deleteStudentAndUnlinkFromAssignments}
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
                grades={evaluationGrades}
                canEdit={isAdmin}
                onAssignmentSave={(assignment) => saveRecord('assignments', assignment)}
                onAssignmentDelete={(id) => deleteRecord('assignments', id)}
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
                canEdit={isAdmin}
                onRecordSave={(record) => saveRecord('attendanceRecords', record)}
                onRecordDelete={(id) => deleteRecord('attendanceRecords', id)}
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
                canEdit={isAdmin}
                onGradesSave={saveEvaluationGrades}
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
