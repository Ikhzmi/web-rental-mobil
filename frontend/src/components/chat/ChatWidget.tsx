import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  X,
  Send,
  ArrowLeft,
  Search,
  Building2,
  Car as CarIcon,
  Check,
  CheckCheck,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { api, type ChatMessage } from '../../lib/api';
import { useChat } from '../../context/ChatContext';
import { useSession } from '../../hooks/useSession';
import { useTheme } from '../../hooks/useTheme';

function formatTime(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function formatRupiah(value: string | number) {
  const num = typeof value === 'string' ? Number(value) : value;
  return `Rp${num.toLocaleString('id-ID')}`;
}

export default function ChatWidget() {
  const { session } = useSession();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const {
    isOpen,
    closeChat,
    activeConversationId,
    selectConversation,
    activeCarContext,
    clearActiveCarContext,
  } = useChat();

  const [searchQuery, setSearchQuery] = useState('');

  // Jangan render apa-apa jika belum login
  if (!session) return null;

  return (
    <>
      {/* Chat Floating Box (Hanya dibuka dari navbar atau tombol Tanya Rental) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={`fixed bottom-5 right-5 sm:right-6 z-50 w-[calc(100vw-2.5rem)] sm:w-[380px] h-[540px] max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border ${
              isDark
                ? 'bg-neutral-900/95 backdrop-blur-2xl border-white/10 text-white shadow-black/60'
                : 'bg-white/95 backdrop-blur-2xl border-neutral-200 text-neutral-900 shadow-neutral-400/40'
            }`}
          >
            {activeConversationId ? (
              <ActiveChatRoom
                conversationId={activeConversationId}
                onBack={() => {
                  selectConversation(null);
                  clearActiveCarContext();
                }}
                onClose={closeChat}
                activeCarContext={activeCarContext}
                clearCarContext={clearActiveCarContext}
                isDark={isDark}
              />
            ) : (
              <ConversationListView
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onSelect={(id) => selectConversation(id)}
                onClose={closeChat}
                isDark={isDark}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * Komponen Tampilan Daftar Obrolan (Inbox)
 */
function ConversationListView({
  searchQuery,
  setSearchQuery,
  onSelect,
  onClose,
  isDark,
}: {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSelect: (id: string) => void;
  onClose: () => void;
  isDark: boolean;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['customer-conversations'],
    queryFn: () => api.listCustomerConversations(),
    refetchInterval: 5000,
  });

  const conversations: any[] = Array.isArray(data) ? data : (data as any)?.data ?? [];

  // Hanya tampilkan percakapan yang sudah ada pesan (filter sisi frontend sebagai backup)
  const filtered = conversations
    .filter((c) => c.lastMessageText != null)
    .filter((c) =>
      (c.instansi?.namaInstansi ?? '').toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`p-4 border-b flex items-center justify-between ${
        isDark ? 'border-white/10 bg-white/[0.02]' : 'border-neutral-200 bg-neutral-50/70'
      }`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-sm">
            <MessageCircle size={16} />
          </div>
          <div>
            <h2 className="font-bold text-sm">Pesan & Konsultasi</h2>
            <p className={`text-[11px] ${isDark ? 'text-white/50' : 'text-neutral-500'}`}>
              Hubungi rental penyedia armada
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className={`p-1.5 rounded-lg transition-colors ${
            isDark ? 'hover:bg-white/10 text-white/70' : 'hover:bg-neutral-200 text-neutral-600'
          }`}
          aria-label="Tutup Chat"
        >
          <X size={18} />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-neutral-200/50 dark:border-white/5">
        <div className="relative">
          <Search
            size={15}
            className={`absolute left-3 top-1/2 -translate-y-1/2 ${
              isDark ? 'text-white/40' : 'text-neutral-400'
            }`}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama rental..."
            className={`w-full rounded-xl pl-9 pr-3 py-2 text-xs outline-none transition-all ${
              isDark
                ? 'bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-orange-500'
                : 'bg-neutral-100 border border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:border-orange-500'
            }`}
          />
        </div>
      </div>

      {/* List Conversations */}
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-white/5">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 gap-2 text-xs text-neutral-400">
            <Loader2 size={16} className="animate-spin" />
            <span>Memuat pesan...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-6">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
              isDark ? 'bg-white/5 text-white/40' : 'bg-neutral-100 text-neutral-400'
            }`}>
              <Building2 size={24} />
            </div>
            <p className="text-xs font-semibold mb-1">Belum ada percakapan</p>
            <p className={`text-[11px] max-w-[220px] ${isDark ? 'text-white/40' : 'text-neutral-500'}`}>
              Buka halaman detail armada untuk mulai bertanya ketersediaan unit ke rental.
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`w-full p-3.5 flex items-start gap-3 text-left transition-colors ${
                isDark ? 'hover:bg-white/5' : 'hover:bg-neutral-50'
              }`}
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 flex items-center justify-center shrink-0 font-bold text-sm">
                {item.instansi?.namaInstansi?.charAt(0).toUpperCase() ?? 'R'}
              </div>

              {/* Text Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <h3 className="text-xs font-bold truncate">
                    {item.instansi?.namaInstansi ?? 'Rental Mobil'}
                  </h3>
                  <span className={`text-[10px] shrink-0 ${isDark ? 'text-white/40' : 'text-neutral-400'}`}>
                    {formatTime(item.lastMessageAt)}
                  </span>
                </div>

                <p className={`text-[11px] truncate ${
                  item.unreadCustomerCount > 0
                    ? isDark ? 'font-semibold text-white' : 'font-semibold text-neutral-900'
                    : isDark ? 'text-white/50' : 'text-neutral-500'
                }`}>
                  {item.lastMessageText || 'Memulai obrolan baru'}
                </p>

                {item.car && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-orange-600 dark:text-orange-400 font-medium">
                    <CarIcon size={11} className="shrink-0" />
                    <span className="truncate">{item.car.nama}</span>
                  </div>
                )}
              </div>

              {/* Unread Badge */}
              {item.unreadCustomerCount > 0 && (
                <span className="shrink-0 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-4 text-center mt-1">
                  {item.unreadCustomerCount}
                </span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Komponen Tampilan Ruang Chat (Active Conversation)
 */
function ActiveChatRoom({
  conversationId,
  onBack,
  onClose,
  activeCarContext,
  clearCarContext,
  isDark,
}: {
  conversationId: string;
  onBack: () => void;
  onClose: () => void;
  activeCarContext: any;
  clearCarContext: () => void;
  isDark: boolean;
}) {
  const queryClient = useQueryClient();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Ambil detail percakapan & riwayat chat (polling 3.5 detik saat chat window aktif)
  const { data, isLoading } = useQuery({
    queryKey: ['conversation-detail', conversationId],
    queryFn: () => api.getCustomerConversation(conversationId),
    refetchInterval: 3500,
  });

  const conversation: any = (data as any)?.data ?? data;
  const messages = conversation?.messages ?? [];

  // Scroll otomatis ke pesan terbaru
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  // Mutation kirim pesan
  const sendMutation = useMutation({
    mutationFn: (payload: { pesan: string; carId?: string }) =>
      api.sendCustomerMessage(conversationId, payload),
    onSuccess: () => {
      setInputText('');
      queryClient.invalidateQueries({ queryKey: ['conversation-detail', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['customer-conversations'] });
    },
  });

  const handleSend = (text?: string, attachedCarId?: string) => {
    const msgToSend = (text ?? inputText).trim();
    if (!msgToSend || sendMutation.isPending) return;

    sendMutation.mutate({
      pesan: msgToSend,
      carId: attachedCarId ?? (activeCarContext ? activeCarContext.id : undefined),
    });

    if (activeCarContext) {
      clearCarContext();
    }
  };

  const quickTemplates = [
    'Halo admin, apakah unit ini masih tersedia?',
    'Bisa sewa lepas kunci untuk tanggal besok?',
    'Apakah unit bisa diantar ke bandara/stasiun?',
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header Room */}
      <div className={`p-3.5 border-b flex items-center justify-between ${
        isDark ? 'border-white/10 bg-white/[0.02]' : 'border-neutral-200 bg-neutral-50/80'
      }`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onBack}
            className={`p-1 rounded-lg transition-colors shrink-0 ${
              isDark ? 'hover:bg-white/10 text-white/70' : 'hover:bg-neutral-200 text-neutral-600'
            }`}
            aria-label="Kembali ke Daftar Chat"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shrink-0 text-xs font-bold">
            {conversation?.instansi?.namaInstansi?.charAt(0).toUpperCase() ?? 'R'}
          </div>

          <div className="min-w-0">
            <h3 className="font-bold text-xs truncate">
              {conversation?.instansi?.namaInstansi ?? 'Rental Mobil'}
            </h3>
            {(() => {
              // Admin dianggap online jika lastSeenAt < 5 menit yang lalu
              const lastSeen = conversation?.instansi?.adminLastSeenAt;
              const isOnline = lastSeen
                ? (Date.now() - new Date(lastSeen).getTime()) < 5 * 60 * 1000
                : false;
              return (
                <div className={`flex items-center gap-1 text-[10px] font-medium ${
                  isOnline ? 'text-emerald-500' : isDark ? 'text-white/40' : 'text-neutral-400'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    isOnline ? 'bg-emerald-500 animate-pulse' : isDark ? 'bg-white/30' : 'bg-neutral-300'
                  }`} />
                  <span>{isOnline ? 'Online' : 'Offline'}</span>
                </div>
              );
            })()}
          </div>
        </div>

        <button
          onClick={onClose}
          className={`p-1.5 rounded-lg transition-colors ${
            isDark ? 'hover:bg-white/10 text-white/70' : 'hover:bg-neutral-200 text-neutral-600'
          }`}
          aria-label="Tutup"
        >
          <X size={18} />
        </button>
      </div>

      {/* Inquiry Car Context Banner */}
      {activeCarContext && (
        <div className={`p-2.5 px-3.5 border-b flex items-center justify-between gap-3 ${
          isDark ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-50 border-orange-200/80'
        }`}>
          <div className="flex items-center gap-2.5 min-w-0">
            {activeCarContext.imageUrl ? (
              <img
                src={activeCarContext.imageUrl}
                alt={activeCarContext.nama}
                className="w-10 h-10 object-cover rounded-lg shrink-0 border border-white/20"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0 text-orange-600">
                <CarIcon size={18} />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-bold truncate">{activeCarContext.nama}</p>
              <p className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold">
                {formatRupiah(activeCarContext.hargaPerHari)}/hari
              </p>
            </div>
          </div>

          <button
            onClick={() => handleSend('Halo admin, apakah unit ini tersedia?', activeCarContext.id)}
            disabled={sendMutation.isPending}
            className="shrink-0 text-[11px] font-bold px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-all shadow-xs"
          >
            Kirim Info Unit
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full gap-2 text-xs text-neutral-400">
            <Loader2 size={16} className="animate-spin" />
            <span>Memuat pesan...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2.5 ${
              isDark ? 'bg-white/5 text-white/40' : 'bg-neutral-100 text-neutral-400'
            }`}>
              <Sparkles size={18} />
            </div>
            <p className="text-xs font-semibold mb-1">Mulai Konsultasi</p>
            <p className={`text-[11px] ${isDark ? 'text-white/40' : 'text-neutral-500'}`}>
              Silakan ketik pertanyaan Anda seputar sewa unit atau pilih template cepat di bawah.
            </p>
          </div>
        ) : (
          messages.map((msg: ChatMessage) => {
            const isCustomer = msg.senderRole === 'customer';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}
              >
                {/* Car Attachment Card in message */}
                {msg.car && (
                  <div className={`mb-1.5 p-2 rounded-xl border max-w-[80%] flex items-center gap-2 text-xs ${
                    isCustomer
                      ? isDark
                        ? 'bg-orange-500/20 border-orange-500/30 text-white'
                        : 'bg-orange-50 border-orange-200 text-neutral-900'
                      : isDark
                        ? 'bg-white/5 border-white/10 text-white'
                        : 'bg-white border-neutral-200 text-neutral-900'
                  }`}>
                    {msg.car.images?.[0]?.url && (
                      <img
                        src={msg.car.images[0].url}
                        alt={msg.car.nama}
                        className="w-8 h-8 rounded object-cover shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-[10px] truncate">{msg.car.nama}</p>
                      <p className="text-[9px] text-orange-600 dark:text-orange-400 font-semibold">
                        {formatRupiah(msg.car.hargaPerHari)}/hari
                      </p>
                    </div>
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed break-words shadow-xs ${
                    isCustomer
                      ? 'bg-gradient-to-tr from-orange-600 to-amber-600 text-white rounded-br-xs'
                      : isDark
                        ? 'bg-white/10 text-white rounded-bl-xs border border-white/10'
                        : 'bg-neutral-100 text-neutral-900 rounded-bl-xs border border-neutral-200/60'
                  }`}
                >
                  <p>{msg.pesan}</p>
                </div>

                {/* Timestamp & Status */}
                <div className={`flex items-center gap-1 mt-1 text-[9px] ${
                  isDark ? 'text-white/40' : 'text-neutral-400'
                }`}>
                  <span>{formatTime(msg.createdAt)}</span>
                  {isCustomer && (
                    msg.isRead ? (
                      <CheckCheck size={11} className="text-orange-400" />
                    ) : (
                      <Check size={11} />
                    )
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Template Chips */}
      <div className="px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-t border-neutral-200/50 dark:border-white/5">
        {quickTemplates.map((tpl, i) => (
          <button
            key={i}
            onClick={() => handleSend(tpl)}
            disabled={sendMutation.isPending}
            className={`shrink-0 text-[10px] px-2.5 py-1 rounded-full border transition-all truncate max-w-[200px] ${
              isDark
                ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white/80'
                : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100 text-neutral-700'
            }`}
          >
            {tpl}
          </button>
        ))}
      </div>

      {/* Input Footer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className={`p-2.5 px-3 border-t flex items-center gap-2 ${
          isDark ? 'border-white/10 bg-white/[0.02]' : 'border-neutral-200 bg-white'
        }`}
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ketik pesan ke rental..."
          className={`flex-1 rounded-xl px-3 py-2 text-xs outline-none transition-all ${
            isDark
              ? 'bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-orange-500'
              : 'bg-neutral-100 border border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:border-orange-500'
          }`}
        />

        <button
          type="submit"
          disabled={!inputText.trim() || sendMutation.isPending}
          className="p-2 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white transition-all shadow-xs shrink-0"
          aria-label="Kirim Pesan"
        >
          {sendMutation.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
        </button>
      </form>
    </div>
  );
}
