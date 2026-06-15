import { useAuthStore } from '@/shared/store/auth'

const BASE = 'http://localhost:8080/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = useAuthStore.getState().token
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  // 문자열 body를 그대로 전송 (text/plain) — Spring @RequestBody String 이 raw string 으로 받을 때 사용
  putString: <T>(path: string, body: string) =>
    request<T>(path, {
      method: 'PUT',
      body,
      headers: { 'Content-Type': 'text/plain' },
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T = void>(path: string) => request<T>(path, { method: 'DELETE' }),
}
