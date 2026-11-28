export const normalizeSearchText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')

export const matchesSearch = (value: string, query: string) =>
  normalizeSearchText(value).includes(normalizeSearchText(query.trim()))
