import { useState, type FormEvent } from 'react'
import DashboardSidebar from '../components/DashboardSidebar'
import { matchesSearch } from '../utils/search'

export type Student = {
  id: number
  nombres: string
  primerApellido: string
  segundoApellido: string
  rut: string
  apoderado: string
  telefono: string
}

type StudentForm = Omit<Student, 'id'>

const emptyForm: StudentForm = {
  nombres: '',
  primerApellido: '',
  segundoApellido: '',
  rut: '',
  apoderado: '',
  telefono: '',
}

type AlumnosPageProps = {
  students: Student[]
  onStudentSave: (student: Student) => Promise<void>
  onStudentDelete: (studentId: number) => Promise<void>
  onLogout: () => void
}

const AlumnosPage = ({ students, onStudentSave, onStudentDelete, onLogout }: AlumnosPageProps) => {
  const [form, setForm] = useState<StudentForm>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [nameSearch, setNameSearch] = useState('')

  const filteredStudents = students.filter((student) =>
    matchesSearch(
      `${student.nombres} ${student.primerApellido} ${student.segundoApellido}`,
      nameSearch,
    ),
  )

  const openNewStudentForm = () => {
    setForm(emptyForm)
    setEditingId(null)
    setSaveError('')
    setIsFormOpen(true)
  }

  const openEditStudentForm = (student: Student) => {
    const { id, ...studentForm } = student
    setForm(studentForm)
    setEditingId(id)
    setIsFormOpen(true)
    setConfirmingDeleteId(null)
    setSaveError('')
  }

  const cancelForm = () => {
    setForm(emptyForm)
    setEditingId(null)
    setIsFormOpen(false)
    setSaveError('')
  }

  const saveStudent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSaving) return

    const existingStudents = students.filter((student) => student.id !== editingId)
    const duplicatedRut = existingStudents.some(
      (student) => student.rut.toUpperCase() === form.rut.toUpperCase(),
    )
    const duplicatedPhone = existingStudents.some((student) => student.telefono === form.telefono)

    if (duplicatedRut || duplicatedPhone) {
      const duplicateMessages = [
        duplicatedRut ? 'RUT duplicado.' : '',
        duplicatedPhone ? 'Número de teléfono duplicado.' : '',
      ].filter(Boolean)
      window.alert(duplicateMessages.join('\n'))
      return
    }

    const student: Student = { ...form, id: editingId ?? Date.now() }
    setIsSaving(true)
    try {
      await onStudentSave(student)
      cancelForm()
    } catch (error: unknown) {
      console.error('No se pudo guardar el alumno en Firebase.', error)
      setSaveError(error instanceof Error ? error.message : 'No se pudo guardar el alumno.')
    } finally {
      setIsSaving(false)
    }
  }

  const deleteStudent = async (id: number) => {
    try {
      await onStudentDelete(id)
      setConfirmingDeleteId(null)
      setSaveError('')
    } catch (error: unknown) {
      console.error('No se pudo eliminar el alumno en Firebase.', error)
      setSaveError(error instanceof Error ? error.message : 'No se pudo eliminar el alumno.')
    }
  }

  const updateField = (field: keyof StudentForm, value: string) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }))
  }

  return (
    <div className="dashboard-shell">
      <DashboardSidebar onLogout={onLogout} />

      <main className="dashboard-content">
        <header className="dashboard-header students-header">
          <div>
            <p className="eyebrow">Administración</p>
            <h1>{isFormOpen ? (editingId === null ? 'Agregar alumno' : 'Editar alumno') : 'Alumnos'}</h1>
          </div>
        </header>

        {isFormOpen ? (
          <section className="students-panel" aria-labelledby="student-form-title">
            <h2 id="student-form-title">
              {editingId === null ? 'Datos del alumno' : 'Actualiza los datos del alumno'}
            </h2>
            {saveError && <p className="assignment-validation" role="alert">{saveError}</p>}
            <form className="student-form" onSubmit={saveStudent}>
              <label>
                Nombres
                <input
                  autoComplete="given-name"
                  name="nombres"
                  required
                  value={form.nombres}
                  onChange={(event) => updateField('nombres', event.target.value)}
                />
              </label>
              <label>
                Primer apellido
                <input
                  autoComplete="family-name"
                  name="primerApellido"
                  required
                  value={form.primerApellido}
                  onChange={(event) => updateField('primerApellido', event.target.value)}
                />
              </label>
              <label>
                Segundo apellido
                <input
                  name="segundoApellido"
                  required
                  value={form.segundoApellido}
                  onChange={(event) => updateField('segundoApellido', event.target.value)}
                />
              </label>
              <label>
                Cédula de identidad (RUT)
                <input
                  autoComplete="off"
                  name="rut"
                  pattern="[0-9]{7,8}-[0-9K]"
                  required
                  title="Ingresa un RUT con 7 u 8 dígitos, guión y dígito verificador (0-9 o K)."
                  maxLength={10}
                  value={form.rut}
                  onChange={(event) => updateField('rut', event.target.value)}
                />
              </label>
              <label>
                Nombre del apoderado
                <input
                  name="apoderado"
                  required
                  value={form.apoderado}
                  onChange={(event) => updateField('apoderado', event.target.value)}
                />
              </label>
              <label>
                Teléfono
                <input
                  autoComplete="tel"
                  name="telefono"
                  type="tel"
                  pattern="[0-9]{9}"
                  required
                  title="Ingresa un teléfono de 9 dígitos."
                  maxLength={9}
                  value={form.telefono}
                  onChange={(event) => updateField('telefono', event.target.value)}
                />
              </label>

              <div className="student-form-actions">
                <button className="primary-button" type="submit" disabled={isSaving}>
                  {editingId === null ? 'Agregar alumno' : 'Guardar cambios'}
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={cancelForm}
                  disabled={isSaving}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </section>
        ) : (
          <section className="students-panel" aria-labelledby="students-list-title">
            {saveError && <p className="assignment-validation" role="alert">{saveError}</p>}
            <div className="students-list-heading">
              <div>
                <h2 id="students-list-title">Lista de alumnos</h2>
                <p>Administra los datos de los alumnos registrados.</p>
              </div>
              <button className="primary-button" onClick={openNewStudentForm}>
                <span aria-hidden="true">+</span> Agregar alumno
              </button>
            </div>

            {students.length > 0 && (
              <div className="list-filters">
                <label className="search-filter">
                  Buscar alumno
                  <input
                    type="search"
                    placeholder="Nombre o apellido"
                    value={nameSearch}
                    onChange={(event) => setNameSearch(event.target.value)}
                  />
                </label>
              </div>
            )}

            {students.length === 0 ? (
              <div className="students-empty-state">
                <p>Aún no hay alumnos registrados.</p>
                <span>Agrega un alumno para comenzar a gestionar sus datos.</span>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="students-empty-state" role="status">
                <p>No se encontraron alumnos.</p>
                <span>Prueba con otro nombre o apellido.</span>
              </div>
            ) : (
              <ul className="students-list">
                {filteredStudents.map((student) => (
                  <li className="student-row" key={student.id}>
                    <span className="student-name">
                      {student.nombres} {student.primerApellido} {student.segundoApellido}
                    </span>
                    <div className="student-actions">
                      {confirmingDeleteId === student.id ? (
                        <div className="student-delete-confirmation" role="group" aria-label={`Confirmar eliminación de ${student.nombres}`}>
                          <span>¿Eliminar a este alumno?</span>
                          <button
                            className="student-action-button student-delete-button"
                            onClick={() => deleteStudent(student.id)}
                          >
                            Confirmar
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
                            aria-label={`Editar ${student.nombres} ${student.primerApellido}`}
                            onClick={() => openEditStudentForm(student)}
                          >
                            <svg aria-hidden="true" viewBox="0 0 24 24">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
                            </svg>
                            <span>Editar</span>
                          </button>
                          <button
                            className="student-action-button student-delete-button"
                            aria-label={`Eliminar ${student.nombres} ${student.primerApellido}`}
                            onClick={() => setConfirmingDeleteId(student.id)}
                          >
                            <svg aria-hidden="true" viewBox="0 0 24 24">
                              <path d="M3 6h18" />
                              <path d="M8 6V4h8v2" />
                              <path d="m19 6-1 14H6L5 6" />
                              <path d="M10 11v5M14 11v5" />
                            </svg>
                            <span>Eliminar</span>
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
    </div>
  )
}

export default AlumnosPage
