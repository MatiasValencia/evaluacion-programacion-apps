import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import EvaluacionesPage, { type EvaluationGrade } from './EvaluacionesPage'

const student = {
  id: 1,
  nombres: 'Ana',
  primerApellido: 'Pérez',
  segundoApellido: 'López',
  rut: '1-9',
  apoderado: 'Apoderado',
  telefono: '123456789',
}

const assignment = {
  id: 'assignment-1',
  nombre: 'Matemáticas',
  studentIds: [student.id],
  gradeCount: 1,
  gradeWeights: [100],
}

const onGradesSave = vi.fn<
  (previousGrades: EvaluationGrade[], nextGrades: EvaluationGrade[]) => Promise<void>
>(() => Promise.resolve())

const renderPage = () => {
  const user = userEvent.setup()

  render(
    <MemoryRouter initialEntries={['/menu/evaluaciones']}>
      <EvaluacionesPage
        students={[student]}
        assignments={[assignment]}
        grades={[]}
        canEdit
        onGradesSave={onGradesSave}
        onLogout={vi.fn()}
      />
    </MemoryRouter>,
  )

  return user
}

const beginGradeEntry = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'Registrar notas' }))
  await user.selectOptions(screen.getByRole('combobox', { name: 'Asignatura' }), assignment.id)
  await user.click(
    screen.getByRole('button', { name: 'Agregar nota 1 a Ana Pérez López' }),
  )
  return screen.getByRole('textbox', { name: 'Nota 1 de Ana Pérez López' })
}

describe('EvaluacionesPage: registro de notas', () => {
  afterEach(cleanup)

  beforeEach(() => {
    onGradesSave.mockClear()
  })

  it('CP-01: guarda y muestra una nota ingresada con coma decimal', async () => {
    const user = renderPage()
    const input = await beginGradeEntry(user)

    await user.type(input, '5,5')
    await user.keyboard('{Enter}')

    expect(screen.getByRole('button', { name: '5,5' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Guardar notas' }))

    await waitFor(() => expect(onGradesSave).toHaveBeenCalledOnce())
    expect(onGradesSave.mock.calls[0][1][0].value).toBe(5.5)
  })

  it('CP-02: convierte el punto decimal en coma al mostrar la nota', async () => {
    const user = renderPage()
    const input = await beginGradeEntry(user)

    await user.type(input, '4.8')
    await user.keyboard('{Enter}')

    expect(screen.getByRole('button', { name: '4,8' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Guardar notas' }))

    await waitFor(() => expect(onGradesSave).toHaveBeenCalledOnce())
    expect(onGradesSave.mock.calls[0][1][0].value).toBe(4.8)
  })

  it.each(['1,0', '7,0'])('CP-03/04: acepta la nota válida %s', async (grade) => {
    const user = renderPage()
    const input = await beginGradeEntry(user)

    await user.type(input, grade)
    await user.keyboard('{Enter}')

    expect(screen.getByRole('button', { name: grade })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it.each(['7,1', '0,9'])('CP-05: rechaza la nota fuera de rango %s', async (grade) => {
    const user = renderPage()
    const input = await beginGradeEntry(user)

    await user.type(input, grade)
    await user.keyboard('{Enter}')

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Ingresa una nota decimal entre 1,0 y 7,0.',
    )
    expect(onGradesSave).not.toHaveBeenCalled()
  })

  it('CP-06: impide guardar mientras la celda de nota sigue en edición', async () => {
    const user = renderPage()
    const input = await beginGradeEntry(user)

    await user.type(input, '5,5')
    await user.click(screen.getByRole('button', { name: 'Guardar notas' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'La celda correspondiente a la nota está sin datos.',
    )
    expect(onGradesSave).not.toHaveBeenCalled()
  })
})
