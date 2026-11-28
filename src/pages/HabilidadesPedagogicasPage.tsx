import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import DashboardSidebar, { DashboardPageTitle } from '../components/DashboardSidebar'
import {
  competencyTypeLabels,
  competencyTypes,
  getCompetencyType,
  parseCompetencyType,
  type CompetencyType,
} from '../utils/competencies'
import type { Student } from './AlumnosPage'

export type PedagogicalSkill = {
  id: string
  studentId: number
  title: string
  description: string
  competencyType: CompetencyType
}

type HabilidadesPedagogicasPageProps = {
  students: Student[]
  skills: PedagogicalSkill[]
  canEdit: boolean
  onSkillSave: (skill: PedagogicalSkill) => Promise<void>
  onLogout: () => void
}

type SkillFormProps = {
  student: Student
  skill?: PedagogicalSkill
  onSkillSave: (skill: PedagogicalSkill) => Promise<void>
  onLogout: () => void
}

const SkillForm = ({ student, skill, onSkillSave, onLogout }: SkillFormProps) => {
  const navigate = useNavigate()
  const [title, setTitle] = useState(skill?.title ?? '')
  const [description, setDescription] = useState(skill?.description ?? '')
  const [competencyType, setCompetencyType] = useState(
    getCompetencyType(skill?.competencyType),
  )
  const [saveError, setSaveError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const profilePath = `/menu/alumnos/${student.id}`

  const saveSkill = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSaving) return

    const trimmedTitle = title.trim()
    const trimmedDescription = description.trim()
    if (!trimmedTitle || !trimmedDescription) {
      setSaveError('Ingresa un título y una descripción para la competencia.')
      return
    }

    setIsSaving(true)
    setSaveError('')
    try {
      await onSkillSave({
        id: skill?.id ?? crypto.randomUUID(),
        studentId: student.id,
        title: trimmedTitle,
        description: trimmedDescription,
        competencyType,
      })
      navigate(profilePath)
    } catch (error: unknown) {
      console.error('No se pudo guardar la competencia en el backend.', error)
      setSaveError(
        error instanceof Error ? error.message : 'No se pudo guardar la competencia.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="dashboard-shell">
      <DashboardSidebar onLogout={onLogout} />
      <main className="dashboard-content">
        <header className="dashboard-header students-header">
          <DashboardPageTitle>
            <h1>{skill ? 'Editar competencia' : 'Agregar competencia'}</h1>
          </DashboardPageTitle>
        </header>

        <section className="students-panel" aria-labelledby="pedagogical-skill-form-title">
          <h2 id="pedagogical-skill-form-title">
            {skill ? 'Actualiza la competencia' : 'Nueva competencia'}
          </h2>
          {saveError && <p className="assignment-validation" role="alert">{saveError}</p>}
          <form className="pedagogical-skill-form" onSubmit={saveSkill}>
            <label>
              Título
              <input
                autoFocus
                maxLength={120}
                name="title"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label>
              Tipo de competencia
              <select
                name="competencyType"
                required
                value={competencyType}
                onChange={(event) => {
                  const nextType = parseCompetencyType(event.target.value)
                  if (nextType !== null) setCompetencyType(nextType)
                }}
              >
                {competencyTypes.map((type) => (
                  <option key={type} value={type}>
                    {competencyTypeLabels[type]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Descripción
              <textarea
                maxLength={2000}
                name="description"
                required
                rows={6}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <div className="student-form-actions">
              <button className="primary-button" type="submit" disabled={isSaving}>
                Guardar cambios
              </button>
              <button
                className="secondary-button"
                type="button"
                disabled={isSaving}
                onClick={() => navigate(profilePath)}
              >
                Descartar cambios
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  )
}

const HabilidadesPedagogicasPage = ({
  students,
  skills,
  canEdit,
  onSkillSave,
  onLogout,
}: HabilidadesPedagogicasPageProps) => {
  const { studentId, skillId } = useParams()
  const selectedStudentId = studentId === undefined ? Number.NaN : Number(studentId)
  const student = students.find((item) => item.id === selectedStudentId)
  const skill = skillId === undefined
    ? undefined
    : skills.find((item) => item.id === skillId && item.studentId === selectedStudentId)

  if (!canEdit) {
    return <Navigate to={student ? `/menu/alumnos/${student.id}` : '/menu/alumnos'} replace />
  }

  if (!Number.isSafeInteger(selectedStudentId) || !student) {
    return <Navigate to="/menu/alumnos" replace />
  }

  if (skillId !== undefined && !skill) {
    return <Navigate to={`/menu/alumnos/${student.id}`} replace />
  }

  return (
    <SkillForm
      key={`${student.id}-${skillId ?? 'new'}`}
      student={student}
      skill={skill}
      onSkillSave={onSkillSave}
      onLogout={onLogout}
    />
  )
}

export default HabilidadesPedagogicasPage