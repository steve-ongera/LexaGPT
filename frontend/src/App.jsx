import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/authStore'

// Pages - User
import LandingPage from './pages/user/LandingPage'
import LoginPage from './pages/user/LoginPage'
import RegisterPage from './pages/user/RegisterPage'
import ChatPage from './pages/user/ChatPage'
import PricingPage from './pages/user/PricingPage'
import SettingsPage from './pages/user/SettingsPage'
import ProjectsPage from './pages/user/ProjectsPage'
import ArtifactsPage from './pages/user/ArtifactsPage'

// Pages - Admin
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminTraining from './pages/admin/AdminTraining'
import AdminBenchmarks from './pages/admin/AdminBenchmarks'
import AdminMetrics from './pages/admin/AdminMetrics'

// Guards
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuthStore()
  if (loading) return <div className="app-loading"><div className="loading-orb" /></div>
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

const AdminRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuthStore()
  if (loading) return <div className="app-loading"><div className="loading-orb" /></div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!['admin', 'moderator'].includes(user?.role)) return <Navigate to="/chat" replace />
  return children
}

const GuestRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <Navigate to="/chat" replace /> : children
}

export default function App() {
  const { initAuth } = useAuthStore()

  useEffect(() => {
    initAuth()
  }, [])

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--surface-2)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            fontFamily: 'var(--font-body)',
          },
          success: { iconTheme: { primary: 'var(--accent)', secondary: 'var(--bg)' } },
          error: { iconTheme: { primary: 'var(--red)', secondary: 'var(--bg)' } },
        }}
      />
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/pricing" element={<PricingPage />} />

        {/* Guest only */}
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

        {/* Protected user */}
        <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="/chat/:conversationId" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
        <Route path="/artifacts" element={<ProtectedRoute><ArtifactsPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

        {/* Admin */}
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="training" element={<AdminTraining />} />
          <Route path="benchmarks" element={<AdminBenchmarks />} />
          <Route path="metrics" element={<AdminMetrics />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}