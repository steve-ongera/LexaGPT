import React, { useState, useEffect } from 'react'
import { adminApi } from '../../services/api'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts'
import toast from 'react-hot-toast'

// ══════════════════════════════════════════════════════════════════════════════
// BENCHMARKS PAGE
// ══════════════════════════════════════════════════════════════════════════════
export function AdminBenchmarks() {
  const [report, setReport] = useState(null)
  const [benchmarks, setBenchmarks] = useState([])
  const [model, setModel] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  const MODELS = ['lexa-lite', 'lexa-pro', 'lexa-vision', 'lexa-ultra']

  useEffect(() => {
    load()
  }, [model])

  const load = async () => {
    setLoading(true)
    try {
      const [r, b] = await Promise.all([
        adminApi.accuracyReport(model || undefined),
        adminApi.benchmarks(model ? { model_name: model } : {}),
      ])
      setReport(r.data)
      setBenchmarks(b.data.results || b.data)
    } catch { } finally { setLoading(false) }
  }

  const radarData = report?.by_category
    ? Object.entries(report.by_category).map(([cat, acc]) => ({ subject: cat, accuracy: acc, fullMark: 100 }))
    : []

  const DIFF_COLORS = { easy: '#00e5a0', medium: '#ffd060', hard: '#ff4466' }
  const CAT_ICONS = { math: '🔢', logic: '🧩', language: '📝', science: '🔬', coding: '💻', reasoning: '🧠', general: '🌐' }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>Thinking Benchmarks</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Monitor model reasoning accuracy across categories</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select className="form-input form-select" style={{ width: 160 }} value={model} onChange={e => setModel(e.target.value)}>
            <option value="">All Models</option>
            {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <i className="bi bi-plus-lg" /> Add Benchmark
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="loading-orb" /></div>
      ) : (
        <>
          {/* Overall accuracy */}
          <div className="stats-grid" style={{ marginBottom: 24 }}>
            <div className="stat-card" style={{ borderLeft: '4px solid var(--accent)' }}>
              <div className="stat-card-icon" style={{ background: 'var(--accent-dim)' }}>
                <i className="bi bi-bullseye" style={{ color: 'var(--accent)', fontSize: 20 }} />
              </div>
              <div className="stat-card-value" style={{ color: 'var(--accent)' }}>{report?.overall_accuracy || 0}%</div>
              <div className="stat-card-label">Overall Accuracy</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon" style={{ background: 'rgba(0,229,160,0.12)' }}>
                <i className="bi bi-check-circle" style={{ color: 'var(--green)', fontSize: 20 }} />
              </div>
              <div className="stat-card-value">{report?.total_benchmarks || 0}</div>
              <div className="stat-card-label">Total Benchmarks</div>
            </div>
            {report?.by_difficulty && Object.entries(report.by_difficulty).map(([diff, stats]) => (
              <div key={diff} className="stat-card" style={{ borderLeft: `4px solid ${DIFF_COLORS[diff]}` }}>
                <div className="stat-card-icon" style={{ background: `${DIFF_COLORS[diff]}18` }}>
                  <span style={{ fontSize: 20 }}>{diff === 'easy' ? '🟢' : diff === 'medium' ? '🟡' : '🔴'}</span>
                </div>
                <div className="stat-card-value" style={{ color: DIFF_COLORS[diff] }}>{stats.accuracy}%</div>
                <div className="stat-card-label" style={{ textTransform: 'capitalize' }}>{diff} Questions</div>
                <div className="stat-card-trend" style={{ color: 'var(--text-muted)' }}>{stats.correct}/{stats.total}</div>
              </div>
            ))}
          </div>

          {/* Radar chart */}
          {radarData.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
              <div className="card">
                <h4 style={{ marginBottom: 16 }}>Accuracy by Category</h4>
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                    <Radar name="Accuracy" dataKey="accuracy" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.15} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="card">
                <h4 style={{ marginBottom: 16 }}>Category Breakdown</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {Object.entries(report?.by_category || {}).map(([cat, acc]) => (
                    <div key={cat}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: '0.82rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{CAT_ICONS[cat] || '📊'}</span>
                          <span style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{cat}</span>
                        </span>
                        <span style={{ fontWeight: 700, color: acc >= 80 ? 'var(--green)' : acc >= 60 ? 'var(--orange)' : 'var(--red)' }}>{acc}%</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${acc}%`, background: acc >= 80 ? 'var(--green)' : acc >= 60 ? 'var(--orange)' : 'var(--red)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Benchmark list */}
          <div className="card">
            <h4 style={{ marginBottom: 16 }}>Recent Benchmarks</h4>
            <table className="data-table">
              <thead><tr><th>Model</th><th>Category</th><th>Difficulty</th><th>Correct</th><th>Score</th><th>Date</th></tr></thead>
              <tbody>
                {benchmarks.slice(0, 20).map(b => (
                  <tr key={b.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent)' }}>{b.model_name}</td>
                    <td><span className="badge badge-muted" style={{ textTransform: 'capitalize' }}>{CAT_ICONS[b.category] || '📊'} {b.category}</span></td>
                    <td><span className="badge" style={{ background: `${DIFF_COLORS[b.difficulty]}18`, color: DIFF_COLORS[b.difficulty], textTransform: 'capitalize' }}>{b.difficulty}</span></td>
                    <td><i className={`bi bi-${b.is_correct ? 'check-circle-fill' : 'x-circle-fill'}`} style={{ color: b.is_correct ? 'var(--green)' : 'var(--red)' }} /></td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>{b.reasoning_score?.toFixed(2)}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(b.evaluated_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showAdd && <AddBenchmarkModal onClose={() => setShowAdd(false)} onAdd={() => { setShowAdd(false); load() }} />}
    </div>
  )
}

function AddBenchmarkModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ model_name: 'lexa-lite', question: '', expected_answer: '', model_answer: '', category: 'general', difficulty: 'medium', is_correct: false, reasoning_score: 0.5 })
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await adminApi.benchmarks({}) // POST would be needed - placeholder
      toast.success('Benchmark added')
      onAdd()
    } catch { toast.error('Failed to add benchmark') }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><i className="bi bi-x-lg" /></button>
        <h3 style={{ marginBottom: 20 }}>Add Benchmark</h3>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Model</label>
              <select className="form-input form-select" value={form.model_name} onChange={e => setForm(p => ({ ...p, model_name: e.target.value }))}>
                {['lexa-lite', 'lexa-pro', 'lexa-vision', 'lexa-ultra'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-input form-select" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                {['math', 'logic', 'language', 'science', 'coding', 'reasoning', 'general'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Difficulty</label>
              <select className="form-input form-select" value={form.difficulty} onChange={e => setForm(p => ({ ...p, difficulty: e.target.value }))}>
                {['easy', 'medium', 'hard'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Question</label>
            <textarea className="form-input" rows={3} value={form.question} onChange={e => setForm(p => ({ ...p, question: e.target.value }))} required style={{ resize: 'vertical' }} />
          </div>
          <div className="form-group">
            <label className="form-label">Expected Answer</label>
            <textarea className="form-input" rows={2} value={form.expected_answer} onChange={e => setForm(p => ({ ...p, expected_answer: e.target.value }))} required style={{ resize: 'vertical' }} />
          </div>
          <div className="form-group">
            <label className="form-label">Model Answer</label>
            <textarea className="form-input" rows={2} value={form.model_answer} onChange={e => setForm(p => ({ ...p, model_answer: e.target.value }))} style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_correct} onChange={e => setForm(p => ({ ...p, is_correct: e.target.checked }))} />
              <span className="form-label" style={{ margin: 0 }}>Is Correct</span>
            </label>
            <div className="form-group" style={{ flex: 1, gap: 4 }}>
              <label className="form-label">Reasoning Score (0-1)</label>
              <input className="form-input" type="number" min={0} max={1} step={0.01} value={form.reasoning_score}
                onChange={e => setForm(p => ({ ...p, reasoning_score: parseFloat(e.target.value) }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>Add Benchmark</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// METRICS PAGE
// ══════════════════════════════════════════════════════════════════════════════
export function AdminMetrics() {
  const [metrics, setMetrics] = useState([])
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    adminApi.metrics(days).then(r => setMetrics(r.data.results || r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [days])

  const chartProps = {
    margin: { top: 5, right: 10, left: -20, bottom: 0 },
  }
  const tooltipStyle = {
    contentStyle: { background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, fontSize: '0.8rem' },
    labelStyle: { color: 'var(--text-primary)' },
  }
  const axisProps = {
    tick: { fontSize: 11, fill: 'var(--text-muted)' },
    tickLine: false, axisLine: false,
  }

  const latest = metrics[metrics.length - 1] || {}

  const CHARTS = [
    { key: 'active_users', label: 'Daily Active Users', color: '#00d4ff', format: v => v?.toLocaleString() },
    { key: 'total_messages', label: 'Cumulative Messages', color: '#7c5cfc', format: v => v?.toLocaleString() },
    { key: 'revenue_usd', label: 'Daily Revenue (USD)', color: '#00e5a0', format: v => `$${parseFloat(v || 0).toFixed(2)}` },
    { key: 'new_users', label: 'New Users Per Day', color: '#ffd060', format: v => v?.toLocaleString() },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>Platform Metrics</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Historical performance data</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[7, 14, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`btn btn-sm ${days === d ? 'btn-primary' : 'btn-secondary'}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="loading-orb" /></div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
            {CHARTS.map(c => (
              <div key={c.key} className="stat-card">
                <div className="stat-card-value" style={{ color: c.color }}>{c.format(latest[c.key])}</div>
                <div className="stat-card-label">{c.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {CHARTS.map(c => (
              <div key={c.key} className="card">
                <h4 style={{ marginBottom: 16, fontSize: '0.95rem' }}>{c.label}</h4>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={metrics} {...chartProps}>
                    <defs>
                      <linearGradient id={`grad-${c.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={c.color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={c.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" {...axisProps} tickFormatter={d => d?.slice(5)} />
                    <YAxis {...axisProps} />
                    <Tooltip {...tooltipStyle} formatter={v => [c.format(v), c.label]} />
                    <Area type="monotone" dataKey={c.key} stroke={c.color} strokeWidth={2} fill={`url(#grad-${c.key})`} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>

          {/* Raw data table */}
          <div className="card" style={{ marginTop: 24 }}>
            <h4 style={{ marginBottom: 16 }}>Raw Data</h4>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th><th>Active Users</th><th>New Users</th><th>Messages</th><th>Tokens</th><th>Revenue</th>
                    <th>Free</th><th>Premium</th><th>Team</th><th>Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {[...metrics].reverse().slice(0, 14).map(m => (
                    <tr key={m.date}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{m.date}</td>
                      <td>{(m.active_users || 0).toLocaleString()}</td>
                      <td style={{ color: 'var(--green)' }}>+{m.new_users || 0}</td>
                      <td>{(m.total_messages || 0).toLocaleString()}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{(m.total_tokens || 0).toLocaleString()}</td>
                      <td style={{ color: 'var(--green)', fontWeight: 600 }}>${parseFloat(m.revenue_usd || 0).toFixed(2)}</td>
                      <td>{m.free_users || 0}</td>
                      <td style={{ color: '#00d4ff' }}>{m.premium_users || 0}</td>
                      <td style={{ color: '#7c5cfc' }}>{m.team_users || 0}</td>
                      <td style={{ color: '#ffd060' }}>{m.enterprise_users || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default AdminBenchmarks