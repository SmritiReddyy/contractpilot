import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { signingApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { FileText, CheckCircle2, Loader2, ShieldCheck, XCircle, AlertTriangle, RefreshCw } from 'lucide-react'

// Steps: 'loading' | 'review' | 'otp' | 'sign' | 'signed' | 'declined' | 'error'

export default function SignPage() {
  const { token } = useParams()
  const [step, setStep] = useState('loading')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  // OTP
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [otpSending, setOtpSending] = useState(false)
  const [otpVerifying, setOtpVerifying] = useState(false)
  const [otpError, setOtpError] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const otpRefs = useRef([])

  // Signing
  const [name, setName] = useState('')
  const [consent, setConsent] = useState(false)
  const [signing, setSigning] = useState(false)
  const [signError, setSignError] = useState('')
  const [signResult, setSignResult] = useState(null)

  // Decline
  const [declining, setDeclining] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [showDeclineForm, setShowDeclineForm] = useState(false)

  useEffect(() => {
    signingApi.get(token)
      .then(({ data }) => {
        setData(data)
        if (data.already_signed) { setStep('signed'); return }
        if (data.signer_name) setName(data.signer_name)
        if (data.otp_verified) {
          setStep('sign')
        } else {
          setStep('review')
        }
      })
      .catch(() => { setError('This signing link is invalid or has expired.'); setStep('error') })
  }, [token])

  // Collect browser metadata for the audit trail
  const getBrowserMetadata = () => ({
    screen: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
  })

  const handleSendOtp = async () => {
    setOtpSending(true)
    setOtpError('')
    try {
      await signingApi.sendOtp(token)
      setOtpSent(true)
      setStep('otp')
    } catch (e) {
      setOtpError(e.response?.data?.detail || 'Failed to send code')
    } finally {
      setOtpSending(false)
    }
  }

  const handleOtpInput = (i, value) => {
    if (!/^\d?$/.test(value)) return
    const next = [...otp]
    next[i] = value
    setOtp(next)
    if (value && i < 5) otpRefs.current[i + 1]?.focus()
  }

  const handleOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus()
  }

  const handleVerifyOtp = async () => {
    const code = otp.join('')
    if (code.length < 6) { setOtpError('Enter all 6 digits'); return }
    setOtpVerifying(true)
    setOtpError('')
    try {
      await signingApi.verifyOtp(token, code)
      setStep('sign')
    } catch (e) {
      setOtpError(e.response?.data?.detail || 'Incorrect code')
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    } finally {
      setOtpVerifying(false)
    }
  }

  const handleSign = async () => {
    if (!name.trim()) { setSignError('Please enter your full name'); return }
    if (!consent) { setSignError('You must consent to sign electronically'); return }
    setSigning(true)
    setSignError('')
    try {
      const { data: result } = await signingApi.sign(token, {
        name,
        consent: true,
        metadata: getBrowserMetadata(),
      })
      setSignResult(result)
      setStep('signed')
    } catch (e) {
      setSignError(e.response?.data?.detail || 'Signing failed — please try again')
    } finally {
      setSigning(false)
    }
  }

  const handleDecline = async () => {
    setDeclining(true)
    try {
      await signingApi.decline(token, declineReason)
      setStep('declined')
    } catch (e) {
      setSignError(e.response?.data?.detail || 'Failed to decline')
    } finally {
      setDeclining(false)
    }
  }

  // ── Layouts ──────────────────────────────────────────────

  if (step === 'loading') return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  )

  if (step === 'error') return (
    <Shell>
      <Card>
        <CardContent className="pt-10 pb-10 text-center space-y-3">
          <AlertTriangle className="w-14 h-14 text-amber-500 mx-auto" />
          <h2 className="text-xl font-bold">Link Invalid or Expired</h2>
          <p className="text-muted-foreground text-sm">{error}</p>
        </CardContent>
      </Card>
    </Shell>
  )

  if (step === 'signed') return (
    <Shell>
      <Card>
        <CardContent className="pt-10 pb-10 text-center space-y-3">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
          <h2 className="text-xl font-bold">Contract Signed</h2>
          <p className="text-muted-foreground text-sm">
            You have signed <strong>{data?.contract_title}</strong>.<br />
            A confirmation with your signature receipt has been sent to your email.
          </p>
          {signResult?.content_hash && (
            <div className="mt-4 text-left p-4 bg-muted rounded-md space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Document hash (SHA-256)</p>
              <p className="text-xs font-mono break-all">{signResult.content_hash}</p>
              <p className="text-xs text-muted-foreground mt-2">
                This hash uniquely identifies the exact version of the document you signed.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </Shell>
  )

  if (step === 'declined') return (
    <Shell>
      <Card>
        <CardContent className="pt-10 pb-10 text-center space-y-3">
          <XCircle className="w-14 h-14 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-bold">Signing Declined</h2>
          <p className="text-muted-foreground text-sm">
            You have declined to sign <strong>{data?.contract_title}</strong>. The sender has been notified.
          </p>
        </CardContent>
      </Card>
    </Shell>
  )

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-5">
        <Brand />

        {/* Progress indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <StepDot done active={step === 'review'} label="1. Review" />
          <div className="flex-1 h-px bg-border" />
          <StepDot done={step === 'sign' || step === 'signed'} active={step === 'otp'} label="2. Verify Email" />
          <div className="flex-1 h-px bg-border" />
          <StepDot done={step === 'signed'} active={step === 'sign'} label="3. Sign" />
        </div>

        {/* Step 1: Review contract */}
        {step === 'review' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{data?.contract_title}</CardTitle>
                <CardDescription>Read the full contract before proceeding</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md p-5 bg-background max-h-[55vh] overflow-y-auto">
                  <pre className="contract-content text-sm whitespace-pre-wrap">{data?.contract_content}</pre>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                {otpError && <p className="text-sm text-destructive w-full">{otpError}</p>}
                <div className="flex gap-3 w-full">
                  <Button variant="outline" className="flex-1" onClick={() => setShowDeclineForm(true)}>
                    <XCircle className="w-4 h-4 mr-2" />Decline
                  </Button>
                  <Button className="flex-1" onClick={handleSendOtp} disabled={otpSending}>
                    {otpSending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                    I've read this — verify my email
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  A 6-digit code will be sent to <strong>{data?.signer_email}</strong>
                </p>
              </CardFooter>
            </Card>

            {showDeclineForm && (
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-base text-destructive">Decline to Sign</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Label>Reason (optional)</Label>
                  <Input
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    placeholder="e.g. Terms not agreed upon"
                  />
                </CardContent>
                <CardFooter className="gap-2">
                  <Button variant="outline" onClick={() => setShowDeclineForm(false)}>Cancel</Button>
                  <Button variant="destructive" onClick={handleDecline} disabled={declining}>
                    {declining ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Confirm Decline
                  </Button>
                </CardFooter>
              </Card>
            )}
          </>
        )}

        {/* Step 2: OTP verification */}
        {step === 'otp' && (
          <Card>
            <CardHeader>
              <CardTitle>Verify your email</CardTitle>
              <CardDescription>
                We sent a 6-digit code to <strong>{data?.signer_email}</strong>. Enter it below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {otpError && (
                <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{otpError}</div>
              )}
              <div className="flex gap-2 justify-center">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpInput(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="w-12 h-14 text-center text-xl font-bold border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                ))}
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Code expires in 15 minutes.{' '}
                <button
                  className="text-primary hover:underline inline-flex items-center gap-1"
                  onClick={handleSendOtp}
                  disabled={otpSending}
                >
                  <RefreshCw className="w-3 h-3" />Resend
                </button>
              </p>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={handleVerifyOtp} disabled={otpVerifying || otp.join('').length < 6}>
                {otpVerifying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                Verify Code
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 3: Sign */}
        {step === 'sign' && (
          <>
            {/* Compact contract reminder */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{data?.contract_title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md p-4 bg-background max-h-48 overflow-y-auto">
                  <pre className="contract-content text-xs whitespace-pre-wrap">{data?.contract_content}</pre>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-green-500" />
                    Email verified — sign below
                  </span>
                </CardTitle>
                <CardDescription>
                  Your signature will be recorded with a timestamp, your IP address, and a hash of the document.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {signError && (
                  <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{signError}</div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="sig-name">Full legal name *</Label>
                  <Input
                    id="sig-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Type your full name exactly as it should appear"
                    className="text-lg font-medium h-12"
                  />
                </div>

                {/* Signature preview */}
                {name && (
                  <div className="p-4 border-2 border-dashed rounded-md bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">Signature preview</p>
                    <p className="text-2xl" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>{name}</p>
                  </div>
                )}

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-primary"
                  />
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                    I agree to sign <strong>{data?.contract_title}</strong> electronically. I understand this constitutes a legally binding signature equivalent to a handwritten signature, and I consent to the use of electronic signatures.
                  </span>
                </label>

                <div className="p-3 bg-muted/50 rounded-md text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">What gets recorded:</p>
                  <p>• Your IP address and the exact timestamp of signing</p>
                  <p>• A SHA-256 hash of the document (proves what you signed)</p>
                  <p>• Browser metadata (timezone, platform)</p>
                  <p>• Your email verification via OTP</p>
                </div>
              </CardContent>
              <CardFooter className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-none"
                  onClick={() => setShowDeclineForm(true)}
                >
                  <XCircle className="w-4 h-4 mr-2" />Decline
                </Button>
                <Button
                  className="flex-1"
                  size="lg"
                  onClick={handleSign}
                  disabled={!name.trim() || !consent || signing}
                >
                  {signing
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing...</>
                    : <>Sign as "{name || '...'}"</>
                  }
                </Button>
              </CardFooter>
            </Card>

            {showDeclineForm && (
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-base text-destructive">Decline to Sign</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Label>Reason (optional)</Label>
                  <Input value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} placeholder="Reason..." />
                </CardContent>
                <CardFooter className="gap-2">
                  <Button variant="outline" onClick={() => setShowDeclineForm(false)}>Cancel</Button>
                  <Button variant="destructive" onClick={handleDecline} disabled={declining}>
                    {declining ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Confirm Decline
                  </Button>
                </CardFooter>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Shell({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-muted/30">
      <div className="w-full max-w-md space-y-4">
        <Brand />
        {children}
      </div>
    </div>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-2 justify-center">
      <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
        <FileText className="w-4 h-4 text-primary-foreground" />
      </div>
      <span className="font-bold text-lg">ContractPilot</span>
    </div>
  )
}

function StepDot({ active, done, label }) {
  return (
    <span className={`flex items-center gap-1 ${done ? 'text-green-600' : active ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs border ${done ? 'bg-green-500 border-green-500 text-white' : active ? 'border-primary text-primary' : 'border-muted-foreground'}`}>
        {done ? '✓' : active ? '●' : '○'}
      </span>
      {label}
    </span>
  )
}
