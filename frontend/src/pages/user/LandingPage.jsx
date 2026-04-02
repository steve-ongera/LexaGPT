import React from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

const FEATURES = [
  { icon: '⚡', title: 'Lightning Fast Streaming', desc: 'Real-time token-by-token streaming so you see responses as they\'re generated.' },
  { icon: '🧠', title: 'Lexa Model Family', desc: 'From Lexa Lite for quick tasks to Lexa Ultra for million-token contexts.' },
  { icon: '🇰🇪', title: 'M-Pesa Payments', desc: 'Pay subscriptions with M-Pesa, credit card, or PayPal. Built for Kenya.' },
  { icon: '🔬', title: 'Custom Model Training', desc: 'Admin platform to train, evaluate, and benchmark your own AI models.' },
  { icon: '📦', title: 'Artifacts & Code', desc: 'Generate code, HTML, React components, diagrams with live preview.' },
  { icon: '🔒', title: 'Privacy First', desc: 'Your conversations are yours. Enterprise-grade security and data controls.' },
]

const MODELS = [
  { name: 'Lexa Lite', desc: 'Fast everyday tasks', tier: 'Free', color: '#00e5a0' },
  { name: 'Lexa Pro', desc: 'Advanced reasoning', tier: 'Premium', color: '#00d4ff' },
  { name: 'Lexa Vision', desc: 'Text + Images', tier: 'Premium', color: '#7c5cfc' },
  { name: 'Lexa Ultra', desc: '1M token context', tier: 'Enterprise', color: '#ffd060' },
]

export default function LandingPage() {
  const { isAuthenticated } = useAuthStore()

  return (
    <div className="landing">
      {/* Nav */}
      <nav className="landing-nav">
        <div className="nav-logo">LexaGPT</div>
        <ul className="nav-links">
          <li><a href="#features">Features</a></li>
          <li><a href="#models">Models</a></li>
          <li><Link to="/pricing">Pricing</Link></li>
        </ul>
        <div className="nav-cta">
          {isAuthenticated ? (
            <Link to="/chat" className="btn btn-primary btn-sm">Open Chat</Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">Sign In</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Get Started Free</Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-badge">
          <i className="bi bi-stars" />
          Now in Beta — Join 10,000+ users
        </div>

        <h1 className="hero-title">
          The AI Built for<br />
          <span className="gradient-text">Africa & Beyond</span>
        </h1>

        <p className="hero-sub">
          LexaGPT brings world-class AI to your fingertips. Chat, code, analyze, and create
          with the Lexa model family. Pay with M-Pesa. Start free.
        </p>

        <div className="hero-cta">
          <Link to="/register" className="btn btn-primary btn-lg">
            <i className="bi bi-lightning-charge-fill" />
            Start for Free
          </Link>
          <Link to="/pricing" className="btn btn-secondary btn-lg">
            View Pricing
            <i className="bi bi-arrow-right" />
          </Link>
        </div>

        <div className="hero-stats">
          {[
            { value: '10K+', label: 'Active Users' },
            { value: '4', label: 'Lexa Models' },
            { value: '99.9%', label: 'Uptime' },
            { value: '< 1s', label: 'First Token' },
          ].map(s => (
            <div className="hero-stat" key={s.label}>
              <span className="stat-value">{s.value}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Chat Preview Demo */}
      <div style={{ position: 'relative', zIndex: 1, padding: '0 40px 80px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '20px', overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        }}>
          <div style={{ background: 'var(--surface-2)', padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            {['#ff5f57','#febc2e','#28c840'].map(c => <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />)}
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginLeft: 8 }}>LexaGPT — Lexa Pro</span>
          </div>
          <div style={{ padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ background: 'var(--surface-3)', borderRadius: '16px 16px 4px 16px', padding: '12px 18px', maxWidth: '70%' }}>
                Write me a Python function to merge sort a list
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--purple-dim)', border: '1px solid rgba(124,92,252,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>⟁</div>
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: 8, fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 600 }}>Lexa Pro</div>
                <div style={{ background: 'var(--surface-2)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <div style={{ background: 'var(--surface-3)', padding: '6px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>python</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--accent)' }}>Copy</span>
                  </div>
                  <pre style={{ padding: '14px 16px', margin: 0, fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', lineHeight: 1.6 }}>{`def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    return merge(left, right)

def merge(left, right):
    result = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i]); i += 1
        else:
            result.append(right[j]); j += 1
    return result + left[i:] + right[j:]`}</pre>
                </div>
              </div>
            </div>
          </div>
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, background: 'var(--surface-2)', borderRadius: 12, padding: '10px 16px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Ask Lexa anything...
            </div>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--grad-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: 16 }}>
              ↑
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <section className="section" id="features">
        <div className="section-header">
          <div className="section-label">Capabilities</div>
          <h2>Everything you need from AI</h2>
          <p style={{ maxWidth: 520, margin: '12px auto 0' }}>
            LexaGPT combines powerful models with a platform built specifically for African developers and businesses.
          </p>
        </div>
        <div className="features-grid">
          {FEATURES.map(f => (
            <div key={f.title} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Models */}
      <section className="section" id="models">
        <div className="section-header">
          <div className="section-label">Model Family</div>
          <h2>The Lexa Model Family</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {MODELS.map(m => (
            <div key={m.name} className="card" style={{ borderColor: `${m.color}22` }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: m.color, marginBottom: 14, boxShadow: `0 0 12px ${m.color}60` }} />
              <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 6 }}>{m.name}</h3>
              <p style={{ fontSize: '0.875rem', marginBottom: 14 }}>{m.desc}</p>
              <span className="badge" style={{ background: `${m.color}18`, color: m.color }}>{m.tier}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: 'relative', zIndex: 1, padding: '60px 40px 100px', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2 style={{ marginBottom: 16 }}>Ready to meet Lexa?</h2>
          <p style={{ marginBottom: 32 }}>Join thousands of developers, students, and businesses using LexaGPT daily.</p>
          <Link to="/register" className="btn btn-primary btn-lg">
            <i className="bi bi-lightning-charge-fill" /> Start Free Today
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '32px 40px', textAlign: 'center' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          © 2024 LexaGPT. Built with ❤️ in Kenya.
          <span style={{ margin: '0 12px' }}>·</span>
          <a href="#" style={{ color: 'var(--text-muted)' }}>Privacy</a>
          <span style={{ margin: '0 12px' }}>·</span>
          <a href="#" style={{ color: 'var(--text-muted)' }}>Terms</a>
        </p>
      </footer>
    </div>
  )
}