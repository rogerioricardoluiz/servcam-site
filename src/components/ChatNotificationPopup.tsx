import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/auth/context';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  MessageSquare, 
  X, 
  ArrowRight, 
  Volume2, 
  VolumeX,
  ShieldCheck
} from 'lucide-react';
import { MockService } from '@/services/mockService';
import { supabase } from '@/lib/supabaseClient';
import { ChatMessage, UserRole } from '@/types';

// Web Audio API synthesized soft cyber chime (zero external dependencies)
const playSoftNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;
    
    // Crystal high tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(784, now); // G5
    osc1.frequency.exponentialRampToValueAtTime(1046.5, now + 0.12); // C6
    gain1.gain.setValueAtTime(0.09, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Warm harmonics
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1318.5, now + 0.10); // E6
    gain2.gain.setValueAtTime(0.06, now + 0.10);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.40);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.10);
    osc2.stop(now + 0.40);
  } catch (_) {}
};

export const ChatNotificationPopup: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [latestMessage, setLatestMessage] = useState<ChatMessage | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    return localStorage.getItem('atalaia_chat_sound_muted') === 'true';
  });

  const lastNotifiedMsgIdRef = useRef<string | null>(null);
  const isOnChatPage = location.pathname === '/chat';

  // Format relative time
  const formatTime = (date: Date) => {
    try {
      const d = new Date(date);
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch (_) {
      return 'Agora';
    }
  };

  // Check unread messages
  const checkUnreadMessages = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      setLatestMessage(null);
      setIsVisible(false);
      return;
    }

    const lastSeenStr = localStorage.getItem(`atalaia_chat_last_seen_${user.id}`);
    let lastSeenTime = lastSeenStr ? parseInt(lastSeenStr, 10) : 0;

    let candidateMessages: ChatMessage[] = [];

    if (user.role === UserRole.RESIDENT) {
      // 1. Resident messages: fetch direct messages with their integrator
      let integratorId = user.integratorId;
      if (!integratorId) {
        try {
          const raw = localStorage.getItem('atalaia_user_integrators');
          if (raw) {
            const parsed = JSON.parse(raw);
            integratorId = parsed[user.id]?.integratorId;
          }
        } catch (_) {}
      }

      try {
        candidateMessages = await MockService.getDirectMessages(user.id, integratorId);
      } catch (_) {
        candidateMessages = [];
      }

      // If resident has zero messages yet, initialize with a welcome notification from the Integrator
      if (candidateMessages.length === 0 && lastSeenTime === 0) {
        const welcomeMsg: ChatMessage = {
          id: `welcome-chat-${user.id}`,
          neighborhoodId: user.neighborhoodId || 'dm',
          userId: integratorId || 'servcam-integrator',
          userName: user.integratorName || 'Central de Atendimento ServCam',
          userRole: UserRole.INTEGRATOR,
          text: 'Olá! Seja bem-vindo ao portal ServCam. Seu sistema de monitoramento está operando normalmente. Qualquer dúvida ou solicitação com suas câmeras, nos chame por aqui!',
          timestamp: new Date(Date.now() - 1000 * 60 * 3), // 3 mins ago
          clientId: user.id,
          integratorId: integratorId
        };

        // Save into local storage so it persists and is visible in Chat.tsx as well
        const generalKey = `atalaia_dm_messages_${user.id}`;
        try {
          localStorage.setItem(generalKey, JSON.stringify([welcomeMsg]));
          if (integratorId) {
            localStorage.setItem(`atalaia_dm_messages_${user.id}_${integratorId}`, JSON.stringify([welcomeMsg]));
          }
        } catch (_) {}

        candidateMessages = [welcomeMsg];
      }
    } else {
      // 2. Integrator or Admin messages: check messages across direct messages
      try {
        const allUsers = await MockService.getUsers();
        const clientIds = allUsers
          .filter(u => u.role === UserRole.RESIDENT && (user.role === UserRole.ADMIN || u.integratorId === user.id))
          .map(u => u.id);

        for (const cid of clientIds.slice(0, 15)) {
          const clientMsgs = await MockService.getDirectMessages(cid, user.id);
          candidateMessages.push(...clientMsgs);
        }

        // If integrator has no messages yet and has never seen chat, provide a demo client inquiry
        if (candidateMessages.length === 0 && lastSeenTime === 0) {
            candidateMessages = [];
        }
      } catch (_) {}
    }

    // Filter incoming messages where the sender is NOT current user
    const incomingMessages = candidateMessages.filter(m => m.userId !== user.id);
    incomingMessages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Unread messages: timestamp greater than lastSeenTime
    const unreads = incomingMessages.filter(m => {
      const msgTime = new Date(m.timestamp).getTime();
      return msgTime > lastSeenTime;
    });

    const count = unreads.length;
    const latest = unreads[0] || null;

    setUnreadCount(count);
    setLatestMessage(latest);

    // Broadcast count to navigation/header
    window.dispatchEvent(new CustomEvent('atalaia_chat_unread_count', { 
      detail: { count, latestMessage: latest } 
    }));

    if (count > 0 && latest) {
      // If a brand new message ID came in, play sound and re-show even if previously dismissed
      if (latest.id !== lastNotifiedMsgIdRef.current) {
        lastNotifiedMsgIdRef.current = latest.id;
        setIsDismissed(false);
        if (!isMuted && !isOnChatPage) {
          playSoftNotificationSound();
        }
      }
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [user, isMuted, isOnChatPage]);

  // When user is on /chat, automatically mark all messages as read
  useEffect(() => {
    if (isOnChatPage && user) {
      localStorage.setItem(`atalaia_chat_last_seen_${user.id}`, Date.now().toString());
      setUnreadCount(0);
      setIsVisible(false);
      setIsDismissed(true);
      window.dispatchEvent(new CustomEvent('atalaia_chat_unread_count', { 
        detail: { count: 0, latestMessage: null } 
      }));
    }
  }, [isOnChatPage, user]);

  // Initial check & event listeners
  useEffect(() => {
    checkUnreadMessages();

    const handleUpdate = () => checkUnreadMessages();
    window.addEventListener('atalaia_dm_update', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    // Periodic polling to catch any realtime changes
    const interval = setInterval(checkUnreadMessages, 7000);

    // Supabase channel listener
    const channel = supabase
      .channel('chat_notifications_global')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        () => {
          checkUnreadMessages();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('atalaia_dm_update', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [checkUnreadMessages]);

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !isMuted;
    setIsMuted(next);
    localStorage.setItem('atalaia_chat_sound_muted', String(next));
    if (!next) {
      playSoftNotificationSound();
    }
  };

  const handleOpenChat = () => {
    if (user) {
      localStorage.setItem(`atalaia_chat_last_seen_${user.id}`, Date.now().toString());
    }
    setUnreadCount(0);
    setIsVisible(false);
    setIsDismissed(true);
    navigate('/chat');
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
  };

  // Do not show popup if on /chat page, or if dismissed, or no unread messages
  if (isOnChatPage || !isVisible || isDismissed || unreadCount === 0 || !latestMessage) {
    return null;
  }

  return (
    <>
      <style>{`
        @keyframes chatPulseNeon {
          0%, 100% {
            box-shadow: 0 0 15px rgba(var(--atalaia-neon-rgb, 0, 255, 102), 0.35),
                        0 0 35px rgba(var(--atalaia-neon-rgb, 0, 255, 102), 0.2),
                        inset 0 0 15px rgba(var(--atalaia-neon-rgb, 0, 255, 102), 0.08);
            border-color: rgba(var(--atalaia-neon-rgb, 0, 255, 102), 0.6);
          }
          50% {
            box-shadow: 0 0 30px rgba(var(--atalaia-neon-rgb, 0, 255, 102), 0.75),
                        0 0 60px rgba(var(--atalaia-neon-rgb, 0, 255, 102), 0.4),
                        inset 0 0 25px rgba(var(--atalaia-neon-rgb, 0, 255, 102), 0.18);
            border-color: rgba(var(--atalaia-neon-rgb, 0, 255, 102), 1);
          }
        }
        @keyframes chatFlashDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.25; transform: scale(0.85); }
        }
        .chat-pulsing-card {
          animation: chatPulseNeon 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .chat-flashing-dot {
          animation: chatFlashDot 0.8s ease-in-out infinite;
        }
      `}</style>

      {/* Floating Pulsing & Blinking Popup */}
      <div 
        className="fixed z-50 bottom-20 right-3 sm:bottom-6 sm:right-6 max-w-[390px] w-[calc(100vw-1.5rem)] sm:w-auto transition-all duration-300 transform animate-in slide-in-from-bottom-5 fade-in"
        role="alert"
        aria-live="assertive"
      >
        <div 
          onClick={handleOpenChat}
          className="chat-pulsing-card group relative bg-[#090a0f]/95 backdrop-blur-xl border-2 rounded-2xl p-4 sm:p-4.5 cursor-pointer text-white overflow-hidden transition-all duration-200 hover:scale-[1.02]"
        >
          {/* Pulsing Neon Background Accent Beam */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-atalaia-neon/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-atalaia-neon/15 rounded-full blur-xl pointer-events-none" />

          {/* Top Header Bar with Blinking Beacon and Actions */}
          <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-white/10">
            <div className="flex items-center gap-2 min-w-0">
              {/* Pulsing Beacon / Radar Ring */}
              <div className="relative flex items-center justify-center shrink-0 w-3.5 h-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-atalaia-neon opacity-80" />
                <span className="chat-flashing-dot relative inline-flex rounded-full h-3 w-3 bg-atalaia-neon shadow-[0_0_10px_rgba(0,255,102,1)]" />
              </div>

              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[11px] font-black uppercase tracking-wider text-atalaia-neon truncate">
                  Mensagem Não Lida
                </span>
                <span className="px-1.5 py-0.5 rounded-full bg-atalaia-neon/20 text-atalaia-neon text-[9px] font-black uppercase tracking-widest border border-atalaia-neon/40 animate-pulse">
                  {unreadCount > 1 ? `${unreadCount} novas` : '1 nova'}
                </span>
              </div>
            </div>

            {/* Mute and Close controls */}
            <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
              <button
                type="button"
                onClick={toggleSound}
                className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                title={isMuted ? "Ativar som de notificação" : "Silenciar notificação"}
                aria-label="Som"
              >
                {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} className="text-atalaia-neon" />}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                title="Fechar notificação"
                aria-label="Fechar"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Message Content Body */}
          <div className="flex items-start gap-3">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-xl bg-atalaia-neon/15 border border-atalaia-neon/30 flex items-center justify-center text-atalaia-neon shadow-[0_0_15px_rgba(0,255,102,0.2)]">
                <MessageSquare size={18} className="animate-pulse" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-atalaia-neon border-2 border-black flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-xs font-bold text-white truncate block">
                  {latestMessage.userName || 'Central ServCam'}
                </span>
                <span className="text-[10px] text-zinc-400 shrink-0 font-mono">
                  {formatTime(latestMessage.timestamp)}
                </span>
              </div>

              <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed font-sans mb-3 pr-1">
                {latestMessage.text}
              </p>

              {/* Pulsing Action Button */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[10px] text-zinc-400 flex items-center gap-1 font-medium">
                  <ShieldCheck size={12} className="text-atalaia-neon" />
                  Atendimento Seguro
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenChat();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-atalaia-neon hover:bg-emerald-400 text-black text-xs font-extrabold shadow-[0_0_15px_rgba(0,255,102,0.4)] hover:shadow-[0_0_25px_rgba(0,255,102,0.8)] transition-all transform active:scale-95 group-hover:scale-[1.03]"
                >
                  <span>Abrir Chat Agora</span>
                  <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatNotificationPopup;
