import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useChatStore } from '../../store/chatStore'
import { useAuthStore } from '../../store/authStore'
import { format } from 'date-fns'

export default function Sidebar({ isOpen, onToggle, onNewChat, onSearch }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { recentChats, starredChats, currentConversation, deleteConversation, starConversation, loadRecent } = useChatStore()
  const [contextMenu, setContextMenu] = useState(null)

  useEffect(() => { loadRecent() }, [])

  const handleContextMenu = (e, conv) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, conv })
  }

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  const NAV_ITEMS = [
    { icon: 'bi-chat-dots', label: 'Chat', path: '/chat' },
    { icon: 'bi-folder2', label: 'Projects', path: '/projects' },
    { icon: 'bi-box', label: 'Artifacts', path: '/artifacts' },
  ]

  if (user?.role === 'admin' || user?.role === 'moderator') {
    NAV_ITEMS.push({ icon: 'bi-shield-check', label: 'Admin', path: '/admin' })
  }

  return (
    <>
      <aside className={`sidebar ${!isOpen ? 'collapsed' : ''}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon">⟁</div>
            {isOpen && <span className="logo-text">LexaGPT</span>}
          </div>
          <button className="sidebar-collapse-btn" onClick={onToggle}>
            <i className={`bi bi-layout-sidebar${isOpen ? '' : '-reverse'}`} />
          </button>
        </div>

        <div className="sidebar-content">
          {/* New Chat */}
          <div style={{ padding: '8px 10px' }}>
            <button className="new-chat-btn" onClick={onNewChat}>
              <i className="bi bi-plus-lg" style={{ fontSize: 16 }} />
              {isOpen && <span>New Chat</span>}
            </button>
          </div>

          {/* Search */}
          <div style={{ padding: '0 10px 8px' }}>
            <button className="sidebar-item w-full" onClick={onSearch} style={{ gap: 10 }}>
              <i className="bi bi-search" />
              {isOpen && (
                <>
                  <span className="item-label">Search chats</span>
                  <kbd style={{ fontSize: '0.68rem', color: 'var(--text-muted)', background: 'var(--surface-3)', padding: '2px 6px', borderRadius: 4 }}>⌘K</kbd>
                </>
              )}
            </button>
          </div>

          {/* Navigation */}
          <div className="sidebar-section">
            {isOpen && <div className="sidebar-section-label">Menu</div>}
            {NAV_ITEMS.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-item ${isActive(item.path) ? 'active' : ''}`}
              >
                <i className={`bi ${item.icon}`} />
                {isOpen && <span className="item-label">{item.label}</span>}
              </Link>
            ))}
          </div>

          {/* Starred Chats */}
          {isOpen && starredChats?.length > 0 && (
            <div className="sidebar-section">
              <div className="sidebar-section-label">Starred</div>
              {starredChats.map(conv => (
                <ConversationItem
                  key={conv.id}
                  conv={conv}
                  isActive={currentConversation?.id === conv.id}
                  onContextMenu={handleContextMenu}
                  onNavigate={() => navigate(`/chat/${conv.id}`)}
                />
              ))}
            </div>
          )}

          {/* Recent Chats */}
          {isOpen && (
            <div className="sidebar-section">
              <div className="sidebar-section-label">Recent</div>
              {recentChats.length === 0 && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '8px 10px' }}>
                  No recent chats
                </p>
              )}
              {recentChats.map(conv => (
                <ConversationItem
                  key={conv.id}
                  conv={conv}
                  isActive={currentConversation?.id === conv.id}
                  onContextMenu={handleContextMenu}
                  onNavigate={() => navigate(`/chat/${conv.id}`)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          {isOpen ? (
            <div>
              <div
                className="user-info"
                onClick={() => navigate('/settings')}
                title="Settings"
              >
                <div className="user-avatar">
                  {user?.avatar ? <img src={user.avatar} alt="" /> : user?.first_name?.charAt(0) || user?.email?.charAt(0)}
                </div>
                <div className="user-details">
                  <div className="user-name">{user?.full_name || user?.email}</div>
                  <div className="user-plan">{user?.current_plan || 'free'}</div>
                </div>
                <i className="bi bi-gear" style={{ color: 'var(--text-muted)', fontSize: 14 }} />
              </div>
              <button
                className="sidebar-item w-full"
                style={{ marginTop: 4, color: 'var(--red)' }}
                onClick={logout}
              >
                <i className="bi bi-box-arrow-right" />
                <span className="item-label">Sign Out</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button className="sidebar-item" onClick={() => navigate('/settings')}>
                <i className="bi bi-gear" />
              </button>
              <button className="sidebar-item" onClick={logout}>
                <i className="bi bi-box-arrow-right" style={{ color: 'var(--red)' }} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Context menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.y, left: contextMenu.x,
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 10, padding: 6, zIndex: 9999, minWidth: 160,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
          onClick={() => setContextMenu(null)}
        >
          {[
            { icon: 'bi-star', label: 'Star', action: () => starConversation(contextMenu.conv.id) },
            { icon: 'bi-pencil', label: 'Rename', action: () => {} },
            { icon: 'bi-share', label: 'Share', action: () => {} },
            { icon: 'bi-archive', label: 'Archive', action: () => {} },
            { icon: 'bi-trash', label: 'Delete', action: () => deleteConversation(contextMenu.conv.id), danger: true },
          ].map(item => (
            <button
              key={item.label}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '8px 12px', borderRadius: 7,
                background: 'none', border: 'none', cursor: 'pointer',
                color: item.danger ? 'var(--red)' : 'var(--text-secondary)',
                fontSize: '0.875rem', fontFamily: 'var(--font-body)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
              onClick={item.action}
            >
              <i className={`bi ${item.icon}`} style={{ fontSize: 15 }} />
              {item.label}
            </button>
          ))}
        </div>
      )}
      {contextMenu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
          onClick={() => setContextMenu(null)} />
      )}
    </>
  )
}

function ConversationItem({ conv, isActive, onContextMenu, onNavigate }) {
  return (
    <button
      className={`sidebar-item ${isActive ? 'active' : ''}`}
      onClick={onNavigate}
      onContextMenu={e => onContextMenu(e, conv)}
      title={conv.title}
    >
      <i className="bi bi-chat" style={{ flexShrink: 0 }} />
      <span className="item-label">{conv.title || 'New Chat'}</span>
      {conv.is_starred && (
        <i className="bi bi-star-fill" style={{ fontSize: 11, color: 'var(--yellow)', flexShrink: 0 }} />
      )}
    </button>
  )
}