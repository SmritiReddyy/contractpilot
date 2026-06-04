import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { contractsApi } from '@/lib/api'
import { formatDate, statusColor } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, CheckCircle2, Clock, AlertTriangle, Plus, ArrowRight, Users, TrendingUp, Flag } from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    contractsApi.dashboard().then(({ data }) => setStats(data)).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )

  const cards = [
    { label: 'Total Contracts', value: stats?.total ?? 0, icon: FileText, color: 'text-blue-500' },
    { label: 'Active (Sent)', value: stats?.active ?? 0, icon: Clock, color: 'text-blue-500' },
    { label: 'Signed', value: stats?.signed ?? 0, icon: CheckCircle2, color: 'text-green-500' },
    { label: 'Expiring Soon', value: stats?.expiring_soon ?? 0, icon: AlertTriangle, color: 'text-amber-500' },
    { label: 'Pending Signatures', value: stats?.pending_signers ?? 0, icon: Users, color: 'text-indigo-500' },
    { label: 'Avg. Days to Sign', value: stats?.avg_days_to_sign != null ? `${stats.avg_days_to_sign}d` : '—', icon: TrendingUp, color: 'text-purple-500' },
    { label: 'Overdue Milestones', value: stats?.overdue_milestones ?? 0, icon: Flag, color: 'text-red-500' },
  ]

  const byStatus = stats?.by_status || {}
  const statusMax = Math.max(...Object.values(byStatus), 1)
  const statusColors = {
    draft: 'bg-gray-400',
    sent: 'bg-blue-400',
    signed: 'bg-green-500',
    expired: 'bg-red-400',
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Overview of your contract portfolio</p>
        </div>
        <Button asChild className="self-start sm:self-auto">
          <Link to="/contracts/new"><Plus className="w-4 h-4 mr-2" />New Contract</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs sm:text-sm text-muted-foreground leading-tight">{label}</p>
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${color} shrink-0`} />
              </div>
              <p className="text-2xl sm:text-3xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Signing pipeline chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Contract Pipeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(byStatus).map(([status, count]) => (
            <div key={status} className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground capitalize w-16 shrink-0">{status}</span>
              <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${statusColors[status] || 'bg-primary'}`}
                  style={{ width: `${Math.max((count / statusMax) * 100, count > 0 ? 4 : 0)}%` }}
                />
              </div>
              <span className="text-sm font-medium w-6 text-right">{count}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">Recent Contracts</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/contracts" className="flex items-center gap-1 text-xs">View all <ArrowRight className="w-3 h-3" /></Link>
          </Button>
        </CardHeader>
        <CardContent>
          {stats?.recent?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No contracts yet.</p>
              <Button variant="outline" size="sm" className="mt-3" asChild>
                <Link to="/contracts/new">Create your first contract</Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {stats?.recent?.map((contract) => (
                <Link
                  key={contract.id}
                  to={`/contracts/${contract.id}`}
                  className="flex items-center justify-between py-3 hover:bg-accent/30 px-2 -mx-2 rounded transition-colors gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{contract.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {contract.end_date ? `Expires ${formatDate(contract.end_date)}` : `Created ${formatDate(contract.created_at)}`}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize shrink-0 ${statusColor(contract.status)}`}>
                    {contract.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
