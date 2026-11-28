import { apiRequest } from './api'
import type { Student } from './pages/AlumnosPage'
import type { Assignment } from './pages/AsignaturasPage'
import type { AttendanceRecord } from './pages/AsistenciaPage'
import type { EvaluationGrade } from './pages/EvaluacionesPage'
import type { PedagogicalSkill } from './pages/HabilidadesPedagogicasPage'
import { competencyTypes, type CompetencyType } from './utils/competencies'

export type AppData = {
  students: Student[]
  assignments: Assignment[]
  attendanceRecords: AttendanceRecord[]
  evaluationGrades: EvaluationGrade[]
  pedagogicalSkills: PedagogicalSkill[]
}

type ApiStudent = Omit<Student, 'foto'> & {
  fotografia: string | null
}

type ApiAssignment = {
  id: number
  nombre: string
  cantidadNotas: number
  porcentajeNotas: number[]
  estudiantes: number[]
}

type ApiAttendance = {
  id: number
  asignatura: number
  fecha: string
  horaInicio: string
  horaFin: string
}

type ApiAttendanceStudent = {
  id: number
  asistencia: number
  estudiante: number
  presente: boolean
}

type ApiEvaluation = {
  id: number
  asignatura: number
  estudiante: number
  numero: number
  nota: string | number
}

type ApiCompetencyType = {
  id: number
  nombreTipoCompetencia: string
}

type ApiCompetency = {
  id: number
  nombreCompetencia: string
  tipoCompetencia: number
  estudiante: number
  descripcion: string
}

const apiList = async <T>(path: string): Promise<T[]> => {
  const response = await apiRequest<unknown>(path)
  if (Array.isArray(response)) return response as T[]

  if (
    typeof response === 'object' &&
    response !== null &&
    'results' in response &&
    Array.isArray(response.results)
  ) {
    return response.results as T[]
  }

  throw new Error(`El backend devolvió una lista inválida para ${path}.`)
}

const idNumber = (value: string | number, field: string) => {
  const id = Number(value)
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new Error(`El identificador de ${field} no es válido.`)
  }
  return id
}

const numericRecordId = (id: string | number) => {
  const parsedId = Number(id)
  return Number.isSafeInteger(parsedId) && parsedId > 0 ? parsedId : null
}

const apiMediaUrl = (value: string) => {
  if (/^https?:\/\//i.test(value)) return value
  return new URL(value, 'https://prufodis-ucen-apirest.onrender.com').toString()
}

const dateToUi = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value
}

const dateToApi = (value: string) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value
}

const timeToUi = (value: string) => {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i.exec(value.trim())
  if (!match) return value

  let hour = Number(match[1])
  if (match[3]) {
    const period = match[3].toUpperCase()
    hour = (hour % 12) + (period === 'PM' ? 12 : 0)
  }
  return `${String(hour).padStart(2, '0')}:${match[2]}`
}

const timeToApi = (value: string) => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value)
  if (!match) throw new Error('La hora de asistencia no tiene un formato válido.')

  const hour = Number(match[1])
  return `${String(hour % 12 || 12).padStart(2, '0')}:${match[2]} ${hour < 12 ? 'AM' : 'PM'}`
}

const toCompetencyType = (name: string): CompetencyType => {
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  const type = competencyTypes.find((candidate) => normalized.includes(candidate))
  if (type === undefined) {
    throw new Error(`El backend devolvió un tipo de competencia desconocido: ${name}.`)
  }
  return type
}

const apiRecordUrl = (path: string, id: number | null) =>
  id === null ? path : `${path}${id}/`

export const loadAppData = async (): Promise<AppData> => {
  const [
    apiStudents,
    apiAssignments,
    apiAttendance,
    apiAttendanceStudents,
    apiEvaluations,
    apiCompetencies,
    apiCompetencyTypes,
  ] = await Promise.all([
    apiList<ApiStudent>('/estudiantes/'),
    apiList<ApiAssignment>('/asignaturas/'),
    apiList<ApiAttendance>('/asistencia/'),
    apiList<ApiAttendanceStudent>('/asistencia-estudiante/'),
    apiList<ApiEvaluation>('/evaluaciones/'),
    apiList<ApiCompetency>('/competencias/'),
    apiList<ApiCompetencyType>('/tipo-competencias/'),
  ])

  const students: Student[] = apiStudents.map(({ fotografia, ...student }) => ({
    ...student,
    ...(fotografia ? { foto: apiMediaUrl(fotografia) } : {}),
  }))
  const assignments: Assignment[] = apiAssignments.map((assignment) => ({
    id: String(assignment.id),
    nombre: assignment.nombre,
    studentIds: assignment.estudiantes,
    gradeCount: assignment.cantidadNotas,
    gradeWeights: assignment.porcentajeNotas,
  }))
  const studentById = new Map(students.map((student) => [student.id, student]))
  const assignmentById = new Map(assignments.map((assignment) => [assignment.id, assignment]))
  const attendanceStudentsByRecord = new Map<number, ApiAttendanceStudent[]>()
  apiAttendanceStudents.forEach((attendanceStudent) => {
    const rows = attendanceStudentsByRecord.get(attendanceStudent.asistencia) ?? []
    rows.push(attendanceStudent)
    attendanceStudentsByRecord.set(attendanceStudent.asistencia, rows)
  })

  const attendanceRecords: AttendanceRecord[] = apiAttendance.map((record) => ({
    id: String(record.id),
    assignmentId: String(record.asignatura),
    assignmentName: assignmentById.get(String(record.asignatura))?.nombre ?? '',
    date: dateToUi(record.fecha),
    startTime: timeToUi(record.horaInicio),
    endTime: timeToUi(record.horaFin),
    students: (attendanceStudentsByRecord.get(record.id) ?? []).map((item) => {
      const student = studentById.get(item.estudiante)
      return {
        studentId: item.estudiante,
        studentName: student
          ? `${student.nombres} ${student.primerApellido} ${student.segundoApellido}`.trim()
          : '',
        present: item.presente,
      }
    }),
  }))

  const apiTypeById = new Map(apiCompetencyTypes.map((type) => [type.id, type]))
  const pedagogicalSkills: PedagogicalSkill[] = apiCompetencies.map((skill) => {
    const type = apiTypeById.get(skill.tipoCompetencia)
    if (type === undefined) {
      throw new Error(`No se encontró el tipo de competencia ${skill.tipoCompetencia}.`)
    }

    return {
      id: String(skill.id),
      studentId: skill.estudiante,
      title: skill.nombreCompetencia,
      description: skill.descripcion,
      competencyType: toCompetencyType(type.nombreTipoCompetencia),
    }
  })

  const evaluationGrades = [...apiEvaluations]
    .sort(
      (left, right) =>
        left.asignatura - right.asignatura ||
        left.estudiante - right.estudiante ||
        left.numero - right.numero,
    )
    .map((grade): EvaluationGrade => ({
      id: String(grade.id),
      assignmentId: String(grade.asignatura),
      studentId: grade.estudiante,
      value: Number(grade.nota),
      gradeNumber: grade.numero,
    }))

  return {
    students,
    assignments,
    attendanceRecords,
    evaluationGrades,
    pedagogicalSkills,
  }
}

export const saveStudent = async (student: Student) => {
  const id = student.id > 0 ? student.id : null
  const { foto } = student
  const fields = {
    nombres: student.nombres,
    primerApellido: student.primerApellido,
    segundoApellido: student.segundoApellido,
    rut: student.rut,
    apoderado: student.apoderado,
    telefono: student.telefono,
  }
  const path = apiRecordUrl('/estudiantes/', id)
  const method = id === null ? 'POST' : 'PATCH'

  if (foto?.startsWith('data:image/')) {
    const photoResponse = await fetch(foto)
    if (!photoResponse.ok) {
      throw new Error('No se pudo preparar la fotografía para subirla.')
    }
    const photoBlob = await photoResponse.blob()
    const formData = new FormData()
    Object.entries(fields).forEach(([name, value]) => formData.append(name, String(value)))
    formData.append(
      'fotografia',
      photoBlob,
      foto.startsWith('data:image/png') ? 'fotografia.png' : 'fotografia.jpg',
    )
    await apiRequest(path, { method, body: formData })
    return
  }

  const body: Record<string, unknown> = { ...fields }
  if (foto === '') body.fotografia = null
  await apiRequest(path, { method, body })
}

export const deleteStudent = (studentId: number) =>
  apiRequest(`/estudiantes/${idNumber(studentId, 'alumno')}/`, { method: 'DELETE' })

export const saveAssignment = (assignment: Assignment) => {
  const id = numericRecordId(assignment.id)
  return apiRequest(apiRecordUrl('/asignaturas/', id), {
    method: id === null ? 'POST' : 'PATCH',
    body: {
      nombre: assignment.nombre,
      cantidadNotas: assignment.gradeCount ?? 1,
      porcentajeNotas: assignment.gradeWeights ?? [100],
      estudiantes: assignment.studentIds,
    },
  })
}

export const saveAssignmentRoster = (assignmentId: string, studentIds: number[]) =>
  apiRequest(`/asignaturas/${idNumber(assignmentId, 'asignatura')}/`, {
    method: 'PATCH',
    body: { estudiantes: studentIds },
  })

export const deleteAssignment = (assignmentId: string) =>
  apiRequest(`/asignaturas/${idNumber(assignmentId, 'asignatura')}/`, {
    method: 'DELETE',
  })

export const saveAttendance = (record: AttendanceRecord) => {
  const id = numericRecordId(record.id)
  return apiRequest(apiRecordUrl('/asistencia/', id), {
    method: id === null ? 'POST' : 'PATCH',
    body: {
      asignatura: idNumber(record.assignmentId, 'asignatura'),
      fecha: dateToApi(record.date),
      horaInicio: timeToApi(record.startTime),
      horaFin: timeToApi(record.endTime),
      estudiantes: record.students.map((student) => ({
        estudiante: idNumber(student.studentId, 'alumno'),
        presente: student.present,
      })),
    },
  })
}

export const deleteAttendance = (recordId: string) =>
  apiRequest(`/asistencia/${idNumber(recordId, 'asistencia')}/`, { method: 'DELETE' })

export const saveEvaluationGrades = async (
  previousGrades: EvaluationGrade[],
  nextGrades: EvaluationGrade[],
) => {
  const previousById = new Map(previousGrades.map((grade) => [grade.id, grade]))
  const nextById = new Map(nextGrades.map((grade) => [grade.id, grade]))

  for (const grade of nextGrades) {
    const previous = previousById.get(grade.id)
    if (
      previous !== undefined &&
      previous.assignmentId === grade.assignmentId &&
      previous.studentId === grade.studentId &&
      previous.value === grade.value &&
      previous.gradeNumber === grade.gradeNumber
    ) {
      continue
    }

    const id = numericRecordId(grade.id)
    await apiRequest(apiRecordUrl('/evaluaciones/', id), {
      method: id === null ? 'POST' : 'PATCH',
      body: {
        asignatura: idNumber(grade.assignmentId, 'asignatura'),
        estudiante: idNumber(grade.studentId, 'alumno'),
        numero: grade.gradeNumber ?? 1,
        nota: grade.value,
      },
    })
  }

  for (const grade of previousGrades) {
    if (nextById.has(grade.id)) continue
    await apiRequest(`/evaluaciones/${idNumber(grade.id, 'evaluación')}/`, {
      method: 'DELETE',
    })
  }
}

export const savePedagogicalSkill = async (skill: PedagogicalSkill) => {
  const competencyTypesFromApi = await apiList<ApiCompetencyType>('/tipo-competencias/')
  const typeIdByName = new Map(
    competencyTypesFromApi.map((type) => [
      toCompetencyType(type.nombreTipoCompetencia),
      type.id,
    ]),
  )
  const typeId = typeIdByName.get(skill.competencyType)
  if (typeId === undefined) {
    throw new Error(`El backend no tiene configurado el tipo de competencia ${skill.competencyType}.`)
  }

  const id = numericRecordId(skill.id)
  return apiRequest(apiRecordUrl('/competencias/', id), {
    method: id === null ? 'POST' : 'PATCH',
    body: {
      nombreCompetencia: skill.title,
      tipoCompetencia: typeId,
      estudiante: idNumber(skill.studentId, 'alumno'),
      descripcion: skill.description,
    },
  })
}

export const deletePedagogicalSkill = (skillId: string) =>
  apiRequest(`/competencias/${idNumber(skillId, 'competencia')}/`, {
    method: 'DELETE',
  })
