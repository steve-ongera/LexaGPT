import React, { useState, useEffect } from 'react'
import { adminApi } from '../../services/api'
import toast from 'react-hot-toast'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState({ role: '', is_active: '' })
  const [selected, setSelected] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const params = { search }
      if (filter.role) params.role = filter.role
      if (filter.is_active !== '') params.is_active = filter.is_active
      const { data } = await adminApi.users(params)
      setUsers(data.results || data)
    } catch { toast.error('Failed to load users') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [search, filter])

  const toggleActive = async (id) => {
    await adminApi.toggleUser(id)
    setUsers(us => us.map(u => u.id === id ? { ...u, is_active: !u.is_active } : u))
    toast.success('User status updated')
  }

  const changePlan = async (id, plan) => {
    await adminApi.changeUserPlan(id, plan)
    toast.success(`Plan updated to ${plan}`)
    setSelected(null)
    load()
  }

  const PLAN_COLORS = { free: '#8888aa', premium: '#00d4ff', team: '#7c5cfc', enterprise: '#ffd060' }
  const ROLE_COLORS = { admin: '#ff4466', moderator: '#ff9945', researcher: '#7c5cfc', user: '#8888aa' }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ marginBottom: 4 }}>Users</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{users.length} total users</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <i className="bi bi-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input className="form-input" style={{ paddingLeft: 36 }} placeholder="Search by email, name..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-input form-select" style={{ width: 140 }} value={filter.role}
          onChange={e => setFilter(f => ({ ...f, role: e.target.value }))}>
          <option value="">All Roles</option>
          {['user', 'moderator', 'researcher', 'admin'].map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className="form-input form-select" style={{ width: 140 }} value={filter.is_active}
          onChange={e => setFilter(f => ({ ...f, is_active: e.target.value }))}>
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="loading-orb" /></div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Plan</th>
              <th>Messages</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="user-avatar" style={{ width: 32, height: 32, fontSize: 13 }}>
                      {u.first_name?.charAt(0) || u.email.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                        {u.first_name} {u.last_name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="badge" style={{ background: `${ROLE_COLORS[u.role] || '#8888aa'}18`, color: ROLE_COLORS[u.role] || '#8888aa' }}>
                    {u.role}
                  </span>
                </td>
                <td>
                  <span className="badge" style={{ background: `${PLAN_COLORS[u.current_plan] || '#8888aa'}18`, color: PLAN_COLORS[u.current_plan] || '#8888aa' }}>
                    {u.current_plan || 'free'}
                  </span>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                  {(u.total_messages_sent || 0).toLocaleString()}
                </td>
                <td>
                  <span className={`badge badge-${u.is_active ? 'green' : 'red'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setSelected(u)} title="Manage">
                      <i className="bi bi-pencil" />
                    </button>
                    <button
                      className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-secondary'}`}
                      onClick={() => toggleActive(u.id)}
                      title={u.is_active ? 'Deactivate' : 'Activate'}
                    >
                      <i className={`bi bi-${u.is_active ? 'pause-circle' : 'play-circle'}`} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* User detail modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelected(null)}><i className="bi bi-x-lg" /></button>
            <h3 style={{ marginBottom: 4 }}>{selected.first_name} {selected.last_name}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 20 }}>{selected.email}</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Total Messages', value: (selected.total_messages_sent || 0).toLocaleString() },
                { label: 'Tokens Used', value: (selected.total_tokens_used || 0).toLocaleString() },
                { label: 'Current Plan', value: selected.current_plan || 'free' },
                { label: 'Role', value: selected.role },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--surface-2)', padding: '12px 14px', borderRadius: 10 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', textTransform: 'capitalize' }}>{s.value}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label className="form-label" style={{ marginBottom: 10 }}>Change Plan</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['free', 'premium', 'team', 'enterprise'].map(plan => (
                  <button key={plan} onClick={() => changePlan(selected.id, plan)}
                    className={`btn btn-sm ${selected.current_plan === plan ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ textTransform: 'capitalize' }}>
                    {plan}
                  </button>
                ))}
              </div>
            </div>

            <button
              className={`btn w-full ${selected.is_active ? 'btn-danger' : 'btn-secondary'}`}
              onClick={() => { toggleActive(selected.id); setSelected(null) }}
            >
              <i className={`bi bi-${selected.is_active ? 'pause-circle' : 'play-circle'}`} />
              {selected.is_active ? 'Deactivate User' : 'Activate User'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}