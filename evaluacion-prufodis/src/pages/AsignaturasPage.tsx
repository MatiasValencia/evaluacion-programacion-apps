import { useState, type FormEvent } from 'react'
import DashboardSidebar from '../components/DashboardSidebar'
import { matchesSearch } from '../utils/search'
import type { Student } from './AlumnosPage'
import type { EvaluationGrade } from './EvaluacionesPage'

export type Assignment = {
  id: string
  nombre: string
  studentIds: number[]
  gradeCount?: number
  gradeWeights?: number[]
}

type AssignmentForm = {
  nombre: string
  studentIds: number[]
  gradeCount: string
  gradeWeights: string[]
}

type AsignaturasPageProps = {
  students: Student[]
  assignments: Assignment[]
  grades: EvaluationGrade[]
  canEdit: boolean
  onAssignmentSave: (assignment: Assignment) => Promise<void>
  onAssignmentDelete: (assignmentId: string) => Promise<void>
  onLogout: () => void
}

const studentFullName = (student: Student) =>
  `${student.nombres} ${student.primerApellido} ${student.segundoApellido}`.trim()

const equalWeights = (count: number) => {
  const weight = Number((100 / count).toFixed(6))
  const weights = Array.from({ length: count }, () => weight)
  weights[count - 1] = Number((100 - weight * (count - 1)).toFixed(6))
  return weights.map(String)
}

const getStoredGradeCount = (assignment: Assignment, grades: EvaluationGrade[]) => {
  if (assignment.gradeCount !== undefined) return assignment.gradeCount

  const assignmentGrades = grades.filter((grade) => grade.assignmentId === assignment.id)
  const numberedCount = assignmentGrades.reduce(
    (maximum, grade) => Math.max(maximum, grade.gradeNumber ?? 0),
    0,
  )
  const studentCounts = new Map<number, number>()
  assignmentGrades.forEach((grade) => {
    studentCounts.set(grade.studentId, (studentCounts.get(grade.studentId) ?? 0) + 1)
  })
  return Math.max(1, numberedCount, ...studentCounts.values())
}

const AsignaturasPage = ({
  students,
  assignments,
  grades,
  canEdit,
  onAssignmentSave,
  onAssignmentDelete,
  onLogout,
}: AsignaturasPageProps) => {
  const [form, setForm] = useState<AssignmentForm>({
    nombre: '',
    studentIds: [],
    gradeCount: '1',
    gradeWeights: ['100'],
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const [validationMessage, setValidationMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [assignmentSearch, setAssignmentSearch] = useState('')
  const [studentSearch, setStudentSearch] = useState('')

  const filteredAssignments = assignments.filter((assignment) => {
    const matchesAssignment = matchesSearch(assignment.nombre, assignmentSearch)
    const matchesStudent = students
      .filter((student) => assignment.studentIds.includes(student.id))
      .some((student) => matchesSearch(studentFullName(student), studentSearch))

    return matchesAssignment && (studentSearch.trim() === '' || matchesStudent)
  })

  const openNewForm = () => {
    if (!canEdit) return
    setForm({ nombre: '', studentIds: [], gradeCount: '1', gradeWeights: ['100'] })
    setEditingId(null)
    setValidationMessage('')
    setIsFormOpen(true)
  }

  const openEditForm = (assignment: Assignment) => {
    if (!canEdit) return
    const gradeCount = getStoredGradeCount(assignment, grades)
    setForm({
      nombre: assignment.nombre,
      studentIds: assignment.studentIds,
      gradeCount: String(gradeCount),
      gradeWeights: assignment.gradeWeights?.length === gradeCount
        ? assignment.gradeWeights.map(String)
        : equalWeights(gradeCount),
    })
    setEditingId(assignment.id)
    setValidationMessage('')
    setConfirmingDeleteId(null)
    setIsFormOpen(true)
  }

  const discardChanges = () => {
    setIsFormOpen(false)
    setForm({ nombre: '', studentIds: [], gradeCount: '1', gradeWeights: ['100'] })
    setEditingId(null)
    setValidationMessage('')
  }

  const saveAssignment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canEdit || isSaving) return
    const nombre = form.nombre.trim()

    if (!nombre) {
      setValidationMessage('Ingresa el nombre de la asignatura.')
      return
    }

    if (form.studentIds.length === 0) {
      setValidationMessage('Selecciona al menos un alumno para la asignatura.')
      return
    }

    const gradeCount = Number(form.gradeCount)
    if (!Number.isSafeInteger(gradeCount) || gradeCount < 1) {
      setValidationMessage('Indica una cantidad válida de notas (al menos 1).')
      return
    }

    const gradeWeights = form.gradeWeights.map((weight) =>
      weight.trim() === '' ? Number.NaN : Number(weight.trim().replace(',', '.')),
    )
    if (
      gradeWeights.length !== gradeCount ||
      gradeWeights.some((weight) => !Number.isFinite(weight) || weight < 0 || weight > 100)
    ) {
      setValidationMessage('Cada ponderación debe ser un porcentaje válido entre 0 y 100.')
      return
    }

    const totalWeight = gradeWeights.reduce((total, weight) => total + weight, 0)
    if (Math.abs(totalWeight - 100) > 0.00000001) {
      setValidationMessage(
        `Las ponderaciones deben sumar 100%. Actualmente suman ${totalWeight.toLocaleString('es-CL')}%.`,
      )
      return
    }

    const currentAssignment = assignments.find((item) => item.id === editingId)
    const previousGradeCount =
      currentAssignment === undefined ? 1 : getStoredGradeCount(currentAssignment, grades)
    if (gradeCount < previousGradeCount) {
      const gradesByStudent = new Map<number, EvaluationGrade[]>()
      grades
        .filter((grade) => grade.assignmentId === editingId)
        .forEach((grade) => {
          const studentGrades = gradesByStudent.get(grade.studentId) ?? []
          studentGrades.push(grade)
          gradesByStudent.set(grade.studentId, studentGrades)
        })
      const wouldHideGrades = [...gradesByStudent.values()].some((studentGrades) =>
        studentGrades.some((grade, index) => (grade.gradeNumber ?? index + 1) > gradeCount),
      )
      if (wouldHideGrades) {
        setValidationMessage(
          'No se puede reducir la cantidad de notas porque hay evaluaciones registradas en esas posiciones.',
        )
        return
      }
    }

    const assignment: Assignment = {
      id: editingId ?? crypto.randomUUID(),
      nombre,
      studentIds: form.studentIds,
      gradeCount,
      gradeWeights,
    }

    setIsSaving(true)
    try {
      await onAssignmentSave(assignment)
      discardChanges()
    } catch (error: unknown) {
      console.error('No se pudo guardar la asignatura en Firebase.', error)
      setValidationMessage(
        error instanceof Error ? error.message : 'No se pudo guardar la asignatura.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const toggleStudent = (studentId: number) => {
    setForm((currentForm) => ({
      ...currentForm,
      studentIds: currentForm.studentIds.includes(studentId)
        ? currentForm.studentIds.filter((id) => id !== studentId)
        : [...currentForm.studentIds, studentId],
    }))
    setValidationMessage('')
  }

  const deleteAssignment = async (id: string) => {
    if (!canEdit) return
    try {
      await onAssignmentDelete(id)
      setConfirmingDeleteId(null)
      if (expandedId === id) setExpandedId(null)
    } catch (error: unknown) {
      console.error('No se pudo eliminar la asignatura en Firebase.', error)
      setValidationMessage(
        error instanceof Error ? error.message : 'No se pudo eliminar la asignatura.',
      )
    }
  }

  return (
    <div className="dashboard-shell">
      <DashboardSidebar onLogout={onLogout} />

      <main className="dashboard-content">
        <header className="dashboard-header students-header">
          <div>
            <p className="eyebrow">{canEdit ? 'Administración' : 'Consulta académica'}</p>
            <h1>
              {isFormOpen
                ? editingId === null
                  ? 'Agregar asignatura'
                  : 'Editar asignatura'
                : 'Asignaturas'}
            </h1>
          </div>
        </header>

        {canEdit && isFormOpen ? (
          <section className="students-panel" aria-labelledby="assignment-form-title">
            <h2 id="assignment-form-title">
              {editingId === null ? 'Datos de la asignatura' : 'Actualiza la asignatura'}
            </h2>
            <form className="assignment-form" onSubmit={saveAssignment}>
              <label className="assignment-name-field">
                Nombre de la asignatura
                <input
                  autoComplete="off"
                  name="nombre"
                  required
                  value={form.nombre}
                  onChange={(event) => {
                    setForm((currentForm) => ({ ...currentForm, nombre: event.target.value }))
                    setValidationMessage('')
                  }}
                />
              </label>

                      <div className="assignment-grade-settings">
                        <label className="assignment-name-field">
                          Cantidad de notas
                          <input
                            type="number"
                            name="gradeCount"
                            min="1"
                            step="1"
                            required
                            value={form.gradeCount}
                            onChange={(event) => {
                              const nextCount = event.target.value
                              const parsedCount = Number(nextCount)
                              setForm((currentForm) => ({
                                ...currentForm,
                                gradeCount: nextCount,
                                gradeWeights:
                                  Number.isSafeInteger(parsedCount) && parsedCount > 0
                                    ? equalWeights(parsedCount)
                                    : currentForm.gradeWeights,
                              }))
                              setValidationMessage('')
                            }}
                          />
                        </label>
                        <fieldset className="assignment-weight-picker">
                          <legend>Ponderación de cada nota (%)</legend>
                          <div className="assignment-weight-list">
                            {form.gradeWeights.map((weight, index) => (
                              <label className="assignment-weight-field" key={index}>
                                Nota {index + 1}
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  aria-label={`Ponderación de la nota ${index + 1}`}
                                  value={weight}
                                  onChange={(event) => {
                                    const nextWeights = [...form.gradeWeights]
                                    nextWeights[index] = event.target.value
                                    setForm((currentForm) => ({
                                      ...currentForm,
                                      gradeWeights: nextWeights,
                                    }))
                                    setValidationMessage('')
                                  }}
                                />
                              </label>
                            ))}
                          </div>
                          <p className="assignment-weight-hint">
                            Total:{' '}
                            {form.gradeWeights
                              .reduce((total, weight) => {
                                const parsedWeight = Number(weight.trim().replace(',', '.'))
                                return Number.isFinite(parsedWeight) ? total + parsedWeight : total
                              }, 0)
                              .toLocaleString('es-CL')}
                            %
                          </p>
                        </fieldset>
                      </div>

                      <fieldset className="assignment-student-picker">
                <legend>Alumnos de la asignatura</legend>
                {students.length === 0 ? (
                  <p className="assignment-no-students">
                    Primero debes agregar alumnos en la página de Alumnos.
                  </p>
                ) : (
                  <ul className="assignment-student-list">
                    {students.map((student) => (
                      <li key={student.id}>
                        <label>
                          <input
                            type="checkbox"
                            checked={form.studentIds.includes(student.id)}
                            onChange={() => toggleStudent(student.id)}
                          />
                          <span>{studentFullName(student)}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </fieldset>

              {validationMessage && (
                <p className="assignment-validation" role="alert">
                  {validationMessage}
                </p>
              )}
              <div className="student-form-actions">
                <button className="primary-button" type="submit" disabled={isSaving}>
                  {editingId === null ? 'Agregar asignatura' : 'Guardar cambios'}
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={discardChanges}
                  disabled={isSaving}
                >
                  Descartar cambios
                </button>
              </div>
            </form>
          </section>
        ) : (
          <section className="students-panel" aria-labelledby="assignments-list-title">
            {validationMessage && (
              <p className="assignment-validation" role="alert">
                {validationMessage}
              </p>
            )}
            <div className="students-list-heading">
              <div>
                <h2 id="assignments-list-title">Lista de asignaturas</h2>
                <p>{canEdit ? 'Administra las asignaturas y los alumnos vinculados.' : 'Consulta las asignaturas y los alumnos vinculados.'}</p>
              </div>
              {canEdit && (
                <button className="primary-button" onClick={openNewForm}>
                  <span aria-hidden="true">+</span> Agregar asignatura
                </button>
              )}
            </div>

            {assignments.length > 0 && (
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

            {assignments.length === 0 ? (
              <div className="students-empty-state">
                <p>Aún no hay asignaturas registradas.</p>
                <span>
                  {canEdit
                    ? 'Agrega una asignatura para comenzar a gestionar sus alumnos.'
                    : 'No hay asignaturas disponibles para consultar.'}
                </span>
              </div>
            ) : filteredAssignments.length === 0 ? (
              <div className="students-empty-state" role="status">
                <p>No se encontraron asignaturas.</p>
                <span>Prueba con otro nombre de asignatura o alumno.</span>
              </div>
            ) : (
              <ul className="students-list">
                {filteredAssignments.map((assignment) => {
                  const assignedStudents = students.filter((student) =>
                    assignment.studentIds.includes(student.id),
                  )
                  const isExpanded = expandedId === assignment.id

                  return (
                    <li className="assignment-row" key={assignment.id}>
                      <div className="assignment-row-heading">
                        <button
                          className="assignment-expand-button"
                          aria-expanded={isExpanded}
                          onClick={() => setExpandedId(isExpanded ? null : assignment.id)}
                        >
                          <span className={`assignment-chevron ${isExpanded ? 'expanded' : ''}`} aria-hidden="true">
                            ›
                          </span>
                          <span>{assignment.nombre}</span>
                        </button>
                        {canEdit && <div className="student-actions">
                          {confirmingDeleteId === assignment.id ? (
                            <div
                              className="student-delete-confirmation"
                              role="group"
                              aria-label={`Confirmar eliminación de ${assignment.nombre}`}
                            >
                              <span>¿Eliminar definitivamente esta asignatura?</span>
                              <button
                                className="student-action-button student-delete-button"
                                onClick={() => deleteAssignment(assignment.id)}
                              >
                                Sí, eliminar
                              </button>
                              <button
                                className="student-action-button"
                                onClick={() => setConfirmingDeleteId(null)}
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                className="student-action-button"
                                aria-label={`Editar ${assignment.nombre}`}
                                onClick={() => openEditForm(assignment)}
                              >
                                <span>Editar</span>
                              </button>
                              <button
                                className="student-action-button student-delete-button"
                                aria-label={`Eliminar ${assignment.nombre}`}
                                onClick={() => setConfirmingDeleteId(assignment.id)}
                              >
                                <span>Eliminar</span>
                              </button>
                            </>
                          )}
                        </div>}
                      </div>
                      {isExpanded && (
                        <div className="assignment-students" aria-label={`Alumnos de ${assignment.nombre}`}>
                          <p>
                            {getStoredGradeCount(assignment, grades)} notas · Ponderaciones:{' '}
                            {(assignment.gradeWeights ??
                              equalWeights(getStoredGradeCount(assignment, grades)).map(Number))
                              .map((weight) => `${weight}%`)
                              .join(', ')}
                          </p>
                          <h3>Alumnos vinculados</h3>
                          {assignedStudents.length === 0 ? (
                            <p>No hay alumnos vinculados a esta asignatura.</p>
                          ) : (
                            <ul>
                              {assignedStudents.map((student) => (
                                <li key={student.id}>{studentFullName(student)}</li>
                              ))}
                            </ul>
                          )}
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

export default AsignaturasPage
