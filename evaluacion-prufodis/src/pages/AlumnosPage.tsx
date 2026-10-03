import { useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

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

const menuItems = [
  { to: '/menu/alumnos', label: 'Alumnos' },
  { to: '/menu/asignaturas', label: 'Asignaturas' },
  { to: '/menu/asistencia', label: 'Asistencia' },
  { to: '/menu/evaluaciones', label: 'Evaluaciones' },
]

type AlumnosPageProps = {
  students: Student[]
  setStudents: Dispatch<SetStateAction<Student[]>>
  onStudentDelete: (studentId: number) => void
  onLogout: () => void
}

const AlumnosPage = ({ students, setStudents, onStudentDelete, onLogout }: AlumnosPageProps) => {
  const navigate = useNavigate()
  const [form, setForm] = useState<StudentForm>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const openNewStudentForm = () => {
    setForm(emptyForm)
    setEditingId(null)
    setIsFormOpen(true)
  }

  const openEditStudentForm = (student: Student) => {
    const { id, ...studentForm } = student
    setForm(studentForm)
    setEditingId(id)
    setIsFormOpen(true)
    setConfirmingDeleteId(null)
  }

  const cancelForm = () => {
    setForm(emptyForm)
    setEditingId(null)
    setIsFormOpen(false)
  }

  const saveStudent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (editingId === null) {
      setStudents((currentStudents) => [
        ...currentStudents,
        { ...form, id: Date.now() },
      ])
    } else {
      setStudents((currentStudents) =>
        currentStudents.map((student) =>
          student.id === editingId ? { ...form, id: editingId } : student,
        ),
      )
    }

    cancelForm()
  }

  const deleteStudent = (id: number) => {
    onStudentDelete(id)
    setConfirmingDeleteId(null)
  }

  const updateField = (field: keyof StudentForm, value: string) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }))
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
            <h1>{isFormOpen ? (editingId === null ? 'Agregar alumno' : 'Editar alumno') : 'Alumnos'}</h1>
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
          <section className="students-panel" aria-labelledby="student-form-title">
            <h2 id="student-form-title">
              {editingId === null ? 'Datos del alumno' : 'Actualiza los datos del alumno'}
            </h2>
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
                  required
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
                  required
                  value={form.telefono}
                  onChange={(event) => updateField('telefono', event.target.value)}
                />
              </label>

              <div className="student-form-actions">
                <button className="primary-button" type="submit">
                  {editingId === null ? 'Agregar alumno' : 'Guardar cambios'}
                </button>
                <button className="secondary-button" type="button" onClick={cancelForm}>
                  Cancelar
                </button>
              </div>
            </form>
          </section>
        ) : (
          <section className="students-panel" aria-labelledby="students-list-title">
            <div className="students-list-heading">
              <div>
                <h2 id="students-list-title">Lista de alumnos</h2>
                <p>Administra los datos de los alumnos registrados.</p>
              </div>
              <button className="primary-button" onClick={openNewStudentForm}>
                <span aria-hidden="true">+</span> Agregar alumno
              </button>
            </div>

            {students.length === 0 ? (
              <div className="students-empty-state">
                <p>Aún no hay alumnos registrados.</p>
                <span>Agrega un alumno para comenzar a gestionar sus datos.</span>
              </div>
            ) : (
              <ul className="students-list">
                {students.map((student) => (
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
