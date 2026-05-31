import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { contractsApi } from '@/lib/api'
import { formatDate, formatDateTime, statusColor, riskColor, riskIcon } from '@/lib/utils'
import { downloadContractPDF } from '@/lib/pdf'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog'
import {
  ArrowLeft, Download, Send, Shield, History, Users, Edit3, Check, X,
  RotateCcw, Loader2, Copy, AlertTriangle, ShieldCheck, Clock, Eye,
  CheckCircle2, XCircle, Mail, FileDigit
} from 'lucide-react'

const EVENT_META = {
  viewed:       { label: 'Link opened',          icon: Eye,          color: 'text-blue-500' },
  otp_sent:     { label: 'OTP code sent',         icon: Mail,         color: 'text-indigo-500' },
  otp_verified: { label: 'Email verified',        icon: ShieldCheck,  color: 'text-green-500' },
  otp_failed:   { label: 'OTP attempt failed',    icon: AlertTriangle,color: 'text-amber-500' },
  signed:       { label: 'Contract signed',       icon: CheckCircle2, color: 'text-green-600' },
  declined:     { label: 'Signing declined',      icon: XCircle,      color: 'text-red-500' },
}

export default function ContractDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [contract, setContract] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [saving, setSaving] = useState(false)

  const [signerDialog, setSignerDialog] = useState(false)
  const [signerForm, setSignerForm] = useState({ email: '', name: '' })
  const [signerLoading, setSignerLoading] = useState(false)
  const [signingLink, setSigningLink] = useState(null)

  const [riskReport, setRiskReport] = useState(null)
  const [analyzingRisk, setAnalyzingRisk] = useState(false)

  const [audit, setAudit] = useState(null)
  const [auditLoading, setAuditLoading] = useState(false)

  const load = () =>
    contractsApi.get(id).then(({ data }) => {
      setContract(data)
      setEditContent(data.content)
      setEditTitle(data.title)
    }).finally(() => setLoading(false))

  useEffect(() => { load() }, [id])

  const loadAudit = () => {
    if (audit) return
    setAuditLoading(true)
    contractsApi.auditTrail(id).then(({ data }) => setAudit(data)).finally(() => setAuditLoading(false))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await contractsApi.update(id, { content: editContent, title: editTitle })
      await load()
      setEditing(false)
      setAudit(null) // refresh audit if content changed
    } finally {
      setSaving(false)
    }
  }

  const handleAddSigner = async () => {
    setSignerLoading(true)
    try {
      const { data } = await contractsApi.addSigner(id, signerForm)
      setSigningLink(data)
      await load()
      setSignerForm({ email: '', name: '' })
      setAudit(null)
    } finally {
      setSignerLoading(false)
    }
  }

  const handleRestoreVersion = async (versionId) => {
    if (!confirm('Restore this version? The current content will be saved as a new version.')) return
    await contractsApi.restoreVersion(id, versionId)
    await load()
    setAudit(null)
  }

  const handleAnalyze = async () => {
    setAnalyzingRisk(true)
    try {
      const { data } = await contractsApi.analyze(id)
      setRiskReport(data)
    } catch (e) {
      alert('AI analysis failed: ' + (e.response?.data?.detail || e.message))
    } finally {
      setAnalyzingRisk(false)
    }
  }

  const copyToClipboard = (text) => navigator.clipboard.writeText(text)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )
  if (!contract) return <div className="text-center py-16 text-muted-foreground">Contract not found.</div>

  const isTampered = contract.locked_content_hash &&
    /* client-side check: hash displayed vs current — full check is on the /audit endpoint */
    contract.signers?.length > 0 && contract.status !== 'draft'

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate('/contracts')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            {editing ? (
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="text-xl font-bold" />
            ) : (
              <h1 className="text-2xl font-bold truncate">{contract.title}</h1>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor(contract.status)}`}>
                {contract.status}
              </span>
              {contract.end_date && (
                <span className="text-xs text-muted-foreground">Expires {formatDate(contract.end_date)}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {editing ? (
            <>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                <X className="w-4 h-4 mr-1" />Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}Save
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Edit3 className="w-4 h-4 mr-1" />Edit
              </Button>
              <Button size="sm" variant="outline" onClick={() => downloadContractPDF(contract)}>
                <Download className="w-4 h-4 mr-1" />PDF
              </Button>
              <Button size="sm" onClick={() => setSignerDialog(true)}>
                <Send className="w-4 h-4 mr-1" />Send for Signing
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tamper warning banner */}
      {audit?.tampered && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-700">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Content Modified After Sending</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              The contract was edited after signers were added. The locked hash no longer matches the current content.
              Signers may have seen a different version.
            </p>
          </div>
        </div>
      )}

      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">Contract</TabsTrigger>
          <TabsTrigger value="signers">
            Signers {contract.signers?.length > 0 && `(${contract.signers.length})`}
          </TabsTrigger>
          <TabsTrigger value="versions">
            History {contract.versions?.length > 0 && `(${contract.versions.length})`}
          </TabsTrigger>
          <TabsTrigger value="audit" onClick={loadAudit}>Audit Trail</TabsTrigger>
          <TabsTrigger value="risk">AI Risk</TabsTrigger>
        </TabsList>

        {/* ── Contract content ── */}
        <TabsContent value="content" className="mt-4 space-y-4">
          <Card>
            <CardContent className="pt-6">
              {editing ? (
                <Textarea className="contract-editor" value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={24} />
              ) : (
                <pre className="contract-content text-sm">{contract.content}</pre>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 grid sm:grid-cols-3 gap-4">
              {[['Start Date', contract.start_date], ['End Date', contract.end_date], ['Reminder Date', contract.reminder_date]].map(([label, val]) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium mt-1">{formatDate(val)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          {contract.locked_content_hash && (
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center gap-2 mb-2">
                  <FileDigit className="w-4 h-4 text-muted-foreground" />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Locked Content Hash (SHA-256)</p>
                </div>
                <p className="text-xs font-mono break-all text-muted-foreground">{contract.locked_content_hash}</p>
                <p className="text-xs text-muted-foreground mt-2">Captured when the first signer was added. Used to detect post-send edits.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Signers ── */}
        <TabsContent value="signers" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Signers</CardTitle>
              <CardDescription>Signing links expire after 30 days. Email is verified via OTP before signing.</CardDescription>
            </CardHeader>
            <CardContent>
              {contract.signers?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No signers added yet.</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setSignerDialog(true)}>Add a signer</Button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {contract.signers.map((signer) => (
                    <div key={signer.id} className="py-4 space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-sm">{signer.name || signer.email}</p>
                          {signer.name && <p className="text-xs text-muted-foreground">{signer.email}</p>}
                        </div>
                        <SignerStatusBadge signer={signer} />
                      </div>

                      {/* Signing details */}
                      {signer.signed_at && (
                        <div className="ml-0 space-y-1">
                          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Signed {formatDateTime(signer.signed_at)}</span>
                            <span>IP: {signer.ip_address || 'N/A'}</span>
                            {signer.otp_verified && <span className="flex items-center gap-1 text-green-600 dark:text-green-400"><ShieldCheck className="w-3 h-3" />Email verified</span>}
                          </div>
                          {signer.content_hash && (
                            <div className="mt-1">
                              <p className="text-xs text-muted-foreground font-mono break-all">
                                Hash: {signer.content_hash}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                      {signer.declined_at && (
                        <p className="text-xs text-red-600 dark:text-red-400">
                          Declined {formatDateTime(signer.declined_at)}{signer.decline_reason ? ` — "${signer.decline_reason}"` : ''}
                        </p>
                      )}
                      {!signer.signed_at && !signer.declined_at && (
                        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                          {signer.viewed_at && <span className="flex items-center gap-1"><Eye className="w-3 h-3" />Opened {formatDateTime(signer.viewed_at)}</span>}
                          {signer.otp_verified && <span className="flex items-center gap-1 text-green-600 dark:text-green-400"><ShieldCheck className="w-3 h-3" />Email verified</span>}
                          {signer.token_expires_at && <span>Link expires {formatDate(signer.token_expires_at)}</span>}
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => {
                            const url = `${window.location.origin}/sign/${signer.token}`
                            copyToClipboard(url)
                          }}>
                            <Copy className="w-3 h-3 mr-1" />Copy link
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Version History ── */}
        <TabsContent value="versions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Version History</CardTitle>
              <CardDescription>Every save creates a new version you can restore</CardDescription>
            </CardHeader>
            <CardContent>
              {contract.versions?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No versions yet.</p>
              ) : (
                <div className="divide-y divide-border">
                  {[...contract.versions].reverse().map((v, i) => (
                    <div key={v.id} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium">Version {v.version_number}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(v.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {i === 0 && <span className="text-xs text-muted-foreground">(current)</span>}
                        {i !== 0 && (
                          <Button size="sm" variant="outline" onClick={() => handleRestoreVersion(v.id)}>
                            <RotateCcw className="w-3.5 h-3.5 mr-1" />Restore
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Audit Trail ── */}
        <TabsContent value="audit" className="mt-4 space-y-4">
          {auditLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : !audit ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Click "Audit Trail" tab to load</p>
            </div>
          ) : (
            <>
              {/* Hash integrity */}
              <Card className={audit.tampered ? 'border-amber-400 dark:border-amber-600' : ''}>
                <CardContent className="pt-5 space-y-3">
                  <div className="flex items-center gap-2">
                    {audit.tampered
                      ? <AlertTriangle className="w-4 h-4 text-amber-500" />
                      : <ShieldCheck className="w-4 h-4 text-green-500" />
                    }
                    <p className="text-sm font-semibold">
                      {audit.tampered ? 'Document integrity: MODIFIED' : 'Document integrity: OK'}
                    </p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground mb-1">Locked hash (at send time)</p>
                      <p className="font-mono break-all">{audit.locked_content_hash || '—'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Current content hash</p>
                      <p className={`font-mono break-all ${audit.tampered ? 'text-amber-600' : ''}`}>{audit.current_content_hash}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Event timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Event Timeline</CardTitle>
                  <CardDescription>{audit.events?.length} event{audit.events?.length !== 1 ? 's' : ''} recorded</CardDescription>
                </CardHeader>
                <CardContent>
                  {audit.events?.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No events yet.</p>
                  ) : (
                    <ol className="relative border-l border-border ml-3 space-y-0">
                      {audit.events.map((event, i) => {
                        const meta = EVENT_META[event.event_type] || { label: event.event_type, icon: Clock, color: 'text-muted-foreground' }
                        const Icon = meta.icon
                        return (
                          <li key={i} className="mb-5 ml-5">
                            <span className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-background border border-border ${meta.color}`}>
                              <Icon className="w-3.5 h-3.5" />
                            </span>
                            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                              <p className="text-sm font-medium">{meta.label}</p>
                              <p className="text-xs text-muted-foreground">{formatDateTime(event.timestamp)}</p>
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                              <p>{event.signer_name || event.signer_email}</p>
                              {event.ip_address && <p>IP: {event.ip_address}</p>}
                              {event.user_agent && <p className="truncate max-w-md">{event.user_agent}</p>}
                              {event.metadata?.content_hash && (
                                <p className="font-mono break-all">Hash: {event.metadata.content_hash}</p>
                              )}
                              {event.metadata?.reason && <p>Reason: {event.metadata.reason}</p>}
                              {event.metadata?.decline_reason && <p>Declined: {event.metadata.decline_reason}</p>}
                            </div>
                          </li>
                        )
                      })}
                    </ol>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ── AI Risk Analysis ── */}
        <TabsContent value="risk" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">AI Clause Risk Flagging</CardTitle>
                <CardDescription>Powered by Claude — analyzes clauses for legal risk</CardDescription>
              </div>
              <Button onClick={handleAnalyze} disabled={analyzingRisk}>
                {analyzingRisk
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
                  : <><Shield className="w-4 h-4 mr-2" />Analyze Contract</>
                }
              </Button>
            </CardHeader>
            <CardContent>
              {!riskReport ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Shield className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm">Click "Analyze Contract" to get an AI risk assessment</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm font-medium mb-1">Summary</p>
                    <p className="text-sm text-muted-foreground">{riskReport.summary}</p>
                  </div>
                  <div className="space-y-2">
                    {riskReport.clauses?.map((clause, i) => (
                      <div key={i} className={`flex gap-3 p-3 rounded-md border text-sm ${riskColor(clause.risk)}`}>
                        <span className="font-bold text-base leading-none mt-0.5">{riskIcon(clause.risk)}</span>
                        <div>
                          <p className="font-medium line-clamp-1">{clause.text}</p>
                          <p className="mt-0.5 opacity-80">{clause.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Signer Dialog */}
      <Dialog open={signerDialog} onOpenChange={setSignerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send for Signing</DialogTitle>
            <DialogDescription>
              The signer receives a unique link valid for 30 days. They must verify their email via OTP before signing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {signingLink ? (
              <div className="space-y-3">
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">Signer added! Share this link:</p>
                <div className="flex gap-2">
                  <Input value={signingLink.signing_url} readOnly className="text-xs" />
                  <Button size="icon" variant="outline" onClick={() => copyToClipboard(signingLink.signing_url)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Expires: {signingLink.expires_at ? new Date(signingLink.expires_at).toLocaleDateString() : 'N/A'}
                </p>
                <Button className="w-full" onClick={() => { setSignerDialog(false); setSigningLink(null) }}>Done</Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Name (optional)</Label>
                  <Input placeholder="Jane Smith" value={signerForm.name} onChange={(e) => setSignerForm({ ...signerForm, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input type="email" placeholder="signer@example.com" value={signerForm.email} onChange={(e) => setSignerForm({ ...signerForm, email: e.target.value })} required />
                </div>
                <div className="p-3 bg-muted/50 rounded-md text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Security features:</p>
                  <p>• Unique one-time link, expires in 30 days</p>
                  <p>• OTP email verification before signing</p>
                  <p>• IP address, timestamp, and content hash recorded</p>
                  <p>• Consent checkbox required</p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSignerDialog(false)}>Cancel</Button>
                  <Button onClick={handleAddSigner} disabled={!signerForm.email || signerLoading}>
                    {signerLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                    Send Invite
                  </Button>
                </DialogFooter>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SignerStatusBadge({ signer }) {
  if (signer.signed_at) return (
    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 flex items-center gap-1">
      <CheckCircle2 className="w-3 h-3" />Signed
    </span>
  )
  if (signer.declined_at) return (
    <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 flex items-center gap-1">
      <XCircle className="w-3 h-3" />Declined
    </span>
  )
  if (signer.otp_verified) return (
    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 flex items-center gap-1">
      <ShieldCheck className="w-3 h-3" />Verified
    </span>
  )
  if (signer.viewed_at) return (
    <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 flex items-center gap-1">
      <Eye className="w-3 h-3" />Viewed
    </span>
  )
  return (
    <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 flex items-center gap-1">
      <Clock className="w-3 h-3" />Pending
    </span>
  )
}
