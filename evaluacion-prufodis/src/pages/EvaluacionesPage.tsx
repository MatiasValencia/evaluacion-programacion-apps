import { useState, type Dispatch, type KeyboardEvent, type SetStateAction } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import type { Student } from './AlumnosPage'
import type { Assignment } from './AsignaturasPage'

export type EvaluationGrade = {
  id: string
  assignmentId: string
  studentId: number
  value: number
}

type EvaluacionesPageProps = {
  students: Student[]
  assignments: Assignment[]
  grades: EvaluationGrade[]
  setGrades: Dispatch<SetStateAction<EvaluationGrade[]>>
  onLogout: () => void
}

type GradeInputTarget = {
  studentId: number
  gradeId: string | null
}

const menuItems = [
  { to: '/menu/alumnos', label: 'Alumnos' },
  { to: '/menu/asignaturas', label: 'Asignaturas' },
  { to: '/menu/asistencia', label: 'Asistencia' },
  { to: '/menu/evaluaciones', label: 'Evaluaciones' },
]

const studentFullName = (student: Student) =>
  `${student.nombres} ${student.primerApellido} ${student.segundoApellido}`.trim()

const formatGrade = (value: number) => value.toFixed(1).replace('.', ',')

const isValidGrade = (value: string) => /^(?:[1-6][,.]\d|7[,.]0)$/.test(value.trim())

const EvaluacionesPage = ({
  students,
  assignments,
  grades,
  setGrades,
  onLogout,
}: EvaluacionesPageProps) => {
  const navigate = useNavigate()
  const [isRegistering, setIsRegistering] = useState(false)
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('')
  const [expandedAssignmentId, setExpandedAssignmentId] = useState<string | null>(null)
  const [draftGrades, setDraftGrades] = useState<EvaluationGrade[]>([])
  const [activeGradeId, setActiveGradeId] = useState<string | null>(null)
  const [inputTarget, setInputTarget] = useState<GradeInputTarget | null>(null)
  const [gradeInput, setGradeInput] = useState('')
  const [validationMessage, setValidationMessage] = useState('')

  const assignedStudents = students.filter((student) =>
    assignments
      .find((assignment) => assignment.id === selectedAssignmentId)
      ?.studentIds.includes(student.id),
  )

  const openRegistration = () => {
    setDraftGrades(grades.map((grade) => ({ ...grade })))
    setSelectedAssignmentId('')
    setActiveGradeId(null)
    setInputTarget(null)
    setGradeInput('')
    setValidationMessage('')
    setIsRegistering(true)
  }

  const discardChanges = () => {
    setIsRegistering(false)
    setSelectedAssignmentId('')
    setInputTarget(null)
    setActiveGradeId(null)
    setValidationMessage('')
  }

  const saveChanges = () => {
    if (inputTarget) {
      setValidationMessage('Presiona Enter para guardar la nota antes de guardar los cambios.')
      return
    }
    setGrades(draftGrades)
    discardChanges()
  }

  const startAddingGrade = (studentId: number) => {
    setInputTarget({ studentId, gradeId: null })
    setGradeInput('')
    setValidationMessage('')
    setActiveGradeId(null)
  }

  const startEditingGrade = (grade: EvaluationGrade) => {
    setInputTarget({ studentId: grade.studentId, gradeId: grade.id })
    setGradeInput(formatGrade(grade.value))
    setValidationMessage('')
    setActiveGradeId(null)
  }

  const cancelGradeInput = () => {
    setInputTarget(null)
    setGradeInput('')
    setValidationMessage('')
  }

  const saveGradeInput = () => {
    if (!inputTarget || !isValidGrade(gradeInput)) {
      setValidationMessage('Ingresa una nota decimal entre 1,0 y 7,0.')
      return
    }

    const value = Number(gradeInput.trim().replace(',', '.'))
    if (inputTarget.gradeId) {
      setDraftGrades((currentGrades) =>
        currentGrades.map((grade) =>
          grade.id === inputTarget.gradeId ? { ...grade, value } : grade,
        ),
      )
    } else {
      setDraftGrades((currentGrades) => [
        ...currentGrades,
        {
          id: crypto.randomUUID(),
          assignmentId: selectedAssignmentId,
          studentId: inputTarget.studentId,
          value,
        },
      ])
    }

    setInputTarget(null)
    setGradeInput('')
    setValidationMessage('')
  }

  const handleGradeInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      saveGradeInput()
    }
    if (event.key === 'Escape') cancelGradeInput()
  }

  const deleteGrade = (gradeId: string) => {
    setDraftGrades((currentGrades) => currentGrades.filter((grade) => grade.id !== gradeId))
    setActiveGradeId(null)
  }

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">PRUFODIS Ucentral</div>
        <nav className="sidebar-nav" aria-label="Navegación principal">
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
            <p className="eyebrow">Administración</p>
            <h1>{isRegistering ? 'Registrar notas' : 'Evaluaciones'}</h1>
          </div>
          <div className="dashboard-header-actions">
            <button
              className="secondary-button students-back-button"
              onClick={() => navigate('/menu')}
            >
              Volver al dashboard
            </button>
            <button className="secondary-button" onClick={onLogout}>
              Cerrar sesión
            </button>
          </div>
        </header>

        {isRegistering ? (
          <section className="students-panel" aria-labelledby="grade-entry-title">
            <div className="students-list-heading">
              <div>
                <h2 id="grade-entry-title">Registro de notas</h2>
                <p>Selecciona una asignatura y agrega las notas de sus estudiantes.</p>
              </div>
            </div>

            <label className="grade-assignment-field">
              Asignatura
              <select
                value={selectedAssignmentId}
                onChange={(event) => {
                  setSelectedAssignmentId(event.target.value)
                  setInputTarget(null)
                  setActiveGradeId(null)
                  setValidationMessage('')
                }}
              >
                <option value="">Selecciona una asignatura</option>
                {assignments.map((assignment) => (
                  <option key={assignment.id} value={assignment.id}>
                    {assignment.nombre}
                  </option>
                ))}
              </select>
            </label>

            {!selectedAssignmentId ? (
              assignments.length === 0 ? (
                <div className="students-empty-state">
                  <p>Aún no hay asignaturas registradas.</p>
                  <span>
                    <NavLink to="/menu/asignaturas">Registra una asignatura</NavLink> antes de
                    ingresar notas.
                  </span>
                </div>
              ) : null
            ) : assignedStudents.length === 0 ? (
              <div className="students-empty-state">
                <p>Esta asignatura no tiene estudiantes vinculados.</p>
                <span>Vincula estudiantes desde la página de Asignaturas.</span>
              </div>
            ) : (
              <div className="grade-entry-list">
                {assignedStudents.map((student) => {
                  const studentGrades = draftGrades.filter(
                    (grade) =>
                      grade.assignmentId === selectedAssignmentId &&
                      grade.studentId === student.id,
                  )

                  return (
                    <div className="grade-entry-row" key={student.id}>
                      <span className="student-name">{studentFullName(student)}</span>
                      <div className="grade-entry-actions">
                        {studentGrades.map((grade) => (
                          <div className="grade-control" key={grade.id}>
                            <button
                              className={`grade-chip ${grade.value < 4 ? 'failing' : 'passing'}`}
                              aria-expanded={activeGradeId === grade.id}
                              onClick={() =>
                                setActiveGradeId(
                                  activeGradeId === grade.id ? null : grade.id,
                                )
                              }
                            >
                              {formatGrade(grade.value)}
                            </button>
                            {activeGradeId === grade.id && (
                              <div className="grade-options">
                                <button
                                  className="student-action-button"
                                  onClick={() => startEditingGrade(grade)}
                                >
                                  Editar nota
                                </button>
                                <button
                                  className="student-action-button student-delete-button"
                                  onClick={() => deleteGrade(grade.id)}
                                >
                                  Eliminar nota
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                        <button
                          className="grade-add-button"
                          aria-label={`Agregar nota a ${studentFullName(student)}`}
                          onClick={() => startAddingGrade(student.id)}
                        >
                          +
                        </button>
                        {inputTarget?.studentId === student.id && (
                          <input
                            autoFocus
                            className="grade-input"
                            aria-label={
                              inputTarget.gradeId === null ? 'Nueva nota' : 'Editar nota'
                            }
                            inputMode="decimal"
                            placeholder="Ej. 5,5"
                            value={gradeInput}
                            onChange={(event) => {
                              setGradeInput(event.target.value)
                              setValidationMessage('')
                            }}
                            onKeyDown={handleGradeInputKeyDown}
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {validationMessage && (
              <p className="assignment-validation" role="alert">
                {validationMessage}
              </p>
            )}
            <div className="student-form-actions grade-form-actions">
              <button className="primary-button" onClick={saveChanges}>
                Guardar notas
              </button>
              <button className="secondary-button" onClick={discardChanges}>
                Descartar cambios
              </button>
            </div>
          </section>
        ) : (
          <section className="students-panel" aria-labelledby="evaluations-list-title">
            <div className="students-list-heading">
              <div>
                <h2 id="evaluations-list-title">Lista de evaluaciones</h2>
                <p>Consulta las notas y promedios por asignatura.</p>
              </div>
              <button className="primary-button" onClick={openRegistration}>
                <span aria-hidden="true">+</span> Registrar notas
              </button>
            </div>

            {grades.length === 0 ? (
              <div className="students-empty-state">
                <p>Aún no hay evaluaciones registradas.</p>
                <span>Registra notas para consultar los resultados por asignatura.</span>
              </div>
            ) : (
              <ul className="students-list">
                {assignments
                  .filter((assignment) =>
                    grades.some((grade) => grade.assignmentId === assignment.id),
                  )
                  .map((assignment) => {
                    const isExpanded = expandedAssignmentId === assignment.id
                    const assignmentStudents = students.filter((student) =>
                      assignment.studentIds.includes(student.id),
                    )

                    return (
                      <li className="assignment-row" key={assignment.id}>
                        <div className="assignment-row-heading">
                          <button
                            className="assignment-expand-button"
                            aria-expanded={isExpanded}
                            onClick={() =>
                              setExpandedAssignmentId(isExpanded ? null : assignment.id)
                            }
                          >
                            <span
                              className={`assignment-chevron ${isExpanded ? 'expanded' : ''}`}
                              aria-hidden="true"
                            >
                              ›
                            </span>
                            <span>{assignment.nombre}</span>
                          </button>
                        </div>
                        {isExpanded && (
                          <div className="evaluation-table-wrapper">
                            <table className="evaluation-table">
                              <thead>
                                <tr>
                                  <th scope="col">Estudiante</th>
                                  <th scope="col">Notas</th>
                                  <th scope="col">Promedio</th>
                                </tr>
                              </thead>
                              <tbody>
                                {assignmentStudents.map((student) => {
                                  const studentGrades = grades.filter(
                                    (grade) =>
                                      grade.assignmentId === assignment.id &&
                                      grade.studentId === student.id,
                                  )
                                  const average =
                                    studentGrades.length === 0
                                      ? null
                                      : studentGrades.reduce(
                                          (total, grade) => total + grade.value,
                                          0,
                                        ) / studentGrades.length

                                  return (
                                    <tr key={student.id}>
                                      <th scope="row">{studentFullName(student)}</th>
                                      <td>
                                        {studentGrades.length === 0 ? (
                                          '—'
                                        ) : (
                                          <div className="evaluation-grade-list">
                                            {studentGrades.map((grade) => (
                                              <span
                                                className={`grade-chip ${grade.value < 4 ? 'failing' : 'passing'}`}
                                                key={grade.id}
                                              >
                                                {formatGrade(grade.value)}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </td>
                                      <td>
                                        {average === null
                                          ? '—'
                                          : formatGrade(Number(average.toFixed(1)))}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </li>
                    )
                  })}
              </ul>
            )}
          </section>
        )}
      </main>
    </div>
  )
}

export default EvaluacionesPage
