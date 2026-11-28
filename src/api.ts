export type UserRole = 'administrador' | 'profesor' | 'psicologo' | 'consulta'

export type AppUser = {
  id: number
  email: string
  firstName: string
  lastName: string
  role: UserRole
}

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/+$/, '')

const getApiUrl = (path: string) =>
  `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`

const readResponseBody = async (response: Response): Promise<unknown> => {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch (error) {
    if (error instanceof SyntaxError) return text
    throw error
  }
}

const getErrorMessage = (body: unknown, status: number) => {
  if (typeof body === 'string') {
    const message = body.trim()
    return message.length > 300 ? `Error HTTP ${status}.` : message || `Error HTTP ${status}.`
  }

  if (typeof body === 'object' && body !== null) {
    const record = body as Record<string, unknown>
    const detail = record.detail
    if (typeof detail === 'string') return detail

    const messages = Object.entries(record).flatMap(([field, value]) => {
      const values = Array.isArray(value) ? value : [value]
      return values
        .filter((item): item is string => typeof item === 'string')
        .map((item) => `${field}: ${item}`)
    })
    if (messages.length > 0) return messages.join(' ')
  }

  return `Error HTTP ${status}.`
}

const readCsrfToken = async () => {
  const response = await fetch(getApiUrl('/auth/csrf/'), {
    credentials: 'include',
  })
  const body = await readResponseBody(response)
  if (!response.ok) {
    throw new ApiError(getErrorMessage(body, response.status), response.status)
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    typeof (body as Record<string, unknown>).csrfToken !== 'string'
  ) {
    throw new Error('El backend no devolvió un token CSRF válido.')
  }

  return (body as { csrfToken: string }).csrfToken
}

type RequestOptions = {
  method?: string
  body?: unknown
}

export const apiRequest = async <T>(
  path: string,
  { method = 'GET', body }: RequestOptions = {},
): Promise<T> => {
  const headers = new Headers()
  let requestBody: BodyInit | undefined

  if (body !== undefined) {
    if (body instanceof FormData) {
      requestBody = body
    } else {
      headers.set('Content-Type', 'application/json')
      requestBody = JSON.stringify(body)
    }
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
    headers.set('X-CSRFToken', await readCsrfToken())
  }

  const response = await fetch(getApiUrl(path), {
    method,
    headers,
    body: requestBody,
    credentials: 'include',
  })
  const responseBody = await readResponseBody(response)

  if (!response.ok) {
    throw new ApiError(getErrorMessage(responseBody, response.status), response.status)
  }

  return responseBody as T
}

export const login = (email: string, password: string) =>
  apiRequest<AppUser>('/auth/login/', {
    method: 'POST',
    body: { email, password },
  })

export const registerAccount = (
  email: string,
  password: string,
  firstName: string,
  lastName: string,
) =>
  apiRequest<AppUser>('/auth/register/', {
    method: 'POST',
    body: { email, password, firstName, lastName },
  })

export const getCurrentUser = () => apiRequest<AppUser>('/auth/me/')

export const logout = () =>
  apiRequest<{ ok: boolean }>('/auth/logout/', {
    method: 'POST',
    body: {},
  })

export type UserProfileChanges = {
  email: string
  firstName: string
  lastName: string
  currentPassword: string
  newPassword: string
}

export const updateUserProfile = (changes: UserProfileChanges) =>
  apiRequest<AppUser>('/auth/profile/', {
    method: 'POST',
    body: changes,
  })
