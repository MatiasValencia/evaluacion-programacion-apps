import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardSidebar from '../components/DashboardSidebar'
import { matchesSearch } from '../utils/search'
import type { Student } from './AlumnosPage'

export type Assignment = {
  id: string
  nombre: string
  studentIds: number[]
}

type AssignmentForm = {
  nombre: string
  studentIds: number[]
}

type AsignaturasPageProps = {
  students: Student[]
  assignments: Assignment[]
  onAssignmentSave: (assignment: Assignment) => Promise<void>
  onAssignmentDelete: (assignmentId: string) => Promise<void>
  onLogout: () => void
}

const studentFullName = (student: Student) =>
  `${student.nombres} ${student.primerApellido} ${student.segundoApellido}`.trim()

const AsignaturasPage = ({
  students,
  assignments,
  onAssignmentSave,
  onAssignmentDelete,
  onLogout,
}: AsignaturasPageProps) => {
  const navigate = useNavigate()
  const [form, setForm] = useState<AssignmentForm>({ nombre: '', studentIds: [] })
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
    setForm({ nombre: '', studentIds: [] })
    setEditingId(null)
    setValidationMessage('')
    setIsFormOpen(true)
  }

  const openEditForm = (assignment: Assignment) => {
    setForm({ nombre: assignment.nombre, studentIds: assignment.studentIds })
    setEditingId(assignment.id)
    setValidationMessage('')
    setConfirmingDeleteId(null)
    setIsFormOpen(true)
  }

  const discardChanges = () => {
    setIsFormOpen(false)
    setForm({ nombre: '', studentIds: [] })
    setEditingId(null)
    setValidationMessage('')
  }

  const saveAssignment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSaving) return
    const nombre = form.nombre.trim()

    if (!nombre) {
      setValidationMessage('Ingresa el nombre de la asignatura.')
      return
    }

    if (form.studentIds.length === 0) {
      setValidationMessage('Selecciona al menos un alumno para la asignatura.')
      return
    }

    const assignment: Assignment = {
      id: editingId ?? crypto.randomUUID(),
      nombre,
      studentIds: form.studentIds,
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
      <DashboardSidebar />

      <main className="dashboard-content">
        <header className="dashboard-header students-header">
          <div>
            <p className="eyebrow">Administración</p>
            <h1>
              {isFormOpen
                ? editingId === null
                  ? 'Agregar asignatura'
                  : 'Editar asignatura'
                : 'Asignaturas'}
            </h1>
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

        {isFormOpen ? (
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
                <p>Administra las asignaturas y los alumnos vinculados.</p>
              </div>
              <button className="primary-button" onClick={openNewForm}>
                <span aria-hidden="true">+</span> Agregar asignatura
              </button>
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
                <span>Agrega una asignatura para comenzar a gestionar sus alumnos.</span>
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
                        <div className="student-actions">
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
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="assignment-students" aria-label={`Alumnos de ${assignment.nombre}`}>
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
