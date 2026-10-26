import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '@/auth/context';
import { Card, Input, Button } from '../components/UI';
import { 
  MessageCircle, 
  MessageSquare, 
  Send, 
  Building, 
  User as UserIcon, 
  Users, 
  MapPin, 
  Loader2, 
  Wifi, 
  WifiOff, 
  Search, 
  Phone, 
  ArrowLeft, 
  ShieldCheck, 
  Sparkles,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { MockService } from '../services/mockService';
import { ChatMessage, UserRole, User } from '../types';
import { supabase } from '../lib/supabaseClient';

const Chat: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTING' | 'CONNECTED' | 'DISCONNECTED'>('CONNECTING');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isWhatsAppMirrorActive, setIsWhatsAppMirrorActive] = useState(false);

  // Integrator & Clients State
  const [myIntegrator, setMyIntegrator] = useState<User | null>(null);
  const [clientsList, setClientsList] = useState<User[]>([]);
  const [selectedClient, setSelectedClient] = useState<User | null>(null);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [loadingClients, setLoadingClients] = useState(false);

  // Mobile navigation state for Integrator: 'list' or 'chat'
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('chat');

  const isClient = user?.role === UserRole.RESIDENT;
  const isIntegratorOrAdmin = user?.role === UserRole.INTEGRATOR || user?.role === UserRole.ADMIN;
  const [allAvailableIntegrators, setAllAvailableIntegrators] = useState<User[]>([]);

  // 1. If CLIENT: Load their specific Integrator
  useEffect(() => {
    if (!user) return;

    const loadIntegratorInfo = async () => {
      try {
        const integrators = await MockService.getIntegrators();
        setAllAvailableIntegrators(integrators);
        let intId = user.integratorId;

        if (!intId && typeof window !== 'undefined' && user.id) {
          try {
            const rawLinks = localStorage.getItem('atalaia_user_integrators');
            if (rawLinks) {
              const parsed = JSON.parse(rawLinks);
              if (parsed[user.id]?.integratorId) {
                intId = parsed[user.id].integratorId;
              }
            }
          } catch (_) {}
        }

        const matched = integrators.find(i => i.id === intId) || integrators[0] || null;
        setMyIntegrator(matched);
      } catch (e) {
        console.error("Error loading integrator info in chat:", e);
      }
    };

    if (isClient) {
      loadIntegratorInfo();
    }
  }, [user, isClient]);

  // 2. If INTEGRADOR or ADMIN: Load their client list
  useEffect(() => {
    if (!user || !isIntegratorOrAdmin) return;

    const loadClients = async () => {
      setLoadingClients(true);
      try {
        const [allUsers, hoods] = await Promise.all([
          MockService.getUsers(),
          MockService.getNeighborhoods(true)
        ]);

        const myHoodIds = new Set(
          hoods
            .filter(h => user.role === UserRole.ADMIN || h.integratorId === user.id)
            .map(h => h.id)
        );

        // Filter only residents/clients linked to this integrator
        const myClients = allUsers.filter(u => {
          if (u.role === UserRole.ADMIN || u.role === UserRole.INTEGRATOR) return false;
          if (user.role === UserRole.ADMIN) return true;
          // RESTRICTED: Link must be direct!
          return u.integratorId === user.id;
        });

        setClientsList(myClients);

        // Auto-select first client if none selected
        if (myClients.length > 0 && !selectedClient) {
          setSelectedClient(myClients[0]);
        }
      } catch (err) {
        console.error("Error loading integrator clients for chat:", err);
      } finally {
        setLoadingClients(false);
      }
    };

    loadClients();
  }, [user, isIntegratorOrAdmin]);

  // Determine current active Client ID for this conversation thread
  const activeClientId = useMemo(() => {
    if (isClient) {
      return user?.id || '';
    }
    return selectedClient?.id || '';
  }, [isClient, user?.id, selectedClient?.id]);

  // 3. Fetch Direct Messages for this specific client & integrator
  const fetchMessages = useCallback(async () => {
    if (!activeClientId) return;
    const integratorId = isClient ? myIntegrator?.id : user?.id;
    const msgs = await MockService.getDirectMessages(activeClientId, integratorId);
    setMessages(msgs);
  }, [activeClientId, isClient, myIntegrator?.id, user?.id]);

  useEffect(() => {
    fetchMessages();
    if (user?.id) {
      localStorage.setItem(`atalaia_chat_last_seen_${user.id}`, Date.now().toString());
      window.dispatchEvent(new CustomEvent('atalaia_chat_unread_count', { detail: { count: 0, latestMessage: null } }));
    }
  }, [fetchMessages, user?.id]);

  // 4. Real-time Subscription & Local Storage Sync
  useEffect(() => {
    if (!user || !activeClientId) return;

    setConnectionStatus('CONNECTING');

    const handleLocalUpdate = () => {
      fetchMessages();
    };

    window.addEventListener('atalaia_dm_update', handleLocalUpdate);

    // Channel dedicated to this client's conversation
    const channelId = `chat_dm_${activeClientId}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          const newMsg = payload.new as any;
          let textContent = newMsg.text;
          let targetClientId = newMsg.user_id;

          if (textContent && typeof textContent === 'string' && textContent.startsWith('{"__dm":true')) {
            try {
              const parsed = JSON.parse(textContent);
              textContent = parsed.text;
              targetClientId = parsed.clientId || targetClientId;
            } catch (_) {}
          }

          // Strictly filter so only messages for this client conversation are accepted
          if (targetClientId === activeClientId) {
            const formatted: ChatMessage = {
              id: newMsg.id,
              neighborhoodId: newMsg.neighborhood_id || 'dm',
              userId: newMsg.user_id,
              userName: newMsg.user_name,
              userRole: newMsg.user_role as UserRole,
              text: textContent,
              timestamp: new Date(newMsg.created_at || newMsg.timestamp || Date.now()),
              clientId: targetClientId
            };

            setMessages((prev) => {
              if (prev.some(m => m.id === formatted.id)) return prev;
              return [...prev, formatted];
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('CONNECTED');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnectionStatus('CONNECTED'); // Fallback gracefully
        }
      });

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('atalaia_dm_update', handleLocalUpdate);
    };
  }, [user, activeClientId, fetchMessages]);

  // Auto-scroll on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // 5. Send Message Handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !activeClientId) return;

    const textToSend = newMessage.trim();
    const senderRole = user.role;
    const senderName = isIntegratorOrAdmin 
      ? (user.companyName || user.razaoSocial || user.name || 'Empresa Integradora')
      : user.name;
    const targetIntegratorId = isClient ? myIntegrator?.id : user.id;

    // Optimistic UI Update
    const optimisticMsg: ChatMessage = {
      id: crypto.randomUUID(),
      neighborhoodId: user.neighborhoodId || 'dm',
      userId: user.id,
      userName: senderName,
      userRole: senderRole,
      text: textToSend,
      timestamp: new Date(),
      clientId: activeClientId,
      integratorId: targetIntegratorId
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setNewMessage('');

    try {
      await MockService.sendDirectMessage({
        clientId: activeClientId,
        integratorId: targetIntegratorId,
        userId: user.id,
        userName: senderName,
        userRole: senderRole,
        text: textToSend,
        neighborhoodId: user.neighborhoodId
      });

      // Mirror to WhatsApp if active
      if (isWhatsAppMirrorActive && user.phone) {
        await MockService.sendChatMessageToWhatsApp(user.name, textToSend, user.phone);
      }
    } catch (err) {
      console.error("Error sending direct message:", err);
    }
  };

  // Filter clients in sidebar for Integrator view
  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) return clientsList;
    const q = clientSearchQuery.toLowerCase();
    return clientsList.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.email.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q))
    );
  }, [clientsList, clientSearchQuery]);

  const integratorDisplayName = myIntegrator?.companyName || myIntegrator?.razaoSocial || myIntegrator?.name || 'Empresa Integradora';

  if (!isClient && !isIntegratorOrAdmin) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-20 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-atalaia-neon/10 border border-atalaia-neon/30 text-atalaia-neon flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(0,255,102,0.15)]">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Canal Exclusivo Cliente ↔ Integrador</h2>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed mb-6">
            O chat direto foi desenvolvido exclusivamente para atendimento e suporte técnico individualizado entre os clientes (moradores) e suas respectivas empresas integradoras credenciadas.
          </p>
          <div className="p-4 rounded-xl bg-black/60 border border-white/10 text-xs text-gray-400 font-mono inline-block">
            Perfil logado: {user?.role || 'Acesso restrito'} • Para atendimento operacional, utilize a Central de Ocorrências ou WhatsApp.
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-100px)]">
        {/* Header Notice */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
              <MessageCircle className="text-atalaia-neon" size={26} />
              {isClient ? 'Atendimento com seu Integrador' : 'Central de Atendimento ao Cliente'}
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm mt-0.5">
              {isClient 
                ? `Canal direto, seguro e privado com ${integratorDisplayName}.` 
                : 'Comunicação direta e individualizada com cada cliente da sua base.'}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-atalaia-neon/10 border border-atalaia-neon/30 text-atalaia-neon">
              <ShieldCheck size={14} /> Canal Privado 1:1
            </span>
            {connectionStatus === 'CONNECTED' && (
              <span className="inline-flex items-center gap-1 text-[11px] text-green-400 font-mono">
                <Wifi size={13} /> Conectado
              </span>
            )}
            {connectionStatus === 'CONNECTING' && (
              <span className="inline-flex items-center gap-1 text-[11px] text-yellow-400 font-mono">
                <Loader2 size={13} className="animate-spin" /> Conectando
              </span>
            )}
          </div>
        </div>

        {/* Main Chat Container */}
        <Card className="flex-1 flex overflow-hidden border-atalaia-border/50 bg-[#0a0a0a] rounded-2xl shadow-2xl">
          {/* LEFT SIDEBAR FOR INTEGRADOR / ADMIN (List of clients) */}
          {isIntegratorOrAdmin && (
            <div className={`w-full md:w-80 lg:w-96 border-r border-white/5 bg-[#0e0e12] flex flex-col shrink-0 ${
              mobileView === 'chat' ? 'hidden md:flex' : 'flex'
            }`}>
              <div className="p-3.5 border-b border-white/5 bg-[#121218]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-atalaia-neon flex items-center gap-1.5">
                    <Users size={15} /> Clientes ({clientsList.length})
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Atendimento Direto
                  </span>
                </div>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={clientSearchQuery}
                    onChange={(e) => setClientSearchQuery(e.target.value)}
                    placeholder="Buscar cliente por nome..."
                    className="w-full pl-9 pr-3 py-2 bg-black/60 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-atalaia-neon"
                  />
                </div>
              </div>

              {/* Client Conversation List */}
              <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                {loadingClients && (
                  <div className="p-8 text-center text-xs text-zinc-500 flex flex-col items-center gap-2">
                    <Loader2 size={18} className="animate-spin text-atalaia-neon" />
                    Carregando base de clientes...
                  </div>
                )}

                {!loadingClients && filteredClients.length === 0 && (
                  <div className="p-8 text-center text-xs text-zinc-500">
                    Nenhum cliente encontrado.
                  </div>
                )}

                {!loadingClients && filteredClients.map((c) => {
                  const isSelected = selectedClient?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedClient(c);
                        setMobileView('chat');
                      }}
                      className={`w-full p-3.5 text-left transition-all flex items-start gap-3 cursor-pointer ${
                        isSelected 
                          ? 'bg-atalaia-neon/15 border-l-4 border-atalaia-neon' 
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-white/10 flex items-center justify-center font-bold text-white text-xs shrink-0 mt-0.5">
                        {c.name ? c.name.charAt(0).toUpperCase() : 'C'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-zinc-200'}`}>
                            {c.name}
                          </h4>
                          <span className="text-[9px] text-zinc-500 font-mono">
                            {c.plan || 'CLIENTE'}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                          {c.phone || c.email}
                        </p>
                        {c.address && (
                          <p className="text-[10px] text-zinc-500 truncate mt-0.5 flex items-center gap-1">
                            <MapPin size={10} /> {c.address}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* RIGHT CHAT AREA */}
          <div className={`flex-1 flex flex-col bg-[#08080a] ${
            isIntegratorOrAdmin && mobileView === 'list' ? 'hidden md:flex' : 'flex'
          }`}>
            {/* Conversation Header */}
            <div className="p-3.5 sm:p-4 border-b border-white/5 bg-[#101015] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {/* Mobile Back Button for Integrator */}
                {isIntegratorOrAdmin && (
                  <button
                    onClick={() => setMobileView('list')}
                    className="md:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white"
                  >
                    <ArrowLeft size={16} />
                  </button>
                )}

                <div className="w-10 h-10 rounded-2xl bg-atalaia-neon/15 border border-atalaia-neon/30 flex items-center justify-center text-atalaia-neon font-black shrink-0 shadow-[0_0_15px_rgba(0,255,102,0.15)]">
                  {isClient ? <Building size={20} /> : <UserIcon size={20} />}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-sm sm:text-base truncate">
                      {isClient 
                        ? integratorDisplayName 
                        : (selectedClient?.name || 'Selecione um cliente')}
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-white/10 text-zinc-300">
                      {isClient ? 'Empresa Integradora' : 'Cliente'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 truncate flex items-center gap-2 mt-0.5">
                    {isClient ? (
                      <>
                        <span className="text-atalaia-neon flex items-center gap-1">
                          <CheckCircle2 size={12} /> Atendimento Oficial
                        </span>
                        {myIntegrator?.phone && (
                          <span className="text-zinc-500 hidden sm:inline">• Tel: {myIntegrator.phone}</span>
                        )}
                      </>
                    ) : (
                      selectedClient?.phone ? (
                        <span className="text-zinc-400 flex items-center gap-1">
                          <Phone size={11} /> {selectedClient.phone}
                        </span>
                      ) : (
                        <span>Conversa direta reservada</span>
                      )
                    )}
                  </p>
                </div>
              </div>

              {/* Right Notice Badge */}
              <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-500 font-mono">
                <Clock size={12} />
                <span>Histórico Permanente</span>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#08080a]">
              {messages.length === 0 && (
                <div className="text-center text-zinc-500 text-sm py-16 flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400">
                    <MessageCircle size={22} />
                  </div>
                  <div>
                    <p className="font-bold text-zinc-300">Nenhuma mensagem nesta conversa.</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {isClient 
                        ? 'Envie uma mensagem abaixo para falar diretamente com o suporte da sua empresa integradora.'
                        : 'Inicie a conversa direta com este cliente enviando uma mensagem abaixo.'}
                    </p>
                  </div>
                </div>
              )}

              {messages.map((msg) => {
                const isMe = msg.userId === user?.id;
                const isIntegrator = msg.userRole === UserRole.INTEGRATOR;

                return (
                  <div 
                    key={msg.id} 
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-150`}
                  >
                    <div className={`flex items-baseline gap-2 mb-1 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      <span className="text-[11px] font-bold text-zinc-300">
                        {isMe ? 'Você' : msg.userName}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-black tracking-wider uppercase border ${
                        isIntegrator 
                          ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' 
                          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      }`}>
                        {isIntegrator ? 'INTEGRADOR' : 'CLIENTE'}
                      </span>
                      <span className="text-[10px] text-zinc-600 font-mono">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div 
                      className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-md ${
                        isMe 
                          ? 'bg-atalaia-neon text-black font-medium rounded-tr-none shadow-[0_2px_15px_rgba(0,255,102,0.15)]' 
                          : 'bg-[#181820] text-gray-100 border border-white/10 rounded-tl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-3.5 sm:p-4 bg-[#101015] border-t border-white/5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs">
                <button 
                  type="button"
                  onClick={() => {
                    if (!user?.phone) {
                      alert("Você precisa cadastrar seu telefone no perfil para usar o espelhamento via WhatsApp.");
                      return;
                    }
                    setIsWhatsAppMirrorActive(!isWhatsAppMirrorActive);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all text-[10px] font-bold uppercase tracking-tight ${
                    isWhatsAppMirrorActive 
                      ? 'bg-green-600 text-white border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' 
                      : 'bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10'
                  }`}
                >
                  <MessageSquare size={13} className={isWhatsAppMirrorActive ? "fill-white/20" : ""} />
                  {isWhatsAppMirrorActive ? "Espelhamento WhatsApp Ativo" : "Enviar Cópia p/ meu WhatsApp"}
                </button>

                <span className="text-[10px] text-zinc-500 italic hidden sm:inline">
                  {isClient ? 'Mensagem visível apenas para seu integrador' : 'Mensagem enviada exclusivamente para este cliente'}
                </span>
              </div>

              <div className="flex gap-2 sm:gap-3 items-center">
                <Input 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={
                    isClient 
                      ? `Escreva para ${integratorDisplayName}...` 
                      : (selectedClient ? `Responder para ${selectedClient.name}...` : 'Selecione um cliente...')
                  }
                  className="flex-1 !bg-black !border-white/10 focus:!border-atalaia-neon !h-12 !text-xs sm:!text-sm text-white"
                  disabled={isIntegratorOrAdmin && !selectedClient}
                />
                <Button 
                  type="submit" 
                  disabled={!newMessage.trim() || (isIntegratorOrAdmin && !selectedClient)}
                  className="px-5 sm:px-7 bg-atalaia-neon hover:bg-[#33ff85] text-black font-black uppercase text-xs transition-all h-12 shadow-[0_0_15px_rgba(0,255,102,0.2)] disabled:opacity-40"
                >
                  <Send size={18} className="mr-1 hidden sm:inline" />
                  <span>Enviar</span>
                </Button>
              </div>
            </form>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default Chat;
