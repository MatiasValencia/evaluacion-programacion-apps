import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import './App.css'
import { AuthContext } from './auth-context'
import {
  ApiError,
  getCurrentUser,
  login,
  logout,
  registerAccount,
  updateUserProfile,
  type AppUser,
} from './api'
import LandingPage from './pages/LandingPage'
import MenuPage from './pages/MenuPage'
import AlumnosPage from './pages/AlumnosPage'
import AsignaturasPage from './pages/AsignaturasPage'
import AsistenciaPage from './pages/AsistenciaPage'
import EvaluacionesPage from './pages/EvaluacionesPage'
import HabilidadesPedagogicasPage from './pages/HabilidadesPedagogicasPage'
import AccessDeniedPage from './pages/AccessDeniedPage'
import UserSettingsPage from './pages/UserSettingsPage'
import {
  deleteAssignment,
  deleteAttendance,
  deletePedagogicalSkill,
  deleteStudent,
  loadAppData,
  saveAssignment,
  saveAssignmentRoster,
  saveAttendance,
  saveEvaluationGrades,
  savePedagogicalSkill,
  saveStudent,
  type AppData,
} from './api-store'

function App() {
  const [students, setStudents] = useState<AppData['students']>([])
  const [assignments, setAssignments] = useState<AppData['assignments']>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AppData['attendanceRecords']>([])
  const [evaluationGrades, setEvaluationGrades] = useState<AppData['evaluationGrades']>([])
  const [pedagogicalSkills, setPedagogicalSkills] = useState<AppData['pedagogicalSkills']>([])
  const [authenticatedUser, setAuthenticatedUser] = useState<AppUser | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authRetry, setAuthRetry] = useState(0)
  const [loadedUserId, setLoadedUserId] = useState<number | null>(null)
  const [dataError, setDataError] = useState<string | null>(null)
  const [dataRetry, setDataRetry] = useState(0)

  useEffect(() => {
    let isActive = true

    void getCurrentUser()
      .then((user) => {
        if (!isActive) return
        setAuthenticatedUser(user)
      })
      .catch((error: unknown) => {
        if (!isActive) return
        if (error instanceof ApiError && error.status === 401) {
          setAuthenticatedUser(null)
          return
        }
        setAuthError(
          error instanceof Error ? error.message : 'No se pudo comprobar la sesión.',
        )
      })
      .finally(() => {
        if (isActive) setIsAuthLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [authRetry])

  const handleLogin = async (email: string, password: string) => {
    const user = await login(email, password)
    setAuthenticatedUser(user)
    setAuthError(null)
  }

  const handleRegister = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) => {
    const user = await registerAccount(email, password, firstName, lastName)
    setAuthenticatedUser(user)
    setAuthError(null)
  }

  const handleLogout = () => {
    void logout()
      .then(() => {
        setAuthenticatedUser(null)
        setLoadedUserId(null)
        setDataError(null)
      })
      .catch((error: unknown) => {
        console.error('No se pudo cerrar la sesión del backend.', error)
        window.alert('No se pudo cerrar la sesión. Inténtalo de nuevo.')
      })
  }

  const userRole = authenticatedUser?.role ?? null
  const isAdmin = userRole === 'administrador'
  const isProfessor = userRole === 'profesor'
  const isPsychologist = userRole === 'psicologo'
  const isAuthorized = authenticatedUser !== null
  const authorizedUserId = isAuthorized ? authenticatedUser.id : null

  useEffect(() => {
    if (authorizedUserId === null) return
    let isActive = true

    void loadAppData()
      .then((data) => {
        if (!isActive) return
        setStudents(data.students)
        setAssignments(data.assignments)
        setAttendanceRecords(data.attendanceRecords)
        setEvaluationGrades(data.evaluationGrades)
        setPedagogicalSkills(data.pedagogicalSkills)
        setLoadedUserId(authorizedUserId)
      })
      .catch((error: unknown) => {
        if (!isActive) return
        console.error('No se pudieron cargar los datos del backend.', error)
        setDataError(
          error instanceof Error ? error.message : 'Error inesperado al cargar los datos.',
        )
      })

    return () => {
      isActive = false
    }
  }, [authorizedUserId, dataRetry])

  const refreshAppData = async () => {
    const data = await loadAppData()
    setStudents(data.students)
    setAssignments(data.assignments)
    setAttendanceRecords(data.attendanceRecords)
    setEvaluationGrades(data.evaluationGrades)
    setPedagogicalSkills(data.pedagogicalSkills)
    setLoadedUserId(authorizedUserId)
  }

  const saveAndRefresh = async (save: () => Promise<unknown>) => {
    await save()
    await refreshAppData()
  }

  const handleStudentSave = (student: Parameters<typeof saveStudent>[0]) =>
    saveAndRefresh(() => saveStudent(student))
  const handleStudentDelete = (studentId: number) =>
    saveAndRefresh(() => deleteStudent(studentId))
  const handleSkillSave = (skill: Parameters<typeof savePedagogicalSkill>[0]) =>
    saveAndRefresh(() => savePedagogicalSkill(skill))
  const handleSkillDelete = (skillId: string) =>
    saveAndRefresh(() => deletePedagogicalSkill(skillId))
  const handleAssignmentSave = (assignment: Parameters<typeof saveAssignment>[0]) =>
    saveAndRefresh(() => saveAssignment(assignment))
  const handleAssignmentRosterSave = (assignmentId: string, studentIds: number[]) =>
    saveAndRefresh(() => saveAssignmentRoster(assignmentId, studentIds))
  const handleAssignmentDelete = (assignmentId: string) =>
    saveAndRefresh(() => deleteAssignment(assignmentId))
  const handleAttendanceSave = (record: Parameters<typeof saveAttendance>[0]) =>
    saveAndRefresh(() => saveAttendance(record))
  const handleAttendanceDelete = (recordId: string) =>
    saveAndRefresh(() => deleteAttendance(recordId))
  const handleUserProfileUpdate = async (
    changes: Parameters<typeof updateUserProfile>[0],
  ) => {
    const user = await updateUserProfile(changes)
    setAuthenticatedUser(user)
    return user
  }

  const isDataLoading =
    isAuthorized && loadedUserId !== authorizedUserId && dataError === null

  if (isAuthLoading) {
    return (
      <main className="auth-loading" role="status">
        Comprobando la sesión…
      </main>
    )
  }

  if (authError !== null) {
    return (
      <main className="auth-loading" role="alert">
        <p>No se pudo conectar con el backend: {authError}</p>
        <button
          className="secondary-button"
          onClick={() => {
            setAuthError(null)
            setIsAuthLoading(true)
            setAuthRetry((retry) => retry + 1)
          }}
        >
          Reintentar
        </button>
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
        <p>No se pudieron cargar los datos del backend: {dataError}</p>
        <button
          className="secondary-button"
          onClick={() => {
            setDataError(null)
            setLoadedUserId(null)
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
    <AuthContext.Provider value={authenticatedUser}>
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
              <LandingPage onLogin={handleLogin} onRegister={handleRegister} />
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
                canEditSkills={isPsychologist}
                pedagogicalSkills={pedagogicalSkills}
                onSkillDelete={handleSkillDelete}
                onStudentSave={handleStudentSave}
                onStudentDelete={handleStudentDelete}
                onLogout={handleLogout}
              />
            }
          />
          <Route
            path="alumnos/:studentId"
            element={
              <AlumnosPage
                students={students}
                canEdit={isAdmin}
                canEditSkills={isPsychologist}
                pedagogicalSkills={pedagogicalSkills}
                onSkillDelete={handleSkillDelete}
                onStudentSave={handleStudentSave}
                onStudentDelete={handleStudentDelete}
                onLogout={handleLogout}
              />
            }
          />
          <Route
            path="alumnos/:studentId/habilidades/nueva"
            element={
              <HabilidadesPedagogicasPage
                students={students}
                skills={pedagogicalSkills}
                canEdit={isPsychologist}
                onSkillSave={handleSkillSave}
                onLogout={handleLogout}
              />
            }
          />
          <Route
            path="alumnos/:studentId/habilidades/:skillId/editar"
            element={
              <HabilidadesPedagogicasPage
                students={students}
                skills={pedagogicalSkills}
                canEdit={isPsychologist}
                onSkillSave={handleSkillSave}
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
                canEditRoster={isProfessor}
                onAssignmentSave={handleAssignmentSave}
                onAssignmentRosterSave={handleAssignmentRosterSave}
                onAssignmentDelete={handleAssignmentDelete}
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
                canEdit={isProfessor}
                onRecordSave={handleAttendanceSave}
                onRecordDelete={handleAttendanceDelete}
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
                canEdit={isProfessor}
                onGradesSave={(previous, next) =>
                  saveAndRefresh(() => saveEvaluationGrades(previous, next))
                }
                onLogout={handleLogout}
              />
            }
          />
          <Route
            path="configurar-usuario"
            element={
              authenticatedUser ? (
                <UserSettingsPage
                  key={authenticatedUser.id}
                  user={authenticatedUser}
                  onUserUpdate={handleUserProfileUpdate}
                  onLogout={handleLogout}
                />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}

export default App
