import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { format } from 'date-fns'
import copy from 'copy-to-clipboard'
import toast from 'react-hot-toast'
import { useChatStore } from '../../store/chatStore'
import { useAuthStore } from '../../store/authStore'
import Sidebar from '../../components/sidebar/Sidebar'
import SearchOverlay from '../../components/ui/SearchOverlay'
import PaymentModal from '../../components/modals/PaymentModal'

const MODELS = [
  { id: 'lexa-lite', name: 'Lexa Lite', tier: 'free' },
  { id: 'lexa-pro', name: 'Lexa Pro', tier: 'premium' },
  { id: 'lexa-vision', name: 'Lexa Vision', tier: 'premium' },
  { id: 'lexa-ultra', name: 'Lexa Ultra', tier: 'enterprise' },
]

const QUICK_PROMPTS = [
  { title: 'Write code', desc: 'Python, JS, any language' },
  { title: 'Analyze data', desc: 'CSV, tables, charts' },
  { title: 'Explain anything', desc: 'Like I\'m 5 or an expert' },
  { title: 'Debug my code', desc: 'Find and fix errors' },
]

// ── Code Block ────────────────────────────────────────────────────────────────
function CodeBlock({ language, children }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    copy(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span className="code-lang">{language || 'code'}</span>
        <button className="code-copy-btn" onClick={handleCopy}>
          <i className={`bi bi-${copied ? 'check2' : 'clipboard'}`} />
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={vscDarkPlus}
        customStyle={{ margin: 0, background: 'var(--surface)' }}
        PreTag="pre"
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    </div>
  )
}

// ── Message Component ─────────────────────────────────────────────────────────
function Message({ msg, isStreaming }) {
  const [feedback, setFeedback] = useState(null)
  const isUser = msg.role === 'user'

  const handleCopy = () => {
    copy(msg.content)
    toast.success('Copied to clipboard')
  }

  const components = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '')
      return !inline && match ? (
        <CodeBlock language={match[1]}>{children}</CodeBlock>
      ) : (
        <code className={className} {...props}>{children}</code>
      )
    }
  }

  return (
    <div className={`message ${msg.role}`}>
      <div className="msg-avatar">
        {isUser ? msg.content.charAt(0).toUpperCase() : '⟁'}
      </div>
      <div className="msg-content">
        <div className="msg-bubble">
          {isUser ? (
            <span>{msg.content}</span>
          ) : (
            <div className="md-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                {msg.content}
              </ReactMarkdown>
              {isStreaming && <span className="streaming-cursor" />}
            </div>
          )}
        </div>

        {!isUser && !isStreaming && msg.content && (
          <div className="msg-actions">
            <button className={`msg-action-btn ${feedback === 1 ? 'liked' : ''}`}
              onClick={() => setFeedback(feedback === 1 ? null : 1)}
              title="Good response">
              <i className="bi bi-hand-thumbs-up" />
            </button>
            <button className={`msg-action-btn ${feedback === -1 ? 'disliked' : ''}`}
              onClick={() => setFeedback(feedback === -1 ? null : -1)}
              title="Bad response">
              <i className="bi bi-hand-thumbs-down" />
            </button>
            <button className="msg-action-btn" onClick={handleCopy} title="Copy">
              <i className="bi bi-clipboard" />
            </button>
            <button className="msg-action-btn" title="Regenerate">
              <i className="bi bi-arrow-clockwise" />
            </button>
          </div>
        )}

        {msg.created_at && (
          <div className="msg-time">
            {format(new Date(msg.created_at), 'h:mm a')}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Chat Page ─────────────────────────────────────────────────────────────
export default function ChatPage() {
  const { conversationId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const {
    messages, currentConversation, isStreaming, selectedModel,
    sendMessage, loadConversation, newChat, setModel, loadRecent,
  } = useChatStore()

  const [input, setInput] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showSearch, setShowSearch] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [attachments, setAttachments] = useState([])
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

  // Load conversation
  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId)
    } else {
      newChat()
    }
  }, [conversationId])

  // Load recent chats
  useEffect(() => { loadRecent() }, [])

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
      }
      if (e.key === 'Escape') {
        setShowSearch(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleSend = useCallback(async () => {
    if (!input.trim() || isStreaming) return
    const msg = input.trim()
    setInput('')
    textareaRef.current?.focus()
    await sendMessage(msg, attachments)
    setAttachments([])
    // Update URL if new conversation was created
    if (!conversationId) {
      const { currentConversation: conv } = useChatStore.getState()
      if (conv) navigate(`/chat/${conv.id}`, { replace: true })
    }
  }, [input, isStreaming, attachments, conversationId])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleQuickPrompt = (prompt) => {
    setInput(prompt.title + ': ')
    textareaRef.current?.focus()
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    setAttachments(files)
    if (files.length) toast.success(`${files.length} file(s) attached`)
  }

  const availableModels = MODELS.filter(m => {
    if (m.tier === 'free') return true
    if (m.tier === 'premium') return ['premium', 'team', 'enterprise'].includes(user?.current_plan)
    if (m.tier === 'enterprise') return user?.current_plan === 'enterprise'
    return false
  })

  return (
    <div className="app-layout">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(p => !p)}
        onNewChat={() => { newChat(); navigate('/chat') }}
        onSearch={() => setShowSearch(true)}
      />

      <div className={`main-content ${!sidebarOpen ? 'sidebar-collapsed' : ''}`}>
        <div className="chat-layout">
          {/* Topbar */}
          <div className="chat-topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button className="btn btn-ghost btn-icon" onClick={() => setSidebarOpen(p => !p)}>
                <i className="bi bi-layout-sidebar" />
              </button>
              <span className="chat-title">
                {currentConversation?.title || 'New Chat'}
              </span>
            </div>
            <div className="topbar-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => setShowSearch(true)}>
                <i className="bi bi-search" />
                <span className="hidden-mobile" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>⌘K</span>
              </button>
              {currentConversation && (
                <>
                  <button className="btn btn-ghost btn-icon" title="Share">
                    <i className="bi bi-share" />
                  </button>
                  <button className="btn btn-ghost btn-icon" title="Archive">
                    <i className="bi bi-archive" />
                  </button>
                </>
              )}
              <button className="btn btn-secondary btn-sm" onClick={() => setShowPayment(true)}>
                <i className="bi bi-lightning-charge" />
                Upgrade
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            <div className="messages-container">
              {messages.length === 0 ? (
                <div className="chat-empty">
                  <div className="chat-empty-orb">⟁</div>
                  <h2>What can Lexa help with?</h2>
                  <p>Ask anything — code, analysis, writing, math, or just a conversation.</p>
                  <div className="quick-prompts">
                    {QUICK_PROMPTS.map(p => (
                      <button key={p.title} className="quick-prompt" onClick={() => handleQuickPrompt(p)}>
                        <strong>{p.title}</strong>
                        {p.desc}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <Message
                    key={msg.id || i}
                    msg={msg}
                    isStreaming={isStreaming && i === messages.length - 1 && msg.role === 'assistant'}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="chat-input-area">
            <div className="chat-input-container">
              {attachments.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  {attachments.map((f, i) => (
                    <span key={i} className="badge badge-accent">
                      <i className="bi bi-paperclip" />{f.name}
                      <button
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '0 2px' }}
                        onClick={() => setAttachments(a => a.filter((_, j) => j !== i))}
                      ><i className="bi bi-x" /></button>
                    </span>
                  ))}
                </div>
              )}

              <div className="chat-input-wrapper">
                <div className="chat-input-top">
                  <textarea
                    ref={textareaRef}
                    className="chat-textarea"
                    placeholder={isStreaming ? 'Lexa is thinking...' : 'Message Lexa... (Enter to send, Shift+Enter for new line)'}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    disabled={isStreaming}
                    style={{ resize: 'none' }}
                  />
                  <button
                    className="chat-send-btn"
                    onClick={handleSend}
                    disabled={!input.trim() || isStreaming}
                  >
                    {isStreaming
                      ? <i className="bi bi-stop-circle" />
                      : <i className="bi bi-arrow-up" />
                    }
                  </button>
                </div>

                <div className="chat-input-bottom">
                  <div className="chat-toolbar">
                    <input
                      ref={fileInputRef} type="file" multiple
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                      accept="image/*,.pdf,.txt,.csv,.js,.py,.ts,.jsx,.tsx,.json"
                    />
                    <button className="toolbar-btn" onClick={() => fileInputRef.current?.click()} title="Attach file">
                      <i className="bi bi-paperclip" />
                    </button>
                    <button className="toolbar-btn" title="Voice input">
                      <i className="bi bi-mic" />
                    </button>
                    <button className="toolbar-btn" title="Web search">
                      <i className="bi bi-globe" />
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="model-selector">
                      <i className="bi bi-cpu" style={{ fontSize: 13 }} />
                      <select
                        value={selectedModel}
                        onChange={e => setModel(e.target.value)}
                        title="Select model"
                      >
                        {MODELS.map(m => (
                          <option key={m.id} value={m.id}
                            disabled={!availableModels.find(am => am.id === m.id)}>
                            {m.name}{!availableModels.find(am => am.id === m.id) ? ' 🔒' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <span className="char-count">
                      {input.length > 0 && `${input.length}`}
                    </span>
                  </div>
                </div>
              </div>

              <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 8 }}>
                Lexa may make mistakes. Verify important information.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Overlays */}
      {showSearch && <SearchOverlay onClose={() => setShowSearch(false)} />}
      {showPayment && <PaymentModal onClose={() => setShowPayment(false)} />}

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          style={{
            display: 'none',
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 99,
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}