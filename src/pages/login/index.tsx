import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { api } from '@/shared/lib/api'
import { useAuthStore } from '@/shared/store/auth'

type Tab = 'login' | 'signup'

interface LoginResponse {
  token: string
  expiresAt: string
  id: number
  username: string
  displayName: string
  role: string
}

export function LoginPage() {
  const [tab, setTab] = useState<Tab>('login')
  const token = useAuthStore((s) => s.token)

  if (token) return <Navigate to="/" replace />

  return (
    <div className="min-h-screen bg-[#002c6c] flex items-center justify-center">
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            'radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-[380px] bg-white rounded-2xl shadow-2xl p-8">
        {/* 로고 */}
        <div className="flex flex-col items-center mb-6">
          <img src="/logo.svg" alt="Hyundai" height={22} className="mb-4" />
          <div className="w-full h-px bg-slate-100 mb-4" />
          <h1 className="text-[17px] font-bold text-slate-800 m-0 tracking-tight">
            통합안전관제시스템
          </h1>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-slate-100 mb-6">
          {(['login', 'signup'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                'flex-1 pb-2.5 text-[13px] font-semibold transition-colors border-b-2 -mb-px',
                tab === t
                  ? 'border-[#003087] text-[#003087]'
                  : 'border-transparent text-slate-400 hover:text-slate-600',
              ].join(' ')}
            >
              {t === 'login' ? '로그인' : '회원가입'}
            </button>
          ))}
        </div>

        {tab === 'login' ? <LoginForm /> : <SignupForm onSuccess={() => setTab('login')} />}

        <p className="mt-5 text-center text-[11px] text-slate-300 m-0">
          Hyundai Motor Company · EHS System
        </p>
      </div>
    </div>
  )
}

function LoginForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post<LoginResponse>('/auth/login', { username, password })
      login(res.token, {
        id: res.id,
        username: res.username,
        displayName: res.displayName,
        role: res.role,
      })
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-[12px] font-semibold text-slate-500">아이디</label>
        <input
          type="text"
          placeholder="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          className="h-11 px-3.5 border border-slate-200 rounded-xl text-[14px] focus:outline-none focus:border-[#003087] transition-colors"
          required
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[12px] font-semibold text-slate-500">비밀번호</label>
        <input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="h-11 px-3.5 border border-slate-200 rounded-xl text-[14px] focus:outline-none focus:border-[#003087] transition-colors"
          required
        />
      </div>

      {error && (
        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-[12px] text-red-600 m-0">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-1 h-11 bg-[#003087] text-white text-[14px] font-semibold rounded-xl hover:bg-[#002470] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? '로그인 중...' : '로그인'}
      </button>
    </form>
  )
}

interface SignupFormProps {
  onSuccess: () => void
}

function SignupForm({ onSuccess }: SignupFormProps) {
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/signup', {
        username,
        password,
        displayName: displayName.trim() || username,
      })
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원가입 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-[12px] font-semibold text-slate-500">
          아이디 <span className="text-slate-400 font-normal">(4자 이상)</span>
        </label>
        <input
          type="text"
          placeholder="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          minLength={4}
          className="h-11 px-3.5 border border-slate-200 rounded-xl text-[14px] focus:outline-none focus:border-[#003087] transition-colors"
          required
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[12px] font-semibold text-slate-500">
          이름 <span className="text-slate-400 font-normal">(선택)</span>
        </label>
        <input
          type="text"
          placeholder="홍길동"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          autoComplete="name"
          className="h-11 px-3.5 border border-slate-200 rounded-xl text-[14px] focus:outline-none focus:border-[#003087] transition-colors"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[12px] font-semibold text-slate-500">
          비밀번호 <span className="text-slate-400 font-normal">(6자 이상)</span>
        </label>
        <input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={6}
          className="h-11 px-3.5 border border-slate-200 rounded-xl text-[14px] focus:outline-none focus:border-[#003087] transition-colors"
          required
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[12px] font-semibold text-slate-500">비밀번호 확인</label>
        <input
          type="password"
          placeholder="••••••••"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          autoComplete="new-password"
          className={[
            'h-11 px-3.5 border rounded-xl text-[14px] focus:outline-none transition-colors',
            passwordConfirm && password !== passwordConfirm
              ? 'border-red-300 focus:border-red-400'
              : 'border-slate-200 focus:border-[#003087]',
          ].join(' ')}
          required
        />
      </div>

      {error && (
        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-[12px] text-red-600 m-0">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-1 h-11 bg-[#003087] text-white text-[14px] font-semibold rounded-xl hover:bg-[#002470] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? '가입 중...' : '회원가입'}
      </button>
    </form>
  )
}
