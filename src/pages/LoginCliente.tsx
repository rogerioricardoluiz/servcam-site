import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/auth/context';
import { UserRole, Neighborhood, UserPlan, User } from '@/types';
import { Button, Input, Card } from '@/components/UI';
import { 
  ShieldCheck, 
  ArrowLeft, 
  AlertCircle, 
  MapPin, 
  CheckCircle, 
  RefreshCw, 
  Loader2, 
  Sparkles, 
  Search, 
  Building, 
  Phone, 
  Check, 
  Lock, 
  Mail, 
  User as UserIcon,
  ChevronDown
} from 'lucide-react';
import { MockService } from '@/services/mockService';
import { SessionService } from '@/services/sessionService';
import { supabase, isRealSupabase } from '@/lib/supabaseClient';

const LoginCliente: React.FC = () => {
  const { login, isAuthenticated, user, loading: authLoading, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Mode: login or register
  const [isRegister, setIsRegister] = useState(searchParams.get('mode') === 'register');
  const [integrators, setIntegrators] = useState<User[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [selectedIntegratorId, setSelectedIntegratorId] = useState<string>('');
  const [showIntegratorModal, setShowIntegratorModal] = useState<boolean>(false);
  const [integratorSearch, setIntegratorSearch] = useState<string>('');

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [selectedNeighborhoodId, setSelectedNeighborhoodId] = useState('');

  // Status
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Recovery Password states
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Parse RGB helper
  const parseRgbString = (input?: string | null): string => {
    if (!input || !input.trim()) return '0, 255, 102';
    let s = input.trim().replace(/^rgb\(|\)$/gi, '').trim();
    if (s.startsWith('#')) {
      const hex = s.substring(1);
      if (hex.length === 3) {
        const r = parseInt(hex[0] + hex[0], 16);
        const g = parseInt(hex[1] + hex[1], 16);
        const b = parseInt(hex[2] + hex[2], 16);
        if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return `${r}, ${g}, ${b}`;
      } else if (hex.length >= 6) {
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
    return '0, 255, 102';
  };

  // Carrega integradores e bairros
  useEffect(() => {
    const loadData = async () => {
      try {
        const [ints, hoods] = await Promise.all([
          MockService.getIntegrators(),
          MockService.getNeighborhoods(false)
        ]);
        setIntegrators(ints);
        setNeighborhoods(hoods);

        // Pre-seleção do integrador:
        // 1. Via query param ?integrator=... ou ?empresa=...
        const paramId = searchParams.get('integrator') || searchParams.get('int');
        const paramEmpresa = searchParams.get('empresa');

        let matchedInt = null;
        if (paramId) {
          const p = paramId.toLowerCase().trim();
          matchedInt = ints.find(i => 
            i.id === paramId || 
            (i.customSlug && i.customSlug.toLowerCase() === p) ||
            i.id.toLowerCase() === p ||
            (p.includes('alien') && (
              i.id.toLowerCase().includes('alien') ||
              i.id === 'a11e9920-6765-4f81-b454-e6778b77ee66' ||
              (i.companyName && i.companyName.toLowerCase().includes('alien')) ||
              (i.name && i.name.toLowerCase().includes('alien'))
            )) ||
            (p === 'a11e9920-6765-4f81-b454-e6778b77ee66' && (
              i.id === 'a11e9920-6765-4f81-b454-e6778b77ee66' ||
              i.id === 'alienmonitoramento-integrator-id' ||
              (i.companyName && i.companyName.toLowerCase().includes('alien'))
            ))
          );
        }
        if (!matchedInt && paramEmpresa) {
          const q = paramEmpresa.toLowerCase();
          matchedInt = ints.find(i => 
            (i.companyName && i.companyName.toLowerCase().includes(q)) ||
            (i.name && i.name.toLowerCase().includes(q))
          );
        }
        // 2. Via localStorage (último integrador do cliente salvo)
        if (!matchedInt && typeof window !== 'undefined') {
          const storedId = localStorage.getItem('atalaia_last_client_integrator_id');
          if (storedId) {
            matchedInt = ints.find(i => 
              i.id === storedId || 
              (i.customSlug && i.customSlug === storedId) ||
              (storedId.includes('alien') && (i.id.includes('alien') || i.id === 'a11e9920-6765-4f81-b454-e6778b77ee66'))
            );
          }
        }
        // 3. Fallback para primeiro integrador disponível
        if (!matchedInt && ints.length > 0) {
          matchedInt = ints[0];
        }

        if (matchedInt) {
          setSelectedIntegratorId(matchedInt.id);
          const effectiveParam = matchedInt.customSlug || matchedInt.id;
          if (typeof window !== 'undefined') {
            localStorage.setItem('atalaia_last_client_integrator_id', matchedInt.id);
            localStorage.setItem('atalaia_last_login_url', `/logincliente?integrator=${effectiveParam}`);
          }
          // Associa apenas bairro explicitamente vinculado a esse integrador
          const linkedHood = hoods.find(h => h.integratorId === matchedInt!.id);
          if (linkedHood) {
            setSelectedNeighborhoodId(linkedHood.id);
          } else {
            setSelectedNeighborhoodId('');
          }
        }
      } catch (e) {
        console.error("[LoginCliente] Erro ao carregar dados:", e);
      }
    };
    loadData();
  }, [searchParams]);

  // Obtém o integrador ativo selecionado
  const activeIntegrator = integrators.find(i => i.id === selectedIntegratorId) || integrators[0] || null;

  // Resolve a cor RGB do integrador ativo
  const activeCustomRgb = (() => {
    if (!activeIntegrator) return '0, 255, 102';
    let rgb: string | null | undefined = activeIntegrator.customRgb;
    if (!rgb && typeof window !== 'undefined') {
      rgb = localStorage.getItem(`atalaia_integrator_custom_rgb_${activeIntegrator.id}`);
      if (!rgb) {
        try {
          const colorsMap = JSON.parse(localStorage.getItem('atalaia_integrator_colors') || '{}');
          rgb = colorsMap[activeIntegrator.id];
        } catch (_) {}
      }
      if (!rgb) {
        try {
          const cached = localStorage.getItem(`atalaia_local_profile_${activeIntegrator.id}`);
          if (cached) {
            const p = JSON.parse(cached);
            rgb = p.customRgb;
          }
        } catch (_) {}
      }
    }
    return parseRgbString(rgb);
  })();

  // Injeta estilos dinâmicos baseados na cor RGB da integradora exclusivamente para esta página
  useEffect(() => {
    let styleEl = document.getElementById('login-cliente-custom-rgb') as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'login-cliente-custom-rgb';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
      :root {
        --client-rgb: ${activeCustomRgb};
      }
      header { display: none !important; }
      .client-neon-text {
        color: rgb(${activeCustomRgb}) !important;
      }
      .client-neon-bg {
        background-color: rgb(${activeCustomRgb}) !important;
      }
      .client-neon-border {
        border-color: rgb(${activeCustomRgb}) !important;
      }
      .client-neon-glow {
        box-shadow: 0 0 20px rgba(${activeCustomRgb}, 0.25) !important;
      }
      .client-neon-glow-lg {
        box-shadow: 0 0 35px rgba(${activeCustomRgb}, 0.35) !important;
      }
    `;
    return () => {
      document.getElementById('login-cliente-custom-rgb')?.remove();
    };
  }, [activeCustomRgb]);

  // Update favicon and title
  useEffect(() => {
    if (activeIntegrator) {
      document.title = activeIntegrator.companyName || activeIntegrator.name || 'Sistema';
      const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link');
      link.type = 'image/x-icon';
      link.rel = 'shortcut icon';
      link.href = activeIntegrator.companyLogo || '/favicon.ico';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
  }, [activeIntegrator]);

  // Redireciona se autenticado
  useEffect(() => {
    if (isAuthenticated && user) {
      const redirectUrl = searchParams.get('redirect');
      if (redirectUrl && redirectUrl.startsWith('/')) {
        navigate(redirectUrl);
      } else {
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, user, navigate, searchParams]);

  // Lista de bairros filtrada para a integradora ativa (exclusivamente seus sistemas)
  const filteredNeighborhoods = activeIntegrator
    ? neighborhoods.filter(h => h.integratorId === activeIntegrator.id)
    : neighborhoods;

  const handleSelectIntegrator = (intId: string) => {
    setSelectedIntegratorId(intId);
    setShowIntegratorModal(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('atalaia_last_client_integrator_id', intId);
    }
    const chosen = integrators.find(i => i.id === intId);
    if (chosen) {
      const linkedHood = neighborhoods.find(h => h.integratorId === intId);
      if (linkedHood) {
        setSelectedNeighborhoodId(linkedHood.id);
      } else {
        setSelectedNeighborhoodId('');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!name.trim()) throw new Error('Por favor, informe seu nome completo.');
        if (!email.trim()) throw new Error('Por favor, informe seu e-mail.');
        if (!password.trim()) throw new Error('Por favor, defina uma senha de acesso.');
        if (!address.trim()) throw new Error('Por favor, informe seu endereço completo.');

        // Efetua registro com role RESIDENT (Cliente)
        const defaultHoodId = filteredNeighborhoods[0]?.id || neighborhoods[0]?.id || 'hood-demo-1';
        await login(email.trim(), password, UserRole.RESIDENT, name.trim(), defaultHoodId, phone.trim(), 'PREMIUM');

        // Atualiza endereço completo no perfil recém-criado
        try {
          await updateProfile({ address: address.trim() });
        } catch (_) {}

        // Vincula o novo cliente diretamente à empresa integradora escolhida
        if (activeIntegrator) {
          const intName = activeIntegrator.companyName || activeIntegrator.razaoSocial || activeIntegrator.name;
          await MockService.linkUserIntegratorByEmail(email.trim(), activeIntegrator.id, intName);
          if (typeof window !== 'undefined') {
            localStorage.setItem('atalaia_last_client_integrator_id', activeIntegrator.id);
            localStorage.setItem('atalaia_last_login_url', `/logincliente?integrator=${activeIntegrator.id}`);
            try {
              const rawLinks = localStorage.getItem('atalaia_user_integrators');
              const parsedLinks = rawLinks ? JSON.parse(rawLinks) : {};
              if (user?.id) {
                parsedLinks[user.id] = { integratorId: activeIntegrator.id, integratorName: intName };
                localStorage.setItem('atalaia_user_integrators', JSON.stringify(parsedLinks));
              }
            } catch (_) {}
          }
        }

        setSuccess('Cadastro realizado com sucesso! Redirecionando para seu painel...');
        setTimeout(() => navigate('/dashboard'), 1200);
      } else {
        // Modo Login
        if (!email.trim()) throw new Error('Por favor, informe seu e-mail.');
        if (!password.trim()) throw new Error('Por favor, informe sua senha.');

        // Realiza login
        const loginPromise = login(email.trim(), password);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Tempo limite excedido. Verifique sua conexão e tente novamente.')), 15000)
        );

        await Promise.race([loginPromise, timeoutPromise]);

        // Vincula e armazena integrador ativo
        if (activeIntegrator && typeof window !== 'undefined') {
          localStorage.setItem('atalaia_last_client_integrator_id', activeIntegrator.id);
          localStorage.setItem('atalaia_last_login_url', `/logincliente?integrator=${activeIntegrator.id}`);
          const intName = activeIntegrator.companyName || activeIntegrator.razaoSocial || activeIntegrator.name;
          MockService.linkUserIntegratorByEmail(email.trim(), activeIntegrator.id, intName).catch(() => {});
        }

        setSuccess('Acesso autorizado! Carregando painel...');
        setTimeout(() => {
          navigate('/dashboard');
        }, 800);
      }
    } catch (err: any) {
      console.error("[LoginCliente] Erro:", err);
      setError(err.message || 'Dados inválidos ou erro de conexão.');
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Por favor, informe seu e-mail cadastrado.');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!isRealSupabase) {
        setSuccess('Instruções de recuperação simuladas com sucesso no ambiente de demonstração!');
        setResetSent(true);
        setLoading(false);
        return;
      }
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/#/reset-password`
      });
      if (resetErr) throw resetErr;
      setSuccess('E-mail de recuperação enviado com sucesso! Verifique sua caixa de entrada.');
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar e-mail de recuperação.');
    } finally {
      setLoading(false);
    }
  };

  const companyDisplayName = activeIntegrator?.companyName || activeIntegrator?.razaoSocial || activeIntegrator?.name || 'Empresa Integradora';
  const companyLogo = activeIntegrator?.companyLogo;
  const companyPhone = activeIntegrator?.phone;

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col justify-between relative overflow-hidden selection:bg-white selection:text-black font-sans">
      {/* Dynamic Background Glows configured with integrator RGB */}
      <div 
        className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-[120px] pointer-events-none opacity-20 transition-all duration-700"
        style={{ backgroundColor: `rgb(${activeCustomRgb})` }}
      />
      <div 
        className="absolute top-1/2 -right-40 w-96 h-96 rounded-full blur-[140px] pointer-events-none opacity-15 transition-all duration-700"
        style={{ backgroundColor: `rgb(${activeCustomRgb})` }}
      />
      <div 
        className="absolute -bottom-40 left-1/3 w-96 h-96 rounded-full blur-[130px] pointer-events-none opacity-10 transition-all duration-700"
        style={{ backgroundColor: `rgb(${activeCustomRgb})` }}
      />

      {/* TOP BAR / NAVIGATION */}
      {/* TOP BAR / NAVIGATION - REMOVED */}
      <header className="w-full px-6 py-4 flex items-center justify-between border-b border-white/5 relative z-10 backdrop-blur-md bg-black/40 hidden">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Voltar ao Início</span>
        </Link>

        {/* INTEGRATOR SWITCHER BADGE */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowIntegratorModal(true)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-white/10 hover:border-white/30 bg-black/60 backdrop-blur-sm transition-all cursor-pointer group"
            title="Clique para alternar a Empresa Integradora"
          >
            <span 
              className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse"
              style={{ backgroundColor: `rgb(${activeCustomRgb})` }}
            />
            <span className="text-xs font-bold text-zinc-300 group-hover:text-white transition-colors flex items-center gap-1.5">
              <Building size={13} style={{ color: `rgb(${activeCustomRgb})` }} />
              {companyDisplayName}
            </span>
            <ChevronDown size={14} className="text-zinc-500 group-hover:text-white transition-colors" />
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 relative z-10 my-4">
        <div className="w-full max-w-md">
          {/* AUTH CARD */}
          <Card 
            className="p-6 sm:p-8 border bg-[#0a0a0a]/90 backdrop-blur-xl relative overflow-hidden transition-all duration-300"
            style={{ 
              borderColor: `rgba(${activeCustomRgb}, 0.25)`,
              boxShadow: `0 8px 32px rgba(0, 0, 0, 0.6), 0 0 25px rgba(${activeCustomRgb}, 0.08)`
            }}
          >
            {/* Top Accent line in chosen RGB */}
            <div 
              className="absolute top-0 inset-x-0 h-1.5 transition-all"
              style={{ backgroundColor: `rgb(${activeCustomRgb})` }}
            />

            {/* INTEGRATOR FULL-WIDTH BANNER LOGO */}
            <div className="mb-6 pt-2 pb-5 border-b border-white/10 text-center flex flex-col items-center">
              {companyLogo ? (
                <div className="w-24 h-24 mx-auto flex items-center justify-center bg-black/60 rounded-xl border border-white/10 mb-3 overflow-hidden shadow-inner">
                  <img 
                    src={companyLogo} 
                    alt={companyDisplayName} 
                    className="w-full h-full object-cover filter drop-shadow" 
                  />
                </div>
              ) : (
                <div 
                  className="w-full h-16 rounded-xl border flex items-center justify-center font-black text-xl text-black mb-3 shadow-lg"
                  style={{ backgroundColor: `rgb(${activeCustomRgb})` }}
                >
                  {companyDisplayName}
                </div>
              )}
              <h2 className="text-xl font-black text-white tracking-wide uppercase">
                {companyDisplayName}
              </h2>
              <span className="text-xs font-mono text-zinc-300 mt-1">
                Portal de Monitoramento & Câmeras
              </span>
            </div>

            {/* TAB SELECTOR: LOGIN / REGISTER */}
            {!isForgotPassword && (
              <div className="grid grid-cols-2 p-1 bg-black/60 border border-white/10 rounded-xl mb-6">
                <button
                  type="button"
                  onClick={() => { setIsRegister(false); setError(''); setSuccess(''); }}
                  className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    !isRegister 
                      ? 'text-black shadow-md' 
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  style={!isRegister ? { backgroundColor: `rgb(${activeCustomRgb})` } : {}}
                >
                  Entrar na Conta
                </button>
                <button
                  type="button"
                  onClick={() => { setIsRegister(true); setError(''); setSuccess(''); }}
                  className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    isRegister 
                      ? 'text-black shadow-md' 
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  style={isRegister ? { backgroundColor: `rgb(${activeCustomRgb})` } : {}}
                >
                  Criar Conta de Cliente
                </button>
              </div>
            )}

            {/* ERROR / SUCCESS ALERTS */}
            {error && (
              <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2.5 text-red-400 text-xs animate-in fade-in">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div 
                className="mb-5 p-3.5 rounded-xl flex items-center gap-2.5 text-xs animate-in fade-in"
                style={{ 
                  backgroundColor: `rgba(${activeCustomRgb}, 0.12)`, 
                  borderColor: `rgba(${activeCustomRgb}, 0.3)`,
                  color: `rgb(${activeCustomRgb})`
                }}
              >
                <CheckCircle size={16} className="shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* FORGOT PASSWORD FORM */}
            {isForgotPassword ? (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div className="text-center mb-4">
                  <h2 className="text-lg font-bold text-white">Recuperação de Senha</h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Informe seu e-mail cadastrado para receber as instruções de redefinição.
                  </p>
                </div>

                <Input
                  label="E-mail Cadastrado"
                  type="email"
                  placeholder="seuemail@exemplo.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 text-black font-black uppercase text-xs tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                  style={{ 
                    backgroundColor: `rgb(${activeCustomRgb})`,
                    boxShadow: `0 4px 15px rgba(${activeCustomRgb}, 0.3)`
                  }}
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : 'Enviar Link de Recuperação'}
                </Button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => { setIsForgotPassword(false); setError(''); setSuccess(''); }}
                    className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Voltar ao login
                  </button>
                </div>
              </form>
            ) : (
              /* LOGIN OR REGISTER FORM */
              <form onSubmit={handleSubmit} className="space-y-4">
                {isRegister && (
                  <>
                    <Input
                      label="Nome Completo"
                      type="text"
                      placeholder="Ex: João da Silva"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                    />

                    <Input
                      label="Endereço Completo"
                      type="text"
                      placeholder="Ex: Rua Principal, 123 - Bairro - Cidade/UF"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      required
                    />

                    <Input
                      label="WhatsApp / Telefone"
                      type="tel"
                      placeholder="(00) 00000-0000"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                    />
                  </>
                )}

                <Input
                  label="E-mail de Acesso"
                  type="email"
                  placeholder="cliente@exemplo.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-gray-300 uppercase tracking-wider font-mono">
                      Senha
                    </label>
                    {!isRegister && (
                      <button
                        type="button"
                        onClick={() => { setIsForgotPassword(true); setError(''); setSuccess(''); }}
                        className="text-[11px] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      >
                        Esqueci minha senha
                      </button>
                    )}
                  </div>
                  <Input
                    type="password"
                    placeholder="Sua senha de segurança"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>

                {/* SUBMIT BUTTON WITH INTEGRATOR RGB COLOR */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 text-black font-black uppercase text-xs tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
                  style={{ 
                    backgroundColor: `rgb(${activeCustomRgb})`,
                    boxShadow: `0 4px 20px rgba(${activeCustomRgb}, 0.35)`
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin text-black" />
                      <span>{isRegister ? 'Criando Conta...' : 'Autenticando...'}</span>
                    </>
                  ) : (
                    <>
                      <Lock size={15} className="text-black" />
                      <span>{isRegister ? 'Cadastrar e Acessar Câmeras' : 'Entrar no Sistema'}</span>
                    </>
                  )}
                </Button>

                {/* VINCULO CONFIRMATION */}
                <div className="pt-3 text-center">
                  <span className="text-[11px] text-zinc-400 flex items-center justify-center gap-1.5">
                    <Check size={12} style={{ color: `rgb(${activeCustomRgb})` }} />
                    Acesso vinculado à integradora: <strong className="text-white">{companyDisplayName}</strong>
                  </span>
                </div>
              </form>
            )}

            {/* WHATSAPP SUPPORT OF THE INTEGRATOR */}
            {companyPhone && (
              <div className="mt-6 pt-5 border-t border-white/5 text-center">
                <a
                  href={`https://wa.me/55${companyPhone.replace(/\D/g, '')}?text=Olá,%20sou%20cliente%20da%20${encodeURIComponent(companyDisplayName)}%20e%20preciso%20de%20ajuda%20para%20acessar%20minhas%20câmeras.`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors"
                >
                  <Phone size={13} style={{ color: `rgb(${activeCustomRgb})` }} />
                  <span>Dúvidas ou suporte? Fale com a <strong>{companyDisplayName}</strong> no WhatsApp</span>
                </a>
              </div>
            )}
          </Card>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full py-4 text-center border-t border-white/5 relative z-10 text-[11px] text-zinc-500">
        <p>ServCam &copy; {new Date().getFullYear()} — Plataforma Autorizada de Monitoramento e Armazenamento em Nuvem.</p>
      </footer>

      {/* MODAL: SELECIONAR EMPRESA INTEGRADORA */}
      {showIntegratorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div 
            className="w-full max-w-lg bg-[#0e0e0e] border rounded-2xl p-6 shadow-2xl relative space-y-4 max-h-[90vh] flex flex-col"
            style={{ borderColor: `rgba(${activeCustomRgb}, 0.3)` }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Building size={18} style={{ color: `rgb(${activeCustomRgb})` }} />
                <h3 className="text-base font-bold text-white">Selecionar Empresa Integradora</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIntegratorModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Escolha a empresa integradora responsável pela instalação ou monitoramento do seu bairro para aplicar as cores e logo correspondentes.
            </p>

            <div className="relative">
              <Search className="absolute left-3.5 top-3.5 text-zinc-500" size={16} />
              <input
                type="text"
                placeholder="Buscar por nome da empresa ou bairro..."
                value={integratorSearch}
                onChange={e => setIntegratorSearch(e.target.value)}
                className="w-full h-11 bg-black border border-white/10 rounded-xl pl-10 pr-4 text-xs text-white placeholder-zinc-600 focus:outline-none transition-all"
                style={{ outlineColor: `rgb(${activeCustomRgb})` }}
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-72">
              {integrators
                .filter(i => {
                  if (!integratorSearch.trim()) return true;
                  const q = integratorSearch.toLowerCase();
                  const cName = (i.companyName || i.razaoSocial || i.name || '').toLowerCase();
                  return cName.includes(q) || (i.email && i.email.toLowerCase().includes(q));
                })
                .map(intUser => {
                  const isCurrent = intUser.id === selectedIntegratorId;
                  const intRgb = parseRgbString(intUser.customRgb);
                  const intName = intUser.companyName || intUser.razaoSocial || intUser.name || 'Integradora';

                  return (
                    <button
                      key={intUser.id}
                      type="button"
                      onClick={() => handleSelectIntegrator(intUser.id)}
                      className={`w-full p-3.5 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                        isCurrent 
                          ? 'bg-zinc-800/80 border-white text-white shadow-md' 
                          : 'bg-black/60 border-white/5 hover:border-white/20 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {intUser.companyLogo ? (
                          <img 
                            src={intUser.companyLogo} 
                            alt={intName} 
                            className="w-10 h-10 rounded-lg object-cover bg-zinc-800 border border-white/10 shrink-0" 
                          />
                        ) : (
                          <div 
                            className="w-10 h-10 rounded-lg border flex items-center justify-center font-bold text-black text-sm shrink-0"
                            style={{ backgroundColor: `rgb(${intRgb})` }}
                          >
                            {intName.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{intName}</span>
                            {isCurrent && (
                              <span 
                                className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded"
                                style={{ backgroundColor: `rgba(${intRgb}, 0.2)`, color: `rgb(${intRgb})` }}
                              >
                                Selecionada
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-400 block font-mono">
                            Cor RGB: rgb({intRgb})
                          </span>
                        </div>
                      </div>

                      <div 
                        className="w-5 h-5 rounded-full border border-white/20 shrink-0"
                        style={{ backgroundColor: `rgb(${intRgb})` }}
                        title={`Cor RGB: rgb(${intRgb})`}
                      />
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginCliente;
