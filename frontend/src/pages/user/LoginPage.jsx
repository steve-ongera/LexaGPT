import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

// ── Login Page ────────────────────────────────────────────────────────────────
export function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const { login, googleLogin } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    setLoading(true)
    try {
      await login(form.email, form.password)
      toast.success('Welcome back!')
      navigate('/chat')
    } catch (err) {
      const data = err.response?.data
      if (data?.detail) {
        const detail = data.detail
        if (typeof detail === 'object') setErrors(detail)
        else toast.error(detail[0] || 'Login failed')
      } else {
        toast.error('Invalid email or password')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleDemo = async () => {
    try {
      await googleLogin({
        email: 'demo.google@lexagpt.com',
        given_name: 'Demo',
        family_name: 'User',
        sub: 'demo_google_123',
      })
      navigate('/chat')
      toast.success('Signed in with Google (Demo)')
    } catch {
      toast.error('Google sign-in failed')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">LexaGPT</div>
        <h2>Welcome back</h2>
        <p className="auth-sub">Sign in to your account</p>

        <button className="google-btn" onClick={handleGoogleDemo} type="button">
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          Continue with Google
        </button>

        <div className="divider"><span>or</span></div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input
              className="form-input" type="email" placeholder="you@example.com"
              value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              required autoComplete="email"
            />
            {errors.email && <span className="form-error"><i className="bi bi-exclamation-circle" />{errors.email}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input" type="password" placeholder="••••••••"
              value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              required autoComplete="current-password"
            />
            {errors.password && <span className="form-error"><i className="bi bi-exclamation-circle" />{errors.password}</span>}
          </div>

          <button className="btn btn-primary w-full" type="submit" disabled={loading}>
            {loading ? <><i className="bi bi-arrow-repeat spin" /> Signing in...</> : 'Sign In'}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account? <Link to="/register">Create one free</Link>
        </p>
      </div>
    </div>
  )
}

// ── Register Page ─────────────────────────────────────────────────────────────
export function RegisterPage() {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '', password_confirm: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const { register } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    if (form.password !== form.password_confirm) {
      setErrors({ password_confirm: 'Passwords do not match' })
      return
    }
    setLoading(true)
    try {
      await register(form)
      toast.success('Account created! Welcome to LexaGPT 🎉')
      navigate('/chat')
    } catch (err) {
      const data = err.response?.data?.detail || err.response?.data
      if (typeof data === 'object') setErrors(data)
      else toast.error('Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const field = (name, label, type = 'text', placeholder = '') => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input
        className="form-input" type={type} placeholder={placeholder}
        value={form[name]} onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}
        required
      />
      {errors[name] && <span className="form-error"><i className="bi bi-exclamation-circle" />{errors[name]}</span>}
    </div>
  )

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">LexaGPT</div>
        <h2>Create account</h2>
        <p className="auth-sub">Start with 20 free messages per day</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {field('first_name', 'First Name', 'text', 'John')}
            {field('last_name', 'Last Name', 'text', 'Doe')}
          </div>
          {field('email', 'Email Address', 'email', 'you@example.com')}
          {field('password', 'Password', 'password', '8+ characters')}
          {field('password_confirm', 'Confirm Password', 'password', 'Repeat password')}

          <button className="btn btn-primary w-full" type="submit" disabled={loading}>
            {loading ? <><i className="bi bi-arrow-repeat spin" /> Creating account...</> : 'Create Free Account'}
          </button>
        </form>

        <div className="divider"><span>or</span></div>

        <button className="google-btn" type="button">
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          Continue with Google
        </button>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>

        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 12 }}>
          By creating an account you agree to our <a href="#">Terms</a> and <a href="#">Privacy Policy</a>.
        </p>
      </div>
    </div>
  )
}

export default LoginPage