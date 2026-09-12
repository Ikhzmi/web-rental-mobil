import { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from 'react';
import { api, type Car } from '../lib/api';
import { useSession } from '../hooks/useSession';

export interface ChatCarContext {
  id: string;
  nama: string;
  hargaPerHari: string;
  imageUrl?: string;
  instansiId: string;
  namaInstansi?: string;
}

interface ChatContextValue {
  isOpen: boolean;
  activeConversationId: string | null;
  activeCarContext: ChatCarContext | null;
  unreadCount: number;
  openChat: (conversationId?: string) => void;
  closeChat: () => void;
  toggleChat: () => void;
  selectConversation: (id: string | null) => void;
  startChatWithRental: (car: Car) => Promise<void>;
  clearActiveCarContext: () => void;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeCarContext, setActiveCarContext] = useState<ChatCarContext | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Poll unread count if user is logged in
  const fetchUnread = useCallback(async () => {
    if (!session) {
      setUnreadCount(0);
      return;
    }
    try {
      const res = await api.getCustomerUnreadCount();
      setUnreadCount(res.unreadCount);
    } catch {
      // silent ignore
    }
  }, [session]);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 10000); // Check unread count every 10s
    return () => clearInterval(interval);
  }, [fetchUnread]);

  const openChat = useCallback((conversationId?: string) => {
    if (conversationId) {
      setActiveConversationId(conversationId);
    }
    setIsOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleChat = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const selectConversation = useCallback((id: string | null) => {
    setActiveConversationId(id);
  }, []);

  const clearActiveCarContext = useCallback(() => {
    setActiveCarContext(null);
  }, []);

  const startChatWithRental = useCallback(
    async (car: Car) => {
      const instansiId = car.instansi?.id;
      if (!instansiId) {
        throw new Error('Instansi rental unit ini tidak ditemukan');
      }

      const carContext: ChatCarContext = {
        id: car.id,
        nama: car.nama,
        hargaPerHari: car.hargaPerHari,
        imageUrl: car.images?.[0]?.url,
        instansiId,
        namaInstansi: car.instansi?.namaInstansi,
      };

      setActiveCarContext(carContext);

      try {
        // Buat atau buka percakapan dengan instansi
        const res = await api.createCustomerConversation({
          instansiId,
          carId: car.id,
        });
        const convId = (res as any)?.id ?? (res as any)?.data?.id;
        if (convId) {
          setActiveConversationId(convId);
        }
        setIsOpen(true);
      } catch (err) {
        console.error('Failed to initiate chat:', err);
        throw err;
      }
    },
    []
  );

  return (
    <ChatContext.Provider
      value={{
        isOpen,
        activeConversationId,
        activeCarContext,
        unreadCount,
        openChat,
        closeChat,
        toggleChat,
        selectConversation,
        startChatWithRental,
        clearActiveCarContext,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
