import type { ApiErrorBody } from './schema'

/**
 * Toujours un chemin, jamais une adresse : c'est le proxy de Vite qui relaie
 * vers l'API (voir `vite.config.ts`). Appeler l'API en direct ferait réussir la
 * connexion puis répondre 401 partout — le cookie de session est en SameSite=Lax
 * et ne repart jamais en inter-sites.
 */
const BASE = '/api'

/**
 * Erreur normalisée. Le back renvoie toujours `{ code, message, retryable }`
 * avec un `message` déjà rédigé en français, destiné à être affiché tel quel :
 * on ne réécrit pas de catalogue de messages par-dessus.
 */
export class ApiError extends Error {
  readonly code: string
  readonly retryable: boolean
  readonly status: number
  readonly retryAfterSeconds: number | null

  constructor(body: ApiErrorBody, status: number, retryAfterSeconds: number | null = null) {
    super(body.message)
    this.name = 'ApiError'
    this.code = body.code
    this.retryable = body.retryable
    this.status = status
    this.retryAfterSeconds = retryAfterSeconds
  }

  get isUnauthenticated() {
    return this.code === 'UNAUTHENTICATED'
  }

  /** Source externe absente ou non configurée : seule la recherche est concernée. */
  get isSearchUnavailable() {
    return this.code === 'SERVICE_UNCONFIGURED' || this.code === 'UPSTREAM_UNAVAILABLE'
  }
}

/** Le proxy est injoignable (machine éteinte, IP changée) : ce n'est pas une erreur métier. */
const networkError = () =>
  new ApiError(
    {
      code: 'NETWORK',
      message:
        "L'API est injoignable. Vérifie qu'elle tourne et que l'adresse configurée dans vite.config.ts est la bonne.",
      retryable: true,
    },
    0,
  )

const parseRetryAfter = (value: string | null): number | null => {
  if (!value) return null
  const seconds = Number(value)
  return Number.isFinite(seconds) ? seconds : null
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | boolean | null | undefined>
  signal?: AbortSignal
}

const buildUrl = (path: string, query?: RequestOptions['query']) => {
  if (!query) return `${BASE}${path}`
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== undefined && value !== '') params.set(key, String(value))
  }
  const qs = params.toString()
  return qs ? `${BASE}${path}?${qs}` : `${BASE}${path}`
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, signal } = options

  let response: Response
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      signal,
      // Inutile en même origine, mais garde le code valable le jour où l'API
      // sera réellement en ligne.
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
        // Sans effet en mode proxy (SameSite=Lax), exigé sur les écritures dès
        // que l'API passe en SameSite=None. Le poser toujours coûte une ligne.
        'X-Mediatheque-Client': 'mediatheque-front',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw networkError()
  }

  if (response.status === 204) return undefined as T

  const raw = await response.text()
  let payload: unknown = null
  if (raw) {
    try {
      payload = JSON.parse(raw)
    } catch {
      payload = null
    }
  }

  if (!response.ok) {
    const envelope = payload as Partial<ApiErrorBody> | null
    const body: ApiErrorBody =
      envelope && typeof envelope.code === 'string' && typeof envelope.message === 'string'
        ? { code: envelope.code, message: envelope.message, retryable: envelope.retryable === true }
        : {
            code: 'INTERNAL',
            message: "Une erreur inattendue est survenue. Réessaie, et signale-la si elle persiste.",
            retryable: false,
          }
    throw new ApiError(body, response.status, parseRetryAfter(response.headers.get('Retry-After')))
  }

  return payload as T
}

export const api = {
  get: <T>(path: string, query?: RequestOptions['query'], signal?: AbortSignal) =>
    request<T>(path, { method: 'GET', query, signal }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
