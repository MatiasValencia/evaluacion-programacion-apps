import { useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import type { Student } from './AlumnosPage'
import type { Assignment } from './AsignaturasPage'

export type AttendanceRecord = {
  id: string
  assignmentId: string
  assignmentName: string
  date: string
  startTime: string
  endTime: string
  students: {
    studentId: number
    studentName: string
    present: boolean
  }[]
}

type AttendanceForm = Omit<AttendanceRecord, 'id' | 'assignmentName'>

type AsistenciaPageProps = {
  students: Student[]
  assignments: Assignment[]
  records: AttendanceRecord[]
  setRecords: Dispatch<SetStateAction<AttendanceRecord[]>>
  onLogout: () => void
}

const menuItems = [
  { to: '/menu/alumnos', label: 'Alumnos' },
  { to: '/menu/asignaturas', label: 'Asignaturas' },
  { to: '/menu/asistencia', label: 'Asistencia' },
  { to: '/menu/evaluaciones', label: 'Evaluaciones' },
]

const formatToday = () => {
  const today = new Date()
  const day = String(today.getDate()).padStart(2, '0')
  const month = String(today.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}/${today.getFullYear()}`
}

const isValidDate = (value: string) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (!match) return false

  const [, day, month, year] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  return (
    date.getFullYear() === Number(year) &&
    date.getMonth() === Number(month) - 1 &&
    date.getDate() === Number(day)
  )
}

const studentFullName = (student: Student) =>
  `${student.nombres} ${student.primerApellido} ${student.segundoApellido}`.trim()

const AsistenciaPage = ({
  students,
  assignments,
  records,
  setRecords,
  onLogout,
}: AsistenciaPageProps) => {
  const navigate = useNavigate()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const [deleteConfirmationStep, setDeleteConfirmationStep] = useState(1)
  const [validationMessage, setValidationMessage] = useState('')
  const [form, setForm] = useState<AttendanceForm>({
    assignmentId: '',
    date: formatToday(),
    startTime: '',
    endTime: '',
    students: [],
  })

  const openNewForm = () => {
    setForm({
      assignmentId: '',
      date: formatToday(),
      startTime: '',
      endTime: '',
      students: [],
    })
    setEditingId(null)
    setValidationMessage('')
    setIsFormOpen(true)
  }

  const openEditForm = (record: AttendanceRecord) => {
    const { id, ...recordForm } = record
    setForm(recordForm)
    setEditingId(id)
    setValidationMessage('')
    setConfirmingDeleteId(null)
    setIsFormOpen(true)
  }

  const discardChanges = () => {
    setIsFormOpen(false)
    setEditingId(null)
    setValidationMessage('')
    navigate('/menu')
  }

  const selectAssignment = (assignmentId: string) => {
    const assignment = assignments.find((item) => item.id === assignmentId)
    const assignedStudents = assignment
      ? students
          .filter((student) => assignment.studentIds.includes(student.id))
          .map((student) => ({
            studentId: student.id,
            studentName: studentFullName(student),
            present: true,
          }))
      : []

    setForm((currentForm) => ({ ...currentForm, assignmentId, students: assignedStudents }))
    setValidationMessage('')
  }

  const saveAttendance = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!form.assignmentId) {
      setValidationMessage('Selecciona una asignatura.')
      return
    }
    if (!isValidDate(form.date)) {
      setValidationMessage('Ingresa una fecha válida con formato DD/MM/AAAA.')
      return
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(form.endTime)) {
      setValidationMessage('Ingresa las horas en formato 24 horas HH:mm.')
      return
    }
    if (form.endTime <= form.startTime) {
      setValidationMessage('La hora de fin debe ser posterior a la hora de inicio.')
      return
    }
    if (form.students.length === 0) {
      setValidationMessage('La asignatura seleccionada no tiene alumnos vinculados.')
      return
    }

    const assignment = assignments.find((item) => item.id === form.assignmentId)
    if (!assignment) {
      setValidationMessage('La asignatura seleccionada ya no está disponible.')
      return
    }

    const record: AttendanceRecord = {
      ...form,
      id: editingId ?? crypto.randomUUID(),
      assignmentName: assignment.nombre,
    }

    setRecords((currentRecords) =>
      editingId === null
        ? [...currentRecords, record]
        : currentRecords.map((currentRecord) =>
            currentRecord.id === editingId ? record : currentRecord,
          ),
    )
    setIsFormOpen(false)
    setEditingId(null)
    navigate('/menu')
  }

  const toggleStudentAttendance = (studentId: number, present: boolean) => {
    setForm((currentForm) => ({
      ...currentForm,
      students: currentForm.students.map((student) =>
        student.studentId === studentId ? { ...student, present } : student,
      ),
    }))
  }

  const deleteRecord = (id: string) => {
    setRecords((currentRecords) => currentRecords.filter((record) => record.id !== id))
    setConfirmingDeleteId(null)
    setDeleteConfirmationStep(1)
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
            <h1>{isFormOpen ? (editingId === null ? 'Registrar asistencia' : 'Editar asistencia') : 'Asistencia'}</h1>
          </div>
          <div className="dashboard-header-actions">
            <button className="secondary-button students-back-button" onClick={() => navigate('/menu')}>
              Volver al dashboard
            </button>
            <button className="secondary-button" onClick={onLogout}>
              Cerrar sesión
            </button>
          </div>
        </header>

        {isFormOpen ? (
          <section className="students-panel" aria-labelledby="attendance-form-title">
            <h2 id="attendance-form-title">
              {editingId === null ? 'Datos de la clase' : 'Actualiza el registro de asistencia'}
            </h2>
            <form className="assignment-form" onSubmit={saveAttendance}>
              <label className="attendance-field">
                Asignatura
                <select
                  required
                  value={form.assignmentId}
                  onChange={(event) => selectAssignment(event.target.value)}
                >
                  <option value="">Selecciona una asignatura</option>
                  {assignments.map((assignment) => (
                    <option key={assignment.id} value={assignment.id}>
                      {assignment.nombre}
                    </option>
                  ))}
                </select>
              </label>

              {assignments.length === 0 && (
                <p className="assignment-no-students">
                  Primero debes agregar asignaturas en la página de Asignaturas.
                </p>
              )}

              <div className="attendance-datetime-fields">
                <label className="attendance-field">
                  Fecha (DD/MM/AAAA)
                  <input
                    autoComplete="off"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="DD/MM/AAAA"
                    required
                    value={form.date}
                    onChange={(event) => {
                      setForm((currentForm) => ({ ...currentForm, date: event.target.value }))
                      setValidationMessage('')
                    }}
                  />
                </label>
                <label className="attendance-field">
                  Hora de inicio (HH:mm)
                  <input
                    autoComplete="off"
                    inputMode="numeric"
                    maxLength={5}
                    placeholder="HH:mm"
                    required
                    value={form.startTime}
                    onChange={(event) => {
                      setForm((currentForm) => ({ ...currentForm, startTime: event.target.value }))
                      setValidationMessage('')
                    }}
                  />
                </label>
                <label className="attendance-field">
                  Hora de fin (HH:mm)
                  <input
                    autoComplete="off"
                    inputMode="numeric"
                    maxLength={5}
                    placeholder="HH:mm"
                    required
                    value={form.endTime}
                    onChange={(event) => {
                      setForm((currentForm) => ({ ...currentForm, endTime: event.target.value }))
                      setValidationMessage('')
                    }}
                  />
                </label>
              </div>

              {form.assignmentId && (
                <fieldset className="assignment-student-picker">
                  <legend>Asistencia de los alumnos</legend>
                  {form.students.length === 0 ? (
                    <p className="assignment-no-students">
                      No hay alumnos vinculados a esta asignatura.
                    </p>
                  ) : (
                    <ul className="attendance-student-list">
                      {form.students.map((student) => (
                        <li key={student.studentId}>
                          <span className="student-name">{student.studentName}</span>
                          <div className="attendance-options">
                            <label>
                              <input
                                type="radio"
                                name={`attendance-${student.studentId}`}
                                checked={student.present}
                                onChange={() => toggleStudentAttendance(student.studentId, true)}
                              />
                              Presente
                            </label>
                            <label>
                              <input
                                type="radio"
                                name={`attendance-${student.studentId}`}
                                checked={!student.present}
                                onChange={() => toggleStudentAttendance(student.studentId, false)}
                              />
                              Ausente
                            </label>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </fieldset>
              )}

              {validationMessage && (
                <p className="assignment-validation" role="alert">
                  {validationMessage}
                </p>
              )}
              <div className="student-form-actions">
                <button className="primary-button" type="submit">
                  {editingId === null ? 'Registrar asistencia' : 'Guardar cambios'}
                </button>
                <button className="secondary-button" type="button" onClick={discardChanges}>
                  Descartar cambios
                </button>
              </div>
            </form>
          </section>
        ) : (
          <section className="students-panel" aria-labelledby="attendance-list-title">
            <div className="students-list-heading">
              <div>
                <h2 id="attendance-list-title">Lista de registros</h2>
                <p>Consulta y administra la asistencia de cada clase.</p>
              </div>
              <button className="primary-button" onClick={openNewForm}>
                <span aria-hidden="true">+</span> Registrar asistencia
              </button>
            </div>

            {records.length === 0 ? (
              <div className="students-empty-state">
                <p>Aún no hay registros de asistencia.</p>
                <span>Registra una clase para comenzar a llevar el control de asistencia.</span>
              </div>
            ) : (
              <ul className="students-list">
                {records.map((record) => {
                  const isExpanded = expandedId === record.id
                  const presentStudents = record.students.filter((student) => student.present)
                  const absentStudents = record.students.filter((student) => !student.present)

                  return (
                    <li className="assignment-row" key={record.id}>
                      <div className="assignment-row-heading">
                        <button
                          className="assignment-expand-button"
                          aria-expanded={isExpanded}
                          onClick={() => setExpandedId(isExpanded ? null : record.id)}
                        >
                          <span className={`assignment-chevron ${isExpanded ? 'expanded' : ''}`} aria-hidden="true">
                            ›
                          </span>
                          <span>
                            {record.assignmentName} · {record.date} · {record.startTime}–{record.endTime}
                          </span>
                        </button>
                        <div className="student-actions">
                          {confirmingDeleteId === record.id ? (
                            <div className="student-delete-confirmation" role="group" aria-label="Confirmar eliminación">
                              <span>
                                {deleteConfirmationStep === 1
                                  ? '¿Eliminar este registro?'
                                  : 'Confirmación final: ¿eliminar definitivamente?'}
                              </span>
                              <button
                                className="student-action-button student-delete-button"
                                onClick={() => {
                                  if (deleteConfirmationStep === 1) {
                                    setDeleteConfirmationStep(2)
                                  } else {
                                    deleteRecord(record.id)
                                  }
                                }}
                              >
                                {deleteConfirmationStep === 1 ? 'Continuar' : 'Sí, eliminar'}
                              </button>
                              <button
                                className="student-action-button"
                                onClick={() => {
                                  setConfirmingDeleteId(null)
                                  setDeleteConfirmationStep(1)
                                }}
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                className="student-action-button"
                                aria-label={`Editar asistencia de ${record.assignmentName} del ${record.date}`}
                                onClick={() => openEditForm(record)}
                              >
                                Editar
                              </button>
                              <button
                                className="student-action-button student-delete-button"
                                aria-label={`Eliminar asistencia de ${record.assignmentName} del ${record.date}`}
                                onClick={() => {
                                  setConfirmingDeleteId(record.id)
                                  setDeleteConfirmationStep(1)
                                }}
                              >
                                Eliminar
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="assignment-students attendance-details">
                          <div>
                            <h3>Alumnos presentes ({presentStudents.length})</h3>
                            {presentStudents.length === 0 ? (
                              <p>No hay alumnos presentes.</p>
                            ) : (
                              <ul>
                                {presentStudents.map((student) => (
                                  <li key={student.studentId}>{student.studentName}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div>
                            <h3>Alumnos ausentes ({absentStudents.length})</h3>
                            {absentStudents.length === 0 ? (
                              <p>No hay alumnos ausentes.</p>
                            ) : (
                              <ul>
                                {absentStudents.map((student) => (
                                  <li key={student.studentId}>{student.studentName}</li>
                                ))}
                              </ul>
                            )}
                          </div>
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

export default AsistenciaPage
