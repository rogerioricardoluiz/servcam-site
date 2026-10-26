
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/auth/context';
import { UserRole, User } from '@/types';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MockService } from '@/services/mockService';
import { 
  ShieldCheck, 
  LayoutDashboard, 
  Camera, 
  Map as MapIcon, 
  LogOut, 
  Menu, 
  X,
  Bell,
  Users,
  User as UserIcon,
  MessageCircle,
  MessageSquare,
  FileText,
  DollarSign,
  Scale,
  Server,
  Sliders
} from 'lucide-react';
import ChatNotificationPopup from './ChatNotificationPopup';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout, switchNeighborhood, activeNeighborhoodId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [neighborhoods, setNeighborhoods] = useState<any[]>([]);
  
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  
  const [partnerLogo, setPartnerLogo] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [partnerPhone, setPartnerPhone] = useState<string | null>(null);
  
  // Initialize synchronously to eliminate ANY flash or delay on page load/navigation
  const [partnerCustomRgb, setPartnerCustomRgb] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return (
      sessionStorage.getItem('atalaia_current_rgb') ||
      localStorage.getItem('atalaia_current_rgb') ||
      null
    );
  });

  // Helper to normalize and clean RGB code
  const parseRgbString = (input?: string | null): string | null => {
    if (!input || !input.trim()) return null;
    let s = input.trim().replace(/^rgb\(|\)$/gi, '').trim();
    if (s.startsWith('#')) {
      const hex = s.substring(1);
      if (hex.length === 3) {
        const r = parseInt(hex[0] + hex[0], 16);
        const g = parseInt(hex[1] + hex[1], 16);
        const b = parseInt(hex[2] + hex[2], 16);
        if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return `${r}, ${g}, ${b}`;
      } else if (hex.length === 6) {
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return `${r}, ${g}, ${b}`;
      }
    }
    const parts = s.split(',').map(p => parseInt(p.trim(), 10));
    if (parts.length === 3 && parts.every(n => !isNaN(n) && n >= 0 && n <= 255)) {
      return `${parts[0]}, ${parts[1]}, ${parts[2]}`;
    }
    return null;
  };

  useEffect(() => {
    const handleThemeChange = (e: any) => {
      if (e.detail) {
        const clean = parseRgbString(e.detail);
        if (clean) {
          setPartnerCustomRgb(clean);
          document.documentElement.style.setProperty('--atalaia-neon-rgb', clean);
          try {
            sessionStorage.setItem('atalaia_current_rgb', clean);
            localStorage.setItem('atalaia_current_rgb', clean);
          } catch (_) {}
        }
      }
    };
    window.addEventListener('atalaia:theme_changed', handleThemeChange);
    return () => window.removeEventListener('atalaia:theme_changed', handleThemeChange);
  }, []);

  useEffect(() => {
    const handleChatUnread = (e: any) => {
      if (e.detail && typeof e.detail.count === 'number') {
        setUnreadChatCount(e.detail.count);
      }
    };
    window.addEventListener('atalaia_chat_unread_count', handleChatUnread);
    return () => window.removeEventListener('atalaia_chat_unread_count', handleChatUnread);
  }, []);

  const [blockedModalOpen, setBlockedModalOpen] = useState(false);

  // Blocked access check
  useEffect(() => {
    if (user && user.approved === false && user.role !== UserRole.ADMIN) {
      setBlockedModalOpen(true);
    }
  }, [user]);

  // Render blocked modal
  const renderBlockedModal = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
      <div className="bg-[#050505] border border-red-500/50 rounded-2xl w-full max-w-sm p-8 text-center animate-in zoom-in-95 duration-200 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <X size={32} />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Acesso Bloqueado</h2>
        <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
          Seu acesso foi bloqueado por questões de segurança. Entre em contato com o administrador do sistema para solicitar a liberação.
        </p>
        <button
          onClick={() => {
            setBlockedModalOpen(false);
            logout();
            navigate('/login');
          }}
          className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all"
        >
          Entendido
        </button>
      </div>
    </div>
  );


  // Effect to apply custom RGB styling only on authorized panels
  useEffect(() => {
    // Define the whitelist of public routes
    const isPublic = ['/', '/login', '/landing', '/home'].includes(location.pathname) ||
                     location.pathname.startsWith('/admin') ||
                     ['/docs', '/terms', '/privacy', '/politica-imagens', '/politica-fornecimento-imagens', '/colaborativa'].includes(location.pathname);

    // Reset to default colors on public routes, admin role, or if no custom theme is defined
    if (isPublic || user?.role === UserRole.ADMIN || !partnerCustomRgb) {
      document.documentElement.style.setProperty('--atalaia-neon-rgb', '0, 255, 102');
      document.getElementById('integrator-custom-theme')?.remove();
      return;
    }

    const cleanRgb = parseRgbString(partnerCustomRgb);
    if (!cleanRgb) {
      document.getElementById('integrator-custom-theme')?.remove();
      return;
    }

    // Apply immediately to CSS variables on root DOM (instant, zero delay)
    document.documentElement.style.setProperty('--atalaia-neon-rgb', cleanRgb);
    try {
      sessionStorage.setItem('atalaia_current_rgb', cleanRgb);
      localStorage.setItem('atalaia_current_rgb', cleanRgb);
    } catch (_) {}

    let styleEl = document.getElementById('integrator-custom-theme') as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'integrator-custom-theme';
      document.head.appendChild(styleEl);
    }

    styleEl.textContent = `
      :root {
        --atalaia-neon-rgb: ${cleanRgb} !important;
      }
      /* Dynamic overrides for theme accents while preserving dark surface backgrounds */
      .theme-accent-text {
        color: rgb(${cleanRgb}) !important;
      }
      .theme-accent-border {
        border-color: rgba(${cleanRgb}, 0.5) !important;
      }
    `;

    // Note: We do NOT remove the styleEl on cleanup to prevent flickers!
  }, [partnerCustomRgb, location.pathname]);

  useEffect(() => {
    const loadHoods = async () => {
      try {
        const list = await MockService.getNeighborhoods(true);
        setNeighborhoods(list);
      } catch (err) {}
    };
    loadHoods();
  }, []);

  useEffect(() => {
    const fetchPartnerBranding = async () => {
      if (!user) {
        setPartnerName(null);
        setPartnerLogo(null);
        setPartnerPhone(null);
        setPartnerCustomRgb(null);
        return;
      }
      const isUserIntegrator = user.role === UserRole.INTEGRATOR || (user.email && user.email.toLowerCase().includes('integrador'));
      if (isUserIntegrator) {
        const resolvedName = user.companyName || user.razaoSocial || user.name || null;
        setPartnerName(resolvedName);
        setPartnerLogo(user.companyLogo || null);

        let resolvedPhone = user.phone || null;
        if (!resolvedPhone && user.address && typeof user.address === 'string' && user.address.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(user.address);
            resolvedPhone = parsed.phone || parsed.whatsapp || parsed.brandPhone || parsed.telefone || parsed.celular || null;
          } catch (_) {}
        }
        if (!resolvedPhone && typeof window !== 'undefined' && user.id) {
          try {
            const direct = localStorage.getItem(`atalaia_integrator_phone_${user.id}`);
            if (direct) {
              resolvedPhone = direct;
            } else {
              const phonesMap = JSON.parse(localStorage.getItem('atalaia_integrator_phones') || '{}');
              resolvedPhone = phonesMap[user.id] || null;
            }
          } catch (_) {}
        }
        if (!resolvedPhone) {
          const isAlien = (user.id && String(user.id).toLowerCase().includes('alien')) || 
                          (resolvedName && String(resolvedName).toLowerCase().includes('alien')) ||
                          (user.email && String(user.email).toLowerCase().includes('alien'));
          if (isAlien) {
            resolvedPhone = '(48) 99206-7665';
          }
        }
        setPartnerPhone(resolvedPhone);

        let customRgb = user.customRgb;
        if (!customRgb && typeof window !== 'undefined') {
          customRgb = localStorage.getItem(`atalaia_integrator_custom_rgb_${user.id}`) || null;
          if (!customRgb) {
            try {
              const colorsMap = JSON.parse(localStorage.getItem('atalaia_integrator_colors') || '{}');
              customRgb = colorsMap[user.id] || null;
            } catch (_) {}
          }
        }
        setPartnerCustomRgb(customRgb || null);
      } else {
        const targetHoodId = activeNeighborhoodId || user.neighborhoodId || '';
        try {
          let directIntId = user.integratorId;
          if (!directIntId && typeof window !== 'undefined') {
            try {
              const rawLinks = localStorage.getItem('atalaia_user_integrators');
              if (rawLinks) {
                const parsedLinks = JSON.parse(rawLinks);
                directIntId = parsedLinks[user.id]?.integratorId;
              }
            } catch (_) {}
          }

          let integrator: User | null = null;
          if (directIntId) {
            const allInts = await MockService.getIntegrators();
            integrator = allInts.find(i => i.id === directIntId) || null;
          }

          if (!integrator && targetHoodId) {
            integrator = await MockService.getNeighborhoodIntegrator(targetHoodId);
          }

          if (integrator) {
            const resolvedName = integrator.companyName || integrator.razaoSocial || integrator.name || null;
            setPartnerName(resolvedName);
            setPartnerLogo(integrator.companyLogo || null);

            let resolvedPhone = integrator.phone || null;
            if (!resolvedPhone && integrator.address && typeof integrator.address === 'string' && integrator.address.trim().startsWith('{')) {
              try {
                const parsed = JSON.parse(integrator.address);
                resolvedPhone = parsed.phone || parsed.whatsapp || parsed.brandPhone || parsed.telefone || parsed.celular || null;
              } catch (_) {}
            }
            if (!resolvedPhone && typeof window !== 'undefined' && integrator.id) {
              try {
                const direct = localStorage.getItem(`atalaia_integrator_phone_${integrator.id}`);
                if (direct) {
                  resolvedPhone = direct;
                } else {
                  const phonesMap = JSON.parse(localStorage.getItem('atalaia_integrator_phones') || '{}');
                  resolvedPhone = phonesMap[integrator.id] || null;
                }
              } catch (_) {}
            }
            if (!resolvedPhone) {
              const isAlien = (integrator.id && String(integrator.id).toLowerCase().includes('alien')) || 
                              (resolvedName && String(resolvedName).toLowerCase().includes('alien')) ||
                              (integrator.email && String(integrator.email).toLowerCase().includes('alien'));
              if (isAlien) {
                resolvedPhone = '(48) 99206-7665';
              }
            }
            setPartnerPhone(resolvedPhone);

            let customRgb: string | null | undefined = integrator.customRgb;
            if (!customRgb && integrator.id && typeof window !== 'undefined') {
              customRgb = localStorage.getItem(`atalaia_integrator_custom_rgb_${integrator.id}`);
              if (!customRgb) {
                try {
                  const colorsMap = JSON.parse(localStorage.getItem('atalaia_integrator_colors') || '{}');
                  customRgb = colorsMap[integrator.id] || null;
                } catch (_) {}
              }
              if (!customRgb) {
                try {
                  const cached = localStorage.getItem(`atalaia_local_profile_${integrator.id}`);
                  if (cached) {
                    const p = JSON.parse(cached);
                    customRgb = p.customRgb;
                  }
                } catch (_) {}
              }
            }
            setPartnerCustomRgb(customRgb || null);
          } else {
            setPartnerName(null);
            setPartnerLogo(null);
            setPartnerPhone(null);
            setPartnerCustomRgb(null);
          }
        } catch (e) {
          console.error("[Layout] Erro ao carregar co-branding do Integrador", e);
          setPartnerName(null);
          setPartnerLogo(null);
          setPartnerPhone(null);
          setPartnerCustomRgb(null);
        }
      }
    };
    fetchPartnerBranding();

    const handleIntegratorUpdate = () => {
      fetchPartnerBranding();
    };

    window.addEventListener('atalaia:integrator_updated', handleIntegratorUpdate);
    window.addEventListener('atalaia:plan_config_changed', handleIntegratorUpdate);
    window.addEventListener('atalaia:theme_changed', handleIntegratorUpdate);

    return () => {
      window.removeEventListener('atalaia:integrator_updated', handleIntegratorUpdate);
      window.removeEventListener('atalaia:plan_config_changed', handleIntegratorUpdate);
      window.removeEventListener('atalaia:theme_changed', handleIntegratorUpdate);
    };
  }, [user, activeNeighborhoodId]);

  const getPartnerWaUrl = () => {
    if (!partnerPhone) return null;
    let clean = partnerPhone.replace(/\D/g, '');
    if (!clean) return null;
    if (clean.length === 10 || clean.length === 11) {
      clean = '55' + clean;
    }
    const text = encodeURIComponent(`Olá ${partnerName || 'Empresa Integradora'}! Sou o cliente ${user?.name || ''} e preciso de atendimento.`);
    return `https://wa.me/${clean}?text=${text}`;
  };
  const partnerWaUrl = getPartnerWaUrl();

  const handleLogout = () => {
    let integratorId = user?.integratorId || '';

    if (!integratorId && typeof window !== 'undefined') {
      try {
        const rawLinks = localStorage.getItem('atalaia_user_integrators');
        if (rawLinks && user?.id) {
          const parsed = JSON.parse(rawLinks);
          integratorId = parsed[user.id]?.integratorId || '';
        }
      } catch (_) {}
      if (!integratorId) {
        integratorId = localStorage.getItem('atalaia_last_client_integrator_id') || '';
      }
    }

    if (!integratorId && user?.neighborhoodId) {
      const hood = neighborhoods.find(h => h.id === user.neighborhoodId);
      if (hood?.integratorId) {
        integratorId = hood.integratorId;
      }
    }

    if (!integratorId && typeof window !== 'undefined') {
      const isAlien = (user?.email || '').toLowerCase().includes('alien') || 
                      (user?.companyName || '').toLowerCase().includes('alien') ||
                      user?.id === 'a11e9920-6765-4f81-b454-e6778b77ee66' ||
                      user?.id === 'alienmonitoramento-integrator-id';
      if (isAlien) {
        integratorId = 'alienmonitoramento-integrator-id';
      }
    }

    let targetUrl = '/login';
    if (integratorId) {
      targetUrl = `/logincliente?integrator=${integratorId}`;
    } else if (typeof window !== 'undefined') {
      const savedUrl = localStorage.getItem('atalaia_last_login_url');
      if (savedUrl && (savedUrl.startsWith('/logincliente') || savedUrl.includes('integrator='))) {
        targetUrl = savedUrl;
      }
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('atalaia_last_login_url', targetUrl);
      if (integratorId) {
        localStorage.setItem('atalaia_last_client_integrator_id', integratorId);
      }
    }

    logout();
    navigate(targetUrl, { replace: true });
  };

  const roleNames: Record<string, string> = {
    ADMIN: 'Administrador',
    INTEGRATOR: 'Empresa Integradora',
    SCR: 'Motovigia',
    RESIDENT: 'Cliente'
  };

  const NavItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => {
    const isActive = location.pathname === to;
    const isChat = to === '/chat';
    const hasUnread = isChat && unreadChatCount > 0 && location.pathname !== '/chat';

    return (
      <Link
        to={to}
        onClick={() => setSidebarOpen(false)}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative ${
          isActive 
            ? 'bg-atalaia-neon/10 text-atalaia-neon border border-atalaia-neon/20 shadow-[0_0_15px_rgba(0,255,102,0.1)]' 
            : hasUnread
              ? 'text-white bg-atalaia-neon/10 border border-atalaia-neon/40 shadow-[0_0_15px_rgba(0,255,102,0.2)]'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <div className="relative shrink-0">
          <Icon size={20} className={isActive ? 'text-atalaia-neon' : hasUnread ? 'text-atalaia-neon' : 'text-gray-500 group-hover:text-white'} />
          {hasUnread && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-atalaia-neon opacity-80" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-atalaia-neon shadow-[0_0_8px_rgba(0,255,102,1)]" />
            </span>
          )}
        </div>
        <span className="font-medium flex-1 truncate">{label}</span>
        {hasUnread && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-atalaia-neon text-black shadow-[0_0_10px_rgba(0,255,102,0.8)] animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
            {unreadChatCount > 1 ? `${unreadChatCount} novas` : '1 nova'}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-[#010101] text-gray-100 flex overflow-hidden">
      {blockedModalOpen && renderBlockedModal()}
      {/* Sidebar Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/90 z-40 lg:hidden backdrop-blur-md"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 bg-[#040404] border-r border-atalaia-border
        transform transition-transform duration-300 ease-in-out flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-5 border-b border-atalaia-border space-y-3">
          {/* LOGOTIPOS EM CO-BRANDING JUNTOS NO TOPO */}
          <div className="flex items-center justify-between gap-2">
            <Link to="/" className="flex items-center gap-2 group transition-opacity hover:opacity-80">
              <div className="w-9 h-9 rounded-lg bg-atalaia-neon flex items-center justify-center shadow-[0_0_15px_rgba(0,255,102,0.3)] group-hover:scale-105 transition-transform">
                <ShieldCheck className="text-black" size={22} />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight text-white group-hover:text-atalaia-neon transition-colors leading-none">ServCam</h1>
                <p className="text-[8px] text-gray-400 font-mono uppercase tracking-[0.1em]">By Alien Sistemas</p>
              </div>
            </Link>
          </div>

          {partnerName && (
            <div className="px-3 py-2.5 rounded-xl bg-atalaia-neon/5 border border-atalaia-neon/20 flex items-center justify-between gap-2 animate-in fade-in duration-300">
              <div className="flex items-center gap-2.5 min-w-0">
                {partnerLogo && (partnerLogo.startsWith('http') || partnerLogo.startsWith('data:')) ? (
                  <img referrerPolicy="no-referrer" src={partnerLogo} alt={partnerName} className="w-6 h-6 rounded-md object-square bg-zinc-800 shrink-0" />
                ) : (
                  <div className="w-6 h-6 rounded-md bg-atalaia-neon/20 border border-atalaia-neon/30 flex items-center justify-center text-[10px] font-black text-atalaia-neon shrink-0">
                    {partnerName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider block leading-none mb-0.5">
                    {user?.role === UserRole.INTEGRATOR || (user?.email && user.email.toLowerCase().includes('integrador')) ? 'Empresa Integradora' : 'Integradora'}
                  </span>
                  <span className="text-xs font-extrabold text-white truncate block" title={partnerName}>
                    {partnerName}
                  </span>
                </div>
              </div>
              {partnerWaUrl && (
                <a
                  href={partnerWaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-black text-[10px] font-black uppercase tracking-wider shadow-[0_0_10px_rgba(37,211,102,0.3)] hover:scale-105 transition-all"
                  title={`Chamar no WhatsApp (${partnerPhone})`}
                >
                  <MessageSquare size={12} fill="currentColor" />
                  <span>WhatsApp</span>
                </a>
              )}
            </div>
          )}

          {user?.secondaryNeighborhoodId && user?.role !== UserRole.INTEGRATOR && (
            <div className="mt-4 p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-1.5 animate-in fade-in duration-300">
              <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest pl-0.5 block flex items-center gap-1">
                🌐 Visualizando Sistema:
              </span>
              <select 
                value={activeNeighborhoodId || user?.neighborhoodId}
                onChange={(e) => switchNeighborhood?.(e.target.value)}
                className="w-full h-9 bg-black border border-white/10 rounded-lg px-2 text-xs text-atalaia-neon focus:outline-none focus:border-atalaia-neon/50 cursor-pointer font-bold font-sans uppercase"
              >
                <option value={user?.primaryNeighborhoodId || user?.neighborhoodId}>
                  🏡 {neighborhoods.find(h => h.id === (user?.primaryNeighborhoodId || user?.neighborhoodId))?.name || 'Sistema Principal'}
                </option>
                <option value={user?.secondaryNeighborhoodId}>
                  🏢 {neighborhoods.find(h => h.id === user?.secondaryNeighborhoodId)?.name || 'Sistema Secundário'}
                </option>
              </select>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">

          <div className="mb-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Principal
          </div>
          
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
          
          <NavItem 
            to="/chat" 
            icon={MessageCircle} 
            label={user?.role === UserRole.RESIDENT ? "Chat com Integrador" : (user?.role === UserRole.INTEGRATOR ? "Chat com Clientes" : "Chat")} 
          />

          <div className="mt-8 mb-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Monitoramento
          </div>
          
          <NavItem to="/cameras" icon={Camera} label="Gestão de Câmeras" />
          
          {(user?.role === UserRole.INTEGRATOR || user?.role === UserRole.ADMIN) && (
             <NavItem 
               to="/integrator/users" 
               icon={Users} 
               label={user.role === UserRole.ADMIN ? "Gestão Geral do Sistema" : "Gestão de Clientes"} 
             />
          )}

          {user?.role === UserRole.ADMIN && (
             <>
               <NavItem to="/admin/whatsapp" icon={MessageSquare} label="Central WhatsApp" />
               <NavItem to="/admin/financial" icon={DollarSign} label="Financeiro" />
             </>
          )}

          <div className="mt-8 mb-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Comunidade
          </div>

          {(user?.role === UserRole.ADMIN || user?.role === UserRole.INTEGRATOR) && (
            <NavItem to="/map" icon={MapIcon} label="Mapa de Câmeras" />
          )}
          <NavItem to="/profile" icon={UserIcon} label="Meu Perfil" />
          
          {/* New Help Section */}
          <div className="mt-8 mb-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Ajuda & Legal
          </div>
          <NavItem to="/politica-imagens" icon={Scale} label="Política de Imagens" />

        </nav>

        <div className="p-4 border-t border-atalaia-border">
          <Link to="/profile" className="flex items-center gap-3 px-4 py-3 mb-2 hover:bg-white/5 rounded-lg transition-colors group">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-atalaia-accent to-blue-600 p-[2px]">
                {user?.photoUrl ? (
                    <img src={user.photoUrl} alt="Profile" className="w-full h-full rounded-full object-cover bg-black" />
                ) : (
                    <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-xs font-bold text-white">
                        {user?.name.charAt(0)}
                    </div>
                )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate group-hover:text-atalaia-neon transition-colors">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate capitalize">
                {user?.role ? roleNames[user.role] : ''}
              </p>
            </div>
          </Link>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            Sair do Sistema
          </button>

          <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2 px-1">
            <Server size={12} className="text-atalaia-neon shrink-0 opacity-70" />
            <p className="text-[10px] text-zinc-500 font-mono leading-tight">
              Servidores <span className="text-zinc-400 font-semibold">ServCam</span> • <span className="text-zinc-400">Alien Seg. Eletrônica</span>
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 bg-[#040404] border-b border-atalaia-border flex items-center px-4 justify-between z-30">
          {/* LOGOTIPO MÓVEL CLICÁVEL COM CO-BRANDING */}
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0">
               <ShieldCheck className="text-atalaia-neon" size={20} />
               <div className="flex flex-col">
                <span className="font-bold text-sm tracking-tight leading-none">ServCam</span>
                <span className="text-[8px] text-gray-400 font-mono uppercase tracking-[0.1em]">By Alien Sistemas</span>
             </div>
            </Link>
            {partnerName && (
              <div className="flex items-center gap-1.5 animate-in fade-in duration-300">
                <span className="text-zinc-600 text-[9px] hidden sm:inline">🤝</span>
                <div className="flex items-center gap-1 bg-white/5 border border-atalaia-neon/30 px-2 py-0.5 rounded-lg">
                   {partnerLogo && (partnerLogo.startsWith('http') || partnerLogo.startsWith('data:')) ? (
                     <img referrerPolicy="no-referrer" src={partnerLogo} alt={partnerName} className="w-4 h-4 rounded object-square bg-zinc-800" />
                   ) : null}
                   <span className="text-[9px] font-bold text-atalaia-neon max-w-[95px] truncate uppercase" title={partnerName}>{partnerName}</span>
                </div>
                {partnerWaUrl && (
                  <a
                    href={partnerWaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-black text-[9px] font-black uppercase tracking-wider shadow-[0_0_8px_rgba(37,211,102,0.3)] hover:scale-105 transition-all shrink-0"
                    title={`Chamar no WhatsApp (${partnerPhone})`}
                  >
                    <MessageSquare size={10} fill="currentColor" />
                    <span className="hidden sm:inline">WhatsApp</span>
                  </a>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Chat Access with Pulsing & Blinking Beacon */}
            <Link
              to="/chat"
              className="relative p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
              title="Chat"
            >
              <MessageCircle size={18} className={unreadChatCount > 0 && location.pathname !== '/chat' ? 'text-atalaia-neon' : 'text-gray-400'} />
              {unreadChatCount > 0 && location.pathname !== '/chat' && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-atalaia-neon opacity-90" />
                  <span className="relative inline-flex items-center justify-center rounded-full h-3.5 w-3.5 bg-atalaia-neon shadow-[0_0_8px_rgba(0,255,102,1)] border border-black text-[8px] font-black text-black">
                    {unreadChatCount}
                  </span>
                </span>
              )}
            </Link>

            <button onClick={() => setSidebarOpen(true)} className="p-2 text-gray-400 hover:text-white cursor-pointer">
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-8 relative bg-[#010101]">
            {/* Background Effects */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-atalaia-accent/5 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-atalaia-neon/3 rounded-full blur-[100px]" />
            </div>
            
            <div className="relative z-10">
                 {children}
            </div>
        </main>
      </div>

      {/* Floating Pulsing & Blinking Unread Chat Popup */}
      <ChatNotificationPopup />
    </div>
  );
};

export default Layout;
