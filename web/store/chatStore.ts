import { create } from "zustand";

export interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  language: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string | null;
  createdAt: string;
  messages: Message[];
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  isLoading: boolean;
  pendingMessage: string;

  setConversations: (conversations: Conversation[]) => void;
  setActiveConversation: (id: string | null) => void;
  addMessage: (conversationId: string, message: Message) => void;
  upsertConversation: (conversation: Conversation) => void;
  deleteConversation: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setPendingMessage: (message: string) => void;
  clearPendingMessage: () => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  conversations: [],
  activeConversationId: null,
  isLoading: false,
  pendingMessage: "",

  setConversations: (conversations) => set({ conversations }),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  addMessage: (conversationId, message) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, messages: [...c.messages, message] }
          : c,
      ),
    })),

  upsertConversation: (conversation) =>
    set((state) => {
      const existing = state.conversations.find(
        (c) => c.id === conversation.id,
      );
      const merged = existing
        ? {
            ...conversation,
            messages:
              conversation.messages.length > 0
                ? conversation.messages
                : existing.messages,
          }
        : conversation;
      return {
        conversations: existing
          ? state.conversations.map((c) => (c.id === merged.id ? merged : c))
          : [merged, ...state.conversations],
      };
    }),

  deleteConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      activeConversationId:
        state.activeConversationId === id ? null : state.activeConversationId,
    })),

  setLoading: (isLoading) => set({ isLoading }),
  setPendingMessage: (pendingMessage) => set({ pendingMessage }),
  clearPendingMessage: () => set({ pendingMessage: "" }),
  clearChat: () =>
    set({ conversations: [], activeConversationId: null, pendingMessage: "" }),
}));

// ── API response mappers ───────────────────────────────────────────────────────

export function mapMessage(m: {
  id: string;
  role: "user" | "model";
  content: string;
  language: string;
  created_at: string;
}): Message {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    language: m.language,
    createdAt: m.created_at,
  };
}

export function mapConversation(c: {
  id: string;
  title: string | null;
  created_at: string;
  messages?: any[];
}): Conversation {
  return {
    id: c.id,
    title: c.title,
    createdAt: c.created_at,
    messages: (c.messages ?? []).map(mapMessage),
  };
}
