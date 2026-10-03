import { useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
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
  setAssignments: Dispatch<SetStateAction<Assignment[]>>
  onLogout: () => void
}

const menuItems = [
  { to: '/menu/alumnos', label: 'Alumnos' },
  { to: '/menu/asignaturas', label: 'Asignaturas' },
  { to: '/menu/asistencia', label: 'Asistencia' },
  { to: '/menu/evaluaciones', label: 'Evaluaciones' },
]

const studentFullName = (student: Student) =>
  `${student.nombres} ${student.primerApellido} ${student.segundoApellido}`.trim()

const AsignaturasPage = ({
  students,
  assignments,
  setAssignments,
  onLogout,
}: AsignaturasPageProps) => {
  const navigate = useNavigate()
  const [form, setForm] = useState<AssignmentForm>({ nombre: '', studentIds: [] })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const [validationMessage, setValidationMessage] = useState('')

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

  const saveAssignment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nombre = form.nombre.trim()

    if (!nombre) {
      setValidationMessage('Ingresa el nombre de la asignatura.')
      return
    }

    if (form.studentIds.length === 0) {
      setValidationMessage('Selecciona al menos un alumno para la asignatura.')
      return
    }

    if (editingId === null) {
      setAssignments((currentAssignments) => [
        ...currentAssignments,
        { id: crypto.randomUUID(), nombre, studentIds: form.studentIds },
      ])
    } else {
      setAssignments((currentAssignments) =>
        currentAssignments.map((assignment) =>
          assignment.id === editingId ? { ...form, nombre, id: editingId } : assignment,
        ),
      )
    }

    discardChanges()
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

  const deleteAssignment = (id: string) => {
    setAssignments((currentAssignments) =>
      currentAssignments.filter((assignment) => assignment.id !== id),
    )
    setConfirmingDeleteId(null)
    if (expandedId === id) setExpandedId(null)
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
                <button className="primary-button" type="submit">
                  {editingId === null ? 'Agregar asignatura' : 'Guardar cambios'}
                </button>
                <button className="secondary-button" type="button" onClick={discardChanges}>
                  Descartar cambios
                </button>
              </div>
            </form>
          </section>
        ) : (
          <section className="students-panel" aria-labelledby="assignments-list-title">
            <div className="students-list-heading">
              <div>
                <h2 id="assignments-list-title">Lista de asignaturas</h2>
                <p>Administra las asignaturas y los alumnos vinculados.</p>
              </div>
              <button className="primary-button" onClick={openNewForm}>
                <span aria-hidden="true">+</span> Agregar asignatura
              </button>
            </div>

            {assignments.length === 0 ? (
              <div className="students-empty-state">
                <p>Aún no hay asignaturas registradas.</p>
                <span>Agrega una asignatura para comenzar a gestionar sus alumnos.</span>
              </div>
            ) : (
              <ul className="students-list">
                {assignments.map((assignment) => {
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
