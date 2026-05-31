import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { templatesApi } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, FileStack, Trash2, Edit2, Wand2, X } from 'lucide-react'

const EMPTY_TEMPLATE = { title: '', description: '', content: '', variables: [] }

export default function Templates() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_TEMPLATE)
  const [saving, setSaving] = useState(false)

  const load = () => templatesApi.list().then(({ data }) => setTemplates(data)).finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const openNew = () => { setEditing(null); setForm(EMPTY_TEMPLATE); setDialog(true) }
  const openEdit = (t) => { setEditing(t); setForm({ title: t.title, description: t.description || '', content: t.content, variables: t.variables || [] }); setDialog(true) }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = { ...form, variables: form.variables }
      if (editing) {
        await templatesApi.update(editing.id, payload)
      } else {
        await templatesApi.create(payload)
      }
      await load()
      setDialog(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this template?')) return
    await templatesApi.delete(id)
    setTemplates((p) => p.filter((t) => t.id !== id))
  }

  const addVariable = () => {
    setForm((f) => ({ ...f, variables: [...f.variables, { name: '', label: '', type: 'text' }] }))
  }

  const updateVar = (i, field, value) => {
    const vars = [...form.variables]
    vars[i] = { ...vars[i], [field]: value }
    if (field === 'label' && !vars[i].name) {
      vars[i].name = value.toLowerCase().replace(/\s+/g, '_')
    }
    setForm((f) => ({ ...f, variables: vars }))
  }

  const removeVar = (i) => {
    setForm((f) => ({ ...f, variables: f.variables.filter((_, idx) => idx !== i) }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Templates</h1>
          <p className="text-muted-foreground text-sm mt-1">Reusable contract templates with variable fields</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />New Template</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileStack className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No templates yet</p>
          <p className="text-sm mt-1">Create reusable templates with variable placeholders like {'{{client_name}}'}</p>
          <Button className="mt-4" onClick={openNew}><Plus className="w-4 h-4 mr-2" />Create Template</Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <Card key={t.id} className="group relative hover:shadow-md transition-shadow">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-primary shrink-0" />
                      <p className="font-medium truncate">{t.title}</p>
                    </div>
                    {t.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>}
                    <p className="text-xs text-muted-foreground mt-2">
                      {t.variables?.length || 0} variable{(t.variables?.length || 0) !== 1 ? 's' : ''} · {formatDate(t.updated_at)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(t)}>
                    <Edit2 className="w-3.5 h-3.5 mr-1" />Edit
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" asChild>
                    <Link to={`/contracts/new?template=${t.id}`}>
                      <Plus className="w-3.5 h-3.5 mr-1" />Use
                    </Link>
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(t.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Template' : 'New Template'}</DialogTitle>
            <DialogDescription>
              Use {'{{variable_name}}'} placeholders in the content. They'll be filled when creating a contract.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Service Agreement" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description..." />
            </div>
            <div className="space-y-2">
              <Label>Content *</Label>
              <Textarea
                className="contract-editor"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder={"This Agreement is entered into between {{client_name}} and {{company_name}}..."}
                rows={12}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Variables</Label>
                <Button size="sm" variant="outline" type="button" onClick={addVariable}>
                  <Plus className="w-3.5 h-3.5 mr-1" />Add variable
                </Button>
              </div>
              {form.variables.map((v, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    placeholder="Label (e.g. Client Name)"
                    value={v.label}
                    onChange={(e) => updateVar(i, 'label', e.target.value)}
                  />
                  <Input
                    placeholder="Key (e.g. client_name)"
                    value={v.name}
                    onChange={(e) => updateVar(i, 'name', e.target.value)}
                    className="font-mono text-xs"
                  />
                  <button onClick={() => removeVar(i)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.title || !form.content}>
              {saving ? 'Saving...' : editing ? 'Update Template' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
