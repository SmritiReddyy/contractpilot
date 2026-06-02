import { useEffect, useState } from 'react'
import { clausesApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { BookOpen, Plus, Pencil, Trash2, Loader2, Copy } from 'lucide-react'

const CATEGORIES = ['All', 'Confidentiality', 'Indemnity', 'Termination', 'Payment', 'Liability', 'Governing Law', 'Other']

export default function Clauses() {
  const [clauses, setClauses] = useState([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [dialog, setDialog] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ title: '', content: '', category: '' })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const load = () =>
    clausesApi.list().then(({ data }) => setClauses(data)).finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ title: '', content: '', category: '' })
    setDialog(true)
  }

  const openEdit = (clause) => {
    setEditing(clause)
    setForm({ title: clause.title, content: clause.content, category: clause.category || '' })
    setDialog(true)
  }

  const openUse = (clause) => {
    setEditing(null)
    setForm({ title: `Copy of ${clause.title}`, content: clause.content, category: clause.category || '' })
    setDialog(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editing) {
        await clausesApi.update(editing.id, form)
      } else {
        await clausesApi.create(form)
      }
      await load()
      setDialog(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this clause?')) return
    setDeletingId(id)
    try {
      await clausesApi.delete(id)
      await load()
    } finally {
      setDeletingId(null)
    }
  }

  const filtered = categoryFilter === 'All'
    ? clauses
    : clauses.filter(c => (c.category || 'Other') === categoryFilter)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clause Library</h1>
          <p className="text-muted-foreground text-sm mt-1">Save and reuse standard contract clauses</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />New Clause
        </Button>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              categoryFilter === cat
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <BookOpen className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-sm">No clauses yet. Add reusable clauses to speed up contract drafting.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={openCreate}>
              Add your first clause
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map(clause => (
            <Card key={clause.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <CardTitle className="text-base">{clause.title}</CardTitle>
                    {clause.category && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground">
                        {clause.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => openUse(clause)} title="Use this clause as a starting point">
                      <Copy className="w-3.5 h-3.5 mr-1" />Use
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(clause)} title="Edit clause">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      disabled={deletingId === clause.id}
                      onClick={() => handleDelete(clause.id)}
                    >
                      {deletingId === clause.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4 font-sans">{clause.content}</pre>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Clause' : form.title.startsWith('Copy of') ? 'Use Clause' : 'New Clause'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="e.g. Standard NDA Confidentiality Clause"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input
                placeholder="e.g. Confidentiality, Indemnity"
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                list="category-suggestions"
              />
              <datalist id="category-suggestions">
                {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label>Clause Text *</Label>
              <Textarea
                placeholder="Enter the full clause text..."
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
                rows={8}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.title || !form.content || saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editing ? 'Save Changes' : 'Create Clause'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
