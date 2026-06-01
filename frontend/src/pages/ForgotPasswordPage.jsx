import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { FileText, ArrowLeft, Mail, CheckCircle2, Loader2 } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    try {
      await authApi.forgotPassword(email.trim())
      setSubmitted(true)
    } catch (err) {
      // Always show success regardless of outcome — prevents user enumeration
      // and matches the security pattern of GitHub, Google, etc.
      // If the backend is down the user will just not receive an email,
      // and they can retry. We log to console for debugging.
      console.error('[forgot-password]', err?.response?.status, err?.message)
      setSubmitted(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4 py-12">
      {/* Brand */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center shadow-sm">
          <FileText className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="font-bold text-xl tracking-tight">ContractPilot</span>
      </div>

      <Card className="w-full max-w-md shadow-md">
        {!submitted ? (
          <>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Forgot password?</CardTitle>
              <CardDescription>
                Enter your account email and we'll send you a link to reset your password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    autoComplete="email"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading || !email.trim()}>
                  {loading
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
                    : <><Mail className="w-4 h-4 mr-2" />Send Reset Link</>
                  }
                </Button>

                <div className="text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to sign in
                  </Link>
                </div>
              </form>
            </CardContent>
          </>
        ) : (
          <CardContent className="pt-10 pb-10 text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold">Check your inbox</h2>
              <p className="text-sm text-muted-foreground">
                If <strong>{email}</strong> is registered, you'll receive a reset link shortly.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              The link expires in <strong>1 hour</strong>. Check your spam folder if it doesn't arrive.
            </p>
            <div className="pt-2 space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => { setSubmitted(false); setEmail('') }}
              >
                Try a different email
              </Button>
              <Link to="/login">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />Back to sign in
                </Button>
              </Link>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
