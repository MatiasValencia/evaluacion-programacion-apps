import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardSidebar from '../components/DashboardSidebar'
import { matchesSearch } from '../utils/search'
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

type TimeParts = {
  hour: string
  minute: string
  period: 'AM' | 'PM'
}

type AttendanceForm = Omit<
  AttendanceRecord,
  'id' | 'assignmentName' | 'startTime' | 'endTime'
> & {
  startTime: TimeParts
  endTime: TimeParts
}

type AsistenciaPageProps = {
  students: Student[]
  assignments: Assignment[]
  records: AttendanceRecord[]
  onRecordSave: (record: AttendanceRecord) => Promise<void>
  onRecordDelete: (recordId: string) => Promise<void>
  onLogout: () => void
}

const formatToday = () => {
  const today = new Date()
  const day = String(today.getDate()).padStart(2, '0')
  const month = String(today.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}/${today.getFullYear()}`
}

const formatDate = (date: Date) =>
  `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`

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

const emptyTime = (): TimeParts => ({ hour: '', minute: '', period: 'AM' })

const parseStoredTime = (time: string): TimeParts => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time)
  if (!match) return emptyTime()

  const hours = Number(match[1])
  return {
    hour: String(hours % 12 || 12),
    minute: match[2],
    period: hours < 12 ? 'AM' : 'PM',
  }
}

const toMinutes = (time: TimeParts) => {
  if (!/^(?:[1-9]|1[0-2])$/.test(time.hour) || !/^\d{1,2}$/.test(time.minute)) {
    return null
  }

  const hour = Number(time.hour)
  const minute = Number(time.minute)
  if (minute > 59) return null

  return (hour % 12 + (time.period === 'PM' ? 12 : 0)) * 60 + minute
}

const toStoredTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

type TimeFieldProps = {
  label: string
  name: string
  value: TimeParts
  onChange: (value: TimeParts) => void
}

const TimeField = ({ label, name, value, onChange }: TimeFieldProps) => (
  <fieldset className="attendance-time-field">
    <legend>{label}</legend>
    <div className="attendance-time-controls">
      <label className="attendance-time-part">
        <input
          aria-label={`${label}: hora`}
          autoComplete="off"
          inputMode="numeric"
          maxLength={2}
          placeholder="HH"
          required
          value={value.hour}
          onChange={(event) => onChange({ ...value, hour: event.target.value })}
        />
      </label>
      <span aria-hidden="true">:</span>
      <label className="attendance-time-part">
        <input
          aria-label={`${label}: minutos`}
          autoComplete="off"
          inputMode="numeric"
          maxLength={2}
          placeholder="MM"
          required
          value={value.minute}
          onChange={(event) => onChange({ ...value, minute: event.target.value })}
        />
      </label>
      <div className="attendance-period-options" role="group" aria-label={`${label}: AM o PM`}>
        {(['AM', 'PM'] as const).map((period) => (
          <label key={period}>
            <input
              type="radio"
              name={`${name}-period`}
              checked={value.period === period}
              onChange={() => onChange({ ...value, period })}
            />
            {period}
          </label>
        ))}
      </div>
    </div>
  </fieldset>
)

const AsistenciaPage = ({
  students,
  assignments,
  records,
  onRecordSave,
  onRecordDelete,
  onLogout,
}: AsistenciaPageProps) => {
  const navigate = useNavigate()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedAssignmentId, setExpandedAssignmentId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const [deleteConfirmationStep, setDeleteConfirmationStep] = useState(1)
  const [validationMessage, setValidationMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [assignmentSearch, setAssignmentSearch] = useState('')
  const [studentSearch, setStudentSearch] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const [form, setForm] = useState<AttendanceForm>({
    assignmentId: '',
    date: formatToday(),
    startTime: emptyTime(),
    endTime: emptyTime(),
    students: [],
  })

  const filteredAttendance = assignments
    .map((assignment) => ({
      assignment,
      records: records.filter(
        (record) =>
          record.assignmentId === assignment.id &&
          (filterDate === '' || record.date === filterDate) &&
          (studentSearch.trim() === '' ||
            record.students.some((student) =>
              matchesSearch(student.studentName, studentSearch),
            )),
      ),
    }))
    .filter(
      ({ assignment, records: assignmentRecords }) =>
        matchesSearch(assignment.nombre, assignmentSearch) &&
        ((filterDate === '' && studentSearch.trim() === '') ||
          assignmentRecords.length > 0),
    )

  const calendarDays = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() + 1,
    0,
  ).getDate()
  const calendarStartDay = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth(),
    1,
  ).getDay()
  const todayDate = formatToday()

  const openNewForm = () => {
    setForm({
      assignmentId: '',
      date: formatToday(),
      startTime: emptyTime(),
      endTime: emptyTime(),
      students: [],
    })
    setEditingId(null)
    setValidationMessage('')
    setIsFormOpen(true)
  }

  const openEditForm = (record: AttendanceRecord) => {
    const { id, ...recordForm } = record
    setForm({
      ...recordForm,
      startTime: parseStoredTime(record.startTime),
      endTime: parseStoredTime(record.endTime),
    })
    setEditingId(id)
    setValidationMessage('')
    setConfirmingDeleteId(null)
    setIsFormOpen(true)
  }

  const discardChanges = () => {
    setIsFormOpen(false)
    setEditingId(null)
    setValidationMessage('')
    navigate('/menu/asistencia')
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

  const saveAttendance = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSaving) return

    if (!form.assignmentId) {
      setValidationMessage('Selecciona una asignatura.')
      return
    }
    if (!isValidDate(form.date)) {
      setValidationMessage('Ingresa una fecha válida con formato DD/MM/AAAA.')
      return
    }
    const startMinutes = toMinutes(form.startTime)
    const endMinutes = toMinutes(form.endTime)
    if (startMinutes === null || endMinutes === null) {
      setValidationMessage('Ingresa una hora válida en formato de 12 horas y selecciona AM o PM.')
      return
    }
    if (endMinutes <= startMinutes) {
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
      startTime: toStoredTime(startMinutes),
      endTime: toStoredTime(endMinutes),
      id: editingId ?? crypto.randomUUID(),
      assignmentName: assignment.nombre,
    }

    setIsSaving(true)
    try {
      await onRecordSave(record)
      setIsFormOpen(false)
      setEditingId(null)
      navigate('/menu/asistencia')
    } catch (error: unknown) {
      console.error('No se pudo guardar la asistencia en Firebase.', error)
      setValidationMessage(
        error instanceof Error ? error.message : 'No se pudo guardar la asistencia.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const toggleStudentAttendance = (studentId: number, present: boolean) => {
    setForm((currentForm) => ({
      ...currentForm,
      students: currentForm.students.map((student) =>
        student.studentId === studentId ? { ...student, present } : student,
      ),
    }))
  }

  const deleteRecord = async (id: string) => {
    try {
      await onRecordDelete(id)
      setConfirmingDeleteId(null)
      setDeleteConfirmationStep(1)
      setValidationMessage('')
    } catch (error: unknown) {
      console.error('No se pudo eliminar la asistencia en Firebase.', error)
      setValidationMessage(
        error instanceof Error ? error.message : 'No se pudo eliminar la asistencia.',
      )
    }
  }

  return (
    <div className="dashboard-shell">
      <DashboardSidebar onLogout={onLogout} />

      <main className="dashboard-content">
        <header className="dashboard-header students-header">
          <div>
            <p className="eyebrow">Administración</p>
            <h1>{isFormOpen ? (editingId === null ? 'Registrar asistencia' : 'Editar asistencia') : 'Asistencia'}</h1>
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
                <TimeField
                  label="Hora de inicio"
                  name="start-time"
                  value={form.startTime}
                  onChange={(startTime) => {
                    setForm((currentForm) => ({ ...currentForm, startTime }))
                    setValidationMessage('')
                  }}
                />
                <TimeField
                  label="Hora de fin"
                  name="end-time"
                  value={form.endTime}
                  onChange={(endTime) => {
                    setForm((currentForm) => ({ ...currentForm, endTime }))
                    setValidationMessage('')
                  }}
                />
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
                <button className="primary-button" type="submit" disabled={isSaving}>
                  {editingId === null ? 'Registrar asistencia' : 'Guardar cambios'}
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
          <section className="students-panel" aria-labelledby="attendance-list-title">
            {validationMessage && (
              <p className="assignment-validation" role="alert">
                {validationMessage}
              </p>
            )}
            <div className="students-list-heading">
              <div>
                <h2 id="attendance-list-title">Lista de registros</h2>
                <p>Consulta y administra la asistencia de cada clase.</p>
              </div>
              <button className="primary-button" onClick={openNewForm}>
                <span aria-hidden="true">+</span> Registrar asistencia
              </button>
            </div>

            <div className="list-filters attendance-filters">
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
              <div className="date-filter">
                <span className="date-filter-label">Filtrar por fecha</span>
                <button
                  className="date-filter-button"
                  type="button"
                  aria-expanded={isDatePickerOpen}
                  aria-haspopup="dialog"
                  onClick={() => {
                    if (!isDatePickerOpen) {
                      const today = new Date()
                      setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1))
                    }
                    setIsDatePickerOpen((isOpen) => !isOpen)
                  }}
                >
                  {filterDate || 'Seleccionar fecha'}
                </button>
                {isDatePickerOpen && (
                  <div className="date-picker" role="dialog" aria-label="Calendario de fecha">
                    <div className="calendar-heading">
                      <button
                        className="calendar-month-button"
                        type="button"
                        aria-label="Mes anterior"
                        onClick={() =>
                          setCalendarMonth(
                            (month) =>
                              new Date(month.getFullYear(), month.getMonth() - 1, 1),
                          )
                        }
                      >
                        ‹
                      </button>
                      <strong>
                        {calendarMonth.toLocaleDateString('es-CL', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </strong>
                      <button
                        className="calendar-month-button"
                        type="button"
                        aria-label="Mes siguiente"
                        onClick={() =>
                          setCalendarMonth(
                            (month) =>
                              new Date(month.getFullYear(), month.getMonth() + 1, 1),
                          )
                        }
                      >
                        ›
                      </button>
                    </div>
                    <div className="calendar-grid" role="grid">
                      {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'].map((day) => (
                        <span className="calendar-weekday" role="columnheader" key={day}>
                          {day}
                        </span>
                      ))}
                      {Array.from({ length: calendarStartDay }, (_, index) => (
                        <span className="calendar-empty-day" aria-hidden="true" key={`empty-${index}`} />
                      ))}
                      {Array.from({ length: calendarDays }, (_, index) => {
                        const date = new Date(
                          calendarMonth.getFullYear(),
                          calendarMonth.getMonth(),
                          index + 1,
                        )
                        const dateValue = formatDate(date)
                        const isToday = dateValue === todayDate
                        const isSelected = dateValue === filterDate

                        return (
                          <button
                            className={`calendar-day${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}`}
                            type="button"
                            role="gridcell"
                            aria-pressed={isSelected}
                            aria-label={date.toLocaleDateString('es-CL', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                            key={dateValue}
                            onClick={() => {
                              setFilterDate(dateValue)
                              setIsDatePickerOpen(false)
                            }}
                          >
                            {index + 1}
                          </button>
                        )
                      })}
                    </div>
                    <button
                      className="calendar-clear-button"
                      type="button"
                      onClick={() => {
                        setFilterDate('')
                        setIsDatePickerOpen(false)
                      }}
                    >
                      Quitar filtro de fecha
                    </button>
                  </div>
                )}
              </div>
            </div>

            {assignments.length === 0 ? (
              <div className="students-empty-state">
                <p>Aún no hay asignaturas registradas.</p>
                <span>Registra una asignatura antes de consultar la asistencia.</span>
              </div>
            ) : filteredAttendance.length === 0 ? (
              <div className="students-empty-state" role="status">
                <p>No se encontraron registros de asistencia.</p>
                <span>Prueba con otros filtros de asignatura, alumno o fecha.</span>
              </div>
            ) : (
            <ul className="students-list attendance-assignment-list">
              {filteredAttendance.map(({ assignment, records: assignmentRecords }) => {
                const isAssignmentExpanded = expandedAssignmentId === assignment.id

                return (
                  <li className="attendance-assignment-row" key={assignment.id}>
                    <button
                      className="assignment-expand-button attendance-assignment-toggle"
                      aria-expanded={isAssignmentExpanded}
                      onClick={() =>
                        setExpandedAssignmentId(isAssignmentExpanded ? null : assignment.id)
                      }
                    >
                      <span
                        className={`assignment-chevron ${isAssignmentExpanded ? 'expanded' : ''}`}
                        aria-hidden="true"
                      >
                        ›
                      </span>
                      <span>{assignment.nombre}</span>
                      <span className="attendance-record-count">
                        {assignmentRecords.length}{' '}
                        {assignmentRecords.length === 1 ? 'registro' : 'registros'}
                      </span>
                    </button>
                    {isAssignmentExpanded && (
                      <div className="attendance-assignment-content">
                        {assignmentRecords.length === 0 ? (
                          <p className="attendance-assignment-empty">No hay registros</p>
                        ) : (
                          <ul className="attendance-record-list">
                            {assignmentRecords.map((record) => {
                              const isExpanded = expandedId === record.id
                              const presentStudents = record.students.filter(
                                (student) =>
                                  student.present &&
                                  (studentSearch.trim() === '' ||
                                    matchesSearch(student.studentName, studentSearch)),
                              )
                              const absentStudents = record.students.filter(
                                (student) =>
                                  !student.present &&
                                  (studentSearch.trim() === '' ||
                                    matchesSearch(student.studentName, studentSearch)),
                              )

                              return (
                                <li className="attendance-record-row" key={record.id}>
                                  <div className="assignment-row-heading">
                                    <button
                                      className="assignment-expand-button"
                                      aria-expanded={isExpanded}
                                      onClick={() =>
                                        setExpandedId(isExpanded ? null : record.id)
                                      }
                                    >
                                      <span
                                        className={`assignment-chevron ${isExpanded ? 'expanded' : ''}`}
                                        aria-hidden="true"
                                      >
                                        ›
                                      </span>
                                      <span>
                                        {record.date} · {record.startTime}–{record.endTime}
                                      </span>
                                    </button>
                                    <div className="student-actions">
                                      {confirmingDeleteId === record.id ? (
                                        <div
                                          className="student-delete-confirmation"
                                          role="group"
                                          aria-label="Confirmar eliminación"
                                        >
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
                                            {deleteConfirmationStep === 1
                                              ? 'Continuar'
                                              : 'Sí, eliminar'}
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
                                              <li key={student.studentId}>
                                                {student.studentName}
                                              </li>
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
                                              <li key={student.studentId}>
                                                {student.studentName}
                                              </li>
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
