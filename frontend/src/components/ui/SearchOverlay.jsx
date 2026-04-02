import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchApi } from '../../services/api'
import { useChatStore } from '../../store/chatStore'

export default function SearchOverlay({ onClose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)
  const navigate = useNavigate()
  const { loadConversation } = useChatStore()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!query.trim()) { setResults(null); return }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const { data } = await searchApi.search(query)
        setResults(data)
      } catch { setResults(null) }
      finally { setLoading(false) }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const handleConvClick = (id) => {
    navigate(`/chat/${id}`)
    onClose()
  }

  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-box" onClick={e => e.stopPropagation()}>
        <div className="search-input-row">
          <i className="bi bi-search" />
          <input
            ref={inputRef}
            placeholder="Search conversations, messages..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {loading && <i className="bi bi-arrow-repeat spin" style={{ color: 'var(--text-muted)' }} />}
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18 }}>
            <i className="bi bi-x" />
          </button>
        </div>

        <div className="search-results">
          {!query && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              <i className="bi bi-search" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} />
              Type to search your conversations
            </div>
          )}

          {results && (
            <>
              {results.conversations?.length > 0 && (
                <div>
                  <div style={{ padding: '8px 14px 4px', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    Conversations
                  </div>
                  {results.conversations.map(c => (
                    <div key={c.id} className="search-result-item" onClick={() => handleConvClick(c.id)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="bi bi-chat" style={{ color: 'var(--text-muted)', fontSize: 14 }} />
                        <div>
                          <div className="search-result-title">{c.title}</div>
                          {c.last_message && (
                            <div className="search-result-preview">{c.last_message.content}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {results.messages?.length > 0 && (
                <div>
                  <div style={{ padding: '8px 14px 4px', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    Messages
                  </div>
                  {results.messages.map(m => (
                    <div key={m.id} className="search-result-item" onClick={() => handleConvClick(m.conversation_id)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="bi bi-chat-text" style={{ color: 'var(--text-muted)', fontSize: 14 }} />
                        <div>
                          <div className="search-result-title">{m.conversation_title}</div>
                          <div className="search-result-preview">{m.content}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {results.conversations?.length === 0 && results.messages?.length === 0 && (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  No results for "<strong>{query}</strong>"
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 16, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span><kbd style={{ background: 'var(--surface-3)', padding: '2px 6px', borderRadius: 4 }}>↑↓</kbd> Navigate</span>
          <span><kbd style={{ background: 'var(--surface-3)', padding: '2px 6px', borderRadius: 4 }}>↵</kbd> Open</span>
          <span><kbd style={{ background: 'var(--surface-3)', padding: '2px 6px', borderRadius: 4 }}>Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  )
}