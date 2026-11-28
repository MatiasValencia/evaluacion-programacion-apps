export const competencyTypes = ['basica', 'generica', 'especifica'] as const
export type CompetencyType = (typeof competencyTypes)[number]

export const competencyTypeLabels: Record<CompetencyType, string> = {
  basica: 'Competencia básica',
  generica: 'Competencia genérica',
  especifica: 'Competencia específica',
}

export const parseCompetencyType = (value: string): CompetencyType | null => {
  switch (value) {
    case 'basica':
    case 'generica':
    case 'especifica':
      return value
    default:
      return null
  }
}

export const getCompetencyType = (value: string | undefined): CompetencyType =>
  parseCompetencyType(value ?? '') ?? 'generica'
