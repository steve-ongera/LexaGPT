import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

const PLANS = [
  {
    id: 'free', name: 'Free', monthly: 0, yearly: 0, color: '#00e5a0',
    desc: 'Perfect for getting started',
    features: [
      '20 messages per day',
      'Lexa Lite model',
      'Basic artifacts',
      '3 file uploads/month',
      '3 projects',
      'Standard support',
    ],
  },
  {
    id: 'premium', name: 'Premium', monthly: 20, yearly: 200, color: '#00d4ff',
    desc: 'For power users and developers', featured: true,
    features: [
      '500 messages per day',
      'Lexa Pro + Vision models',
      'All artifact types',
      '50 file uploads/month',
      '50 projects',
      'Code execution',
      'Priority support',
    ],
  },
  {
    id: 'team', name: 'Team', monthly: 30, yearly: 300, color: '#7c5cfc',
    desc: 'Collaborate with your team',
    features: [
      '2,000 messages per day',
      'All models incl. Lexa Ultra',
      'Unlimited projects',
      '500 file uploads/month',
      '5 team members',
      'Shared workspaces',
      'API access',
    ],
  },
  {
    id: 'enterprise', name: 'Enterprise', monthly: 100, yearly: 1000, color: '#ffd060',
    desc: 'For businesses at scale',
    features: [
      'Unlimited messages',
      'All models + Lexa Research',
      'Custom model training',
      'Unlimited everything',
      'Unlimited team members',
      'Dedicated support',
      'SLA guarantee',
      'On-premise option',
    ],
  },
]

export default function PricingPage() {
  const [billing, setBilling] = useState('monthly')
  const { isAuthenticated } = useAuthStore()

  return (
    <div className="pricing-page" style={{ background: 'var(--bg)' }}>
      {/* Nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 40px', height: 64,
        background: 'rgba(8,8,15,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <Link to="/" style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 800, background: 'var(--grad-accent)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          LexaGPT
        </Link>
        <div style={{ display: 'flex', gap: 12 }}>
          {isAuthenticated
            ? <Link to="/chat" className="btn btn-primary btn-sm">Open Chat</Link>
            : <><Link to="/login" className="btn btn-ghost btn-sm">Sign In</Link><Link to="/register" className="btn btn-primary btn-sm">Get Started</Link></>
          }
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', paddingTop: 40 }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div className="section-label" style={{ marginBottom: 12 }}>Pricing</div>
          <h1 style={{ marginBottom: 16 }}>Simple, transparent pricing</h1>
          <p style={{ color: 'var(--text-muted)', maxWidth: 480, margin: '0 auto 28px' }}>
            Start free, upgrade when you need more. All plans support M-Pesa, card, and PayPal.
          </p>

          {/* Billing toggle */}
          <div style={{ display: 'inline-flex', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 4, gap: 4 }}>
            {['monthly', 'yearly'].map(b => (
              <button key={b} onClick={() => setBilling(b)}
                style={{
                  padding: '8px 24px', borderRadius: 9, border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '0.9rem',
                  background: billing === b ? 'var(--grad-accent)' : 'transparent',
                  color: billing === b ? '#000' : 'var(--text-secondary)',
                  transition: 'all 0.2s',
                }}>
                {b.charAt(0).toUpperCase() + b.slice(1)}
                {b === 'yearly' && (
                  <span style={{ marginLeft: 6, fontSize: '0.72rem', color: billing === 'yearly' ? '#000' : 'var(--green)', fontWeight: 700 }}>
                    Save 17%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="pricing-grid">
          {PLANS.map(plan => {
            const price = billing === 'monthly' ? plan.monthly : plan.yearly
            const priceKsh = price * 130
            return (
              <div key={plan.id} className={`pricing-card ${plan.featured ? 'featured' : ''}`}
                style={{ borderColor: plan.featured ? `${plan.color}55` : undefined }}>

                {/* Header */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: plan.color, boxShadow: `0 0 10px ${plan.color}80` }} />
                    <span className="plan-name" style={{ color: plan.color }}>{plan.name}</span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 16 }}>{plan.desc}</p>
                </div>

                {/* Price */}
                <div>
                  <div className="plan-price">
                    <sup>$</sup>{price}
                    <sub>/{billing === 'monthly' ? 'mo' : 'yr'}</sub>
                  </div>
                  {price > 0 && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      ~KES {priceKsh.toLocaleString()} via M-Pesa
                    </div>
                  )}
                </div>

                {/* Features */}
                <ul className="plan-features">
                  {plan.features.map(f => (
                    <li key={f}>
                      <i className="bi bi-check-circle-fill" style={{ color: plan.color }} />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  to={isAuthenticated ? '/chat' : '/register'}
                  className="btn w-full"
                  style={{
                    background: plan.featured ? plan.color : 'var(--surface-2)',
                    color: plan.featured ? '#000' : 'var(--text-primary)',
                    border: `1px solid ${plan.featured ? plan.color : 'var(--border)'}`,
                    fontWeight: 600,
                    marginTop: 'auto',
                  }}>
                  {plan.id === 'free' ? 'Start Free' : `Get ${plan.name}`}
                  <i className="bi bi-arrow-right" />
                </Link>
              </div>
            )
          })}
        </div>

        {/* Payment methods */}
        <div style={{ textAlign: 'center', marginTop: 64, padding: '40px 0', borderTop: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 20 }}>Accepted payment methods</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
            {[
              { icon: '📱', label: 'M-Pesa', desc: 'Safaricom Daraja' },
              { icon: '💳', label: 'Visa / Mastercard', desc: 'Via Stripe' },
              { icon: '🅿️', label: 'PayPal', desc: 'Sandbox in demo' },
            ].map(pm => (
              <div key={pm.label} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 20px', background: 'var(--surface)',
                border: '1px solid var(--border)', borderRadius: 12,
              }}>
                <span style={{ fontSize: 24 }}>{pm.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{pm.label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pm.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 0 60px' }}>
          <h3 style={{ textAlign: 'center', marginBottom: 28 }}>Frequently asked questions</h3>
          {[
            { q: 'Can I pay with M-Pesa?', a: 'Yes! LexaGPT is built for Kenya. Pay directly via Safaricom M-Pesa STK push — no card needed.' },
            { q: 'Can I cancel anytime?', a: 'Absolutely. Cancel your subscription at any time from your settings. You keep access until the period ends.' },
            { q: 'What is "demo mode"?', a: 'In debug/demo mode, payments are simulated without real transactions. This is for testing the platform.' },
            { q: 'What are the Lexa models?', a: 'Lexa is our proprietary model family: Lite (fast), Pro (smart), Vision (multimodal), Ultra (maximum power).' },
          ].map(faq => (
            <div key={faq.q} style={{ borderBottom: '1px solid var(--border)', padding: '18px 0' }}>
              <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>{faq.q}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{faq.a}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}