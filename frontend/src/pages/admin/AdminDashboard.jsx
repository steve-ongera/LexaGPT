import React, { useState, useEffect } from 'react'
import { adminApi } from '../../services/api'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const PLAN_COLORS = { free: '#8888aa', premium: '#00d4ff', team: '#7c5cfc', enterprise: '#ffd060' }

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [metrics, setMetrics] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      adminApi.dashboard(),
      adminApi.metrics(30),
    ]).then(([dash, met]) => {
      setData(dash.data)
      setMetrics(met.data.results || met.data)
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="loading-orb" /></div>
  if (!data) return null

  const pieData = Object.entries(data.subscriptions || {}).map(([k, v]) => ({ name: k, value: v, color: PLAN_COLORS[k] }))

  const STAT_CARDS = [
    { label: 'Total Users', value: data.users.total.toLocaleString(), icon: 'bi-people-fill', color: '#00d4ff', trend: `+${data.users.new_this_month} this month` },
    { label: 'Active Today', value: data.users.active_today.toLocaleString(), icon: 'bi-activity', color: '#00e5a0', trend: 'users online' },
    { label: 'Total Messages', value: data.conversations.total_messages.toLocaleString(), icon: 'bi-chat-dots-fill', color: '#7c5cfc', trend: 'all time' },
    { label: 'Total Revenue', value: `$${parseFloat(data.revenue.total_usd).toLocaleString()}`, icon: 'bi-cash-stack', color: '#ffd060', trend: 'all time' },
    { label: 'Model Accuracy', value: `${data.model_accuracy.overall || 0}%`, icon: 'bi-bullseye', color: '#ff9945', trend: 'thinking benchmark' },
    { label: 'Active Training', value: data.training.active_runs, icon: 'bi-cpu-fill', color: '#ec4899', trend: 'runs in progress' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ marginBottom: 4 }}>Dashboard</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Platform overview and real-time metrics</p>
      </div>

      {/* Stat cards */}
      <div className="stats-grid">
        {STAT_CARDS.map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-card-icon" style={{ background: `${s.color}18` }}>
              <i className={`bi ${s.icon}`} style={{ color: s.color, fontSize: 20 }} />
            </div>
            <div className="stat-card-value">{s.value}</div>
            <div className="stat-card-label">{s.label}</div>
            <div className="stat-card-trend up"><i className="bi bi-arrow-up-short" />{s.trend}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, marginBottom: 24 }}>
        {/* Messages over time */}
        <div className="card">
          <h4 style={{ marginBottom: 20 }}>Message Volume (30 Days)</h4>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={metrics.slice(-30)} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="msgGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false}
                tickFormatter={d => d?.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, fontSize: '0.8rem' }}
                labelStyle={{ color: 'var(--text-primary)' }}
                itemStyle={{ color: 'var(--accent)' }}
              />
              <Area type="monotone" dataKey="total_messages" stroke="#00d4ff" strokeWidth={2} fill="url(#msgGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Plan distribution */}
        <div className="card">
          <h4 style={{ marginBottom: 20 }}>Plan Distribution</h4>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, fontSize: '0.8rem' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pieData.map(p => (
              <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.color }} />
                  <span style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{p.name}</span>
                </div>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue chart */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h4 style={{ marginBottom: 20 }}>Daily Revenue (USD)</h4>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={metrics.slice(-14)} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} tickFormatter={d => d?.slice(5)} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, fontSize: '0.8rem' }}
              formatter={(v) => [`$${v}`, 'Revenue']}
            />
            <Bar dataKey="revenue_usd" fill="#7c5cfc" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Model accuracy */}
      {data.model_accuracy.by_category && Object.keys(data.model_accuracy.by_category).length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h4 style={{ marginBottom: 20 }}>Model Accuracy by Category</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
            {Object.entries(data.model_accuracy.by_category).map(([cat, score]) => (
              <div key={cat} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', fontFamily: 'var(--font-display)', fontWeight: 800, color: score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--orange)' : 'var(--red)' }}>{score}%</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'capitalize', marginTop: 4 }}>{cat}</div>
                <div className="progress-bar" style={{ marginTop: 8 }}>
                  <div className="progress-fill" style={{ width: `${score}%`, background: score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--orange)' : 'var(--red)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent payments */}
      <div className="card">
        <h4 style={{ marginBottom: 16 }}>Recent Payments</h4>
        {data.revenue.recent_payments?.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No payments yet</p>
        ) : (
          <table className="data-table">
            <thead><tr><th>User</th><th>Method</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {(data.revenue.recent_payments || []).map(p => (
                <tr key={p.id}>
                  <td style={{ color: 'var(--text-primary)' }}>{p.user}</td>
                  <td style={{ textTransform: 'capitalize' }}>{p.method}</td>
                  <td style={{ color: 'var(--green)', fontWeight: 600 }}>${p.amount}</td>
                  <td><span className={`badge badge-${p.status === 'completed' ? 'green' : 'orange'}`}>{p.status}</span></td>
                  <td>{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}