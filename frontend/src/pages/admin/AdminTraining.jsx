import React, { useState, useEffect, useRef } from 'react'
import { adminApi, createTrainingSocket } from '../../services/api'
import toast from 'react-hot-toast'

export default function AdminTraining() {
  const [tab, setTab] = useState('runs')
  const [runs, setRuns] = useState([])
  const [datasets, setDatasets] = useState([])
  const [samples, setSamples] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateRun, setShowCreateRun] = useState(false)
  const [showCreateDataset, setShowCreateDataset] = useState(false)
  const [activeRun, setActiveRun] = useState(null)
  const [liveProgress, setLiveProgress] = useState({})
  const socketRef = useRef(null)

  const TABS = [
    { id: 'runs', label: 'Training Runs', icon: 'bi-cpu' },
    { id: 'datasets', label: 'Datasets', icon: 'bi-database' },
    { id: 'samples', label: 'Sample Review', icon: 'bi-card-checklist' },
  ]

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [r, d, s] = await Promise.all([
        adminApi.trainingRuns(),
        adminApi.datasets(),
        adminApi.samples({ quality_status: 'pending' }),
      ])
      setRuns(r.data.results || r.data)
      setDatasets(d.data.results || d.data)
      setSamples(s.data.results || s.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const connectToRun = (runId) => {
    if (socketRef.current) socketRef.current.close()
    const ws = createTrainingSocket(runId)
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'training_progress' || data.progress !== undefined) {
        setLiveProgress(p => ({
          ...p,
          [runId]: {
            progress: data.progress,
            epoch: data.epoch,
            step: data.step,
            train_loss: data.train_loss,
            accuracy: data.accuracy,
            status: data.status,
          }
        }))
        if (data.status === 'completed') {
          toast.success('Training run completed!')
          loadAll()
        }
      }
    }
    ws.onerror = () => { /* WS may not be available in demo */ }
    socketRef.current = ws
  }

  const startRun = async (id) => {
    try {
      await adminApi.startRun(id)
      setRuns(rs => rs.map(r => r.id === id ? { ...r, status: 'running' } : r))
      connectToRun(id)
      toast.success('Training started!')
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to start')
    }
  }

  const stopRun = async (id, action) => {
    await (action === 'pause' ? adminApi.pauseRun(id) : adminApi.cancelRun(id))
    setRuns(rs => rs.map(r => r.id === id ? { ...r, status: action === 'pause' ? 'paused' : 'cancelled' } : r))
    toast.success(`Run ${action}d`)
  }

  const reviewSample = async (id, status) => {
    await adminApi.reviewSample(id, { quality_status: status, score: status === 'approved' ? 1.0 : 0.0 })
    setSamples(ss => ss.filter(s => s.id !== id))
    toast.success(`Sample ${status}`)
  }

  const STATUS_COLORS = { running: '#00e5a0', queued: '#ffd060', completed: '#00d4ff', failed: '#ff4466', cancelled: '#8888aa', paused: '#ff9945' }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>Model Training Platform</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Train, evaluate, and deploy Lexa models</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => setShowCreateDataset(true)}>
            <i className="bi bi-database-add" /> New Dataset
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreateRun(true)}>
            <i className="bi bi-play-circle" /> New Training Run
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--surface)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: '8px 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '0.875rem',
              display: 'flex', alignItems: 'center', gap: 7,
              background: tab === t.id ? 'var(--grad-accent)' : 'transparent',
              color: tab === t.id ? '#000' : 'var(--text-secondary)',
              transition: 'all 0.2s',
            }}>
            <i className={`bi ${t.icon}`} /> {t.label}
            {t.id === 'samples' && samples.length > 0 && (
              <span style={{ background: tab === t.id ? 'rgba(0,0,0,0.2)' : 'var(--red)', color: tab === t.id ? '#000' : '#fff', borderRadius: 99, padding: '1px 7px', fontSize: '0.72rem', fontWeight: 700 }}>
                {samples.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="loading-orb" /></div>
      ) : (
        <>
          {/* ── Training Runs ─────────────────────────────────────────────── */}
          {tab === 'runs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {runs.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <i className="bi bi-cpu" style={{ fontSize: 48, color: 'var(--text-muted)', display: 'block', marginBottom: 16 }} />
                  <h3>No training runs yet</h3>
                  <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>Start by creating a dataset and launching a training run.</p>
                  <button className="btn btn-primary" onClick={() => setShowCreateRun(true)}>Launch First Run</button>
                </div>
              )}
              {runs.map(run => {
                const live = liveProgress[run.id]
                const progress = live?.progress ?? run.progress_percent ?? 0
                const status = live?.status || run.status
                return (
                  <div key={run.id} className="card" style={{ borderLeft: `4px solid ${STATUS_COLORS[status] || '#8888aa'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem', marginBottom: 4 }}>{run.name}</div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <span className="badge" style={{ background: `${STATUS_COLORS[status]}18`, color: STATUS_COLORS[status] }}>{status}</span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{run.model_name}</span>
                          {run.dataset_name && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Dataset: {run.dataset_name}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {status === 'queued' && (
                          <button className="btn btn-primary btn-sm" onClick={() => startRun(run.id)}>
                            <i className="bi bi-play-fill" /> Start
                          </button>
                        )}
                        {status === 'running' && (
                          <>
                            <button className="btn btn-secondary btn-sm" onClick={() => stopRun(run.id, 'pause')}>
                              <i className="bi bi-pause-fill" /> Pause
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => stopRun(run.id, 'cancel')}>
                              <i className="bi bi-stop-fill" /> Cancel
                            </button>
                          </>
                        )}
                        {status === 'paused' && (
                          <button className="btn btn-primary btn-sm" onClick={() => startRun(run.id)}>
                            <i className="bi bi-play-fill" /> Resume
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                        <span>Epoch {live?.epoch ?? run.current_epoch}/{run.total_epochs} · Step {live?.step ?? run.current_step}/{run.total_steps}</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{progress.toFixed(1)}%</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${progress}%`, background: STATUS_COLORS[status] || 'var(--grad-accent)' }} />
                      </div>
                    </div>

                    {/* Metrics */}
                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                      {[
                        { label: 'Train Loss', value: (live?.train_loss ?? run.train_loss)?.toFixed(4) },
                        { label: 'Accuracy', value: (live?.accuracy ?? run.accuracy) ? `${((live?.accuracy ?? run.accuracy) * 100).toFixed(1)}%` : null },
                        { label: 'Eval Loss', value: run.eval_loss?.toFixed(4) },
                      ].filter(m => m.value).map(m => (
                        <div key={m.label}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 2 }}>{m.label}</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent)' }}>{m.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Datasets ──────────────────────────────────────────────────── */}
          {tab === 'datasets' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {datasets.map(ds => (
                <div key={ds.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>{ds.name}</div>
                      <span className={`badge badge-${ds.status === 'ready' ? 'green' : ds.status === 'processing' ? 'orange' : 'muted'}`}>{ds.status}</span>
                    </div>
                  </div>
                  {ds.description && <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 12 }}>{ds.description}</p>}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                    {[
                      { label: 'Total', value: ds.total_samples, color: 'var(--accent)' },
                      { label: 'Approved', value: ds.validated_samples, color: 'var(--green)' },
                      { label: 'Rejected', value: ds.rejected_samples, color: 'var(--red)' },
                    ].map(s => (
                      <div key={s.label} style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                        <div style={{ fontWeight: 700, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Sample Review ─────────────────────────────────────────────── */}
          {tab === 'samples' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {samples.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <i className="bi bi-check-circle" style={{ fontSize: 48, color: 'var(--green)', display: 'block', marginBottom: 16 }} />
                  <h3>All caught up!</h3>
                  <p style={{ color: 'var(--text-muted)' }}>No samples pending review</p>
                </div>
              )}
              {samples.map(s => (
                <div key={s.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {s.category && <span className="badge badge-accent">{s.category}</span>}
                      {s.language && <span className="badge badge-muted">{s.language}</span>}
                      {s.source && <span className="badge badge-muted">{s.source}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Prompt</div>
                      <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '12px 14px', fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.6, maxHeight: 120, overflow: 'auto' }}>
                        {s.prompt}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Response</div>
                      <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '12px 14px', fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.6, maxHeight: 120, overflow: 'auto' }}>
                        {s.response}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-sm" style={{ background: 'rgba(0,229,160,0.15)', color: 'var(--green)', border: '1px solid rgba(0,229,160,0.25)' }}
                      onClick={() => reviewSample(s.id, 'approved')}>
                      <i className="bi bi-check2-circle" /> Approve
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => reviewSample(s.id, 'rejected')}>
                      <i className="bi bi-x-circle" /> Reject
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => reviewSample(s.id, 'flagged')}>
                      <i className="bi bi-flag" /> Flag
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create Training Run Modal */}
      {showCreateRun && <CreateRunModal datasets={datasets} onClose={() => setShowCreateRun(false)} onCreate={(run) => { setRuns(r => [run, ...r]); setShowCreateRun(false); toast.success('Training run queued') }} />}
      {showCreateDataset && <CreateDatasetModal onClose={() => setShowCreateDataset(false)} onCreate={(ds) => { setDatasets(d => [ds, ...d]); setShowCreateDataset(false); toast.success('Dataset created') }} />}
    </div>
  )
}

function CreateRunModal({ datasets, onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', model_name: 'lexa-lite', dataset: '', hyperparameters: { epochs: 3, learning_rate: 0.00002, batch_size: 8, warmup_steps: 100 } })
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await adminApi.createRun(form)
      onCreate(data)
    } catch { toast.error('Failed to create run') }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><i className="bi bi-x-lg" /></button>
        <h3 style={{ marginBottom: 20 }}>New Training Run</h3>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Run Name *</label>
            <input className="form-input" placeholder="Lexa Lite v2.0 Finetune" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Base Model</label>
            <select className="form-input form-select" value={form.model_name} onChange={e => setForm(p => ({ ...p, model_name: e.target.value }))}>
              {['lexa-lite', 'lexa-pro', 'lexa-vision', 'lexa-ultra'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Dataset</label>
            <select className="form-input form-select" value={form.dataset} onChange={e => setForm(p => ({ ...p, dataset: e.target.value }))}>
              <option value="">No dataset (from scratch)</option>
              {datasets.map(d => <option key={d.id} value={d.id}>{d.name} ({d.total_samples} samples)</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Epochs</label>
              <input className="form-input" type="number" min={1} max={20} value={form.hyperparameters.epochs}
                onChange={e => setForm(p => ({ ...p, hyperparameters: { ...p.hyperparameters, epochs: parseInt(e.target.value) } }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Batch Size</label>
              <input className="form-input" type="number" value={form.hyperparameters.batch_size}
                onChange={e => setForm(p => ({ ...p, hyperparameters: { ...p.hyperparameters, batch_size: parseInt(e.target.value) } }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Learning Rate</label>
            <input className="form-input" type="number" step="0.000001" value={form.hyperparameters.learning_rate}
              onChange={e => setForm(p => ({ ...p, hyperparameters: { ...p.hyperparameters, learning_rate: parseFloat(e.target.value) } }))} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><i className="bi bi-arrow-repeat spin" /> Queuing...</> : <><i className="bi bi-play-circle" /> Queue Run</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CreateDatasetModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', description: '' })
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await adminApi.createDataset(form)
      onCreate(data)
    } catch { toast.error('Failed to create dataset') }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><i className="bi bi-x-lg" /></button>
        <h3 style={{ marginBottom: 20 }}>Create Dataset</h3>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Dataset Name *</label>
            <input className="form-input" placeholder="General QA v1" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Dataset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}