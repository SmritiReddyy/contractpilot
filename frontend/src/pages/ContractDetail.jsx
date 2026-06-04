import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { contractsApi, clausesApi } from '@/lib/api'
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
  CheckCircle2, XCircle, Mail, FileDigit, Flag, BookOpen, Sparkles, Trash2, Plus
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
  const { user } = useAuth()
  const [contract, setContract] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [saving, setSaving] = useState(false)

  const [signerDialog, setSignerDialog] = useState(false)
  const [signerForm, setSignerForm] = useState({ email: '', name: '', signing_order: 1, signing_mode: 'parallel' })
  const [signerLoading, setSignerLoading] = useState(false)
  const [signingLink, setSigningLink] = useState(null)
  const [revokingId, setRevokingId] = useState(null)

  const [riskReport, setRiskReport] = useState(null)
  const [analyzingRisk, setAnalyzingRisk] = useState(false)
  const [aiSummary, setAiSummary] = useState(null)
  const [summarizing, setSummarizing] = useState(false)

  const [audit, setAudit] = useState(null)
  const [auditLoading, setAuditLoading] = useState(false)

  const [milestones, setMilestones] = useState([])
  const [milestonesLoaded, setMilestonesLoaded] = useState(false)
  const [milestoneForm, setMilestoneForm] = useState({ title: '', description: '', due_date: '' })
  const [milestoneDialog, setMilestoneDialog] = useState(false)
  const [savingMilestone, setSavingMilestone] = useState(false)
  const [deletingMilestoneId, setDeletingMilestoneId] = useState(null)

  const [clauseDialog, setClauseDialog] = useState(false)
  const [clauseLibrary, setClauseLibrary] = useState([])
  const [clauseFilter, setClauseFilter] = useState('')

  // Owner sign dialog
  const [ownerSignDialog, setOwnerSignDialog] = useState(false)
  const [ownerSignName, setOwnerSignName] = useState('')
  const [ownerSignConsent, setOwnerSignConsent] = useState(false)
  const [ownerSigning, setOwnerSigning] = useState(false)
  const [ownerSignError, setOwnerSignError] = useState('')

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

  const loadMilestones = () => {
    if (milestonesLoaded) return
    contractsApi.getMilestones(id).then(({ data }) => {
      setMilestones(data)
      setMilestonesLoaded(true)
    })
  }

  const handleAddMilestone = async () => {
    setSavingMilestone(true)
    try {
      await contractsApi.createMilestone(id, milestoneForm)
      const { data } = await contractsApi.getMilestones(id)
      setMilestones(data)
      setMilestoneDialog(false)
      setMilestoneForm({ title: '', description: '', due_date: '' })
    } finally {
      setSavingMilestone(false)
    }
  }

  const handleMarkComplete = async (milestoneId) => {
    await contractsApi.updateMilestone(id, milestoneId, { status: 'completed' })
    const { data } = await contractsApi.getMilestones(id)
    setMilestones(data)
  }

  const handleDeleteMilestone = async (milestoneId) => {
    if (!confirm('Delete this milestone?')) return
    setDeletingMilestoneId(milestoneId)
    try {
      await contractsApi.deleteMilestone(id, milestoneId)
      setMilestones(ms => ms.filter(m => m.id !== milestoneId))
    } finally {
      setDeletingMilestoneId(null)
    }
  }

  const handleSummarize = async () => {
    setSummarizing(true)
    try {
      const { data } = await contractsApi.summarize(id)
      setAiSummary(data)
    } catch (e) {
      alert('AI summarization failed: ' + (e.response?.data?.detail || e.message))
    } finally {
      setSummarizing(false)
    }
  }

  const openClauseDialog = async () => {
    if (clauseLibrary.length === 0) {
      const { data } = await clausesApi.list()
      setClauseLibrary(data)
    }
    setClauseDialog(true)
  }

  const insertClause = (clauseContent) => {
    setEditContent(prev => prev ? prev + '\n\n' + clauseContent : clauseContent)
    setClauseDialog(false)
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
      setSignerForm({ email: '', name: '', signing_order: 1, signing_mode: 'parallel' })
      setAudit(null)
    } finally {
      setSignerLoading(false)
    }
  }

  const handleRevokeSigner = async (signerId) => {
    if (!confirm('Revoke this signing link? The signer will no longer be able to sign using their link.')) return
    setRevokingId(signerId)
    try {
      await contractsApi.revokeSigner(id, signerId)
      await load()
    } finally {
      setRevokingId(null)
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

  const openOwnerSignDialog = () => {
    setOwnerSignName(user?.full_name || '')
    setOwnerSignConsent(false)
    setOwnerSignError('')
    setOwnerSignDialog(true)
  }

  const handleOwnerSign = async () => {
    if (!ownerSignName.trim()) { setOwnerSignError('Please enter your full name'); return }
    if (!ownerSignConsent) { setOwnerSignError('You must consent to sign electronically'); return }
    setOwnerSigning(true)
    setOwnerSignError('')
    try {
      await contractsApi.ownerSign(id, { name: ownerSignName, consent: true })
      setOwnerSignDialog(false)
      await load()
    } catch (e) {
      setOwnerSignError(e.response?.data?.detail || 'Signing failed')
    } finally {
      setOwnerSigning(false)
    }
  }

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
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate('/contracts')} className="shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            {editing ? (
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="text-xl font-bold" />
            ) : (
              <h1 className="text-xl sm:text-2xl font-bold truncate">{contract.title}</h1>
            )}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {contract.is_sample && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                  Sample
                </span>
              )}
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor(contract.status)}`}>
                {contract.status}
              </span>
              {contract.end_date && (
                <span className="text-xs text-muted-foreground">Expires {formatDate(contract.end_date)}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {editing ? (
            <>
              <Button size="sm" variant="outline" onClick={openClauseDialog}>
                <BookOpen className="w-4 h-4 mr-1" />Insert Clause
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                <X className="w-4 h-4 mr-1" />Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}Save
              </Button>
            </>
          ) : (
            <>
              {!contract.is_sample && (
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                  <Edit3 className="w-4 h-4 mr-1" />Edit
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => downloadContractPDF(contract)}>
                <Download className="w-4 h-4 mr-1" />PDF
              </Button>
              {!contract.is_sample && (
                <Button size="sm" onClick={() => setSignerDialog(true)}>
                  <Send className="w-4 h-4 mr-1" />Send for Signing
                </Button>
              )}
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
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="flex w-max min-w-full">
            <TabsTrigger value="content">Contract</TabsTrigger>
            {!contract.is_sample && (
              <>
                <TabsTrigger value="signers">
                  Signers {contract.signers?.length > 0 && `(${contract.signers.length})`}
                </TabsTrigger>
                <TabsTrigger value="milestones" onClick={loadMilestones}>
                  Milestones {milestones.length > 0 && `(${milestones.length})`}
                </TabsTrigger>
                <TabsTrigger value="versions">
                  History {contract.versions?.length > 0 && `(${contract.versions.length})`}
                </TabsTrigger>
                <TabsTrigger value="audit" onClick={loadAudit}>Audit Trail</TabsTrigger>
                <TabsTrigger value="risk">AI Risk</TabsTrigger>
              </>
            )}
          </TabsList>
        </div>

        {/* ── Contract content ── */}
        <TabsContent value="content" className="mt-4 space-y-4">
          <Card>
            <CardContent className="pt-6">
              {editing && !contract.is_sample ? (
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
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Signers</CardTitle>
                  <CardDescription>
                    {contract.is_sample
                      ? 'This is a sample contract — duplicate it to send for signing.'
                      : 'Signing links expire after 30 days.'}
                  </CardDescription>
                </div>
                {!contract.is_sample && (
                  <div className="flex gap-2 shrink-0 flex-wrap">
                    <Button size="sm" variant="outline" onClick={openOwnerSignDialog}>
                      <Check className="w-4 h-4 mr-1" />Add my signature
                    </Button>
                    <Button size="sm" onClick={() => setSignerDialog(true)}>
                      <Send className="w-4 h-4 mr-1" />Add Signer
                    </Button>
                  </div>
                )}
              </div>
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
                          <div className="flex items-center gap-2">
                            {contract.signing_mode === 'sequential' && (
                              <span className="text-xs font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">#{signer.signing_order}</span>
                            )}
                            <p className="font-medium text-sm">{signer.name || signer.email}</p>
                          </div>
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
                      {signer.revoked_at && (
                        <p className="text-xs text-red-500">Revoked {formatDateTime(signer.revoked_at)}</p>
                      )}
                      {!signer.signed_at && !signer.declined_at && !signer.revoked_at && (
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
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                            disabled={revokingId === signer.id}
                            onClick={() => handleRevokeSigner(signer.id)}
                          >
                            {revokingId === signer.id
                              ? <Loader2 className="w-3 h-3 animate-spin mr-1" />
                              : <X className="w-3 h-3 mr-1" />}
                            Revoke
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

        {/* ── Milestones ── */}
        <TabsContent value="milestones" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Milestones & Obligations</CardTitle>
                <CardDescription>Track key dates and deliverables for this contract</CardDescription>
              </div>
              <Button size="sm" onClick={() => setMilestoneDialog(true)}>
                <Plus className="w-4 h-4 mr-1" />Add Milestone
              </Button>
            </CardHeader>
            <CardContent>
              {milestones.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Flag className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No milestones yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {milestones.map(m => {
                    const isPast = new Date(m.due_date) < new Date() && m.status === 'pending'
                    const displayStatus = isPast ? 'overdue' : m.status
                    const statusStyles = {
                      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
                      completed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
                      overdue: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
                    }
                    return (
                      <div key={m.id} className="py-4 flex items-start justify-between gap-4">
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm">{m.title}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${statusStyles[displayStatus]}`}>
                              {displayStatus}
                            </span>
                          </div>
                          {m.description && <p className="text-xs text-muted-foreground">{m.description}</p>}
                          <p className="text-xs text-muted-foreground">Due: {m.due_date}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {m.status !== 'completed' && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleMarkComplete(m.id)}>
                              <Check className="w-3 h-3 mr-1" />Done
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                            disabled={deletingMilestoneId === m.id}
                            onClick={() => handleDeleteMilestone(m.id)}
                          >
                            {deletingMilestoneId === m.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Trash2 className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog open={milestoneDialog} onOpenChange={setMilestoneDialog}>
            <DialogContent className="w-full max-w-lg mx-4">
              <DialogHeader>
                <DialogTitle>Add Milestone</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    placeholder="e.g. Payment due, Delivery deadline"
                    value={milestoneForm.title}
                    onChange={e => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Optional details..."
                    value={milestoneForm.description}
                    onChange={e => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Due Date *</Label>
                  <Input
                    type="date"
                    value={milestoneForm.due_date}
                    onChange={e => setMilestoneForm({ ...milestoneForm, due_date: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setMilestoneDialog(false)}>Cancel</Button>
                <Button
                  onClick={handleAddMilestone}
                  disabled={!milestoneForm.title || !milestoneForm.due_date || savingMilestone}
                >
                  {savingMilestone ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Add Milestone
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
        <TabsContent value="risk" className="mt-4 space-y-4">
          {/* AI Summary section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">AI Summary</CardTitle>
                <CardDescription>Extract structured metadata from this contract</CardDescription>
              </div>
              <Button onClick={handleSummarize} disabled={summarizing} variant="outline">
                {summarizing
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Summarizing...</>
                  : <><Sparkles className="w-4 h-4 mr-2" />Summarize</>
                }
              </Button>
            </CardHeader>
            <CardContent>
              {!aiSummary ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Click "Summarize" to extract key details</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {aiSummary.summary && (
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm font-medium mb-1">Overview</p>
                      <p className="text-sm text-muted-foreground">{aiSummary.summary}</p>
                    </div>
                  )}
                  {aiSummary.parties?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Parties</p>
                      <div className="flex flex-wrap gap-2">
                        {aiSummary.parties.map((p, i) => (
                          <span key={i} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">{p}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid sm:grid-cols-3 gap-3 text-sm">
                    {aiSummary.contract_value && (
                      <div className="p-3 rounded-md bg-muted/40">
                        <p className="text-xs text-muted-foreground mb-1">Contract Value</p>
                        <p className="font-medium">{aiSummary.contract_value}</p>
                      </div>
                    )}
                    {aiSummary.governing_law && (
                      <div className="p-3 rounded-md bg-muted/40">
                        <p className="text-xs text-muted-foreground mb-1">Governing Law</p>
                        <p className="font-medium">{aiSummary.governing_law}</p>
                      </div>
                    )}
                    {aiSummary.payment_terms && (
                      <div className="p-3 rounded-md bg-muted/40">
                        <p className="text-xs text-muted-foreground mb-1">Payment Terms</p>
                        <p className="font-medium">{aiSummary.payment_terms}</p>
                      </div>
                    )}
                  </div>
                  {aiSummary.key_dates?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Key Dates</p>
                      <table className="w-full text-sm">
                        <tbody className="divide-y divide-border">
                          {aiSummary.key_dates.map((kd, i) => (
                            <tr key={i}>
                              <td className="py-1.5 text-muted-foreground pr-4">{kd.label}</td>
                              <td className="py-1.5 font-medium">{kd.date}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {aiSummary.termination_clause && (
                    <div className="p-3 rounded-md bg-muted/40">
                      <p className="text-xs text-muted-foreground mb-1">Termination</p>
                      <p className="text-sm">{aiSummary.termination_clause}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Risk analysis section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">AI Clause Risk Flagging</CardTitle>
                <CardDescription>Powered by Claude — analyzes clauses for legal risk</CardDescription>
              </div>
              <Button onClick={handleAnalyze} disabled={analyzingRisk}>
                {analyzingRisk
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
                  : <><Shield className="w-4 h-4 mr-2" />Analyze Risk</>
                }
              </Button>
            </CardHeader>
            <CardContent>
              {!riskReport ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Shield className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm">Click "Analyze Risk" to get an AI risk assessment</p>
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

      {/* Insert Clause Dialog */}
      <Dialog open={clauseDialog} onOpenChange={setClauseDialog}>
        <DialogContent className="w-full max-w-lg mx-4">
          <DialogHeader>
            <DialogTitle>Insert Clause</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder="Search clauses..."
              value={clauseFilter}
              onChange={e => setClauseFilter(e.target.value)}
            />
            <div className="max-h-80 overflow-y-auto space-y-2">
              {clauseLibrary
                .filter(c =>
                  !clauseFilter ||
                  c.title.toLowerCase().includes(clauseFilter.toLowerCase()) ||
                  (c.category || '').toLowerCase().includes(clauseFilter.toLowerCase())
                )
                .map(c => (
                  <button
                    key={c.id}
                    onClick={() => insertClause(c.content)}
                    className="w-full text-left p-3 rounded-md border hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{c.title}</p>
                      {c.category && <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{c.category}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.content}</p>
                  </button>
                ))}
              {clauseLibrary.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">No clauses saved yet. Visit the Clause Library to add some.</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Owner Sign Dialog */}
      <Dialog open={ownerSignDialog} onOpenChange={setOwnerSignDialog}>
        <DialogContent className="w-full max-w-lg mx-4">
          <DialogHeader>
            <DialogTitle>Add My Signature</DialogTitle>
            <DialogDescription>Sign this contract as the owner. This will be recorded in the audit trail.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {ownerSignError && (
              <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{ownerSignError}</div>
            )}
            <div className="space-y-2">
              <Label>Full legal name *</Label>
              <Input
                value={ownerSignName}
                onChange={(e) => setOwnerSignName(e.target.value)}
                placeholder="Type your full name"
              />
            </div>
            {ownerSignName && (
              <div className="p-4 border-2 border-dashed rounded-md bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">Signature preview</p>
                <p className="text-2xl" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>{ownerSignName}</p>
              </div>
            )}
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={ownerSignConsent}
                onChange={(e) => setOwnerSignConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-primary"
              />
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                I consent to sign <strong>{contract?.title}</strong> electronically. This constitutes a legally binding signature.
              </span>
            </label>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setOwnerSignDialog(false)}>Cancel</Button>
            <Button onClick={handleOwnerSign} disabled={!ownerSignName.trim() || !ownerSignConsent || ownerSigning}>
              {ownerSigning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              Sign Contract
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Signer Dialog */}
      <Dialog open={signerDialog} onOpenChange={setSignerDialog}>
        <DialogContent className="w-full max-w-lg mx-4">
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
                {contract.signers?.length === 0 && (
                  <div className="space-y-2">
                    <Label>Signing Mode</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'parallel', label: 'Parallel', desc: 'All signers receive links simultaneously' },
                        { value: 'sequential', label: 'Sequential', desc: 'Each signer signs in order' },
                      ].map(({ value, label, desc }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setSignerForm({ ...signerForm, signing_mode: value })}
                          className={`text-left p-3 rounded-md border text-sm transition-colors ${signerForm.signing_mode === value ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'}`}
                        >
                          <p className="font-medium">{label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {(signerForm.signing_mode === 'sequential' || contract.signers?.length > 0) && (
                  <div className="space-y-2">
                    <Label>Signing Order</Label>
                    <Input
                      type="number"
                      min={1}
                      value={signerForm.signing_order}
                      onChange={(e) => setSignerForm({ ...signerForm, signing_order: parseInt(e.target.value) || 1 })}
                    />
                    <p className="text-xs text-muted-foreground">Position in the signing queue (1 = first)</p>
                  </div>
                )}
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
  if (signer.revoked_at) return (
    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 flex items-center gap-1">
      <X className="w-3 h-3" />Revoked
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
