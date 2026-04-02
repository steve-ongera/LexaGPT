import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { projectApi, artifactApi } from '../../services/api'
import Sidebar from '../../components/sidebar/Sidebar'
import toast from 'react-hot-toast'

// ══════════════════════════════════════════════════════════════════════════════
// PROJECTS PAGE
// ══════════════════════════════════════════════════════════════════════════════
export function ProjectsPage() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', color: '#6366f1' })
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    projectApi.list().then(r => setProjects(r.data.results || r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const createProject = async (e) => {
    e.preventDefault()
    try {
      const { data } = await projectApi.create(form)
      setProjects(p => [data, ...p])
      setShowCreate(false)
      setForm({ name: '', description: '', color: '#6366f1' })
      toast.success('Project created')
    } catch { toast.error('Failed to create project') }
  }

  const COLORS = ['#6366f1', '#00d4ff', '#7c5cfc', '#00e5a0', '#ffd060', '#ff9945', '#ff4466', '#ec4899']

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(p => !p)} onNewChat={() => navigate('/chat')} onSearch={() => {}} />
      <div className={`main-content ${!sidebarOpen ? 'sidebar-collapsed' : ''}`}>
        <div style={{ padding: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
            <div>
              <h2 style={{ marginBottom: 4 }}>Projects</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Organize your conversations by project</p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <i className="bi bi-plus-lg" /> New Project
            </button>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="loading-orb" /></div>
          ) : projects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 20px' }}>
              <i className="bi bi-folder2-open" style={{ fontSize: 48, color: 'var(--text-muted)', display: 'block', marginBottom: 16 }} />
              <h3 style={{ marginBottom: 8 }}>No projects yet</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>Create a project to organize your conversations</p>
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Create First Project</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {projects.map(proj => (
                <div key={proj.id} className="card card-hover" onClick={() => navigate(`/chat?project=${proj.id}`)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `${proj.color}22`, border: `1px solid ${proj.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                      📁
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{proj.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{proj.conversation_count} conversations</div>
                    </div>
                    {proj.is_starred && <i className="bi bi-star-fill" style={{ marginLeft: 'auto', color: 'var(--yellow)', fontSize: 14 }} />}
                  </div>
                  {proj.description && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{proj.description}</p>}
                  <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
                    <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); projectApi.star(proj.id).then(() => setProjects(ps => ps.map(p => p.id === proj.id ? { ...p, is_starred: !p.is_starred } : p))) }}>
                      <i className={`bi bi-star${proj.is_starred ? '-fill' : ''}`} />
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); }}>
                      <i className="bi bi-pencil" />
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={e => {
                      e.stopPropagation()
                      if (confirm('Delete this project?')) {
                        projectApi.delete(proj.id).then(() => { setProjects(ps => ps.filter(p => p.id !== proj.id)); toast.success('Project deleted') })
                      }
                    }}>
                      <i className="bi bi-trash" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showCreate && (
          <div className="modal-overlay" onClick={() => setShowCreate(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setShowCreate(false)}><i className="bi bi-x-lg" /></button>
              <h3 style={{ marginBottom: 20 }}>Create Project</h3>
              <form onSubmit={createProject} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Project Name *</label>
                  <input className="form-input" placeholder="My Research Project" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-input" rows={3} placeholder="What is this project about?" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} style={{ resize: 'vertical' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Color</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setForm(p => ({ ...p, color: c }))}
                        style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: `3px solid ${form.color === c ? 'white' : 'transparent'}`, cursor: 'pointer', flexShrink: 0 }} />
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Create Project</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ARTIFACTS PAGE
// ══════════════════════════════════════════════════════════════════════════════
export function ArtifactsPage() {
  const [artifacts, setArtifacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    artifactApi.list().then(r => setArtifacts(r.data.results || r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const TYPE_ICONS = { code: 'bi-code-slash', html: 'bi-filetype-html', react: 'bi-filetype-jsx', svg: 'bi-vector-pen', markdown: 'bi-markdown', text: 'bi-file-text', json: 'bi-filetype-json', csv: 'bi-table', mermaid: 'bi-diagram-3' }
  const TYPE_COLORS = { code: '#00d4ff', html: '#ff9945', react: '#61dafb', svg: '#7c5cfc', markdown: '#00e5a0', text: 'var(--text-secondary)', json: '#ffd060', csv: '#00e5a0', mermaid: '#7c5cfc' }

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(p => !p)} onNewChat={() => navigate('/chat')} onSearch={() => {}} />
      <div className={`main-content ${!sidebarOpen ? 'sidebar-collapsed' : ''}`}>
        <div style={{ padding: 32 }}>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ marginBottom: 4 }}>Artifacts</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Code, documents, and components created by Lexa</p>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="loading-orb" /></div>
          ) : artifacts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 20px' }}>
              <i className="bi bi-box" style={{ fontSize: 48, color: 'var(--text-muted)', display: 'block', marginBottom: 16 }} />
              <h3 style={{ marginBottom: 8 }}>No artifacts yet</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>Ask Lexa to write code, create HTML, or build a React component</p>
              <button className="btn btn-primary" onClick={() => navigate('/chat')}>Start Chatting</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              {artifacts.map(a => {
                const color = TYPE_COLORS[a.artifact_type] || 'var(--text-secondary)'
                const icon = TYPE_ICONS[a.artifact_type] || 'bi-file-code'
                return (
                  <div key={a.id} className="card card-hover" onClick={() => setSelected(a)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className={`bi ${icon}`} style={{ color, fontSize: 18 }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                        <div style={{ fontSize: '0.72rem', color, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{a.artifact_type}</div>
                      </div>
                    </div>
                    <pre style={{ background: 'var(--surface-2)', padding: 10, borderRadius: 8, fontSize: '0.75rem', overflow: 'hidden', maxHeight: 80, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', lineHeight: 1.5 }}>
                      {a.content.slice(0, 200)}
                    </pre>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>v{a.version}</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(a.content); toast.success('Copied') }}><i className="bi bi-clipboard" /></button>
                        <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); if (confirm('Delete?')) artifactApi.delete(a.id).then(() => { setArtifacts(as => as.filter(x => x.id !== a.id)); toast.success('Deleted') }) }}><i className="bi bi-trash" /></button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {selected && (
          <div className="modal-overlay" onClick={() => setSelected(null)}>
            <div className="modal" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setSelected(null)}><i className="bi bi-x-lg" /></button>
              <h3 style={{ marginBottom: 4 }}>{selected.title}</h3>
              <span className="badge badge-accent" style={{ marginBottom: 16, display: 'inline-flex' }}>{selected.artifact_type}</span>
              <pre style={{ background: 'var(--surface-2)', padding: 16, borderRadius: 10, fontSize: '0.82rem', fontFamily: 'var(--font-mono)', lineHeight: 1.6, overflow: 'auto', maxHeight: 400, color: 'var(--text-primary)' }}>
                {selected.content}
              </pre>
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button className="btn btn-primary" onClick={() => { navigator.clipboard.writeText(selected.content); toast.success('Copied to clipboard') }}>
                  <i className="bi bi-clipboard" /> Copy Code
                </button>
                <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProjectsPage