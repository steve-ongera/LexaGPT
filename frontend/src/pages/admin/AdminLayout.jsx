import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

const NAV = [
  { path: '/admin', icon: 'bi-speedometer2', label: 'Dashboard', end: true },
  { path: '/admin/users', icon: 'bi-people', label: 'Users' },
  { path: '/admin/training', icon: 'bi-cpu', label: 'Model Training' },
  { path: '/admin/benchmarks', icon: 'bi-graph-up', label: 'Benchmarks' },
  { path: '/admin/metrics', icon: 'bi-bar-chart', label: 'Metrics' },
]

export default function AdminLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className={`admin-sidebar ${mobileOpen ? 'open' : ''}`}>
        <div style={{ padding: '16px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--grad-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, boxShadow: 'var(--accent-glow)' }}>⟁</div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.95rem', background: 'var(--grad-accent)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>LexaGPT</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.08em' }}>ADMIN CONSOLE</div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
          {NAV.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <i className={`bi ${item.icon}`} />
              <span className="item-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border)' }}>
          <button className="sidebar-item w-full" onClick={() => navigate('/chat')}>
            <i className="bi bi-chat-dots" />
            <span className="item-label">Back to Chat</span>
          </button>
          <button className="sidebar-item w-full" style={{ color: 'var(--red)' }} onClick={logout}>
            <i className="bi bi-box-arrow-right" />
            <span className="item-label">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="admin-main">
        <div className="admin-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-ghost btn-icon" onClick={() => setMobileOpen(p => !p)} style={{ display: 'none' }}>
              <i className="bi bi-list" />
            </button>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Admin Console</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Platform Management</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="badge badge-accent"><i className="bi bi-shield-check" /> {user?.role}</span>
            <div className="user-avatar" style={{ width: 34, height: 34 }}>
              {user?.first_name?.charAt(0) || user?.email?.charAt(0)}
            </div>
          </div>
        </div>
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}