import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { contractsApi } from '@/lib/api'
import { formatDate, statusColor } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Search, FileText, Trash2, Copy } from 'lucide-react'

export default function Contracts() {
  const navigate = useNavigate()
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const load = () => {
    contractsApi.list().then(({ data }) => setContracts(data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (e, id) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Delete this contract?')) return
    await contractsApi.delete(id)
    setContracts((prev) => prev.filter((c) => c.id !== id))
  }

  const handleDuplicate = async (e, id) => {
    e.preventDefault()
    e.stopPropagation()
    const { data } = await contractsApi.duplicate(id)
    navigate(`/contracts/${data.id}`)
  }

  const filtered = contracts.filter((c) => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || c.status === statusFilter
    return matchSearch && matchStatus
  })

  const statuses = ['all', 'draft', 'sent', 'signed', 'expired']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contracts</h1>
          <p className="text-muted-foreground text-sm mt-1">{contracts.length} contract{contracts.length !== 1 ? 's' : ''} total</p>
        </div>
        <Button asChild>
          <Link to="/contracts/new"><Plus className="w-4 h-4 mr-2" />New Contract</Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search contracts..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-base font-medium">No contracts found</p>
          <p className="text-sm mt-1">
            {search || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first contract to get started'}
          </p>
          {!search && statusFilter === 'all' && (
            <Button className="mt-4" asChild>
              <Link to="/contracts/new"><Plus className="w-4 h-4 mr-2" />New Contract</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((contract) => (
            <Link key={contract.id} to={`/contracts/${contract.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{contract.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {contract.end_date
                            ? `Expires ${formatDate(contract.end_date)}`
                            : `Updated ${formatDate(contract.updated_at)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {contract.is_sample ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                          Sample
                        </span>
                      ) : (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColor(contract.status)}`}>
                          {contract.status}
                        </span>
                      )}
                      <button
                        onClick={(e) => handleDuplicate(e, contract.id)}
                        title="Duplicate contract"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, contract.id)}
                        title="Delete contract"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
