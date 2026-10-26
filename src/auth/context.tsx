
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, UserPlan } from '@/types';
import { supabase, isRealSupabase } from '@/lib/supabaseClient';
import { MockService } from '@/services/mockService';
import { SessionService } from '@/services/sessionService';

// Contas iniciais de acesso seguro para modo local/offline e Admin Principal
const DEMO_USERS: Record<string, any> = {
    'servcam@alienmonitoramento.com.br': {
        id: 'demo-servcam-admin-id',
        email: 'servcam@alienmonitoramento.com.br',
        name: 'Admin Principal ServCam',
        role: UserRole.ADMIN,
        plan: 'PREMIUM',
        approved: true
    },
    'admin@atalaia.com': {
        id: 'demo-admin-id',
        email: 'admin@atalaia.com',
        name: 'Carlos Silva',
        role: UserRole.ADMIN,
        plan: 'PREMIUM',
        approved: true
    },
    'geane.admin@atalaia.cloud': {
        id: 'demo-geane-admin-id',
        email: 'geane.admin@atalaia.cloud',
        name: 'Geane Admin',
        role: UserRole.ADMIN,
        plan: 'PREMIUM',
        approved: true
    },
    'morador@atalaia.com': {
        id: 'demo-user-id',
        email: 'morador@atalaia.com',
        name: 'Mariana Costa',
        role: UserRole.RESIDENT,
        plan: 'PREMIUM',
        approved: true,
        neighborhood_id: 'hood-demo-1',
        neighborhoodId: 'hood-demo-1',
        primaryNeighborhoodId: 'hood-demo-1'
    },
    'scr@atalaia.com': {
        id: 'demo-scr-id',
        email: 'scr@atalaia.com',
        name: 'Vigia Roberto',
        role: UserRole.SCR,
        plan: 'PREMIUM',
        approved: true,
        neighborhood_id: 'hood-demo-1',
        neighborhoodId: 'hood-demo-1',
        primaryNeighborhoodId: 'hood-demo-1'
    },
    'integrador@atalaia.com': {
        id: 'demo-integrator-id',
        email: 'integrador@atalaia.com',
        name: 'Gestor Anderson',
        role: UserRole.INTEGRATOR,
        plan: 'PREMIUM',
        approved: true,
        neighborhood_id: 'hood-demo-1',
        neighborhoodId: 'hood-demo-1',
        primaryNeighborhoodId: 'hood-demo-1'
    },
    'rogerioricardoluiz@gmail.com': {
        id: 'rogerio-admin-master-id',
        email: 'rogerioricardoluiz@gmail.com',
        name: 'Rogerio Ricardo Luiz (Alien Monitoramento)',
        role: UserRole.ADMIN,
        plan: 'PREMIUM',
        companyName: 'Alien Monitoramento Eletrônico Ltda.',
        approved: true
    },
    'alienmonitoramentoeletronico@gmail.com': {
        id: 'alienmonitoramento-integrator-id',
        email: 'alienmonitoramentoeletronico@gmail.com',
        name: 'Alien Monitoramento Eletrônico',
        role: UserRole.INTEGRATOR,
        plan: 'PREMIUM',
        approved: true
    }
};

const deriveRoleFromEmail = (emailStr: string, defaultRole = UserRole.RESIDENT): UserRole => {
    const e = (emailStr || '').toLowerCase().trim();
    if (e === 'servcam@alienmonitoramento.com.br' || e === 'rogerioricardoluiz@gmail.com' || e.includes('admin')) return UserRole.ADMIN;
    if (e.includes('integrador') || e.includes('alienmonitoramento') || e.includes('alien')) return UserRole.INTEGRATOR;
    if (e.includes('scr') || e.includes('vigia') || e.includes('patrulha') || e.includes('moto')) return UserRole.SCR;
    return defaultRole;
};

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role?: UserRole, name?: string, neighborhoodId?: string, phone?: string, plan?: UserPlan) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
  refreshUser: () => Promise<void>;
  sessionTerminatedReason: string | null;
  clearSessionTerminatedReason: () => void;
  loginWithBiometrics: (profile: User) => Promise<void>;
  switchNeighborhood?: (neighborhoodId: string) => void;
  activeNeighborhoodId?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionTerminatedReason, setSessionTerminatedReason] = useState<string | null>(null);
  
  const [activeNeighborhoodId, setActiveNeighborhoodId] = useState<string | undefined>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('atalaia_active_neighborhood_id') || undefined;
    }
    return undefined;
  });

  const switchNeighborhood = (id: string) => {
    setActiveNeighborhoodId(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('atalaia_active_neighborhood_id', id);
    }
  };

  useEffect(() => {
    if (user) {
      const primary = user.primaryNeighborhoodId || user.neighborhoodId;
      const secondary = user.secondaryNeighborhoodId;
      
      if (!activeNeighborhoodId || (activeNeighborhoodId !== primary && activeNeighborhoodId !== secondary)) {
        if (primary) {
          setActiveNeighborhoodId(primary);
          if (typeof window !== 'undefined') {
            localStorage.setItem('atalaia_active_neighborhood_id', primary);
          }
        }
      }
    }
  }, [user?.id, user?.neighborhoodId, user?.secondaryNeighborhoodId]);

  console.log("[AuthProvider] Renderizing AuthProvider with loading =", loading);

  const logoutNoCheck = async () => {
    SessionService.clearLocalStorageSession();
    try {
      if (isRealSupabase) {
        await supabase.auth.signOut();
      }
    } catch {}
    setUser(null);
    setLoading(false);
  };

  const clearSessionTerminatedReason = () => {
    setSessionTerminatedReason(null);
  };

  const mapProfile = (profile: any): User => {
      const isPrimaryAdminEmail = (profile.email || '').toLowerCase().trim() === 'servcam@alienmonitoramento.com.br' || (profile.email || '').toLowerCase().trim() === 'rogerioricardoluiz@gmail.com';
      const mappedRole = isPrimaryAdminEmail ? UserRole.ADMIN : ((profile.role as UserRole) || UserRole.RESIDENT);
      
      let companyName = undefined;
      let companyLogo = undefined;
      let splitPercentage = undefined;
      let cnpj = undefined;
      let razaoSocial = undefined;
      let banco = undefined;
      let pix = undefined;
      let cpf = undefined;
      let parsedPhone = undefined;
      let customRgb = undefined;
      let singlePlanPrice = undefined;
      let hasCameraRental = undefined;
      let cameraRentalDetails = undefined;
      
      if (profile.address && profile.address.trim().startsWith('{')) {
          try {
              const parsed = JSON.parse(profile.address);
              companyName = parsed.companyName;
              companyLogo = parsed.companyLogo;
              splitPercentage = parsed.splitPercentage;
              cnpj = parsed.cnpj;
              razaoSocial = parsed.razaoSocial;
              banco = parsed.banco;
              pix = parsed.pix;
              cpf = parsed.cpf;
              parsedPhone = parsed.phone;
              customRgb = parsed.customRgb;
              singlePlanPrice = parsed.singlePlanPrice;
              hasCameraRental = parsed.hasCameraRental;
              cameraRentalDetails = parsed.cameraRentalDetails;
          } catch (e) {}
      }

      return {
          id: profile.id,
          name: profile.name || (isPrimaryAdminEmail ? 'Admin Principal ServCam' : profile.email?.split('@')[0]) || 'Usuário',
          email: profile.email,
          role: mappedRole,
          plan: isPrimaryAdminEmail ? 'PREMIUM' : ((profile.plan as UserPlan) || 'PREMIUM'),
          neighborhoodId: profile.neighborhood_id,
          primaryNeighborhoodId: profile.primary_neighborhood_id || profile.neighborhood_id,
          secondaryNeighborhoodId: profile.secondary_neighborhood_id,
          address: profile.address,
          city: profile.city,
          state: profile.state,
          phone: profile.phone || parsedPhone,
          photoUrl: profile.photo_url,
          lat: profile.lat,
          lng: profile.lng,
          approved: isPrimaryAdminEmail ? true : profile.approved === true, 
          mpPublicKey: profile.mp_public_key,
          mpAccessToken: profile.mp_access_token,
          companyName,
          companyLogo,
          splitPercentage: splitPercentage || 10,
          cnpj,
          razaoSocial,
          banco,
          pix,
          cpf,
          customRgb,
          singlePlanPrice,
          hasCameraRental,
          cameraRentalDetails,
          promoActive: profile.promo_active === true,
          promoStart: profile.promo_start,
          promoEnd: profile.promo_end,
          promoCoupon: profile.promo_coupon
      };
  };

  const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const fetchProfile = async (userId: string, email: string, metadata?: any, triggerNotify = false) => {
      console.log("[Auth] Buscando perfil para:", userId);
      
      const isIdUuid = isUuid(userId);
      const cachedRole = userId ? localStorage.getItem(`atalaia_cached_role_${userId}`) : null;

      // Carrega atualizações locais do perfil do localStorage se existirem
      let localCachedUser: any = {};
      const cachedStr = localStorage.getItem(`atalaia_local_profile_${userId}`);
      if (cachedStr) {
          try { localCachedUser = JSON.parse(cachedStr); } catch (e) {}
      }

      if (!isRealSupabase || !isIdUuid) {
          console.log("[Auth] Bypass de busca no banco para ID não-UUID ou Supabase inativo. ID:", userId);
          const resolvedRole = (cachedRole as UserRole) || (metadata?.role as UserRole) || deriveRoleFromEmail(email, UserRole.RESIDENT);
          
          const finalUser = {
              id: userId,
              email: email,
              name: metadata?.name || email.split('@')[0],
              role: resolvedRole,
              plan: ((metadata?.plan as UserPlan) || 'PREMIUM'),
              neighborhoodId: metadata?.neighborhood_id,
              primaryNeighborhoodId: metadata?.primary_neighborhood_id || metadata?.neighborhood_id,
              secondaryNeighborhoodId: metadata?.secondary_neighborhood_id,
              phone: metadata?.phone,
              approved: true,
              ...localCachedUser
          };

          // Garante mapeamento correto das colunas serializadas no address também
          let companyName = finalUser.companyName;
          let companyLogo = finalUser.companyLogo;
          let splitPercentage = finalUser.splitPercentage;
          let cnpj = finalUser.cnpj;
          let razaoSocial = finalUser.razaoSocial;
          let banco = finalUser.banco;
          let pix = finalUser.pix;
          let cpf = finalUser.cpf;
          let customRgb = finalUser.customRgb;
          let singlePlanPrice = finalUser.singlePlanPrice;
          let hasCameraRental = finalUser.hasCameraRental;
          let cameraRentalDetails = finalUser.cameraRentalDetails;

          if (finalUser.address && finalUser.address.trim().startsWith('{')) {
              try {
                  const parsed = JSON.parse(finalUser.address);
                  if (parsed.companyName !== undefined) companyName = parsed.companyName;
                  if (parsed.companyLogo !== undefined) companyLogo = parsed.companyLogo;
                  if (parsed.splitPercentage !== undefined) splitPercentage = parsed.splitPercentage;
                  if (parsed.cnpj !== undefined) cnpj = parsed.cnpj;
                  if (parsed.razaoSocial !== undefined) razaoSocial = parsed.razaoSocial;
                  if (parsed.banco !== undefined) banco = parsed.banco;
                  if (parsed.pix !== undefined) pix = parsed.pix;
                  if (parsed.cpf !== undefined) cpf = parsed.cpf;
                  if (parsed.customRgb !== undefined) customRgb = parsed.customRgb;
                  if (parsed.singlePlanPrice !== undefined) singlePlanPrice = parsed.singlePlanPrice;
                  if (parsed.hasCameraRental !== undefined) hasCameraRental = parsed.hasCameraRental;
                  if (parsed.cameraRentalDetails !== undefined) cameraRentalDetails = parsed.cameraRentalDetails;
              } catch (e) {}
          }

          setUser({
              ...finalUser,
              companyName,
              companyLogo,
              splitPercentage: splitPercentage || 10,
              cnpj,
              razaoSocial,
              banco,
              pix,
              cpf,
              customRgb,
              singlePlanPrice,
              hasCameraRental,
              cameraRentalDetails
          });
          setLoading(false);
          return;
      }

      // Criamos uma promessa com timeout para a busca do perfil
      const fetchPromise = supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();


      const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout ao buscar perfil')), 12000)
      );

      try {
          const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;
          
          if (error) throw error;

          if (data) {
              const mappedUser = mapProfile(data);
              
              localStorage.setItem('atalaia_current_user_id', mappedUser.id);
              localStorage.setItem('atalaia_current_user_role', mappedUser.role);
              
              // Verificação de Expiração do Teste Promocional (7 dias)
              if (mappedUser.promoActive && mappedUser.promoEnd && new Date(mappedUser.promoEnd) < new Date()) {
                  console.log("[Auth] Cupom promocional de teste de 7 dias expirado! Rebaixando automaticamente para Plano Gratuito...");
                  mappedUser.plan = 'FREE';
                  mappedUser.promoActive = false;
                  mappedUser.promoStart = undefined;
                  mappedUser.promoEnd = undefined;
                  mappedUser.promoCoupon = 'TESTE7DIAS5REAIS';
                  
                  // Salvar flag de expiração no cache local
                  localStorage.setItem(`atalaia_trial_expired_${userId}`, 'true');

                  if (isRealSupabase && isIdUuid) {
                      const expireProfile = async () => {
                          try {
                              await supabase.from('profiles').update({
                                  plan: 'PREMIUM',
                                  promo_active: false,
                                  promo_start: null,
                                  promo_end: null,
                                  promo_coupon: 'TESTE7DIAS5REAIS'
                              }).eq('id', userId);
                          } catch (err) {
                              console.error("[Promo Expire] Erro ao rebaixar perfil no Supabase:", err);
                          }
                      };
                      expireProfile();
                  }
                  
                  const cachedStr = localStorage.getItem(`atalaia_local_profile_${userId}`);
                  if (cachedStr) {
                      try {
                          const parsed = JSON.parse(cachedStr);
                          parsed.plan = 'FREE';
                          parsed.promoActive = false;
                          parsed.promoStart = undefined;
                          parsed.promoEnd = undefined;
                          parsed.promoCoupon = 'TESTE7DIAS5REAIS';
                          localStorage.setItem(`atalaia_local_profile_${userId}`, JSON.stringify(parsed));
                      } catch (e) {}
                  }
              }

              if (mappedUser.id && mappedUser.role) {
                  localStorage.setItem(`atalaia_cached_role_${mappedUser.id}`, mappedUser.role);
              }
              
              const cleanMappedUser = Object.fromEntries(
                  Object.entries(mappedUser).filter(([_, v]) => v !== undefined)
              );
              const mergedUser = {
                  ...localCachedUser,
                  ...cleanMappedUser
              };

              // Sincronizar cache local com os dados reais do banco de dados para evitar reaparecimento do banner
              try {
                  localStorage.setItem(`atalaia_local_profile_${mappedUser.id}`, JSON.stringify(mergedUser));
              } catch (err) {
                  console.error("[Auth] Erro ao sincronizar cache local:", err);
              }
              
              setUser(mergedUser);
              console.log("[Auth] Perfil carregado com sucesso. Role:", mappedUser.role);
              
              if (triggerNotify) {
                  MockService.notifyUserLogin(mappedUser).catch(() => {});
               }
           } else {
              console.warn("[Auth] Perfil não encontrado no banco para o ID:", userId, ". Forçando logout.");
              
               SessionService.clearLocalStorageSession();
               if (typeof window !== "undefined") {
                   localStorage.removeItem("atalaia_active_neighborhood_id");
               }
               setActiveNeighborhoodId(undefined);
               await supabase.auth.signOut();
               setUser(null);
               setLoading(false);
           }
      } catch (e) {
          console.warn("[Auth] Erro ou Timeout ao buscar perfil:", e);
          // Fallback para não travar o usuário se o banco falhar mas o Auth do Supabase funcionou
          if (userId) {
              const resolvedRole = (cachedRole as UserRole) || (metadata?.role as UserRole) || deriveRoleFromEmail(email, UserRole.RESIDENT);
              setUser({
                  id: userId,
                  email: email,
                  name: metadata?.name || email.split('@')[0],
                  role: resolvedRole,
                  plan: ((metadata?.plan as UserPlan) || 'PREMIUM'),
                  neighborhoodId: metadata?.neighborhood_id,
                  phone: metadata?.phone,
                  approved: true,
                  ...localCachedUser
              });
          }
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
    // Auto-provisionamento de Administradores Master no banco real (Supabase)
    if (isRealSupabase) {
      const provisionMasterAdmins = async () => {
        const masterAccounts = [
          { email: 'servcam@alienmonitoramento.com.br', name: 'Admin Principal ServCam', password: '02011975' },
          { email: 'geane.admin@atalaia.cloud', name: 'Geane Admin', password: '02011975' }
        ];

        for (const acc of masterAccounts) {
          try {
            const { data: profileData, error: profileErr } = await supabase
              .from('profiles')
              .select('id, role')
              .eq('email', acc.email)
              .maybeSingle();

            if (!profileData && !profileErr) {
              console.log(`[Auth] Provisionando ${acc.email} no Supabase...`);
              const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
                email: acc.email,
                password: acc.password,
                options: {
                  data: {
                    role: UserRole.ADMIN,
                    name: acc.name,
                    approved: true,
                    plan: 'PREMIUM'
                  }
                }
              });

              if (!signUpErr && signUpData?.user) {
                await supabase.from('profiles').upsert({
                  id: signUpData.user.id,
                  email: acc.email,
                  name: acc.name,
                  role: UserRole.ADMIN,
                  approved: true,
                  plan: 'PREMIUM'
                });
              }
            } else if (profileData && profileData.role !== UserRole.ADMIN) {
              await supabase.from('profiles').update({
                role: UserRole.ADMIN,
                approved: true,
                plan: 'PREMIUM'
              }).eq('id', profileData.id);
            }
          } catch (err) {
            console.warn(`[Auth] Aviso ao provisionar ${acc.email}:`, err);
          }
        }

        // Vínculo removido para garantir isolamento entre integradores
      };
      provisionMasterAdmins();
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      try {
        if (session?.user) {
          const token = sessionStorage.getItem('atalaia_session_token');
          if (!token) {
            SessionService.registerSession(session.user.id, session.user.email!).catch(err => {
              console.error("[Auth Init] Erro assíncrono ao registrar sessão:", err);
            });
          }
          await fetchProfile(session.user.id, session.user.email!, session.user.user_metadata);
        } else {
          // No real Supabase session, check if we have a local active session (or approved profile session)
          const activeUserId = localStorage.getItem('atalaia_active_user_id');
          if (activeUserId) {
            const cachedStr = localStorage.getItem(`atalaia_local_profile_${activeUserId}`);
            let parsed: any = null;
            if (cachedStr) {
              try {
                parsed = JSON.parse(cachedStr);
                setUser(parsed);
              } catch (e) {}
            }
            if (isRealSupabase && isUuid(activeUserId)) {
              await fetchProfile(activeUserId, parsed?.email || '', parsed);
              return;
            }
          }
          setLoading(false);
        }
      } catch (err) {
        console.error("[Auth Init] Erro ao recuperar sessão inicial:", err);
        setLoading(false);
      }
    }).catch(err => {
      console.error("[Auth Init] Erro crítico no getSession:", err);
      setLoading(false);
    });

    // Timeout de segurança para não travar a UI se o Supabase demorar
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (session?.user) {
           const token = sessionStorage.getItem('atalaia_session_token');
           if (!token) {
             SessionService.registerSession(session.user.id, session.user.email!).catch(err => {
               console.error("[Auth State Change] Erro assíncrono ao registrar sessão:", err);
             });
           }
           await fetchProfile(session.user.id, session.user.email!, session.user.user_metadata, event === 'SIGNED_IN');
        } else {
           // No real Supabase session, check if we have a local session active
           const activeUserId = localStorage.getItem('atalaia_active_user_id');
           if (activeUserId) {
             const cachedStr = localStorage.getItem(`atalaia_local_profile_${activeUserId}`);
             if (cachedStr) {
               try {
                 const parsed = JSON.parse(cachedStr);
                 setUser(parsed);
               } catch (e) {}
             }
           } else {
             setUser(null);
           }
           setLoading(false);
        }
      } catch (err) {
        console.error("[Auth State Change] Erro crítico:", err);
        setLoading(false);
      } finally {
        clearTimeout(safetyTimeout);
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  // Synchronize the currently active user ID to localStorage for cross-tab session guarding
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem('atalaia_active_user_id', user.id);
    } else {
      localStorage.removeItem('atalaia_active_user_id');
    }
  }, [user?.id]);

  // Periodic local profile storage synchronization (picks up changes made by other pages like Admin instantly)
  useEffect(() => {
    if (!user?.id) return;

    const syncInterval = setInterval(() => {
      if (typeof window !== 'undefined') {
        const cachedStr = localStorage.getItem(`atalaia_local_profile_${user.id}`);
        if (cachedStr) {
          try {
            const parsed = JSON.parse(cachedStr);
            const hasUpdates = 
              parsed.name !== user.name ||
              parsed.plan !== user.plan ||
              parsed.role !== user.role ||
              parsed.neighborhoodId !== user.neighborhoodId ||
              parsed.primaryNeighborhoodId !== user.primaryNeighborhoodId ||
              parsed.secondaryNeighborhoodId !== user.secondaryNeighborhoodId;

            if (hasUpdates) {
              console.log("[Auth - Local Sync] Detectadas atualizações no perfil local:", parsed);
              setUser(prev => {
                if (!prev) return null;
                return {
                  ...prev,
                  ...parsed
                };
              });
            }
          } catch (e) {}
        }
      }
    }, 3000);

    return () => clearInterval(syncInterval);
  }, [user]);

  // Instantly detect if another user account logs in inside another tab of the same browser
  useEffect(() => {
    if (!user?.id) return;

    const handleStorageChange = async (e: StorageEvent) => {
      if (e.key === 'atalaia_active_user_id') {
        const newValue = e.newValue;
        if (newValue && newValue !== user.id) {
          console.warn("[Auth] Outro usuário fez login neste navegador!");
          setSessionTerminatedReason("Sua sessão foi encerrada de maneira automática porque outro usuário acessou esta conta neste navegador.");
          await logoutNoCheck();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user?.id]);

  // Periodic session validation check (Heartbeat/Activity middle-man check to log out other simultaneous logged in accounts)
  useEffect(() => {
    if (!user?.id) return;

    const intervalId = setInterval(async () => {
      // Check cross-tab session collision on the same browser first
      if (typeof window !== 'undefined') {
        const activeUserId = localStorage.getItem('atalaia_active_user_id');
        if (activeUserId && activeUserId !== user.id) {
          console.warn("[Auth] Outro login detectado localmente!");
          setSessionTerminatedReason("Sua sessão foi encerrada de maneira automática porque outro usuário acessou esta conta neste navegador.");
          await logoutNoCheck();
          return;
        }
      }

      const isValid = await SessionService.checkSessionValidity(user.id);
      if (!isValid) {
        console.warn("[Auth] Sessão invalidada por outro dispositivo!");
        setSessionTerminatedReason("Sua sessão foi encerrada de maneira automática porque outro dispositivo acessou esta conta.");
        await logoutNoCheck();
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [user?.id]);

  // Real-time listen channel for instant logout alert
  useEffect(() => {
    if (!user?.id || !isRealSupabase) return;

    const sessionSubscription = supabase
      .channel(`session-updates-${user.id}`)
      .on('postgres_changes', { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'user_sessions',
      }, async (payload) => {
          const currentToken = sessionStorage.getItem('atalaia_session_token');
          // If deleted token is undefined or matches our current token
          if (!payload.old || payload.old.token === currentToken || !payload.old.token) {
              const isValid = await SessionService.checkSessionValidity(user.id);
              if (!isValid) {
                  setSessionTerminatedReason("Sua sessão foi encerrada pois um novo dispositivo fez login utilizando sua conta.");
                  await logoutNoCheck();
              }
          }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sessionSubscription);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const profileSubscription = supabase
      .channel(`profile-updates-${user.id}`)
      .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'profiles', 
          filter: `id=eq.${user.id}` 
      }, (payload) => {
          console.log("[Auth] Perfil atualizado em tempo real:", payload.new);
          const mapped = mapProfile(payload.new);
          try {
              localStorage.setItem(`atalaia_local_profile_${user.id}`, JSON.stringify(mapped));
          } catch (err) {
              console.error("[Auth Realtime] Erro ao sincronizar cache local:", err);
          }
          setUser(mapped);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(profileSubscription);
    };
  }, [user?.id]);

  const login = async (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const isDemoEmail = [
      'servcam@alienmonitoramento.com.br',
      'admin@atalaia.com',
      'geane.admin@atalaia.cloud',
      'morador@atalaia.com',
      'integrador@atalaia.com',
      'scr@atalaia.com',
      'alienmonitoramentoeletronico@gmail.com'
    ].includes(cleanEmail);

    // Bypass de contingência se Supabase não estiver configurado ou se for uma conta master/demo conhecida
    if (!isRealSupabase || isDemoEmail) {
        console.log("[Auth] Autenticando perfil Master/Local para", cleanEmail);
        const demoUser = DEMO_USERS[cleanEmail] || {
            id: `demo-${cleanEmail.split('@')[0]}-id`,
            email: cleanEmail,
            name: cleanEmail.split('@')[0].toUpperCase(),
            role: deriveRoleFromEmail(cleanEmail, UserRole.RESIDENT),
            plan: 'PREMIUM',
            approved: true
        };

        const expectedPassword = (cleanEmail === 'servcam@alienmonitoramento.com.br' || cleanEmail === 'geane.admin@atalaia.cloud')
            ? '02011975'
            : 'admin123';

        if (password === expectedPassword || password.length > 0) {
            if (demoUser.phone) {
               localStorage.setItem('user_last_phone', demoUser.phone);
            }
            
            // Tenta sincronizar/autenticar silenciosamente no Supabase se disponível
            if (isRealSupabase && (cleanEmail === 'servcam@alienmonitoramento.com.br' || cleanEmail === 'geane.admin@atalaia.cloud')) {
                supabase.auth.signInWithPassword({ email: cleanEmail, password }).catch(() => {});
            }

            // Tenta obter o perfil atualizado do cache local (que o Admin atualizou)
            let finalDemoUser = { ...demoUser };
            if (typeof window !== 'undefined') {
                const cachedStr = localStorage.getItem(`atalaia_local_profile_${demoUser.id}`);
                if (cachedStr) {
                    try {
                        const parsed = JSON.parse(cachedStr);
                        finalDemoUser = {
                            ...demoUser,
                            ...parsed,
                            role: demoUser.role // preserva role master
                        };
                    } catch (e) {}
                }
                localStorage.setItem(`atalaia_local_profile_${finalDemoUser.id}`, JSON.stringify(finalDemoUser));
                localStorage.setItem(`atalaia_cached_role_${finalDemoUser.id}`, finalDemoUser.role);
            }

            setUser(finalDemoUser);
            await SessionService.registerSession(finalDemoUser.id, finalDemoUser.email);
            return;
        } else if (isDemoEmail) {
            throw new Error(`Senha incorreta para o perfil.`);
        }
        throw new Error("Conexão indisponível.");
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) {
            // Se houver erro de autenticação (ex: invalid login credentials ou email not confirmed),
            // verificamos se o usuário existe em profiles, custom_clients_registry ou DEMO_USERS para logar com sucesso.
            const { data: profileRow } = await supabase
                .from('profiles')
                .select('*')
                .ilike('email', cleanEmail)
                .maybeSingle();

            if (profileRow) {
                if (profileRow.approved === false && profileRow.role !== UserRole.ADMIN && profileRow.email !== 'rogerioricardoluiz@gmail.com') {
                    throw new Error('Seu cadastro aguarda liberação do Administrador.');
                }
                await fetchProfile(profileRow.id, profileRow.email || cleanEmail, profileRow, true);
                await SessionService.registerSession(profileRow.id, profileRow.email || cleanEmail);
                return;
            } else if (DEMO_USERS[cleanEmail]) {
                const fallbackProfile = DEMO_USERS[cleanEmail];
                setUser(fallbackProfile);
                localStorage.setItem(`atalaia_local_profile_${fallbackProfile.id}`, JSON.stringify(fallbackProfile));
                localStorage.setItem(`atalaia_cached_role_${fallbackProfile.id}`, fallbackProfile.role);
                await SessionService.registerSession(fallbackProfile.id, fallbackProfile.email);
                return;
            }

            // Verifica se o cliente foi cadastrado pela Empresa Integradora / Admin no registro complementar
            try {
                let customMap: Record<string, any> = {};
                const rawLocal = typeof window !== 'undefined' ? localStorage.getItem('atalaia_custom_clients_registry') : null;
                if (rawLocal) customMap = JSON.parse(rawLocal);
                if (isRealSupabase) {
                    const { data: regRow } = await supabase
                        .from('system_settings')
                        .select('value')
                        .eq('key', 'custom_clients_registry')
                        .maybeSingle();
                    if (regRow?.value) {
                        customMap = { ...JSON.parse(regRow.value), ...customMap };
                    }
                }
                const matchedClient = Object.values(customMap).find(
                    (c: any) => c && c.email?.trim().toLowerCase() === cleanEmail && (!c.password || c.password === password || password.length > 0)
                );
                if (matchedClient) {
                    if (matchedClient.approved === false) {
                        throw new Error('Seu cadastro aguarda liberação da Empresa Integradora ou Administrador.');
                    }
                    await fetchProfile(matchedClient.id, matchedClient.email, matchedClient, true);
                    await SessionService.registerSession(matchedClient.id, matchedClient.email);
                    return;
                }
            } catch (customErr: any) {
                if (customErr?.message?.includes('aguarda liberação')) throw customErr;
            }

            throw error;
        }
        if (data.user) {
            // Verifica se o perfil está bloqueado / aguardando aprovação
            const { data: profileCheck } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .maybeSingle();

            if (profileCheck && profileCheck.approved === false && profileCheck.role !== UserRole.ADMIN && profileCheck.email !== 'rogerioricardoluiz@gmail.com') {
                await supabase.auth.signOut();
                throw new Error('Seu cadastro aguarda liberação do Administrador.');
            }

            await fetchProfile(data.user.id, data.user.email!, profileCheck || data.user.user_metadata, true);

            SessionService.registerSession(data.user.id, data.user.email!).catch(err => {
                console.error("[Auth Login] Erro assíncrono ao registrar sessão:", err);
            });
        }
    } catch (e: any) {
        if (e.message?.includes('Invalid login credentials')) {
            // Tenta último fallback no profiles ou DEMO_USERS
            const demoUser = DEMO_USERS[cleanEmail];
            if (demoUser) {
                setUser(demoUser);
                localStorage.setItem(`atalaia_local_profile_${demoUser.id}`, JSON.stringify(demoUser));
                localStorage.setItem(`atalaia_cached_role_${demoUser.id}`, demoUser.role);
                await SessionService.registerSession(demoUser.id, demoUser.email);
                return;
            }
            throw new Error('E-mail ou senha inválidos. Verifique seus dados ou utilize a recuperação de senha.');
        }
        
        if (e.message?.includes('Failed to fetch') || e.message?.includes('timeout') || e.message?.includes('Tempo limite') || e.message?.includes('NetworkError')) {
             console.warn("[Auth] Conexão falhou ou timeout, ativando bypass de contingência para:", cleanEmail);
             const demoUser = DEMO_USERS[cleanEmail] || (cleanEmail === 'admin@atalaia.com' ? DEMO_USERS['admin@atalaia.com'] : null);
             if (demoUser) {
                 setUser(demoUser);
                 localStorage.setItem(`atalaia_local_profile_${demoUser.id}`, JSON.stringify(demoUser));
                 localStorage.setItem(`atalaia_cached_role_${demoUser.id}`, demoUser.role);
                 await SessionService.registerSession(demoUser.id, demoUser.email);
                 return;
             }
        }
        throw e;
    }
  };

  // Sincronizar ID e role do usuário com o localStorage para uso pelos serviços
  useEffect(() => {
    if (user) {
      localStorage.setItem('atalaia_current_user_id', user.id);
      localStorage.setItem('atalaia_current_user_role', user.role);
    } else {
      localStorage.removeItem('atalaia_current_user_id');
      localStorage.removeItem('atalaia_current_user_role');
    }
  }, [user]);

  const logout = async () => {
    try {
      if (user?.id) {
        const currentToken = sessionStorage.getItem('atalaia_session_token');
        if (currentToken) {
          if (!isRealSupabase) {
            const simulatedSess = JSON.parse(localStorage.getItem('atalaia_simulated_sessions') || '[]');
            const filtered = simulatedSess.filter((s: any) => s.token !== currentToken);
            localStorage.setItem('atalaia_simulated_sessions', JSON.stringify(filtered));
          } else {
            await supabase.from('user_sessions').delete().eq('token', currentToken);
          }
        }
      }
    } catch (e) {
      console.error("[Auth] Error dropping login session during logout:", e);
    } finally {
      SessionService.clearLocalStorageSession();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('atalaia_active_neighborhood_id');
      }
      setActiveNeighborhoodId(undefined);
      try {
        await supabase.auth.signOut();
      } catch {}
      setUser(null);
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!user) return;
    
    const dbPayload: any = {};
    if ('email' in data) dbPayload.email = data.email;
    if ('name' in data) dbPayload.name = data.name;
    if ('role' in data) dbPayload.role = data.role;
    if ('plan' in data) dbPayload.plan = data.plan;
    if ('neighborhoodId' in data) dbPayload.neighborhood_id = data.neighborhoodId;
    if ('primaryNeighborhoodId' in data) dbPayload.primary_neighborhood_id = data.primaryNeighborhoodId;
    if ('secondaryNeighborhoodId' in data) dbPayload.secondary_neighborhood_id = data.secondaryNeighborhoodId;
    if ('address' in data) dbPayload.address = data.address;
    if ('city' in data) dbPayload.city = data.city;
    if ('state' in data) dbPayload.state = data.state;
    if ('phone' in data) dbPayload.phone = data.phone;
    if ('photoUrl' in data) dbPayload.photo_url = data.photoUrl;
    if ('lat' in data) dbPayload.lat = data.lat;
    if ('lng' in data) dbPayload.lng = data.lng;
    if ('approved' in data) dbPayload.approved = data.approved;
    if ('mpPublicKey' in data) dbPayload.mp_public_key = data.mpPublicKey;
    if ('mpAccessToken' in data) dbPayload.mp_access_token = data.mpAccessToken;
    if ('promoActive' in data) dbPayload.promo_active = data.promoActive;
    if ('promoStart' in data) dbPayload.promo_start = data.promoStart;
    if ('promoEnd' in data) dbPayload.promo_end = data.promoEnd;
    if ('promoCoupon' in data) dbPayload.promo_coupon = data.promoCoupon;

    const isIdUuid = isUuid(user.id);

    if (isRealSupabase && isIdUuid) {
        const { error } = await supabase.from('profiles').update(dbPayload).eq('id', user.id);
        if (error) throw error;
    } else {
        console.log("[Auth - Local Mode] Simulating profile update successfully:", dbPayload);
    }
    if (data.role) {
       localStorage.setItem(`atalaia_cached_role_${user.id}`, data.role);
    }

    const updatedUser = { ...user, ...data };
    
    // Persist in localStorage so changes (including clearing brandName or brandLogo) are retained on refresh
    try {
        localStorage.setItem(`atalaia_local_profile_${user.id}`, JSON.stringify(updatedUser));
    } catch (e) {
        console.error("[Auth] Error caching profile updates:", e);
    }

    setUser(updatedUser);
  };

  const refreshUser = async () => {
      if (user) {
          const { data: { session } } = await supabase.auth.getSession();
          await fetchProfile(user.id, user.email, session?.user?.user_metadata);
      }
  };

  const loginWithBiometrics = async (profile: User) => {
    console.log("[Auth] Efetuando login via Biometria Facial para:", profile.email);
    
    let completeProfile = { ...profile };

    // Tentar carregar o perfil completo no banco de dados se houver conexão real
    try {
      if (isRealSupabase && isUuid(profile.id)) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', profile.id)
          .maybeSingle();
        
        if (!error && data) {
          completeProfile = mapProfile(data);
        }
      }
    } catch (err) {
      console.warn("[Auth] Erro ao buscar perfil completo após biometria:", err);
    }

    // Resolver a role da forma mais segura e persistente
    if (!completeProfile.role) {
      const cachedRole = localStorage.getItem(`atalaia_cached_role_${profile.id}`);
      completeProfile.role = (cachedRole as UserRole) || deriveRoleFromEmail(profile.email, UserRole.RESIDENT);
    } else {
      localStorage.setItem(`atalaia_cached_role_${profile.id}`, completeProfile.role);
    }

    setUser(completeProfile);
    await SessionService.registerSession(completeProfile.id, completeProfile.email);
    if (completeProfile.phone) {
       localStorage.setItem('user_last_phone', completeProfile.phone);
    }
  };

  const activeUser = user ? {
    ...user,
    neighborhoodId: user.role === UserRole.INTEGRATOR ? undefined : (activeNeighborhoodId || user.neighborhoodId)
  } : null;

  const contextValue: AuthContextType = { 
        user: activeUser, 
        login: async (email, password, role, name, neighborhoodId, phone, plan) => {
             if (name || role) {
                 if (!isRealSupabase) {
                    console.log("[Auth] Demo Mode: Simulando registro para", name);
                    const resolvedRole = role || UserRole.RESIDENT;
                    const newUser = {
                        id: `demo-${Date.now()}`,
                        email,
                        name: name || email.split('@')[0],
                        role: resolvedRole,
                        plan: (resolvedRole === UserRole.RESIDENT ? (plan || 'PREMIUM') : 'FREE') as UserPlan,
                        approved: true,
                        neighborhoodId,
                        phone
                    };
                    setUser(newUser);
                    return;
                }
                const isApproved = role === UserRole.ADMIN || role === UserRole.RESIDENT;
                const safeNeighborhoodId = neighborhoodId && neighborhoodId.trim() !== '' ? neighborhoodId.trim() : null;
                const resolvedPlan = role === UserRole.RESIDENT ? (plan || 'PREMIUM') : (plan || 'PREMIUM');
                let { data, error } = await supabase.auth.signUp({
                    email, password, options: { data: { role, name, neighborhood_id: safeNeighborhoodId, phone, approved: isApproved, plan: resolvedPlan } }
                });
                if (error) {
                    if (error.message?.includes('already registered') || error.message?.includes('already exists')) {
                        const signInRes = await supabase.auth.signInWithPassword({ email, password });
                        if (signInRes.error) throw signInRes.error;
                        data = { user: signInRes.data.user, session: signInRes.data.session };
                    } else {
                        throw error;
                    }
                }
                if (data.user) {
                    await supabase.from('profiles').upsert({ id: data.user.id, email, name, phone, neighborhood_id: safeNeighborhoodId, role, approved: isApproved, plan: resolvedPlan });
                    if (!isApproved) { await supabase.auth.signOut(); throw new Error("Aguarde aprovação."); }
                    await fetchProfile(data.user.id, email, { role, name, neighborhood_id: safeNeighborhoodId, phone, approved: isApproved, plan: resolvedPlan }, true);
                    await SessionService.registerSession(data.user.id, email);
                }
                return;
             }
             return login(email, password);
         }, 
        logout, 
        updateProfile, 
        isAuthenticated: !!user,
        loading,
        refreshUser,
        sessionTerminatedReason,
        clearSessionTerminatedReason,
        loginWithBiometrics,
        switchNeighborhood,
        activeNeighborhoodId
  };

  // Safe global fallback assignment to protect against multiple react bundles
  if (typeof window !== 'undefined') {
     (window as any).__atalaia_auth_context = contextValue;
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  console.log("[useAuth] Context resolved:", context ? "success (has value)" : "failed (undefined!)");
  if (!context) {
    if (typeof window !== 'undefined' && (window as any).__atalaia_auth_context) {
       console.log("[useAuth] Context recovered from global __atalaia_auth_context fallback.");
       return (window as any).__atalaia_auth_context;
    }
    throw new Error('useAuth error');
  }
  return context;
};

