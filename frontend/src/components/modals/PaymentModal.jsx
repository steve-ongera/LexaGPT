import React, { useState, useEffect } from 'react'
import { paymentApi } from '../../services/api'
import toast from 'react-hot-toast'

const PLANS = [
  {
    id: 'premium', name: 'Premium', monthly: 20, yearly: 200,
    color: '#00d4ff', features: ['500 messages/day', 'Lexa Pro & Vision', 'Code execution', 'Priority support', '50 file uploads'],
  },
  {
    id: 'team', name: 'Team', monthly: 30, yearly: 300,
    color: '#7c5cfc', features: ['2000 messages/day', 'All models incl. Ultra', 'Unlimited projects', '5 team members', 'API access'],
  },
  {
    id: 'enterprise', name: 'Enterprise', monthly: 100, yearly: 1000,
    color: '#ffd060', features: ['Unlimited messages', 'All models + Research', 'Custom model training', 'Dedicated support', 'Unlimited everything'],
  },
]

const METHODS = [
  { id: 'mpesa', label: 'M-Pesa', icon: '📱', desc: 'Pay via Safaricom M-Pesa STK push' },
  { id: 'card', label: 'Card', icon: '💳', desc: 'Visa, Mastercard, American Express' },
  { id: 'paypal', label: 'PayPal', icon: '🅿️', desc: 'Pay with your PayPal account' },
]

export default function PaymentModal({ onClose }) {
  const [step, setStep] = useState('plans') // plans | method | form | processing | success
  const [selectedPlan, setSelectedPlan] = useState('premium')
  const [billing, setBilling] = useState('monthly')
  const [method, setMethod] = useState('mpesa')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const plan = PLANS.find(p => p.id === selectedPlan)
  const price = billing === 'monthly' ? plan?.monthly : plan?.yearly
  const priceKsh = price * 130 // approximate

  const handleProceed = async () => {
    setLoading(true)
    setStep('processing')
    try {
      let data
      if (method === 'mpesa') {
        if (!phone.trim()) { toast.error('Enter phone number'); setStep('form'); setLoading(false); return }
        const res = await paymentApi.mpesa({ phone_number: phone, plan: selectedPlan, billing_cycle: billing })
        data = res.data
      } else if (method === 'card') {
        const res = await paymentApi.stripe({ plan: selectedPlan, billing_cycle: billing })
        data = res.data
      } else {
        const res = await paymentApi.paypal({ plan: selectedPlan, billing_cycle: billing })
        data = res.data
      }
      setResult(data)
      setStep('success')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Payment failed')
      setStep('form')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><i className="bi bi-x-lg" /></button>

        {/* ── Plans step ───────────────────────────────────────────────────── */}
        {step === 'plans' && (
          <>
            <h3 style={{ marginBottom: 6 }}>Upgrade LexaGPT</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 20 }}>
              Unlock more messages, models, and features.
            </p>

            {/* Billing toggle */}
            <div style={{ display: 'flex', background: 'var(--surface-2)', borderRadius: 10, padding: 4, marginBottom: 20, width: 'fit-content' }}>
              {['monthly', 'yearly'].map(b => (
                <button key={b} onClick={() => setBilling(b)}
                  style={{
                    padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 500,
                    background: billing === b ? 'var(--surface-3)' : 'transparent',
                    color: billing === b ? 'var(--text-primary)' : 'var(--text-muted)',
                    transition: 'all 0.15s',
                  }}>
                  {b.charAt(0).toUpperCase() + b.slice(1)}
                  {b === 'yearly' && <span style={{ marginLeft: 6, fontSize: '0.72rem', color: 'var(--green)', fontWeight: 700 }}>-17%</span>}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {PLANS.map(p => (
                <div key={p.id}
                  onClick={() => setSelectedPlan(p.id)}
                  style={{
                    padding: '16px', borderRadius: 12, cursor: 'pointer',
                    border: `2px solid ${selectedPlan === p.id ? p.color : 'var(--border)'}`,
                    background: selectedPlan === p.id ? `${p.color}0f` : 'var(--surface-2)',
                    transition: 'all 0.2s',
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: p.color }}>{p.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{p.features[0]}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800 }}>
                        ${billing === 'monthly' ? p.monthly : p.yearly}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        /{billing === 'monthly' ? 'mo' : 'yr'} · ~KES {(billing === 'monthly' ? p.monthly : p.yearly) * 130}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {p.features.map(f => (
                      <span key={f} style={{
                        fontSize: '0.72rem', padding: '3px 8px', borderRadius: 6,
                        background: `${p.color}15`, color: p.color, fontWeight: 500,
                      }}>{f}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button className="btn btn-primary w-full" onClick={() => setStep('method')}>
              Continue <i className="bi bi-arrow-right" />
            </button>
          </>
        )}

        {/* ── Payment method step ───────────────────────────────────────────── */}
        {step === 'method' && (
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => setStep('plans')} style={{ marginBottom: 16 }}>
              <i className="bi bi-arrow-left" /> Back
            </button>
            <h3 style={{ marginBottom: 6 }}>Payment Method</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 20 }}>
              {plan?.name} · ${price}/{ billing === 'monthly' ? 'month' : 'year'} · ~KES {priceKsh}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {METHODS.map(m => (
                <div key={m.id}
                  onClick={() => setMethod(m.id)}
                  style={{
                    padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                    border: `2px solid ${method === m.id ? 'var(--accent)' : 'var(--border)'}`,
                    background: method === m.id ? 'var(--accent-dim)' : 'var(--surface-2)',
                    display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.2s',
                  }}>
                  <span style={{ fontSize: 24 }}>{m.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.label}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{m.desc}</div>
                  </div>
                  {method === m.id && <i className="bi bi-check-circle-fill" style={{ marginLeft: 'auto', color: 'var(--accent)' }} />}
                </div>
              ))}
            </div>

            <button className="btn btn-primary w-full" onClick={() => setStep('form')}>
              Continue with {METHODS.find(m2 => m2.id === method)?.label}
              <i className="bi bi-arrow-right" />
            </button>
          </>
        )}

        {/* ── Form step ─────────────────────────────────────────────────────── */}
        {step === 'form' && (
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => setStep('method')} style={{ marginBottom: 16 }}>
              <i className="bi bi-arrow-left" /> Back
            </button>
            <h3 style={{ marginBottom: 6 }}>
              {method === 'mpesa' ? '📱 M-Pesa Payment' : method === 'card' ? '💳 Card Payment' : '🅿️ PayPal Payment'}
            </h3>

            <div style={{ background: 'var(--accent-dim)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: '0.85rem' }}>
              <strong>Demo Mode</strong> — No real payment will be processed. In production, real payment APIs are used.
            </div>

            {method === 'mpesa' && (
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">Safaricom Phone Number</label>
                <input
                  className="form-input" type="tel"
                  placeholder="e.g. 0712 345 678"
                  value={phone} onChange={e => setPhone(e.target.value)}
                />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  You'll receive an STK push prompt. Enter your M-Pesa PIN to confirm.
                </span>
              </div>
            )}

            {method === 'card' && (
              <div style={{ padding: '20px', background: 'var(--surface-2)', borderRadius: 10, marginBottom: 20, textAlign: 'center' }}>
                <i className="bi bi-credit-card-2-front" style={{ fontSize: 32, color: 'var(--accent)', display: 'block', marginBottom: 8 }} />
                <p style={{ fontSize: '0.875rem' }}>Stripe payment form will appear here in production.<br />Card details are handled securely by Stripe.</p>
              </div>
            )}

            {method === 'paypal' && (
              <div style={{ padding: '20px', background: 'var(--surface-2)', borderRadius: 10, marginBottom: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🅿️</div>
                <p style={{ fontSize: '0.875rem' }}>You'll be redirected to PayPal sandbox to complete payment.</p>
              </div>
            )}

            <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{plan?.name} · {billing}</span>
                <span style={{ fontWeight: 600 }}>${price}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>In KES (approx.)</span>
                <span style={{ fontWeight: 600, color: 'var(--green)' }}>KES {priceKsh.toLocaleString()}</span>
              </div>
            </div>

            <button className="btn btn-primary w-full" onClick={handleProceed} disabled={loading}>
              {loading ? <><i className="bi bi-arrow-repeat spin" /> Processing...</> : `Pay ${method === 'mpesa' ? `KES ${priceKsh.toLocaleString()}` : `$${price}`}`}
            </button>
          </>
        )}

        {/* ── Processing step ───────────────────────────────────────────────── */}
        {step === 'processing' && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div className="loading-orb" style={{ margin: '0 auto 24px' }} />
            <h3 style={{ marginBottom: 8 }}>Processing Payment</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {method === 'mpesa' ? 'Sending STK push to your phone...' : 'Connecting to payment gateway...'}
            </p>
          </div>
        )}

        {/* ── Success step ──────────────────────────────────────────────────── */}
        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'rgba(0,229,160,0.15)', border: '2px solid var(--green)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', fontSize: 32,
            }}>✓</div>
            <h3 style={{ marginBottom: 8, color: 'var(--green)' }}>
              {result?.demo_mode ? 'Demo Payment Initiated!' : 'Payment Successful!'}
            </h3>
            {result?.message && (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 16 }}>{result.message}</p>
            )}
            {result?.demo_mode && (
              <div style={{ background: 'var(--accent-dim)', borderRadius: 10, padding: '12px 16px', fontSize: '0.82rem', marginBottom: 20, textAlign: 'left' }}>
                <strong>Demo Mode Active</strong>
                <p style={{ marginTop: 4, color: 'var(--text-secondary)' }}>
                  {result.instructions || 'In production, the payment would be processed via the real payment gateway.'}
                </p>
              </div>
            )}
            <button className="btn btn-primary w-full" onClick={onClose}>
              Back to Chat <i className="bi bi-arrow-right" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}