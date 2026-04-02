// ══════════════════════════════════════════════════════════════════════════════
// SETTINGS PAGE
// ══════════════════════════════════════════════════════════════════════════════
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { authApi, paymentApi } from '../../services/api'
import toast from 'react-hot-toast'
import Sidebar from '../../components/sidebar/Sidebar'

export function SettingsPage() {
  const { user, updateUser, logout } = useAuthStore()
  const navigate = useNavigate()
  const [tab, setTab] = useState('profile')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [profile, setProfile] = useState({ first_name: '', last_name: '', theme: 'dark', timezone: 'Africa/Nairobi' })
  const [subscription, setSubscription] = useState(null)
  const [payments, setPayments] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) setProfile({ first_name: user.first_name, last_name: user.last_name, theme: user.theme, timezone: user.timezone })
    paymentApi.getSubscription().then(r => setSubscription(r.data)).catch(() => {})
    paymentApi.history().then(r => setPayments(r.data.results || r.data)).catch(() => {})
  }, [user])

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const { data } = await authApi.updateProfile(profile)
      updateUser(data)
      toast.success('Profile saved')
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  const TABS = [
    { id: 'profile', icon: 'bi-person', label: 'Profile' },
    { id: 'subscription', icon: 'bi-lightning', label: 'Subscription' },
    { id: 'appearance', icon: 'bi-palette', label: 'Appearance' },
    { id: 'security', icon: 'bi-shield-lock', label: 'Security' },
  ]

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(p => !p)} onNewChat={() => navigate('/chat')} onSearch={() => {}} />
      <div className={`main-content ${!sidebarOpen ? 'sidebar-collapsed' : ''}`}>
        <div className="settings-layout">
          {/* Sidebar nav */}
          <div>
            <h3 style={{ marginBottom: 20, paddingLeft: 14 }}>Settings</h3>
            <nav className="settings-nav">
              {TABS.map(t => (
                <button key={t.id} className={`settings-nav-item ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
                  <i className={`bi ${t.icon}`} /> {t.label}
                </button>
              ))}
              <button className="settings-nav-item" style={{ color: 'var(--red)', marginTop: 20 }} onClick={logout}>
                <i className="bi bi-box-arrow-right" /> Sign Out
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="settings-content">
            {tab === 'profile' && (
              <div className="settings-section">
                <h3>Profile Information</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input className="form-input" value={profile.first_name} onChange={e => setProfile(p => ({ ...p, first_name: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input className="form-input" value={profile.last_name} onChange={e => setProfile(p => ({ ...p, last_name: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label className="form-label">Email</label>
                  <input className="form-input" value={user?.email || ''} disabled />
                </div>
                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label className="form-label">Timezone</label>
                  <select className="form-input form-select" value={profile.timezone} onChange={e => setProfile(p => ({ ...p, timezone: e.target.value }))}>
                    {['Africa/Nairobi', 'UTC', 'America/New_York', 'Europe/London', 'Asia/Dubai'].map(tz => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
                <button className="btn btn-primary" onClick={handleSaveProfile} disabled={saving}>
                  {saving ? <><i className="bi bi-arrow-repeat spin" /> Saving...</> : 'Save Changes'}
                </button>
              </div>
            )}

            {tab === 'subscription' && (
              <div className="settings-section">
                <h3>Subscription & Billing</h3>
                <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', textTransform: 'capitalize' }}>
                        {subscription?.current_subscription?.plan || 'Free'} Plan
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
                        {subscription?.usage?.daily_messages_used || 0} / {subscription?.usage?.daily_limit || 20} messages today
                      </div>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => navigate('/pricing')}>
                      Upgrade
                    </button>
                  </div>
                  <div className="progress-bar" style={{ marginTop: 12 }}>
                    <div className="progress-fill" style={{
                      width: `${Math.min(100, ((subscription?.usage?.daily_messages_used || 0) / (subscription?.usage?.daily_limit || 20)) * 100)}%`
                    }} />
                  </div>
                </div>

                <h4 style={{ marginBottom: 14 }}>Payment History</h4>
                {payments.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No payments yet.</p>
                ) : (
                  <table className="data-table">
                    <thead><tr><th>Date</th><th>Method</th><th>Amount</th><th>Status</th></tr></thead>
                    <tbody>
                      {payments.map(p => (
                        <tr key={p.id}>
                          <td>{new Date(p.created_at).toLocaleDateString()}</td>
                          <td style={{ textTransform: 'capitalize' }}>{p.method}</td>
                          <td>${p.amount}</td>
                          <td><span className={`badge badge-${p.status === 'completed' ? 'green' : p.status === 'pending' ? 'orange' : 'red'}`}>{p.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {tab === 'appearance' && (
              <div className="settings-section">
                <h3>Appearance</h3>
                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label className="form-label">Theme</label>
                  <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                    {['dark', 'light', 'system'].map(t => (
                      <button key={t} onClick={() => setProfile(p => ({ ...p, theme: t }))}
                        style={{
                          padding: '10px 20px', borderRadius: 10, border: `2px solid ${profile.theme === t ? 'var(--accent)' : 'var(--border)'}`,
                          background: profile.theme === t ? 'var(--accent-dim)' : 'var(--surface-2)',
                          color: profile.theme === t ? 'var(--accent)' : 'var(--text-secondary)',
                          cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 500,
                          textTransform: 'capitalize', transition: 'all 0.2s',
                        }}>
                        {t === 'dark' ? '🌙' : t === 'light' ? '☀️' : '💻'} {t}
                      </button>
                    ))}
                  </div>
                </div>
                <button className="btn btn-primary" onClick={handleSaveProfile} disabled={saving}>Save</button>
              </div>
            )}

            {tab === 'security' && (
              <div className="settings-section">
                <h3>Security</h3>
                <ChangePasswordForm />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ChangePasswordForm() {
  const [form, setForm] = useState({ old_password: '', new_password: '', confirm: '' })
  const [loading, setLoading] = useState(false)

  const handle = async (e) => {
    e.preventDefault()
    if (form.new_password !== form.confirm) { toast.error('Passwords do not match'); return }
    setLoading(true)
    try {
      await authApi.changePassword({ old_password: form.old_password, new_password: form.new_password })
      toast.success('Password changed successfully')
      setForm({ old_password: '', new_password: '', confirm: '' })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password')
    } finally { setLoading(false) }
  }

  return (
    <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 380 }}>
      {[
        { name: 'old_password', label: 'Current Password' },
        { name: 'new_password', label: 'New Password' },
        { name: 'confirm', label: 'Confirm New Password' },
      ].map(f => (
        <div key={f.name} className="form-group">
          <label className="form-label">{f.label}</label>
          <input className="form-input" type="password" value={form[f.name]}
            onChange={e => setForm(p => ({ ...p, [f.name]: e.target.value }))} required />
        </div>
      ))}
      <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: 'fit-content' }}>
        {loading ? <><i className="bi bi-arrow-repeat spin" /> Updating...</> : 'Update Password'}
      </button>
    </form>
  )
}

export default SettingsPage