import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { contractsApi, templatesApi } from '@/lib/api'
import { fillTemplate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Wand2 } from 'lucide-react'

export default function NewContract() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const templateIdParam = searchParams.get('template')

  const [templates, setTemplates] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [variables, setVariables] = useState({})
  const [form, setForm] = useState({
    title: '',
    content: '',
    start_date: '',
    end_date: '',
    reminder_date: '',
  })
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(templateIdParam ? 2 : 1) // 1=pick template, 2=fill details

  useEffect(() => {
    templatesApi.list().then(({ data }) => {
      setTemplates(data)
      if (templateIdParam) {
        const t = data.find((t) => t.id === templateIdParam)
        if (t) applyTemplate(t)
      }
    })
  }, [])

  const applyTemplate = (template) => {
    setSelectedTemplate(template)
    const vars = {}
    template.variables?.forEach((v) => { vars[v.name] = '' })
    setVariables(vars)
    setForm((f) => ({ ...f, title: template.title, content: template.content }))
    setStep(2)
  }

  const handleVarChange = (name, value) => {
    const newVars = { ...variables, [name]: value }
    setVariables(newVars)
    const filled = fillTemplate(selectedTemplate.content, newVars)
    setForm((f) => ({ ...f, content: filled }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await contractsApi.create({
        title: form.title,
        content: form.content,
        template_id: selectedTemplate?.id || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        reminder_date: form.reminder_date || null,
      })
      navigate(`/contracts/${data.id}`)
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create contract')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">New Contract</h1>
          <p className="text-muted-foreground text-sm">Start from a template or create from scratch</p>
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => { setSelectedTemplate(null); setStep(2) }}
          >
            <CardContent className="pt-5">
              <p className="font-medium">Start from scratch</p>
              <p className="text-sm text-muted-foreground mt-1">Write your contract content manually</p>
            </CardContent>
          </Card>

          {templates.length > 0 && (
            <>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Or choose a template</p>
              {templates.map((t) => (
                <Card key={t.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => applyTemplate(t)}>
                  <CardContent className="pt-5">
                    <div className="flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-primary" />
                      <p className="font-medium">{t.title}</p>
                    </div>
                    {t.description && <p className="text-sm text-muted-foreground mt-1">{t.description}</p>}
                    {t.variables?.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">{t.variables.length} variable{t.variables.length !== 1 ? 's' : ''}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      )}

      {step === 2 && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {selectedTemplate?.variables?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fill in template variables</CardTitle>
                <CardDescription>These will be substituted into the contract text</CardDescription>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-4">
                {selectedTemplate.variables.map((v) => (
                  <div key={v.name} className="space-y-2">
                    <Label>{v.label}</Label>
                    <Input
                      type={v.type === 'date' ? 'date' : 'text'}
                      placeholder={`{{${v.name}}}`}
                      value={variables[v.name] || ''}
                      onChange={(e) => handleVarChange(v.name, e.target.value)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contract details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Service Agreement - Acme Corp"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Contract Content *</Label>
                <Textarea
                  id="content"
                  className="contract-editor"
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Enter the full contract text here..."
                  required
                  rows={16}
                />
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input id="start_date" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input id="end_date" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reminder_date">Reminder Date</Label>
                  <Input id="reminder_date" type="date" value={form.reminder_date} onChange={(e) => setForm({ ...form, reminder_date: e.target.value })} />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            {!templateIdParam && (
              <Button type="button" variant="outline" onClick={() => setStep(1)}>Back</Button>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Contract'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
