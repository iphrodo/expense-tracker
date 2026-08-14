import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'

export function SignInScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setIsSubmitting(false)
    if (signInError) {
      setError('Incorrect email or password.')
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-white p-4 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xs space-y-4 rounded-lg border border-neutral-200 p-6 dark:border-neutral-800"
      >
        <h1 className="text-lg font-semibold">Sign in</h1>
        <div className="space-y-1">
          <label htmlFor="email" className="block text-sm text-neutral-600 dark:text-neutral-400">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor="password"
            className="block text-sm text-neutral-600 dark:text-neutral-400"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
