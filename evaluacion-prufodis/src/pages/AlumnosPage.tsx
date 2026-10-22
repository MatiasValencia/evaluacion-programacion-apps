import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import DashboardSidebar from '../components/DashboardSidebar'
import type { PedagogicalSkill } from './HabilidadesPedagogicasPage'
import { matchesSearch } from '../utils/search'

export type Student = {
  id: number
  nombres: string
  primerApellido: string
  segundoApellido: string
  rut: string
  apoderado: string
  telefono: string
  foto?: string
}

type StudentForm = Omit<Student, 'id'>

const emptyForm: StudentForm = {
  nombres: '',
  primerApellido: '',
  segundoApellido: '',
  rut: '',
  apoderado: '',
  telefono: '',
  foto: '',
}

const readStudentPhoto = async (file: File): Promise<string> => {
  const extension = file.name.split('.').pop()?.toLowerCase()
  const supportedTypes = ['image/jpeg', 'image/png']
  if (
    !['jpg', 'jpeg', 'png'].includes(extension ?? '') ||
    (file.type !== '' && !supportedTypes.includes(file.type))
  ) {
    throw new Error('Selecciona una fotografía en formato JPG, JPEG o PNG.')
  }

  const image = await createImageBitmap(file)
  const scale = Math.min(1, 256 / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.width * scale))
  canvas.height = Math.max(1, Math.round(image.height * scale))

  const context = canvas.getContext('2d')
  if (context === null) {
    image.close()
    throw new Error('No se pudo procesar la fotografía.')
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  image.close()
  return canvas.toDataURL(extension === 'png' ? 'image/png' : 'image/jpeg', 0.82)
}

type AlumnosPageProps = {
  students: Student[]
  canEdit: boolean
  pedagogicalSkills: PedagogicalSkill[]
  onSkillDelete: (skillId: string) => Promise<void>
  onStudentSave: (student: Student) => Promise<void>
  onStudentDelete: (studentId: number) => Promise<void>
  onLogout: () => void
}

const AlumnosPage = ({
  students,
  canEdit,
  pedagogicalSkills,
  onSkillDelete,
  onStudentSave,
  onStudentDelete,
  onLogout,
}: AlumnosPageProps) => {
  const { studentId } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState<StudentForm>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null)
  const [confirmingSkillDeleteId, setConfirmingSkillDeleteId] = useState<string | null>(null)
  const [skillDeleteError, setSkillDeleteError] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [nameSearch, setNameSearch] = useState('')
  const [photoError, setPhotoError] = useState('')

  const selectedStudentId = studentId === undefined ? null : Number(studentId)
  const selectedStudent = students.find((student) => student.id === selectedStudentId)

  const filteredStudents = students.filter((student) =>
    matchesSearch(
      `${student.nombres} ${student.primerApellido} ${student.segundoApellido}`,
      nameSearch,
    ),
  )

  const openNewStudentForm = () => {
    if (!canEdit) return
    setForm(emptyForm)
    setEditingId(null)
    setSaveError('')
    setPhotoError('')
    setIsFormOpen(true)
  }

  const openEditStudentForm = (student: Student) => {
    if (!canEdit) return
    const { id, ...studentForm } = student
    setForm(studentForm)
    setEditingId(id)
    setIsFormOpen(true)
    setConfirmingDeleteId(null)
    setSaveError('')
    setPhotoError('')
  }

  const cancelForm = () => {
    setForm(emptyForm)
    setEditingId(null)
    setIsFormOpen(false)
    setSaveError('')
    setPhotoError('')
  }

  const saveStudent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canEdit || isSaving) return

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

    const { foto, ...studentFields } = form
    const student: Student = {
      ...studentFields,
      ...(foto ? { foto } : {}),
      id: editingId ?? Date.now(),
    }
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
    if (!canEdit) return
    try {
      await onStudentDelete(id)
      setConfirmingDeleteId(null)
      setSaveError('')
      if (selectedStudentId === id) navigate('/menu/alumnos')
    } catch (error: unknown) {
      console.error('No se pudo eliminar el alumno en Firebase.', error)
      setSaveError(error instanceof Error ? error.message : 'No se pudo eliminar el alumno.')
    }
  }

  const deleteSkill = async (skillId: string) => {
    if (!canEdit) return
    try {
      await onSkillDelete(skillId)
      setConfirmingSkillDeleteId(null)
      setSkillDeleteError('')
    } catch (error: unknown) {
      console.error('No se pudo eliminar la habilidad pedagógica en Firebase.', error)
      setSkillDeleteError(
        error instanceof Error ? error.message : 'No se pudo eliminar la habilidad pedagógica.',
      )
    }
  }

  const updateField = (field: keyof StudentForm, value: string) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }))
  }

  const updatePhoto = async (file: File | undefined) => {
    setPhotoError('')
    if (!file) return
    try {
      updateField('foto', await readStudentPhoto(file))
    } catch (error: unknown) {
      setPhotoError(error instanceof Error ? error.message : 'No se pudo procesar la fotografía.')
    }
  }

  if (studentId !== undefined && (!Number.isSafeInteger(selectedStudentId) || !selectedStudent)) {
    return <Navigate to="/menu/alumnos" replace />
  }

  return (
    <div className="dashboard-shell">
      <DashboardSidebar onLogout={onLogout} />

      <main className="dashboard-content">
        <header className="dashboard-header students-header">
          <div>
            <p className="eyebrow">{canEdit ? 'Administración' : 'Consulta académica'}</p>
            <h1>
              {canEdit && isFormOpen
                ? editingId === null ? 'Agregar alumno' : 'Editar alumno'
                : selectedStudent ? 'Ficha del alumno' : 'Alumnos'}
            </h1>
          </div>
        </header>

        {canEdit && isFormOpen ? (
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

              <div className="student-photo-field">
                <span>Fotografía (opcional)</span>
                <label className="student-photo-picker">
                  <input
                    accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                    aria-label="Seleccionar fotografía del alumno"
                    type="file"
                    onChange={(event) => {
                      void updatePhoto(event.target.files?.[0])
                      event.target.value = ''
                    }}
                  />
                  {form.foto ? (
                    <img src={form.foto} alt="Vista previa de la fotografía del alumno" />
                  ) : (
                    <span className="student-photo-placeholder" aria-hidden="true">+</span>
                  )}
                  <span className="student-photo-change">
                    {form.foto ? 'Cambiar foto' : 'Agregar foto'}
                  </span>
                </label>
                {form.foto && (
                  <button
                    className="student-photo-remove"
                    type="button"
                    onClick={() => updateField('foto', '')}
                  >
                    Quitar fotografía
                  </button>
                )}
                {photoError && <p className="assignment-validation" role="alert">{photoError}</p>}
              </div>

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
        ) : selectedStudent ? (
          <section className="students-panel student-profile" aria-labelledby="student-profile-title">
            <Link className="student-profile-back" to="/menu/alumnos">
              ← Volver a alumnos
            </Link>
            <div className="student-profile-heading">
              <div className="student-profile-photo">
                {selectedStudent.foto ? (
                  <img src={selectedStudent.foto} alt={`Fotografía de ${selectedStudent.nombres}`} />
                ) : (
                  <span aria-label="Sin fotografía">Sin foto</span>
                )}
              </div>
              <div>
                <p className="eyebrow">Ficha de alumno</p>
                <h2 id="student-profile-title">
                  {selectedStudent.nombres} {selectedStudent.primerApellido} {selectedStudent.segundoApellido}
                </h2>
              </div>
            </div>

            {saveError && <p className="assignment-validation" role="alert">{saveError}</p>}
            <dl className="student-profile-details">
              <div><dt>Nombres</dt><dd>{selectedStudent.nombres}</dd></div>
              <div><dt>Primer apellido</dt><dd>{selectedStudent.primerApellido}</dd></div>
              <div><dt>Segundo apellido</dt><dd>{selectedStudent.segundoApellido}</dd></div>
              <div><dt>Cédula de identidad (RUT)</dt><dd>{selectedStudent.rut}</dd></div>
              <div><dt>Nombre del apoderado</dt><dd>{selectedStudent.apoderado}</dd></div>
              <div><dt>Teléfono</dt><dd>{selectedStudent.telefono}</dd></div>
            </dl>

            <section className="pedagogical-skills" aria-labelledby="pedagogical-skills-title">
              <div className="pedagogical-skills-heading">
                <div>
                  <h3 id="pedagogical-skills-title">Habilidades pedagógicas</h3>
                  <p>Habilidades registradas para este alumno.</p>
                </div>
                {canEdit && (
                  <Link
                    className="primary-button"
                    to={`/menu/alumnos/${selectedStudent.id}/habilidades/nueva`}
                  >
                    <span aria-hidden="true">+</span> Agregar habilidad
                  </Link>
                )}
              </div>
              {skillDeleteError && (
                <p className="assignment-validation" role="alert">{skillDeleteError}</p>
              )}
              {pedagogicalSkills.filter((skill) => skill.studentId === selectedStudent.id).length === 0 ? (
                <div className="students-empty-state pedagogical-skills-empty">
                  <p>Aún no hay habilidades registradas.</p>
                  {canEdit && <span>Agrega una habilidad para completar la ficha del alumno.</span>}
                </div>
              ) : (
                <div className="pedagogical-skills-list">
                  {pedagogicalSkills
                    .filter((skill) => skill.studentId === selectedStudent.id)
                    .map((skill) => (
                      <details className="pedagogical-skill" key={skill.id}>
                        <summary>{skill.title}</summary>
                        <div className="pedagogical-skill-content">
                          <p>{skill.description}</p>
                          {canEdit && (
                            <div className="student-actions">
                              {confirmingSkillDeleteId === skill.id ? (
                                <div
                                  className="student-delete-confirmation"
                                  role="group"
                                  aria-label={`Confirmar eliminación de ${skill.title}`}
                                >
                                  <span>¿Eliminar esta habilidad?</span>
                                  <button
                                    className="student-action-button student-delete-button"
                                    type="button"
                                    onClick={() => void deleteSkill(skill.id)}
                                  >
                                    Confirmar
                                  </button>
                                  <button
                                    className="student-action-button"
                                    type="button"
                                    onClick={() => setConfirmingSkillDeleteId(null)}
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <Link
                                    className="student-action-button"
                                    to={`/menu/alumnos/${selectedStudent.id}/habilidades/${skill.id}/editar`}
                                  >
                                    Editar
                                  </Link>
                                  <button
                                    className="student-action-button student-delete-button"
                                    type="button"
                                    onClick={() => setConfirmingSkillDeleteId(skill.id)}
                                  >
                                    Eliminar
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </details>
                    ))}
                </div>
              )}
            </section>

            {canEdit && (
              <div className="student-profile-actions">
                {confirmingDeleteId === selectedStudent.id ? (
                  <div className="student-delete-confirmation" role="group" aria-label={`Confirmar eliminación de ${selectedStudent.nombres}`}>
                    <span>¿Eliminar a este alumno?</span>
                    <button
                      className="student-action-button student-delete-button"
                      type="button"
                      onClick={() => void deleteStudent(selectedStudent.id)}
                    >
                      Confirmar
                    </button>
                    <button
                      className="student-action-button"
                      type="button"
                      onClick={() => setConfirmingDeleteId(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      className="student-action-button"
                      type="button"
                      onClick={() => openEditStudentForm(selectedStudent)}
                    >
                      Editar
                    </button>
                    <button
                      className="student-action-button student-delete-button"
                      type="button"
                      onClick={() => setConfirmingDeleteId(selectedStudent.id)}
                    >
                      Eliminar
                    </button>
                  </>
                )}
              </div>
            )}
          </section>
        ) : (
          <section className="students-panel" aria-labelledby="students-list-title">
            {saveError && <p className="assignment-validation" role="alert">{saveError}</p>}
            <div className="students-list-heading">
              <div>
                <h2 id="students-list-title">Lista de alumnos</h2>
                <p>{canEdit ? 'Administra los datos de los alumnos registrados.' : 'Consulta los datos de los alumnos registrados.'}</p>
              </div>
              {canEdit && (
                <button className="primary-button" onClick={openNewStudentForm}>
                  <span aria-hidden="true">+</span> Agregar alumno
                </button>
              )}
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
                <span>
                  {canEdit
                    ? 'Agrega un alumno para comenzar a gestionar sus datos.'
                    : 'No hay alumnos disponibles para consultar.'}
                </span>
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
                      <Link className="student-action-button" to={`/menu/alumnos/${student.id}`}>
                        Ver ficha
                      </Link>
                      {canEdit && (confirmingDeleteId === student.id ? (
                        <div className="student-delete-confirmation" role="group" aria-label={`Confirmar eliminación de ${student.nombres}`}>
                          <span>¿Eliminar a este alumno?</span>
                          <button
                            className="student-action-button student-delete-button"
                            type="button"
                            onClick={() => deleteStudent(student.id)}
                          >
                            Confirmar
                          </button>
                          <button
                            className="student-action-button"
                            type="button"
                            onClick={() => setConfirmingDeleteId(null)}
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            className="student-action-button"
                            type="button"
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
                            type="button"
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
                      ))}
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
