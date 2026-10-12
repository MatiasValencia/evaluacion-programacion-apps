import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
  type Unsubscribe,
  type WriteBatch,
} from 'firebase/firestore'
import { firebaseDb } from './firebase'
import type { Student } from './pages/AlumnosPage'
import type { Assignment } from './pages/AsignaturasPage'
import type { AttendanceRecord } from './pages/AsistenciaPage'
import type { EvaluationGrade } from './pages/EvaluacionesPage'

type StoreData = {
  students: Student[]
  assignments: Assignment[]
  attendanceRecords: AttendanceRecord[]
  evaluationGrades: EvaluationGrade[]
}

type StoreCollection = keyof StoreData
type StoreRecord = StoreData[StoreCollection][number]

const collectionNames: StoreCollection[] = [
  'students',
  'assignments',
  'attendanceRecords',
  'evaluationGrades',
]

const storageKeys: Record<StoreCollection, string> = {
  students: 'prufodis-students',
  assignments: 'prufodis-assignments',
  attendanceRecords: 'prufodis-attendance',
  evaluationGrades: 'prufodis-evaluation-grades',
}

const requireFirestore = () => {
  if (firebaseDb === null) {
    throw new Error('Firebase no está configurado. Completa las variables de entorno.')
  }

  return firebaseDb
}

const recordDocument = (name: StoreCollection, id: string | number) =>
  doc(requireFirestore(), name, String(id))

const readStoredArray = <T extends { id: string | number }>(key: string): T[] => {
  const storedValue = localStorage.getItem(key)
  if (storedValue === null) return []

  const parsedValue: unknown = JSON.parse(storedValue)
  if (
    !Array.isArray(parsedValue) ||
    parsedValue.some(
      (record) =>
        typeof record !== 'object' ||
        record === null ||
        !('id' in record) ||
        (typeof record.id !== 'string' && typeof record.id !== 'number'),
    )
  ) {
    throw new Error(`Los datos guardados en "${key}" no tienen un formato válido.`)
  }

  return parsedValue as T[]
}

const readLocalData = (): StoreData => ({
  students: readStoredArray<Student>(storageKeys.students),
  assignments: readStoredArray<Assignment>(storageKeys.assignments),
  attendanceRecords: readStoredArray<AttendanceRecord>(storageKeys.attendanceRecords),
  evaluationGrades: readStoredArray<EvaluationGrade>(storageKeys.evaluationGrades),
})

const commitOperations = async (operations: ((batch: WriteBatch) => void)[]) => {
  const db = requireFirestore()

  for (let start = 0; start < operations.length; start += 450) {
    const batch = writeBatch(db)
    operations.slice(start, start + 450).forEach((operation) => operation(batch))
    await batch.commit()
  }
}

export const subscribeToCollection = <K extends StoreCollection>(
  name: K,
  onData: (records: StoreData[K]) => void,
  onError: (error: Error) => void,
): Unsubscribe =>
  onSnapshot(
    collection(requireFirestore(), name),
    (snapshot) => {
      onData(snapshot.docs.map((record) => record.data()) as StoreData[K])
    },
    onError,
  )

export const saveRecord = async (name: StoreCollection, record: StoreRecord) => {
  await setDoc(recordDocument(name, record.id), record)
}

export const deleteRecord = async (name: StoreCollection, id: string | number) => {
  await deleteDoc(recordDocument(name, id))
}

export const deleteStudentAndUnlinkFromAssignments = async (studentId: number) => {
  const db = requireFirestore()
  const assignmentSnapshot = await getDocs(collection(db, 'assignments'))
  const operations: ((batch: WriteBatch) => void)[] = [
    (batch) => batch.delete(recordDocument('students', studentId)),
  ]

  assignmentSnapshot.docs.forEach((assignmentDocument) => {
    const assignment = assignmentDocument.data() as Assignment
    if (!assignment.studentIds.includes(studentId)) return

    operations.push((batch) =>
      batch.update(assignmentDocument.ref, {
        studentIds: assignment.studentIds.filter((id) => id !== studentId),
      }),
    )
  })

  await commitOperations(operations)
}

export const saveEvaluationGrades = async (
  previousGrades: EvaluationGrade[],
  nextGrades: EvaluationGrade[],
) => {
  const previousById = new Map(previousGrades.map((grade) => [grade.id, grade]))
  const nextById = new Map(nextGrades.map((grade) => [grade.id, grade]))
  const operations: ((batch: WriteBatch) => void)[] = []

  nextGrades.forEach((grade) => {
    if (JSON.stringify(previousById.get(grade.id)) === JSON.stringify(grade)) return
    operations.push((batch) => batch.set(recordDocument('evaluationGrades', grade.id), grade))
  })

  previousGrades.forEach((grade) => {
    if (nextById.has(grade.id)) return
    operations.push((batch) => batch.delete(recordDocument('evaluationGrades', grade.id)))
  })

  await commitOperations(operations)
}

export const initializeFirestoreData = async (): Promise<StoreData> => {
  const db = requireFirestore()
  const migrationDocument = doc(db, 'metadata', 'localStorageMigration')
  const migrationSnapshot = await getDoc(migrationDocument)

  if (!migrationSnapshot.exists()) {
    const remoteCollections = await Promise.all(
      collectionNames.map((name) => getDocs(collection(db, name))),
    )
    const remoteDatabaseIsEmpty = remoteCollections.every((snapshot) => snapshot.empty)

    if (remoteDatabaseIsEmpty) {
      const localData = readLocalData()
      const operations: ((batch: WriteBatch) => void)[] = []

      collectionNames.forEach((name) => {
        localData[name].forEach((record) => {
          operations.push((batch) => batch.set(recordDocument(name, record.id), record))
        })
      })

      await commitOperations(operations)
    }

    await setDoc(migrationDocument, {
      completedAt: serverTimestamp(),
      importedLocalData: remoteDatabaseIsEmpty,
    })
  }

  const collectionSnapshots = await Promise.all(
    collectionNames.map((name) => getDocs(collection(db, name))),
  )

  return Object.fromEntries(
    collectionNames.map((name, index) => [
      name,
      collectionSnapshots[index].docs.map((record) => record.data()),
    ]),
  ) as StoreData
}
