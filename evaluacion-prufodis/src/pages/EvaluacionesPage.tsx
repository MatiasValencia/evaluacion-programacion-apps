import { useState, type KeyboardEvent } from 'react'
import { NavLink } from 'react-router-dom'
import DashboardSidebar from '../components/DashboardSidebar'
import { matchesSearch } from '../utils/search'
import type { Student } from './AlumnosPage'
import type { Assignment } from './AsignaturasPage'

export type EvaluationGrade = {
  id: string
  assignmentId: string
  studentId: number
  value: number
  gradeNumber?: number
}

type EvaluacionesPageProps = {
  students: Student[]
  assignments: Assignment[]
  grades: EvaluationGrade[]
  onGradesSave: (
    previousGrades: EvaluationGrade[],
    nextGrades: EvaluationGrade[],
  ) => Promise<void>
  onLogout: () => void
}

type GradeInputTarget = {
  studentId: number
  gradeNumber: number
  gradeId: string | null
}

const studentFullName = (student: Student) =>
  `${student.nombres} ${student.primerApellido} ${student.segundoApellido}`.trim()

const formatGrade = (value: number) => value.toFixed(1).replace('.', ',')

const formatWeight = (value: number) =>
  `${value.toLocaleString('es-CL', { maximumFractionDigits: 2 })}%`

const isValidGrade = (value: string) => /^(?:[1-6][,.]\d|7[,.]0)$/.test(value.trim())

const getGradeNumber = (grade: EvaluationGrade, studentGrades: EvaluationGrade[]) =>
  grade.gradeNumber ?? studentGrades.indexOf(grade) + 1

const getAssignmentGradeCount = (
  assignment: Assignment,
  grades: EvaluationGrade[],
) => {
  if (assignment.gradeCount !== undefined) return assignment.gradeCount

  const assignmentGrades = grades.filter((grade) => grade.assignmentId === assignment.id)
  return Math.max(
    1,
    ...assignmentGrades.map((grade) => {
      const studentGrades = assignmentGrades.filter(
        (item) => item.studentId === grade.studentId,
      )
      return getGradeNumber(grade, studentGrades)
    }),
  )
}

const getAssignmentWeights = (assignment: Assignment, gradeCount: number) =>
  assignment.gradeWeights?.length === gradeCount
    ? assignment.gradeWeights
    : Array.from({ length: gradeCount }, () => 100 / gradeCount)

const EvaluacionesPage = ({
  students,
  assignments,
  grades,
  onGradesSave,
  onLogout,
}: EvaluacionesPageProps) => {
  const [isRegistering, setIsRegistering] = useState(false)
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('')
  const [expandedAssignmentId, setExpandedAssignmentId] = useState<string | null>(null)
  const [baseGrades, setBaseGrades] = useState<EvaluationGrade[]>([])
  const [draftGrades, setDraftGrades] = useState<EvaluationGrade[]>([])
  const [activeGradeId, setActiveGradeId] = useState<string | null>(null)
  const [inputTarget, setInputTarget] = useState<GradeInputTarget | null>(null)
  const [gradeInput, setGradeInput] = useState('')
  const [validationMessage, setValidationMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [assignmentSearch, setAssignmentSearch] = useState('')
  const [studentSearch, setStudentSearch] = useState('')

  const assignedStudents = students.filter((student) =>
    assignments
      .find((assignment) => assignment.id === selectedAssignmentId)
      ?.studentIds.includes(student.id),
  )
  const selectedAssignment = assignments.find(
    (assignment) => assignment.id === selectedAssignmentId,
  )
  const selectedGradeCount =
    selectedAssignment === undefined
      ? 0
      : getAssignmentGradeCount(selectedAssignment, draftGrades)
  const selectedWeights =
    selectedAssignment === undefined
      ? []
      : getAssignmentWeights(selectedAssignment, selectedGradeCount)

  const filteredAssignments = assignments.filter(
    (assignment) =>
      matchesSearch(assignment.nombre, assignmentSearch) &&
      grades.some((grade) => {
        if (grade.assignmentId !== assignment.id) return false
        if (studentSearch.trim() === '') return true
        const student = students.find((item) => item.id === grade.studentId)
        return student !== undefined && matchesSearch(studentFullName(student), studentSearch)
      }),
  )

  const openRegistration = () => {
    const initialGrades = grades.map((grade) => ({ ...grade }))
    setBaseGrades(initialGrades)
    setDraftGrades(initialGrades.map((grade) => ({ ...grade })))
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

  const saveChanges = async () => {
    if (isSaving) return
    if (inputTarget) {
      setValidationMessage('Presiona Enter para guardar la nota antes de guardar los cambios.')
      return
    }

    setIsSaving(true)
    try {
      await onGradesSave(baseGrades, draftGrades)
      discardChanges()
    } catch (error: unknown) {
      console.error('No se pudieron guardar las evaluaciones en Firebase.', error)
      setValidationMessage(
        error instanceof Error ? error.message : 'No se pudieron guardar las evaluaciones.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const startAddingGrade = (studentId: number, gradeNumber: number) => {
    setInputTarget({ studentId, gradeNumber, gradeId: null })
    setGradeInput('')
    setValidationMessage('')
    setActiveGradeId(null)
  }

  const startEditingGrade = (grade: EvaluationGrade) => {
    const studentGrades = draftGrades.filter(
      (item) =>
        item.assignmentId === grade.assignmentId && item.studentId === grade.studentId,
    )
    setInputTarget({
      studentId: grade.studentId,
      gradeNumber: getGradeNumber(grade, studentGrades),
      gradeId: grade.id,
    })
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
          grade.id === inputTarget.gradeId
            ? { ...grade, value, gradeNumber: inputTarget.gradeNumber }
            : grade,
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
          gradeNumber: inputTarget.gradeNumber,
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
      <DashboardSidebar onLogout={onLogout} />

      <main className="dashboard-content">
        <header className="dashboard-header students-header">
          <div>
            <p className="eyebrow">Administración</p>
            <h1>{isRegistering ? 'Registrar notas' : 'Evaluaciones'}</h1>
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
              <div className="evaluation-table-wrapper grade-entry-table-wrapper">
                <table className="evaluation-table grade-entry-table">
                  <thead>
                    <tr>
                      <th scope="col">Estudiante</th>
                      {Array.from({ length: selectedGradeCount }, (_, index) => (
                        <th scope="col" key={index}>
                          Nota {index + 1}
                          <span className="grade-weight-label">
                            {formatWeight(selectedWeights[index])}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {assignedStudents.map((student) => {
                      const studentGrades = draftGrades.filter(
                        (grade) =>
                          grade.assignmentId === selectedAssignmentId &&
                          grade.studentId === student.id,
                      )

                      return (
                        <tr key={student.id}>
                          <th scope="row">{studentFullName(student)}</th>
                          {Array.from({ length: selectedGradeCount }, (_, index) => {
                            const gradeNumber = index + 1
                            const grade = studentGrades.find(
                              (item) => getGradeNumber(item, studentGrades) === gradeNumber,
                            )
                            const isEditingThisCell =
                              inputTarget?.studentId === student.id &&
                              inputTarget.gradeNumber === gradeNumber

                            return (
                              <td key={gradeNumber}>
                                {isEditingThisCell ? (
                                  <input
                                    autoFocus
                                    className="grade-input"
                                    aria-label={`Nota ${gradeNumber} de ${studentFullName(student)}`}
                                    inputMode="decimal"
                                    placeholder="Ej. 5,5"
                                    value={gradeInput}
                                    onChange={(event) => {
                                      setGradeInput(event.target.value)
                                      setValidationMessage('')
                                    }}
                                    onKeyDown={handleGradeInputKeyDown}
                                  />
                                ) : grade ? (
                                  <div className="grade-control">
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
                                ) : (
                                  <button
                                    className="grade-add-button"
                                    aria-label={`Agregar nota ${gradeNumber} a ${studentFullName(student)}`}
                                    onClick={() => startAddingGrade(student.id, gradeNumber)}
                                  >
                                    +
                                  </button>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {validationMessage && (
              <p className="assignment-validation" role="alert">
                {validationMessage}
              </p>
            )}
            <div className="student-form-actions grade-form-actions">
              <button className="primary-button" onClick={saveChanges} disabled={isSaving}>
                Guardar notas
              </button>
              <button className="secondary-button" onClick={discardChanges} disabled={isSaving}>
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

            {grades.length > 0 && (
              <div className="list-filters">
                <label className="search-filter">
                  Buscar asignatura
                  <input
                    type="search"
                    placeholder="Nombre de la asignatura"
                    value={assignmentSearch}
                    onChange={(event) => setAssignmentSearch(event.target.value)}
                  />
                </label>
                <label className="search-filter">
                  Buscar alumno
                  <input
                    type="search"
                    placeholder="Nombre o apellido"
                    value={studentSearch}
                    onChange={(event) => setStudentSearch(event.target.value)}
                  />
                </label>
              </div>
            )}

            {grades.length === 0 ? (
              <div className="students-empty-state">
                <p>Aún no hay evaluaciones registradas.</p>
                <span>Registra notas para consultar los resultados por asignatura.</span>
              </div>
            ) : filteredAssignments.length === 0 ? (
              <div className="students-empty-state" role="status">
                <p>No se encontraron evaluaciones.</p>
                <span>Prueba con otro nombre de asignatura o alumno.</span>
              </div>
            ) : (
              <ul className="students-list">
                {filteredAssignments.map((assignment) => {
                    const isExpanded = expandedAssignmentId === assignment.id
                    const assignmentStudents = students.filter((student) => {
                      if (!assignment.studentIds.includes(student.id)) return false
                      if (studentSearch.trim() === '') return true
                      return (
                        grades.some(
                          (grade) =>
                            grade.assignmentId === assignment.id &&
                            grade.studentId === student.id,
                        ) && matchesSearch(studentFullName(student), studentSearch)
                      )
                    })

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
                                  {Array.from(
                                    { length: getAssignmentGradeCount(assignment, grades) },
                                    (_, index) => (
                                      <th scope="col" key={index}>
                                        Nota {index + 1}
                                        <span className="grade-weight-label">
                                          {formatWeight(
                                            getAssignmentWeights(
                                              assignment,
                                              getAssignmentGradeCount(assignment, grades),
                                            )[index],
                                          )}
                                        </span>
                                      </th>
                                    ),
                                  )}
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
                                  const gradeCount = getAssignmentGradeCount(
                                    assignment,
                                    grades,
                                  )
                                  const assignmentWeights = getAssignmentWeights(
                                    assignment,
                                    gradeCount,
                                  )
                                  const gradesByNumber = Array.from(
                                    { length: gradeCount },
                                    (_, index) =>
                                      studentGrades.find(
                                        (grade) =>
                                          getGradeNumber(grade, studentGrades) === index + 1,
                                      ),
                                  )
                                  const completedWeight = gradesByNumber.reduce(
                                    (total, grade, index) =>
                                      total + (grade ? assignmentWeights[index] : 0),
                                    0,
                                  )
                                  const average =
                                    completedWeight === 0
                                      ? null
                                      : gradesByNumber.reduce(
                                          (total, grade, index) =>
                                            total +
                                            (grade?.value ?? 0) * assignmentWeights[index],
                                          0,
                                        ) / completedWeight

                                  return (
                                    <tr key={student.id}>
                                      <th scope="row">{studentFullName(student)}</th>
                                      {Array.from({ length: gradeCount }, (_, index) => {
                                        const grade = studentGrades.find(
                                          (item) =>
                                            getGradeNumber(item, studentGrades) === index + 1,
                                        )
                                        return (
                                          <td key={index}>
                                            {grade ? (
                                              <span
                                                className={`grade-chip ${grade.value < 4 ? 'failing' : 'passing'}`}
                                              >
                                                {formatGrade(grade.value)}
                                              </span>
                                            ) : (
                                              '—'
                                            )}
                                          </td>
                                        )
                                      })}
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
