
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/auth/context';
import { UserRole, Neighborhood, UserPlan, Coupon, User } from '@/types';
import { Button, Input, Card } from '@/components/UI';
import { ShieldCheck, ArrowLeft, ArrowRight, CreditCard, AlertCircle, MapPin, CheckCircle, RefreshCw, Loader2, Sparkles, Upload, FileText, Search, Building, X } from 'lucide-react';
import { MockService } from '@/services/mockService';
import { PaymentService } from '@/services/paymentService';
import { SessionService } from '@/services/sessionService';
import { supabase, isRealSupabase } from '@/lib/supabaseClient';
import { motion } from 'motion/react';

const Login: React.FC = () => {
  const { login, isAuthenticated, user, loading: authLoading, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isRegister, setIsRegister] = useState(searchParams.get('mode') === 'register');
  const planParam = searchParams.get('plan');
  const camerasParam = searchParams.get('cameras');
  const retentionParam = searchParams.get('retention');
  const rentalNameParam = searchParams.get('rentalName');
  const aiParam = searchParams.get('ai');
  const cycleParam = searchParams.get('cycle');
  const totalParam = searchParams.get('total');
  const [couponCodeIn, setCouponCodeIn] = useState(searchParams.get('coupon') || '');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.RESIDENT);
  const [selectedNeighborhoodId, setSelectedNeighborhoodId] = useState('');
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [integrators, setIntegrators] = useState<User[]>([]);
  const [selectedIntegratorId, setSelectedIntegratorId] = useState('');
  const [integratorSearch, setIntegratorSearch] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [redirectingToPay, setRedirectingToPay] = useState(false);

  // States to audit concurrent session security
  const [showActiveSessionModal, setShowActiveSessionModal] = useState(false);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [showPromoRedirectModal, setShowPromoRedirectModal] = useState(false);
  const [isManualVerifying, setIsManualVerifying] = useState(false);
  const [promoReceiptName, setPromoReceiptName] = useState('');
  const [promoReceiptBase64, setPromoReceiptBase64] = useState('');

  // Recovery Password states
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    const intParam = searchParams.get('integrator') || searchParams.get('int');
    if (intParam) {
      navigate(`/logincliente?integrator=${intParam}`, { replace: true });
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    const couponUrl = searchParams.get('coupon');
    if (couponUrl) {
      const autoApply = async () => {
        try {
          const res = await MockService.validateCoupon(couponUrl.toUpperCase(), 'temp-register-id');
          if (res.success && res.coupon) {
            setAppliedCoupon(res.coupon);
            console.log(`[Login] Cupom ${res.coupon.code} auto-aplicado via URL.`);
          }
        } catch (err) {
          console.error("Erro ao auto-aplicar coupon da URL:", err);
        }
      };
      autoApply();
    }
  }, [searchParams]);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleApplyCoupon = async () => {
    if (!couponCodeIn.trim()) {
      setCouponError("Por favor, digite o código do cupom.");
      return;
    }
    
    setIsValidating(true);
    setCouponError(null);
    setCouponSuccess(null);
    
    try {
      // Usamos um ID temporário e seguro para simulação se o morador ainda não tiver criado a conta
      const res = await MockService.validateCoupon(couponCodeIn, 'temp-register-id');
      if (res.success && res.coupon) {
        setAppliedCoupon(res.coupon);
        setCouponSuccess(`Cupom ${res.coupon.code} aplicado com sucesso!`);
      } else {
        setAppliedCoupon(null);
        setCouponError(res.message);
      }
    } catch (err) {
      console.error("Erro ao aplicar cupom no cadastro:", err);
      setCouponError("Erro técnico ao validar o cupom.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleManualConfirmPayment = async () => {
      let targetUserId = user?.id;
      if (!targetUserId) {
          const keys = Object.keys(localStorage);
          for (const key of keys) {
              if (key.startsWith('atalaia_local_profile_')) {
                  try {
                      const cached = JSON.parse(localStorage.getItem(key) || '');
                      if (cached && cached.email === email) {
                          targetUserId = cached.id;
                          break;
                      }
                  } catch (e) {}
              }
          }
      }
      
      if (!targetUserId) {
          setError("Perfil de morador não localizado. Faça o login para concluir a ativação.");
          setShowPromoRedirectModal(false);
          return;
      }

      // EXIGIR COMPROVANTE E AVISAR CLIENTE
      if (!promoReceiptBase64) {
          setError("Por favor, anexe o comprovante de pagamento antes de prosseguir.");
          return;
      }

      setIsManualVerifying(true);
      try {
          await new Promise(resolve => setTimeout(resolve, 2000));
          const res = await MockService.manualConfirmPromoTrialPayment(targetUserId, promoReceiptName, promoReceiptBase64);
          if (res.success) {
              setSuccess("Parabéns! Seu Plano Família de teste por R$ 5,00 foi ativado com sucesso!");
              setShowPromoRedirectModal(false);
              window.location.href = '/#/dashboard';
              window.location.reload();
          } else {
              throw new Error(res.message);
          }
      } catch (error: any) {
          console.error("Erro ao validar pagamento de R$ 5,00 no cadastro:", error);
          setError(error.message || "Não foi possível validar o pagamento de R$ 5,00.");
          setIsManualVerifying(false);
      }
  };

  // Monitora se o usuário foi autenticado para redirecionar
  useEffect(() => {
    if (isAuthenticated && user) {
       const redirectUrl = searchParams.get('redirect');
       if (redirectUrl && redirectUrl.startsWith('/')) {
         console.log("[Login] Autenticação confirmada, redirecionando para:", redirectUrl);
         navigate(redirectUrl);
       } else {
         console.log("[Login] Autenticação confirmada, navegando para dashboard...");
         navigate('/dashboard');
       }
    }
  }, [isAuthenticated, user, navigate, searchParams]);

  useEffect(() => {
      const loadHoodsAndIntegrators = async () => {
          try {
              const [hoods, ints] = await Promise.all([
                  MockService.getNeighborhoods(false),
                  MockService.getIntegrators()
              ]);
              setNeighborhoods(hoods);
              setIntegrators(ints);

              const paramId = searchParams.get('integrator') || searchParams.get('int');
              if (paramId) {
                  setSelectedIntegratorId(paramId);
                  const linkedHood = hoods.find(h => h.integratorId === paramId);
                  if (linkedHood) setSelectedNeighborhoodId(linkedHood.id);
              } else if (hoods.length > 0 && !selectedNeighborhoodId) {
                  setSelectedNeighborhoodId(hoods[0].id);
                  if (hoods[0].integratorId) {
                      setSelectedIntegratorId(hoods[0].integratorId);
                  }
              }
          } catch (e) {
              console.error("Erro ao carregar bairros e integradoras", e);
          }
      };
      loadHoodsAndIntegrators();
  }, []);

  // Detecta marca e dados personalizados do integrador
  const paramIntegratorId = searchParams.get('integrator') || searchParams.get('int');
  const paramEmpresa = searchParams.get('empresa') || searchParams.get('company');
  const paramName = searchParams.get('name');
  const paramLogo = searchParams.get('logo');

  const matchedIntegrator = integrators.find(i => 
      (paramIntegratorId && (i.id === paramIntegratorId || i.id.toLowerCase().includes(paramIntegratorId.toLowerCase()))) ||
      (paramEmpresa && (
          (i.companyName && i.companyName.toLowerCase().includes(paramEmpresa.toLowerCase())) ||
          (i.name && i.name.toLowerCase().includes(paramEmpresa.toLowerCase()))
      ))
  ) || null;

  const customIntegratorName = paramName || paramEmpresa || matchedIntegrator?.companyName || matchedIntegrator?.name || null;
  const customIntegratorLogo = paramLogo || matchedIntegrator?.companyLogo || null;

  // Atualiza título da aba do navegador (ao lado do favicon) e o próprio favicon com o logo do integrador
  useEffect(() => {
      if (customIntegratorName) {
          document.title = `${customIntegratorName} | Acesso ao Painel`;
      }
      if (customIntegratorLogo) {
          const link = (document.querySelector("link[rel*='icon']") as HTMLLinkElement) || document.createElement('link');
          link.type = 'image/x-icon';
          link.rel = 'shortcut icon';
          link.href = customIntegratorLogo;
          document.getElementsByTagName('head')[0].appendChild(link);
      }
  }, [customIntegratorName, customIntegratorLogo]);

  const filteredIntegrators = integrators.filter(intUser => {
      if (!integratorSearch.trim()) return true;
      const q = integratorSearch.toLowerCase().trim();
      const compName = (intUser.companyName || intUser.razaoSocial || intUser.name || '').toLowerCase();
      const emailStr = (intUser.email || '').toLowerCase();
      const phoneStr = (intUser.phone || '').toLowerCase();
      const linkedHoodNames = neighborhoods
          .filter(h => h.integratorId === intUser.id)
          .map(h => h.name.toLowerCase())
          .join(' ');
      return compName.includes(q) || emailStr.includes(q) || phoneStr.includes(q) || linkedHoodNames.includes(q);
  });

  const handleSelectIntegratorInRegister = (intId: string) => {
      setSelectedIntegratorId(intId);
      if (intId) {
          const linkedHood = neighborhoods.find(h => h.integratorId === intId);
          if (linkedHood) {
              setSelectedNeighborhoodId(linkedHood.id);
          } else {
              setSelectedNeighborhoodId('');
          }
      }
  };

  const neighborhoodsForRegister = selectedIntegratorId
      ? neighborhoods.filter(h => h.integratorId === selectedIntegratorId)
      : neighborhoods;

  const handleSubmit = async (e?: React.FormEvent | boolean, forceBypass = false) => {
    let actualBypass = forceBypass;
    if (typeof e === 'boolean') {
      actualBypass = e;
    } else if (e) {
      e.preventDefault();
    }

    if (loading) return;

    setError('');
    setSuccess('');
    setLoading(true);
    
    try {
      if (isRegister) {
          if (!address.trim() && role !== UserRole.ADMIN && role !== UserRole.INTEGRATOR) {
              throw new Error('Por favor, informe seu endereço completo.');
          }
          
          const defaultHoodId = neighborhoods[0]?.id || 'hood-demo-1';
          await login(
              email, 
              password, 
              role, 
              name, 
              role === UserRole.INTEGRATOR ? undefined : defaultHoodId, 
              phone, 
              (planParam || 'PREMIUM') as UserPlan
          );

          try {
              await updateProfile({ address: address.trim() });
          } catch (_) {}

          if (role !== UserRole.INTEGRATOR) {
              if (selectedIntegratorId) {
                  const chosenInt = integrators.find(i => i.id === selectedIntegratorId);
                  const chosenIntName = chosenInt ? (chosenInt.companyName || chosenInt.razaoSocial || chosenInt.name) : undefined;
                  await MockService.linkUserIntegratorByEmail(email, selectedIntegratorId, chosenIntName);
              } else if (selectedNeighborhoodId) {
                  const chosenHood = neighborhoods.find(h => h.id === selectedNeighborhoodId);
                  if (chosenHood?.integratorId) {
                      await MockService.linkUserIntegratorByEmail(email, chosenHood.integratorId, chosenHood.integratorName);
                  }
              }
          }

          // Redirecionamento automático para o Checkout Mercado Pago após contratação de câmeras ou planos
          const isCamerasContract = !!camerasParam || planParam === 'CUSTOM';
          const isPaidPlan = planParam && (planParam === 'FAMILY' || planParam === 'PREMIUM' || planParam === 'PROMO' || planParam === 'CUSTOM');

          if (isCamerasContract || isPaidPlan) {
              if (planParam === 'PROMO') {
                  setShowPromoRedirectModal(true);
                  setLoading(false);
                  return;
              }

              setRedirectingToPay(true);
              const activeCouponCode = appliedCoupon ? appliedCoupon.code : undefined;
              const camCount = camerasParam ? parseInt(camerasParam, 10) : 1;
              let calculatedAmount: number | undefined = undefined;

              if (totalParam) {
                  calculatedAmount = parseFloat(totalParam);
              } else if (isCamerasContract) {
                  let unitRate = 24.90;
                  if (camCount <= 10) unitRate = 24.90;
                  else if (camCount <= 20) unitRate = 22.90;
                  else if (camCount <= 30) unitRate = 20.90;
                  else if (camCount <= 50) unitRate = 18.90;
                  else unitRate = 15.90;
                  calculatedAmount = camCount * unitRate;
              } else if (planParam === 'PREMIUM') {
                  calculatedAmount = 49.90;
              } else if (planParam === 'FAMILY') {
                  calculatedAmount = 29.90;
              }

              const checkoutUrl = await PaymentService.createPreference({
                  planId: planParam || (isCamerasContract ? 'CUSTOM' : 'FAMILY'),
                  cameras: camCount,
                  retentionDays: Number(retentionParam) || 3,
                  amount: calculatedAmount,
                  email,
                  name,
                  phone,
                  couponCode: activeCouponCode,
                  title: isCamerasContract 
                    ? `ServCam - Monitoramento ${camCount} ${camCount === 1 ? 'Câmera' : 'Câmeras'} em Nuvem` 
                    : undefined,
                  description: isCamerasContract 
                    ? `Gravação contínua em nuvem 24/7 (3 dias inclusos) - ${camCount} câmeras ativas.` 
                    : undefined
              });

              window.location.href = checkoutUrl;
              return; 
          }

          setSuccess('Cadastro realizado com sucesso!');
          setTimeout(() => navigate('/welcome'), 1000);
      } else {
          // Pre-emptively check for active concurrent sessions with a safety timeout
          if (!actualBypass) {
              try {
                  const checkPromise = SessionService.checkSessionsByEmail(email);
                  const raceTimeout = new Promise<any[]>((_, reject) => 
                      setTimeout(() => reject(new Error('timeout')), 3500)
                  );
                  const existingSess = await Promise.race([checkPromise, raceTimeout]);
                  if (existingSess && existingSess.length > 0) {
                      setActiveSessions(existingSess);
                      setShowActiveSessionModal(true);
                      setLoading(false);
                      return; // interrupt the login to display confirmation prompt
                  }
              } catch (sessError) {
                  console.warn("[Login] Could not pre-screen active sessions safely or timeout hit", sessError);
              }
          }

          // Login via Supabase com Timeout de Segurança
          console.log("[Login] Iniciando tentativa de login para:", email);
          
          const loginPromise = login(email, password);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Tempo limite excedido. Verifique sua conexão ou tente novamente.')), 60000)
          );

          await Promise.race([loginPromise, timeoutPromise]);
          
          console.log("[Login] Login bem-sucedido, redirecionando para dashboard...");
          setSuccess('Acesso autorizado!');
          
          // Redirecionamento explícito
          navigate('/dashboard');
      }
    } catch (err: any) {
        console.error("[Login] Erro capturado:", err);
        setError(err.message || 'Dados inválidos ou erro de conexão com o banco ServCam.');
        setLoading(false); 
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Por favor, informe seu e-mail ou WhatsApp cadastrado.');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const inputStr = email.trim();

      // Se estiver rodando sem banco de dados configurado (Conexão Local de Demonstração Dev):
      if (!isRealSupabase) {
        setSuccess(`[Simulador] Solicitação de recuperação processada via ambiente de demonstração! Instruções enviadas de forma segura.`);
        setResetSent(true);
        setLoading(false);
        return;
      }

      let targetEmail = '';
      let targetPhone = '';
      let userName = '';
      let foundProfile: any = null;

      if (inputStr.includes('@')) {
        targetEmail = inputStr.toLowerCase();
        // Buscar perfil para ver se tem WhatsApp cadastrado de forma clássica
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', targetEmail)
          .maybeSingle();
        if (profile) {
          foundProfile = profile;
          targetPhone = profile.phone || '';
          userName = profile.name || '';
        }
      } else {
        // Tratar como possível telefone digitado pelo usuário
        const cleanPhone = inputStr.replace(/\D/g, '');
        if (cleanPhone.length < 8) {
          throw new Error('Por favor, insira um e-mail válido ou o número do seu WhatsApp com DDD.');
        }

        // Buscar todos os perfis para localizar de forma resiliente, ignorando diferenças de formato
        const { data: profiles, error: queryErr } = await supabase
          .from('profiles')
          .select('*');

        if (queryErr) throw queryErr;

        const matchedProfile = (profiles || []).find((p: any) => {
          if (!p.phone) return false;
          const cleanDbPhone = p.phone.replace(/\D/g, '');
          // Correspondência idêntica ou correspondência nos últimos 8 caracteres para ser imune a prefixo internacional ou DDD digitado diferente
          return cleanDbPhone === cleanPhone ||
                 (cleanDbPhone.length >= 8 && cleanPhone.endsWith(cleanDbPhone.slice(-8))) ||
                 (cleanPhone.length >= 8 && cleanDbPhone.endsWith(cleanPhone.slice(-8)));
        });

        if (!matchedProfile) {
          throw new Error('Nenhum cadastro com esse número de WhatsApp foi localizado no sistema ServCam.');
        }

        foundProfile = matchedProfile;
        targetEmail = matchedProfile.email || '';
        targetPhone = matchedProfile.phone || '';
        userName = matchedProfile.name || '';
      }

      if (!targetEmail) {
        throw new Error('Não conseguimos identificar um e-mail cadastrado associado a essa conta de acesso.');
      }

      // Dispara o reset via Auth do Supabase por segurança
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: `${window.location.origin}/#/reset-password`
      });
      if (resetError) throw resetError;

      // Ofuscar e-mail para feedback visual seguro
      const obscureEmail = (emailStr: string) => {
        const parts = emailStr.split('@');
        if (parts.length !== 2) return emailStr;
        const u = parts[0];
        const d = parts[1];
        if (u.length <= 3) return `${u[0]}***@${d}`;
        return `${u.slice(0, 2)}***${u.slice(-1)}@${d}`;
      };

      const obscured = obscureEmail(targetEmail);
      let waStatus = '';

      // Tenta enviar o WhatsApp via função oficial de disparo de alertas
      if (targetPhone) {
        try {
          const customMsg = `🛡️ *SERVCAM - RECUPERAÇÃO DE ACESSO*\n\nOlá, *${userName || 'Colaborador ServCam'}*!\n\nRecebemos uma solicitação de redefinição de senha para sua credencial de acesso tático ao ServCam.\n\nEnviamos o link de alteração de senha de forma segura para o seu e-mail:\n➡️ *${targetEmail}*\n\nSe você não recebeu o e-mail ou precisa que alteremos seu e-mail de acesso cadastrado, basta responder a esta mensagem diretamente no WhatsApp!\n\nAtenciosamente,\n*Equipe de Suporte ServCam*`;

          await supabase.functions.invoke('send-alert', {
            body: { message: customMsg, numbers: [targetPhone] }
          });

          waStatus = ` E notificamos seu WhatsApp (${targetPhone})!`;
        } catch (waErr) {
          console.error('[ForgotPassword] Failed to send WhatsApp alert:', waErr);
        }
      }

      setSuccess(`Solicitação processada! Código e link enviados com sucesso para ${obscured}.${waStatus}`);
      setResetSent(true);
    } catch (err: any) {
      console.error('[ForgotPassword] Error:', err);
      setError(err.message || 'Erro ao processar sua solicitação de recuperação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#010101] relative overflow-hidden px-4 py-8">
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-atalaia-neon/5 rounded-full blur-[120px]" />
      
      <Card className="w-full max-w-md p-8 border-atalaia-border relative z-10 bg-[#040404]">
        <button 
          onClick={() => {
            if (isForgotPassword) {
              setIsForgotPassword(false);
              setResetSent(false);
              setError('');
              setSuccess('');
            } else {
              navigate('/');
            }
          }}
          className="absolute top-6 left-6 text-gray-500 hover:text-atalaia-neon transition-colors flex items-center gap-2 text-sm font-medium group text-left"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span>Voltar</span>
        </button>

        <div className="text-center mb-8 pt-6">
          {customIntegratorLogo ? (
            <div className="w-24 h-24 mx-auto flex items-center justify-center bg-black/70 rounded-2xl border border-white/10 mb-4 overflow-hidden shadow-[0_0_25px_rgba(0,255,102,0.18)] p-2">
              <img 
                src={customIntegratorLogo} 
                alt={customIntegratorName || 'Logo do Integrador'} 
                className="max-w-full max-h-full object-contain filter drop-shadow"
              />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-atalaia-neon/10 text-atalaia-neon mb-4 shadow-[0_0_20px_rgba(0,255,102,0.15)]">
              <ShieldCheck size={40} />
            </div>
          )}

          <h1 className="text-2xl font-bold text-white tracking-tight">
            {customIntegratorName ? customIntegratorName : (isForgotPassword ? 'Recuperar Acesso' : isRegister ? 'Cadastro de Cliente' : 'Acesso ServCam')}
          </h1>
          <p className="text-gray-400 text-xs tracking-wider uppercase font-semibold mt-1.5">
            {customIntegratorName ? 'Portal do Integrador • Central de Monitoramento' : (
              isForgotPassword 
                ? 'Digite seu e-mail ou WhatsApp (DDD+número) para receber as instruções de recuperação.' 
                : isRegister 
                  ? 'Segurança colaborativa inteligente.' 
                  : 'Entre para monitorar seu sistema.'
            )}
          </p>

          {isRegister && (planParam === 'CUSTOM' || camerasParam) && (
            <div className="mt-4 p-4 bg-emerald-950/40 border border-atalaia-neon/40 rounded-2xl text-xs text-left space-y-2 shadow-[0_0_25px_rgba(0,255,102,0.12)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="text-atalaia-neon shrink-0" size={18} />
                  <p className="text-white font-bold text-sm">Contratação de Câmeras em Nuvem</p>
                </div>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-atalaia-neon text-black font-black uppercase tracking-wider">
                  3 Dias Inclusos
                </span>
              </div>

              <div className="text-gray-300 space-y-1 pt-1">
                <p className="text-xs">
                  <strong>{camerasParam || 1} {Number(camerasParam) === 1 ? 'Câmera Ativa' : 'Câmeras Ativas'}</strong> • Gravação contínua em nuvem 24/7 ServCam
                </p>
                {rentalNameParam && rentalNameParam !== 'Sem Locação (Já possuo câmeras)' && (
                  <p className="text-gray-400 text-[11px]">
                    🛠️ <span className="text-white font-medium">{rentalNameParam}</span> (Garantia e troca inclusa)
                  </p>
                )}
                {aiParam && (
                  <p className="text-gray-400 text-[11px]">
                    🧠 <span className="text-emerald-400 font-medium">IA Aplicada:</span> {aiParam.split(',').join(', ')}
                  </p>
                )}
                {totalParam && (
                  <div className="text-atalaia-neon font-mono font-black text-sm pt-1.5 border-t border-white/10 flex items-center justify-between">
                    <span>Total Mensal Estimado:</span>
                    <span>R$ {totalParam}/mês</span>
                  </div>
                )}
              </div>

              <div className="p-2 bg-black/60 rounded-xl border border-white/5 text-[11px] text-gray-400 flex items-center gap-2">
                <CreditCard size={14} className="text-atalaia-neon shrink-0" />
                <span>Ao finalizar o cadastro, você irá direto para o <strong>Mercado Pago</strong> (PIX, Cartão ou Boleto).</span>
              </div>
            </div>
          )}
        </div>

        {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex flex-col gap-2 text-red-500 text-sm animate-in fade-in duration-300">
                <div className="flex items-center gap-3">
                    <AlertCircle size={20} className="shrink-0" />
                    <span>{error}</span>
                </div>
                {error.includes('fetch') && (
                    <div className="mt-2 p-2 bg-black/40 rounded text-xs text-amber-500 border border-amber-500/20">
                        <strong>Dica:</strong> Para logar utilizando perfis locais pré-configurados:<br/>
                        Email: <code className="bg-white/10 px-1 rounded text-white">admin@atalaia.com</code><br/>
                        Senha: <code className="bg-white/10 px-1 rounded text-white">admin123</code>
                    </div>
                )}
            </div>
        )}

        {success && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3 text-green-500 text-sm animate-in fade-in duration-300">
                <CheckCircle size={20} className="shrink-0" />
                <span>{success}</span>
            </div>
        )}

        {redirectingToPay ? (
            <div className="text-center py-8 space-y-3">
                <RefreshCw size={36} className="animate-spin text-atalaia-neon mx-auto mb-2" />
                <h3 className="text-lg font-bold text-white">Cadastro Realizado com Sucesso!</h3>
                <p className="text-sm text-gray-300">
                  Redirecionando você para o <strong className="text-atalaia-neon">Checkout Seguro do Mercado Pago</strong>...
                </p>
                <p className="text-xs text-gray-500">
                  Pague com PIX (aprovação imediata), Cartão de Crédito ou Boleto Bancário.
                </p>
            </div>
        ) : isForgotPassword ? (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-5">
                <Input 
                    label="E-mail ou WhatsApp Cadastrado" 
                    type="text" 
                    placeholder="ex: rogerio@gmail.com ou 48999999999" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                />
                
                <Button type="submit" className="w-full h-12 text-sm uppercase tracking-wider font-bold mt-6" disabled={loading || resetSent}>
                    {loading ? <><Loader2 className="animate-spin mr-2" /> Enviando...</> : 'Enviar Link & WhatsApp'}
                </Button>

                <div className="text-center mt-4">
                    <button 
                        type="button"
                        onClick={() => {
                            setIsForgotPassword(false);
                            setResetSent(false);
                            setError('');
                            setSuccess('');
                        }}
                        className="text-xs text-atalaia-neon hover:underline transition-colors bg-transparent border-none p-0 cursor-pointer"
                    >
                        Voltar para a tela de login
                    </button>
                </div>
            </form>
        ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
            {isRegister && (
                <>
                    <Input label="Nome Completo" placeholder="Seu Nome" value={name} onChange={(e) => setName(e.target.value)} required />
                    <Input label="WhatsApp" placeholder="+55 48 99999-9999" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                    
                    <div className="space-y-2 mb-4">
                        <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center gap-1">
                            <ShieldCheck size={12} /> Tipo de Acesso
                        </label>
                        <select 
                            className="w-full bg-black/55 border border-zinc-850 rounded-lg px-4 py-2.5 text-white focus:border-atalaia-neon focus:outline-none"
                            value={role}
                            onChange={(e) => setRole(e.target.value as UserRole)}
                            required
                        >
                            <option value={UserRole.RESIDENT}>Cliente (Residencial)</option>
                            <option value={UserRole.INTEGRATOR}>Empresa Integradora (Gestor de Sistema)</option>
                        </select>
                    </div>
                </>
            )}

            <Input 
                label="Email" 
                type="email" 
                placeholder="seu@email.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
            />
            
            <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">Senha</label>
                    {!isRegister && (
                        <button
                            type="button"
                            onClick={() => {
                                setIsForgotPassword(true);
                                setError('');
                                setSuccess('');
                            }}
                            className="text-xs text-atalaia-neon/80 hover:text-atalaia-neon transition-colors font-medium bg-transparent border-none p-0 cursor-pointer focus:outline-none"
                        >
                            Esqueci minha senha
                        </button>
                    )}
                </div>
                <Input 
                    type="password" 
                    placeholder="••••••••" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    minLength={6} 
                />
            </div>

            {isRegister && role !== UserRole.INTEGRATOR && role !== UserRole.ADMIN && (
                <div className="space-y-4">
                    {/* FILTRO DE BUSCA DE EMPRESAS INTEGRADORAS */}
                    <div className="p-3.5 rounded-xl bg-zinc-950/90 border border-white/10 space-y-2.5">
                        <label className="block text-xs font-bold text-atalaia-neon uppercase tracking-wider flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                                <Building size={13} /> Buscar Empresa Integradora
                            </span>
                            {selectedIntegratorId && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedIntegratorId('');
                                        setIntegratorSearch('');
                                    }}
                                    className="text-[10px] text-zinc-400 hover:text-white underline font-normal cursor-pointer"
                                >
                                    Limpar filtro
                                </button>
                            )}
                        </label>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={15} />
                            <input
                                type="text"
                                placeholder="Filtrar empresa integradora por nome ou telefone..."
                                value={integratorSearch}
                                onChange={(e) => setIntegratorSearch(e.target.value)}
                                className="w-full bg-black/70 border border-white/10 rounded-lg pl-9 pr-8 py-2 text-xs text-white focus:border-atalaia-neon focus:outline-none placeholder-zinc-500"
                            />
                            {integratorSearch && (
                                <button
                                    type="button"
                                    onClick={() => setIntegratorSearch('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        <select
                            className="w-full bg-black/70 border border-atalaia-border rounded-lg px-3.5 py-2.5 text-sm text-white focus:border-atalaia-neon focus:outline-none"
                            value={selectedIntegratorId}
                            onChange={(e) => handleSelectIntegratorInRegister(e.target.value)}
                        >
                            <option value="">Todas as Empresas Integradoras ({filteredIntegrators.length})</option>
                            {filteredIntegrators.map(intUser => {
                                const displayName = intUser.companyName || intUser.razaoSocial || intUser.name;
                                return (
                                    <option key={intUser.id} value={intUser.id}>
                                        {displayName}
                                    </option>
                                );
                            })}
                        </select>

                        {integratorSearch.trim().length > 0 && (
                            <div className="max-h-32 overflow-y-auto space-y-1 pt-1">
                                {filteredIntegrators.length > 0 ? (
                                    filteredIntegrators.map(intUser => {
                                        const displayName = intUser.companyName || intUser.razaoSocial || intUser.name;
                                        const isSelected = selectedIntegratorId === intUser.id;
                                        return (
                                            <button
                                                key={intUser.id}
                                                type="button"
                                                onClick={() => handleSelectIntegratorInRegister(intUser.id)}
                                                className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-all cursor-pointer ${
                                                    isSelected
                                                        ? 'bg-atalaia-neon/20 border border-atalaia-neon text-white font-bold'
                                                        : 'bg-white/5 hover:bg-white/10 text-zinc-300 border border-transparent'
                                                }`}
                                            >
                                                <div className="truncate pr-2">
                                                    <span className="block truncate text-white font-semibold">{displayName}</span>
                                                </div>
                                                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-black/50 text-atalaia-neon shrink-0">
                                                    {isSelected ? 'Selecionada' : 'Selecionar'}
                                                </span>
                                            </button>
                                        );
                                    })
                                ) : (
                                    <p className="text-[11px] text-zinc-500 text-center py-1">
                                        Nenhuma empresa integradora encontrada para "{integratorSearch}".
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Input
                            label="Endereço Completo"
                            type="text"
                            placeholder="Ex: Rua Principal, 123 - Bairro - Cidade/UF"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            required
                        />
                    </div>
                </div>
            )}

            <Button type="submit" className="w-full h-12 text-sm uppercase tracking-wider font-bold mt-6" disabled={loading || !!success || authLoading}>
                {(loading || authLoading) ? <><Loader2 className="animate-spin mr-2" /> Validando credenciais...</> : (isRegister ? 'Finalizar Cadastro' : 'Entrar no Sistema')}
            </Button>
            </form>
        )}

        {!isForgotPassword && (
            <div className="mt-6 text-center">
                <button 
                    onClick={() => { setIsRegister(!isRegister); setError(''); setSuccess(''); }}
                    className="text-sm text-gray-400 hover:text-atalaia-neon transition-colors"
                    type="button"
                    disabled={loading || authLoading}
                >
                    {isRegister ? 'Já tem conta? Faça login' : 'Não tem conta? Crie agora'}
                </button>
            </div>
        )}
      </Card>

      {/* POPUP DE AVISO CONEXÃO ATIVA (SEGUNDO USUÁRIO) */}
      {showActiveSessionModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
              <div className="w-full max-w-md bg-zinc-950 border border-amber-500/35 rounded-2xl p-6 md:p-8 shadow-[0_0_50px_rgba(245,158,11,0.15)] flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                  <div className="relative mb-6">
                      <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-500 mb-1 animate-pulse">
                          <AlertCircle size={32} />
                      </div>
                      <div className="absolute inset-x-0 -bottom-2 flex justify-center">
                          <span className="px-2 py-0.5 bg-amber-500 text-[9px] font-black uppercase text-black tracking-widest rounded-sm font-sans">ATIVO</span>
                      </div>
                  </div>

                  <h3 className="text-xl font-bold text-white uppercase tracking-tight mb-3 font-sans">Conta em Uso</h3>
                  
                  <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                      Esta conta já possui uma sessão de monitoramento ativa em outro dispositivo. Para preservar a segurança e o controle dos alertas, o uso de sessões simultâneas é limitado.
                  </p>

                  <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl mb-6 text-left w-full text-xs text-zinc-400 space-y-2">
                       <span className="text-[10px] uppercase font-bold text-amber-500 font-mono tracking-wider block">Dispositivo Conectado Encontrado:</span>
                       {activeSessions.map((s, idx) => (
                           <div key={idx} className="bg-black/30 p-2.5 rounded border border-white/5 font-mono text-[10px] space-y-1">
                                <div className="flex justify-between text-white font-bold text-[11px]">
                                     <span>{s.os} &bull; {s.browser}</span>
                                     <span className="text-[8px] text-amber-500">● ATIVO AGORA</span>
                                </div>
                                <div className="flex justify-between text-zinc-500 text-[9px]">
                                     <span>IP: {s.ipAddress}</span>
                                     <span>Conectado em: {new Date(s.createdAt).toLocaleTimeString('pt-BR')}</span>
                                </div>
                           </div>
                       ))}
                  </div>

                  <p className="text-[10px] text-zinc-500 leading-normal mb-6">
                      Ao clicar em <strong>"Desconectar Outro & Entrar"</strong>, o outro dispositivo será deslogado de forma instantânea e você assumirá o controle das câmeras.
                  </p>

                  <div className="grid grid-cols-2 gap-3 w-full">
                      <button
                          type="button"
                          onClick={() => {
                              setShowActiveSessionModal(false);
                              setLoading(false);
                          }}
                          className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold rounded-xl text-xs uppercase tracking-wider transition-all border border-white/5"
                      >
                          Cancelar
                      </button>
                      <button
                          type="button"
                          onClick={() => {
                              setShowActiveSessionModal(false);
                              handleSubmit(true); // Força bypass e loga
                          }}
                          className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-black font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                      >
                          Derrubar & Entrar
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL REDIRECIONAMENTO PAGAMENTO MERCACO PAGO DE R$ 1,00 */}
      {showPromoRedirectModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
              <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-md bg-zinc-950 border border-yellow-500/35 rounded-2xl p-6 md:p-8 shadow-[0_0_50px_rgba(234,179,8,0.15)] relative overflow-hidden text-left"
              >
                  <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />
                  
                  <div className="w-14 h-14 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-2xl flex items-center justify-center mx-auto mb-5 animate-pulse">
                      <Sparkles size={26} />
                  </div>
                  
                  <div className="text-center mb-6">
                      <span className="text-[10px] text-yellow-500 font-extrabold uppercase tracking-widest bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-full inline-block mb-3">
                          ⚡ Cadastro Concluído!
                      </span>
                      <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">
                          Ativar Seu Plano Família
                      </h3>
                      <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto">
                          Seu cadastro na plataforma ServCam foi realizado! Agora, ative seu plano de testes por apenas R$ 5,00.
                      </p>
                  </div>

                  <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl mb-6 space-y-3">
                      <div className="flex items-start gap-2.5 text-xs text-zinc-300">
                          <span className="text-yellow-500 font-bold">1.</span>
                          <span>Efetue o pagamento de <strong>R$ 5,00</strong> no ambiente oficial e seguro do Mercado Pago clicando no link abaixo.</span>
                      </div>
                      <div className="flex items-start gap-2.5 text-xs text-zinc-300">
                          <span className="text-yellow-500 font-bold">2.</span>
                          <span>Após o pagamento, anexe obrigatoriamente o comprovante abaixo e ative seu teste de 7 dias com recursos completos do Plano Família.</span>
                      </div>
                  </div>

                  <div className="mb-6 flex flex-col items-center justify-center p-3.5 rounded-xl bg-black/40 border border-white/5 text-center">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Valor das Vantagens (7 Dias)</span>
                      <span className="text-3xl font-black text-yellow-500 mt-1">R$ 5,00</span>
                  </div>

                  {/* ANEXO DE COMPROVANTE MANDATÓRIO */}
                  <div className="mb-6 p-4 bg-zinc-900/50 border border-white/5 rounded-xl space-y-3 text-left">
                      <span className="text-[10px] uppercase font-bold text-yellow-500 tracking-wider block font-semibold">
                          📎 Enviar Comprovante de R$ 5,00 (Obrigatório)
                      </span>
                      <div className="flex flex-col gap-2">
                          <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-zinc-700 hover:border-yellow-500/40 rounded-xl cursor-pointer bg-black/40 hover:bg-zinc-950/65 transition-all text-center p-3 relative overflow-hidden group">
                              {promoReceiptName ? (
                                  <div className="flex flex-col items-center justify-center text-zinc-300">
                                      <FileText className="text-yellow-500 mb-1" size={24} />
                                      <span className="text-xs font-semibold truncate max-w-[200px]">{promoReceiptName}</span>
                                      <span className="text-[9px] text-green-500 font-bold mt-1">Comprovante anexado! ✅</span>
                                  </div>
                              ) : (
                                  <div className="flex flex-col items-center justify-center text-zinc-500">
                                      <Upload className="text-zinc-600 group-hover:text-yellow-500 transition-colors mb-1 animate-bounce" size={24} />
                                      <span className="text-xs font-bold text-zinc-400">Anexar Comprovante (JPG, PNG ou PDF)</span>
                                      <span className="text-[9px] text-zinc-600 mt-0.5">Clique ou arraste o arquivo aqui</span>
                                  </div>
                              )}
                              <input 
                                  type="file" 
                                  accept=".jpg,.jpeg,.png,image/jpeg,image/png,application/pdf" 
                                  onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                          const reader = new FileReader();
                                          reader.onloadend = () => {
                                              setPromoReceiptName(file.name);
                                              setPromoReceiptBase64(reader.result as string);
                                          };
                                          reader.readAsDataURL(file);
                                      }
                                  }} 
                                  className="hidden" 
                                  id="modal-receipt-upload-login"
                              />
                          </label>
                      </div>
                  </div>

                  <div className="flex flex-col gap-3 text-left">
                      <a
                          href="https://mpago.la/2EjAtCr"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full inline-flex items-center justify-center py-3.5 bg-zinc-900 border border-yellow-500/30 hover:bg-zinc-850 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all text-center font-sans font-bold"
                      >
                          💳 Abrir Link do Mercado Pago (R$ 5,00)
                      </a>
                      
                      <button
                          type="button"
                          onClick={handleManualConfirmPayment}
                          disabled={isManualVerifying}
                          className="w-full inline-flex items-center justify-center py-3.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(234,179,8,0.25)] text-center font-sans cursor-pointer font-bold"
                      >
                          {isManualVerifying ? (
                              <>
                                  <Loader2 className="animate-spin mr-2" size={16} />
                                  Verificando Comprovante & Ativando...
                              </>
                          ) : (
                              "✅ Já paguei R$ 5,00! Ativar Plano"
                          )}
                      </button>

                      <button
                          type="button"
                          onClick={() => {
                              setShowPromoRedirectModal(false);
                              navigate('/welcome');
                          }}
                          disabled={isManualVerifying}
                          className="w-full py-2 bg-transparent text-zinc-500 hover:text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all select-none text-center cursor-pointer font-sans"
                      >
                          Avançar para o Início Gratuito
                      </button>
                  </div>
              </motion.div>
          </div>
      )}
    </div>
  );
};

export default Login;
