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
  getUserRole,
  type UserRole,
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
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(firebaseAuth !== null)
  const [loadedUserUid, setLoadedUserUid] = useState<string | null>(null)
  const [dataError, setDataError] = useState<string | null>(null)
  const [dataRetry, setDataRetry] = useState(0)

  useEffect(() => {
    if (firebaseAuth === null) return

    return onAuthStateChanged(
      firebaseAuth,
      async (user) => {
        setAuthenticatedUser(user)
        setLoadedUserUid(null)
        setDataError(null)

        if (user === null) {
          setUserRole(null)
          setIsAuthLoading(false)
          return
        }

        try {
          const role = await getUserRole(user.uid)
          if (firebaseAuth.currentUser?.uid !== user.uid) return
          setUserRole(role)
        } catch (error) {
          console.error('No se pudo resolver el rol del usuario.', error)
          setUserRole(null)
          try {
            await signOut(firebaseAuth)
          } catch (signOutError) {
            console.error('No se pudo cerrar la sesión del usuario sin un rol válido.', signOutError)
          }
        } finally {
          if (firebaseAuth.currentUser?.uid === user.uid) {
            setIsAuthLoading(false)
          }
        }
      },
      (error) => {
        console.error('No se pudo restaurar la sesión de Firebase.', error)
        setAuthenticatedUser(null)
        setUserRole(null)
        setIsAuthLoading(false)
      },
    )
  }, [])

  const handleLogin = async (email: string, password: string) => {
    const { user, role } = await authenticateUser(email, password)
    setAuthenticatedUser(user)
    setUserRole(role)
  }

  const handleLogout = () => {
    if (firebaseAuth === null) return

    void signOut(firebaseAuth)
      .then(() => {
        setUserRole(null)
      })
      .catch((error: unknown) => {
        console.error('No se pudo cerrar la sesión de Firebase.', error)
        window.alert('No se pudo cerrar la sesión. Inténtalo de nuevo.')
      })
  }

  const isAdmin = userRole === 'admin'
  const isReadOnly = userRole === 'readOnly'
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
              isAuthorized ? (
                <Navigate to="/menu" replace />
              ) : authenticatedUser ? (
                <Navigate to="/acceso-denegado" replace />
              ) : (
                <LandingPage onLogin={handleLogin} />
              )
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
