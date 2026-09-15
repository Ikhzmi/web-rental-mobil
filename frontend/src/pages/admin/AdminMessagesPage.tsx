import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  MessageCircle,
  Mail,
  Phone,
  Car as CarIcon,
  Send,
  Loader2,
  Check,
  CheckCheck,
  ExternalLink,
  MessageSquare,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { api, type ChatMessage, type Conversation } from '../../lib/api';
import { useTheme } from '../../hooks/useTheme';
import { Skeleton } from '../../components/Skeleton';

function formatTime(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function formatRupiah(value: string | number) {
  const num = typeof value === 'string' ? Number(value) : value;
  return `Rp${num.toLocaleString('id-ID')}`;
}

export default function AdminMessagesPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Ambil daftar percakapan instansi (polling 5 detik)
  const { data: conversationsData, isLoading: isLoadingList } = useQuery({
    queryKey: ['admin-conversations'],
    queryFn: () => api.listAdminConversations(),
    refetchInterval: 5000,
  });

  const conversations: Conversation[] = Array.isArray(conversationsData)
    ? conversationsData
    : (conversationsData as any)?.data ?? [];

  // Filter percakapan berdasarkan nama customer / email / nama mobil
  const filteredConversations = conversations.filter((c: Conversation) => {
    const q = searchQuery.toLowerCase();
    const custName = (c.customer?.nama ?? '').toLowerCase();
    const custEmail = (c.customer?.email ?? '').toLowerCase();
    const carName = (c.car?.nama ?? '').toLowerCase();
    return custName.includes(q) || custEmail.includes(q) || carName.includes(q);
  });

  // Deep-link dari notifikasi: ?conversationId= langsung membuka chat tsb
  // (termasuk di mobile). Diabaikan jika id tidak ada di daftar.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const target = searchParams.get('conversationId');
    if (target) {
      setSelectedConversationId(target);
      setShowMobileChat(true);
      // Bersihkan query agar refresh tidak terkunci di percakapan lama
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pilih percakapan pertama secara otomatis jika belum ada yang dipilih dan daftar sudah ada
  useEffect(() => {
    if (!selectedConversationId && filteredConversations.length > 0) {
      setSelectedConversationId(filteredConversations[0].id);
    }
  }, [filteredConversations, selectedConversationId]);

  // 2. Ambil detail percakapan terpilih (polling 3.5 detik)
  const { data: detailData, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['admin-conversation-detail', selectedConversationId],
    queryFn: () => api.getAdminConversation(selectedConversationId!),
    enabled: !!selectedConversationId,
    refetchInterval: 3500,
  });

  const activeConversation: Conversation | undefined =
    detailData && 'messages' in detailData
      ? (detailData as Conversation)
      : (detailData as any)?.data;
  const messages = activeConversation?.messages ?? [];

  // Scroll otomatis ke bawah saat pesan bertambah
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // 3. Mutation balas pesan dari admin
  const sendMutation = useMutation({
    mutationFn: (pesan: string) =>
      api.sendAdminMessage(selectedConversationId!, { pesan }),
    onSuccess: () => {
      setInputText('');
      queryClient.invalidateQueries({
        queryKey: ['admin-conversation-detail', selectedConversationId],
      });
      queryClient.invalidateQueries({ queryKey: ['admin-conversations'] });
    },
  });

  const handleSend = (text?: string) => {
    const msg = (text ?? inputText).trim();
    if (!msg || !selectedConversationId || sendMutation.isPending) return;
    sendMutation.mutate(msg);
  };

  const quickAdminReplies = [
    'Halo kak, unit ini masih tersedia untuk tanggal tersebut.',
    'Bisa sewa lepas kunci, persyaratannya cukup e-KTP asli dan SIM A aktif.',
    'Silakan lanjutkan pemesanan via aplikasi, kami akan segera konfirmasi unitnya.',
    'Unit siap diantar ke lokasi Anda.',
  ];

  const waLink = (noHp: string, custName: string) => {
    const digits = noHp.replace(/\D/g, '').replace(/^0/, '62');
    const msg = encodeURIComponent(`Halo Kak ${custName}, kami dari pihak rental mobil terkait konsultasi Anda.`);
    return `https://wa.me/${digits}?text=${msg}`;
  };

  return (
    <div className="space-y-4">
      {/* Header Halaman */}
      <div>
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Pusat Obrolan Pelanggan
        </h1>
        <p className={`text-sm mt-0.5 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
          Layani pertanyaan dan konsultasi calon penyewa secara langsung
        </p>
      </div>

      {/* Main Split-Box Chat Panel — Liquid Glass.
          Tinggi memakai dvh agar stabil saat address bar mobile muncul/
          hilang; min-h direndahkan di HP supaya tidak overflow. */}
      <div className={`h-[calc(100dvh-13rem)] min-h-[480px] sm:min-h-[550px] rounded-3xl border flex overflow-hidden transition-all ${
        isDark
          ? 'sa-glass-dark border-white/15 text-white shadow-2xl shadow-black/80'
          : 'sa-glass-light border-white/80 text-slate-900 shadow-xl shadow-slate-900/10'
      }`}>
        {/* KOLOM KIRI: Daftar Percakapan (Di-hide pada layar HP jika obrolan sedang dibuka) */}
        <div className={`${showMobileChat ? 'hidden md:flex' : 'flex'} ${isSidebarOpen ? 'w-full md:w-80 lg:w-96' : 'w-0 hidden'} border-r flex-col shrink-0 transition-all duration-300 ${
          isDark ? 'border-white/10 bg-white/[0.02]' : 'border-white/40 bg-white/30 backdrop-blur-xl'
        }`}>
          {/* Search Box & Sidebar Toggle Header */}
          <div className="p-3.5 border-b border-inherit flex items-center gap-2">
            <div className="relative flex-1">
              <Search
                size={15}
                className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                  isDark ? 'text-white/40' : 'text-slate-400'
                }`}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, email, armada..."
                className={`w-full rounded-xl pl-9 pr-3 py-2 text-xs outline-none transition-all ${
                  isDark
                    ? 'bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-orange-500'
                    : 'bg-white/60 border border-white/80 text-slate-900 placeholder:text-slate-400 focus:border-orange-500 backdrop-blur-md'
                }`}
              />
            </div>
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className={`p-2 rounded-xl border transition-colors hidden md:flex ${
                isDark ? 'bg-white/5 border-white/10 text-white/60 hover:text-white' : 'bg-white/80 border-slate-200 text-slate-500 hover:text-slate-900'
              }`}
              title="Tutup Daftar Obrolan"
            >
              <MessageSquare size={14} />
            </button>
          </div>

          {/* List Conversations */}
          <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-white/5">
            {isLoadingList ? (
              <div className="p-3 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-xl">
                    <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-2/3 rounded" />
                      <Skeleton className="h-2.5 w-1/2 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center px-6">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                  isDark ? 'bg-white/5 text-white/40' : 'bg-slate-100 text-slate-400'
                }`}>
                  <MessageSquare size={22} />
                </div>
                <p className="text-xs font-semibold mb-1">Belum ada obrolan</p>
                <p className={`text-[11px] ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                  Pesan yang dikirim calon penyewa dari halaman armada akan muncul di sini.
                </p>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = c.id === selectedConversationId;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedConversationId(c.id);
                      setShowMobileChat(true);
                    }}
                    className={`w-full p-3.5 flex items-start gap-3 text-left transition-all relative ${
                      isSelected
                        ? isDark
                          ? 'bg-white/15 backdrop-blur-md'
                          : 'sa-glass-light border-r-4 border-r-orange-500'
                        : isDark
                          ? 'hover:bg-white/5'
                          : 'hover:bg-white/40'
                    }`}
                  >
                    {/* Customer Avatar */}
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 flex items-center justify-center font-bold text-sm shrink-0">
                      {c.customer?.nama?.charAt(0).toUpperCase() ?? 'U'}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4 className="text-xs font-bold truncate">
                          {c.customer?.nama ?? 'Pelanggan'}
                        </h4>
                        <span className={`text-[10px] shrink-0 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                          {formatDate(c.lastMessageAt)} {formatTime(c.lastMessageAt)}
                        </span>
                      </div>

                      <p className={`text-[11px] truncate mb-1 ${
                        c.unreadAdminCount > 0
                          ? isDark ? 'font-bold text-white' : 'font-bold text-slate-900'
                          : isDark ? 'text-white/50' : 'text-slate-500'
                      }`}>
                        {c.lastMessageText || 'Memulai percakapan'}
                      </p>

                      {c.car && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[10px] font-medium max-w-full">
                          <CarIcon size={10} className="shrink-0" />
                          <span className="truncate">{c.car.nama}</span>
                        </div>
                      )}
                    </div>

                    {/* Unread Badge */}
                    {c.unreadAdminCount > 0 && (
                      <span className="shrink-0 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-4 text-center mt-1">
                        {c.unreadAdminCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* KOLOM KANAN: Ruang Obrolan Terpilih (Di-hide pada layar HP jika kontak belum dipencet) */}
        <div className={`${!showMobileChat ? 'hidden md:flex' : 'flex'} flex-1 flex-col min-w-0 bg-transparent`}>
          {selectedConversationId && activeConversation ? (
            <>
              {/* Header Obrolan — Liquid Glass */}
              <div className={`p-4 border-b flex items-center justify-between gap-4 ${
                isDark ? 'border-white/10 bg-white/[0.02]' : 'border-white/60 bg-white/40 backdrop-blur-xl'
              }`}>
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button to Contact List */}
                  <button
                    type="button"
                    onClick={() => setShowMobileChat(false)}
                    className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-300 font-semibold text-xs shrink-0"
                  >
                    <ArrowLeft size={14} />
                    <span>Kontak</span>
                  </button>

                  {!isSidebarOpen && (
                    <button
                      type="button"
                      onClick={() => setIsSidebarOpen(true)}
                      className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shrink-0 ${
                        isDark ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-white/80 border-slate-200 text-slate-700 hover:bg-white'
                      }`}
                      title="Buka Daftar Obrolan"
                    >
                      <MessageSquare size={14} />
                      <span>Daftar Obrolan</span>
                    </button>
                  )}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                    {activeConversation.customer?.nama?.charAt(0).toUpperCase() ?? 'U'}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm truncate">
                      {activeConversation.customer?.nama ?? 'Pelanggan'}
                    </h3>
                    {/* Kontak bertumpuk di HP agar tidak overflow horizontal */}
                    <div className="flex flex-col gap-0.5 text-xs text-slate-500 dark:text-white/50 sm:flex-row sm:items-center sm:gap-3">
                      {activeConversation.customer?.email && (
                        <span className="flex items-center gap-1 truncate">
                          <Mail size={12} className="shrink-0" />
                          <span className="truncate">{activeConversation.customer.email}</span>
                        </span>
                      )}
                      {activeConversation.customer?.noHp && (
                        <span className="flex items-center gap-1 shrink-0">
                          <Phone size={12} className="shrink-0" />
                          {activeConversation.customer.noHp}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* WhatsApp Quick Action Button */}
                {activeConversation.customer?.noHp && (
                  <a
                    href={waLink(
                      activeConversation.customer.noHp,
                      activeConversation.customer.nama
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Hubungi via WhatsApp"
                    className="shrink-0 inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-all"
                  >
                    <Phone size={13} />
                    <span className="hidden sm:inline">Hubungi WA</span>
                    <ExternalLink size={11} className="hidden sm:inline" />
                  </a>
                )}
              </div>

              {/* Inquiry Car Context Banner — Liquid Glass */}
              {activeConversation.car && (
                <div className={`p-3 px-4 border-b flex items-center justify-between gap-4 ${
                  isDark ? 'bg-orange-500/10 border-orange-500/20' : 'sa-glass-light border-orange-200/80'
                }`}>
                  <div className="flex items-center gap-3 min-w-0">
                    {activeConversation.car.images?.[0]?.url ? (
                      <img
                        src={activeConversation.car.images[0].url}
                        alt={activeConversation.car.nama}
                        className="w-12 h-10 object-cover rounded-lg shrink-0 border border-white/20"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0 text-orange-600">
                        <CarIcon size={18} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">
                        {activeConversation.car.nama}
                      </p>
                      <p className="text-[11px] text-orange-600 dark:text-orange-400 font-semibold">
                        {formatRupiah(activeConversation.car.hargaPerHari)}/hari
                      </p>
                    </div>
                  </div>

                  <a
                    href={`/armada/${activeConversation.car.id}`}
                    target="_blank"
                    rel="noreferrer"
                    title="Lihat Unit"
                    className={`shrink-0 text-xs font-medium underline flex items-center gap-1 ${
                      isDark ? 'text-white/70 hover:text-white' : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <span className="hidden sm:inline">Lihat Unit</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}

              {/* Messages Feed */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
                {isLoadingDetail ? (
                  <div className="space-y-3.5 p-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className={`flex items-start gap-3 ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl space-y-1.5 ${
                          isDark ? 'border border-white/10 p-0' : 'border border-white/60 p-0'
                        }`}>
                          <Skeleton className="h-3 w-36 rounded" />
                          <Skeleton className="h-2.5 w-24 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                      isDark ? 'bg-white/5 text-white/40' : 'bg-slate-100 text-slate-400'
                    }`}>
                      <Sparkles size={20} />
                    </div>
                    <p className="text-xs font-semibold mb-1">Obrolan Baru</p>
                    <p className={`text-[11px] ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                      Ketik pesan pertama Anda di bawah untuk merespons pelanggan.
                    </p>
                  </div>
                ) : (
                  messages.map((msg: ChatMessage) => {
                    const isAdminMsg = msg.senderRole === 'admin';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isAdminMsg ? 'items-end' : 'items-start'}`}
                      >
                        {/* Car Attachment Card in message */}
                        {msg.car && (
                          <div className={`mb-1.5 p-2 rounded-xl border max-w-[70%] flex items-center gap-2 text-xs ${
                            isAdminMsg
                              ? 'bg-orange-500/10 border-orange-500/20'
                              : isDark
                                ? 'sa-glass-dark border-white/15 text-white'
                                : 'sa-glass-light border-white/80 text-slate-900'
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

                        {/* Liquid Glass Message Bubble */}
                        <div
                          className={`max-w-[85%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed break-words shadow-sm ${
                            isAdminMsg
                              ? 'bg-gradient-to-tr from-orange-600 to-amber-600 text-white rounded-br-xs shadow-md shadow-orange-600/20'
                              : isDark
                                ? 'sa-glass-dark text-white rounded-bl-xs border border-white/15'
                                : 'sa-glass-light text-slate-900 rounded-bl-xs border border-white/80 shadow-md shadow-slate-900/5'
                          }`}
                        >
                          <p>{msg.pesan}</p>
                        </div>

                        {/* Metadata */}
                        <div className={`flex items-center gap-1.5 mt-1 text-[9px] ${
                          isDark ? 'text-white/40' : 'text-slate-400'
                        }`}>
                          <span>{formatTime(msg.createdAt)}</span>
                          {isAdminMsg && (
                            msg.isRead ? (
                              <CheckCheck size={12} className="text-orange-400" />
                            ) : (
                              <Check size={12} />
                            )
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Template Chips for Admin */}
              <div className={`px-4 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar border-t ${
                isDark ? 'border-white/10 bg-white/[0.01]' : 'border-slate-200 bg-slate-50/50'
              }`}>
                {quickAdminReplies.map((tpl, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(tpl)}
                    disabled={sendMutation.isPending}
                    className={`shrink-0 text-[11px] px-3 py-1 rounded-full border transition-all truncate max-w-[280px] ${
                      isDark
                        ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white/80'
                        : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    {tpl}
                  </button>
                ))}
              </div>

              {/* Input Area */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className={`p-3.5 px-4 border-t flex items-center gap-3 ${
                  isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-white'
                }`}
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ketik balasan untuk pelanggan..."
                  className={`flex-1 rounded-xl px-4 py-2.5 text-xs outline-none transition-all ${
                    isDark
                      ? 'bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-orange-500'
                      : 'bg-slate-100 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-orange-500'
                  }`}
                />

                <button
                  type="submit"
                  disabled={!inputText.trim() || sendMutation.isPending}
                  className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 shrink-0"
                >
                  {sendMutation.isPending ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <>
                      <span>Kirim</span>
                      <Send size={14} />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : selectedConversationId && isLoadingDetail ? (
            /* Skeleton panel penuh saat seleksi pertama: percakapan aktif
               belum ada sehingga guard di atas tidak terpenuhi. Tanpa ini
               user melihat flash "Pilih Percakapan" saat reload. */
            <div className="flex-1 flex flex-col min-w-0">
              <div className={`p-4 border-b flex items-center gap-3 ${
                isDark ? 'border-white/10 bg-white/[0.02]' : 'border-white/60 bg-white/40 backdrop-blur-xl'
              }`}>
                <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-2.5 w-48" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                    <div className="max-w-[70%] w-64 space-y-1.5">
                      <Skeleton className="h-10 w-full rounded-2xl" />
                      <Skeleton className="h-2.5 w-24 rounded" />
                    </div>
                  </div>
                ))}
              </div>
              <div className={`p-3.5 px-4 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${
                isDark ? 'bg-white/5 text-white/40' : 'bg-slate-100 text-slate-400'
              }`}>
                <MessageCircle size={28} />
              </div>
              <h3 className="text-sm font-bold mb-1">Pilih Percakapan</h3>
              <p className={`text-xs max-w-sm ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                Pilih salah satu pesan pelanggan dari daftar di sebelah kiri untuk mulai membaca dan membalas pertanyaan mereka.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}