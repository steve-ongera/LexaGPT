// ── Auth Store ────────────────────────────────────────────────────────────────
import { create } from 'zustand'
import { authApi } from '../services/api'
import toast from 'react-hot-toast'

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  loading: true,

  initAuth: async () => {
    const token = localStorage.getItem('access_token')
    if (!token) return set({ loading: false })
    try {
      const { data } = await authApi.profile()
      set({ user: data, isAuthenticated: true, loading: false })
    } catch {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      set({ loading: false })
    }
  },

  login: async (email, password) => {
    const { data } = await authApi.login({ email, password })
    localStorage.setItem('access_token', data.tokens.access)
    localStorage.setItem('refresh_token', data.tokens.refresh)
    set({ user: data.user, isAuthenticated: true })
    return data
  },

  register: async (formData) => {
    const { data } = await authApi.register(formData)
    localStorage.setItem('access_token', data.tokens.access)
    localStorage.setItem('refresh_token', data.tokens.refresh)
    set({ user: data.user, isAuthenticated: true })
    return data
  },

  googleLogin: async (tokenData) => {
    const { data } = await authApi.googleAuth(tokenData)
    localStorage.setItem('access_token', data.tokens.access)
    localStorage.setItem('refresh_token', data.tokens.refresh)
    set({ user: data.user, isAuthenticated: true })
    return data
  },

  logout: async () => {
    try {
      const refresh = localStorage.getItem('refresh_token')
      await authApi.logout(refresh)
    } catch {}
    localStorage.clear()
    set({ user: null, isAuthenticated: false })
    toast.success('Signed out successfully')
  },

  updateUser: (updates) => set(state => ({ user: { ...state.user, ...updates } })),
}))