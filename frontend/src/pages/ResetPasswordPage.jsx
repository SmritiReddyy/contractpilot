import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { FileText, ArrowLeft, Eye, EyeOff, CheckCircle2, Loader2, AlertTriangle, KeyRound } from 'lucide-react'

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One number', test: (p) => /\d/.test(p) },
]

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const token = searchParams.get('token') || ''
  const email = searchParams.get('email') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  // Redirect to login after success countdown
  const [countdown, setCountdown] = useState(5)
  useEffect(() => {
    if (!success) return
    const t = setInterval(() => setCountdown((c) => c - 1), 1000)
    return () => clearInterval(t)
  }, [success])
  useEffect(() => {
    if (countdown <= 0) navigate('/login')
  }, [countdown, navigate])

  const rules = PASSWORD_RULES.map((r) => ({ ...r, passed: r.test(password) }))
  const allRulesPassed = rules.every((r) => r.passed)
  const passwordsMatch = password === confirm && confirm.length > 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!token) { setError('Missing reset token. Please use the link from your email.'); return }
    if (!allRulesPassed) { setError('Password does not meet all requirements'); return }
    if (!passwordsMatch) { setError('Passwords do not match'); return }

    setLoading(true)
    setError('')
    try {
      await authApi.resetPassword(token, password)
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Reset failed. The link may have expired — please request a new one.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <Shell>
        <Card>
          <CardContent className="pt-10 pb-10 text-center space-y-4">
            <AlertTriangle className="w-14 h-14 text-amber-500 mx-auto" />
            <h2 className="text-xl font-bold">Invalid Reset Link</h2>
            <p className="text-sm text-muted-foreground">
              This reset link is missing required parameters. Please request a new one.
            </p>
            <Link to="/forgot-password">
              <Button className="w-full">Request new link</Button>
            </Link>
          </CardContent>
        </Card>
      </Shell>
    )
  }

  return (
    <Shell>
      <Card className="shadow-md">
        {success ? (
          <CardContent className="pt-10 pb-10 text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold">Password updated!</h2>
              <p className="text-sm text-muted-foreground">
                Your password has been reset successfully.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Redirecting to sign in in <strong>{countdown}</strong>s…
            </p>
            <Link to="/login">
              <Button className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />Sign in now
              </Button>
            </Link>
          </CardContent>
        ) : (
          <>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Set new password</CardTitle>
              <CardDescription>
                {email && <>For <strong>{email}</strong> — </>}choose a strong password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                    {error}
                    {error.includes('expired') && (
                      <span> <Link to="/forgot-password" className="underline font-medium">Request a new link</Link>.</span>
                    )}
                  </div>
                )}

                {/* New password */}
                <div className="space-y-2">
                  <Label htmlFor="password">New password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                      autoFocus
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password strength rules */}
                  {password.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {rules.map((r) => (
                        <li key={r.label} className={`flex items-center gap-2 text-xs ${r.passed ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${r.passed ? 'bg-green-500 text-white' : 'bg-muted'}`}>
                            {r.passed ? '✓' : '·'}
                          </span>
                          {r.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Confirm password */}
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirm password</Label>
                  <div className="relative">
                    <Input
                      id="confirm"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Re-enter new password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className={`pr-10 ${confirm.length > 0 ? (passwordsMatch ? 'border-green-400 focus-visible:ring-green-400' : 'border-destructive focus-visible:ring-destructive') : ''}`}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowConfirm((v) => !v)}
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirm.length > 0 && !passwordsMatch && (
                    <p className="text-xs text-destructive">Passwords don't match</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || !allRulesPassed || !passwordsMatch}
                >
                  {loading
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating...</>
                    : <><KeyRound className="w-4 h-4 mr-2" />Set New Password</>
                  }
                </Button>

                <div className="text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />Back to sign in
                  </Link>
                </div>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </Shell>
  )
}

function Shell({ children }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <div className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center shadow-sm">
          <FileText className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="font-bold text-xl tracking-tight">ContractPilot</span>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
