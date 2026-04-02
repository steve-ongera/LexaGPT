import { create } from 'zustand'
import { conversationApi, chatApi } from '../services/api'
import toast from 'react-hot-toast'

export const useChatStore = create((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  isStreaming: false,
  streamingContent: '',
  selectedModel: 'lexa-pro',
  projects: [],
  recentChats: [],
  starredChats: [],
  searchResults: null,

  // ── Conversations ──────────────────────────────────────────────────────────
  loadConversations: async () => {
    try {
      const { data } = await conversationApi.list({ archived: false })
      set({ conversations: data.results || data })
    } catch (e) {
      console.error('Failed to load conversations', e)
    }
  },

  loadRecent: async () => {
    try {
      const { data } = await conversationApi.recent()
      set({ recentChats: data })
    } catch {}
  },

  loadConversation: async (id) => {
    try {
      const { data } = await conversationApi.get(id)
      set({ currentConversation: data, messages: data.messages || [] })
    } catch {
      toast.error('Conversation not found')
    }
  },

  newChat: () => {
    set({ currentConversation: null, messages: [], streamingContent: '' })
  },

  deleteConversation: async (id) => {
    await conversationApi.delete(id)
    set(s => ({
      conversations: s.conversations.filter(c => c.id !== id),
      recentChats: s.recentChats.filter(c => c.id !== id),
      ...(s.currentConversation?.id === id ? { currentConversation: null, messages: [] } : {}),
    }))
    toast.success('Chat deleted')
  },

  starConversation: async (id) => {
    await conversationApi.star(id)
    set(s => ({
      conversations: s.conversations.map(c => c.id === id ? { ...c, is_starred: !c.is_starred } : c),
    }))
  },

  // ── Sending Messages ───────────────────────────────────────────────────────
  sendMessage: async (content, attachments = []) => {
    const { currentConversation, selectedModel, messages } = get()
    if (get().isStreaming) return

    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    }
    const tempAsstMsg = {
      id: `streaming-${Date.now()}`,
      role: 'assistant',
      content: '',
      status: 'streaming',
      created_at: new Date().toISOString(),
    }

    set(s => ({
      messages: [...s.messages, tempUserMsg, tempAsstMsg],
      isStreaming: true,
      streamingContent: '',
    }))

    try {
      const payload = {
        content,
        model: selectedModel,
        conversation_id: currentConversation?.id || null,
      }

      const response = await chatApi.sendMessage(payload)

      if (!response.ok) {
        const err = await response.json()
        if (response.status === 429) {
          toast.error(err.error || 'Daily message limit reached. Upgrade your plan!')
        } else {
          toast.error('Failed to send message')
        }
        set(s => ({
          messages: s.messages.filter(m => m.id !== tempAsstMsg.id && m.id !== tempUserMsg.id),
          isStreaming: false,
        }))
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''
      let conversationId = currentConversation?.id

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value)
        const lines = text.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'text') {
              fullContent += event.text
              set(s => ({
                messages: s.messages.map(m =>
                  m.id === tempAsstMsg.id ? { ...m, content: fullContent } : m
                ),
                streamingContent: fullContent,
              }))
            } else if (event.type === 'done') {
              conversationId = event.conversation_id || conversationId
            }
          } catch {}
        }
      }

      // Finalize
      set(s => ({
        isStreaming: false,
        streamingContent: '',
        messages: s.messages.map(m =>
          m.id === tempAsstMsg.id ? { ...m, status: 'completed', content: fullContent } : m
        ),
      }))

      // Load full conversation if new
      if (!currentConversation && conversationId) {
        const { data } = await conversationApi.get(conversationId)
        set({ currentConversation: data })
        // Update sidebar
        get().loadRecent()
      }

    } catch (err) {
      console.error('Send message error:', err)
      toast.error('Connection error. Please try again.')
      set(s => ({
        messages: s.messages.filter(m => m.id !== tempAsstMsg.id && m.id !== tempUserMsg.id),
        isStreaming: false,
      }))
    }
  },

  setModel: (model) => set({ selectedModel: model }),
  setMessages: (messages) => set({ messages }),
}))