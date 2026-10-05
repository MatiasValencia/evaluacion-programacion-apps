import { NavLink } from 'react-router-dom'
import type { Student } from './AlumnosPage'
import type { Assignment } from './AsignaturasPage'
import type { AttendanceRecord } from './AsistenciaPage'
import type { EvaluationGrade } from './EvaluacionesPage'

type MenuPageProps = {
  students: Student[]
  assignments: Assignment[]
  attendanceRecords: AttendanceRecord[]
  evaluationGrades: EvaluationGrade[]
  onLogout: () => void
}

const menuItems = [
  { to: '/menu/alumnos', label: 'Alumnos' },
  { to: '/menu/asignaturas', label: 'Asignaturas' },
  { to: '/menu/asistencia', label: 'Asistencia' },
  { to: '/menu/evaluaciones', label: 'Evaluaciones' },
]

const studentFullName = (studentId: number, students: Student[]) => {
  const student = students.find((item) => item.id === studentId)
  return student
    ? `${student.nombres} ${student.primerApellido} ${student.segundoApellido}`.trim()
    : 'Alumno no disponible'
}

const formatGrade = (value: number) => value.toFixed(1).replace('.', ',')

const formatPercentage = (value: number) =>
  `${value.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`

const getAttendanceTimestamp = (record: AttendanceRecord) => {
  const [day, month, year] = record.date.split('/').map(Number)
  const [hours, minutes] = record.startTime.split(':').map(Number)
  return new Date(year, month - 1, day, hours, minutes).getTime()
}

const MenuPage = ({
  students,
  assignments,
  attendanceRecords,
  evaluationGrades,
  onLogout,
}: MenuPageProps) => {
  const recentAttendanceRecords = [...attendanceRecords]
    .sort((a, b) => getAttendanceTimestamp(b) - getAttendanceTimestamp(a))
    .slice(0, 3)
  const bestGrades = [...evaluationGrades].sort((a, b) => b.value - a.value).slice(0, 3)
  const lowestGrades = [...evaluationGrades].sort((a, b) => a.value - b.value).slice(0, 3)

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">PRUFODIS Ucentral</div>
        <nav className="sidebar-nav">
          {menuItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="dashboard-content">
        <header className="dashboard-header students-header">
          <div>
            <p className="eyebrow">Panel principal</p>
            <h1>Dashboard</h1>
          </div>
          <button className="secondary-button" onClick={onLogout}>
            Cerrar sesión
          </button>
        </header>

        <section className="dashboard-summary">
          <div className="dashboard-stat-grid" aria-label="Resumen general">
            <article className="dashboard-stat-card">
              <span>Asignaturas totales</span>
              <strong>{assignments.length}</strong>
            </article>
            <article className="dashboard-stat-card">
              <span>Alumnos totales</span>
              <strong>{students.length}</strong>
            </article>
          </div>

          <section className="dashboard-section" aria-labelledby="attendance-summary-title">
            <div className="dashboard-section-heading">
              <div>
                <p className="dashboard-section-eyebrow">Actividad reciente</p>
                <h2 id="attendance-summary-title">Registros de asistencia</h2>
              </div>
              <NavLink to="/menu/asistencia">Ver asistencia</NavLink>
            </div>

            {recentAttendanceRecords.length === 0 ? (
              <p className="dashboard-empty-state">Aún no hay registros de asistencia.</p>
            ) : (
              <ul className="dashboard-record-list">
                {recentAttendanceRecords.map((record) => {
                  const presentCount = record.students.filter((student) => student.present).length
                  const absentCount = record.students.length - presentCount

                  return (
                    <li className="dashboard-record" key={record.id}>
                      <div>
                        <strong>{record.assignmentName}</strong>
                        <span>{record.date} · {record.startTime}–{record.endTime}</span>
                      </div>
                      <div className="dashboard-record-counts">
                        <span className="dashboard-present">{presentCount} presentes</span>
                        <span className="dashboard-absent">{absentCount} ausentes</span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}

            <div className="dashboard-breakdown">
              <h3>Porcentaje de asistencia por asignatura</h3>
              {assignments.length === 0 ? (
                <p className="dashboard-empty-state">Aún no hay asignaturas registradas.</p>
              ) : (
                <ul className="dashboard-breakdown-list">
                  {assignments.map((assignment) => {
                    const attendance = attendanceRecords
                      .filter((record) => record.assignmentId === assignment.id)
                      .flatMap((record) => record.students)
                    const presentCount = attendance.filter((student) => student.present).length
                    const absentCount = attendance.length - presentCount
                    const presentPercentage =
                      attendance.length === 0 ? 0 : (presentCount / attendance.length) * 100
                    const absentPercentage =
                      attendance.length === 0 ? 0 : (absentCount / attendance.length) * 100

                    return (
                      <li className="dashboard-breakdown-row" key={assignment.id}>
                        <div className="dashboard-breakdown-heading">
                          <strong>{assignment.nombre}</strong>
                          <span>{attendance.length === 0 ? 'Sin registros' : `${attendance.length} asistencias`}</span>
                        </div>
                        <div
                          className="dashboard-meter"
                          role="img"
                          aria-label={`${assignment.nombre}: ${formatPercentage(presentPercentage)} presentes, ${formatPercentage(absentPercentage)} ausentes`}
                        >
                          <span
                            className="dashboard-meter-present"
                            style={{ width: `${presentPercentage}%` }}
                          />
                          <span
                            className="dashboard-meter-absent"
                            style={{ width: `${absentPercentage}%` }}
                          />
                        </div>
                        <div className="dashboard-breakdown-values">
                          <span className="dashboard-present">
                            Presentes {formatPercentage(presentPercentage)}
                          </span>
                          <span className="dashboard-absent">
                            Ausentes {formatPercentage(absentPercentage)}
                          </span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </section>

          <section className="dashboard-section" aria-labelledby="evaluations-summary-title">
            <div className="dashboard-section-heading">
              <div>
                <p className="dashboard-section-eyebrow">Resultados</p>
                <h2 id="evaluations-summary-title">Evaluaciones</h2>
              </div>
              <NavLink to="/menu/evaluaciones">Ver evaluaciones</NavLink>
            </div>

            <div className="dashboard-grade-rankings">
              {[{ title: 'Tres mejores notas', grades: bestGrades }, { title: 'Tres peores notas', grades: lowestGrades }].map(
                ({ title, grades }) => (
                  <div className="dashboard-grade-ranking" key={title}>
                    <h3>{title}</h3>
                    {grades.length === 0 ? (
                      <p className="dashboard-empty-state">Aún no hay notas registradas.</p>
                    ) : (
                      <ol className="dashboard-grade-list">
                        {grades.map((grade) => {
                          const assignmentName =
                            assignments.find((assignment) => assignment.id === grade.assignmentId)?.nombre ??
                            'Asignatura no disponible'

                          return (
                            <li key={grade.id}>
                              <strong className={grade.value < 4 ? 'dashboard-failing-grade' : 'dashboard-passing-grade'}>
                                {formatGrade(grade.value)}
                              </strong>
                              <span>{studentFullName(grade.studentId, students)}</span>
                              <small>{assignmentName}</small>
                            </li>
                          )
                        })}
                      </ol>
                    )}
                  </div>
                ),
              )}
            </div>

            <div className="dashboard-breakdown">
              <h3>Porcentaje de notas por asignatura</h3>
              {assignments.length === 0 ? (
                <p className="dashboard-empty-state">Aún no hay asignaturas registradas.</p>
              ) : (
                <ul className="dashboard-breakdown-list">
                  {assignments.map((assignment) => {
                    const grades = evaluationGrades.filter(
                      (grade) => grade.assignmentId === assignment.id,
                    )
                    const passingCount = grades.filter((grade) => grade.value >= 4).length
                    const failingCount = grades.length - passingCount
                    const passingPercentage =
                      grades.length === 0 ? 0 : (passingCount / grades.length) * 100
                    const failingPercentage =
                      grades.length === 0 ? 0 : (failingCount / grades.length) * 100

                    return (
                      <li className="dashboard-breakdown-row" key={assignment.id}>
                        <div className="dashboard-breakdown-heading">
                          <strong>{assignment.nombre}</strong>
                          <span>{grades.length === 0 ? 'Sin notas' : `${grades.length} notas`}</span>
                        </div>
                        <div
                          className="dashboard-meter"
                          role="img"
                          aria-label={`${assignment.nombre}: ${formatPercentage(passingPercentage)} aprobativas, ${formatPercentage(failingPercentage)} reprobativas`}
                        >
                          <span
                            className="dashboard-meter-passing"
                            style={{ width: `${passingPercentage}%` }}
                          />
                          <span
                            className="dashboard-meter-failing"
                            style={{ width: `${failingPercentage}%` }}
                          />
                        </div>
                        <div className="dashboard-breakdown-values">
                          <span className="dashboard-passing-grade">
                            Aprobativas {formatPercentage(passingPercentage)}
                          </span>
                          <span className="dashboard-failing-grade">
                            Reprobativas {formatPercentage(failingPercentage)}
                          </span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </section>
        </section>
      </main>
    </div>
  )
}

export default MenuPage
