
import React, { useState, useEffect } from 'react';
// App Entry Point - Sync Fix Attempt
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/auth/context.tsx';
import Landing from '@/pages/Landing.tsx';
import Login from '@/pages/Login.tsx';
import LoginCliente from '@/pages/LoginCliente.tsx';
import Dashboard from '@/pages/Dashboard.tsx';
import Cameras from '@/pages/Cameras.tsx';
import Alerts from '@/pages/Alerts.tsx';
import Chat from '@/pages/Chat.tsx';
import Profile from '@/pages/Profile.tsx';
import MapPage from '@/pages/MapPage.tsx';
import IntegratorUsers from '@/pages/IntegratorUsers.tsx';
import PaymentSuccess from '@/pages/PaymentSuccess.tsx';
import PaymentCheckout from '@/pages/PaymentCheckout.tsx';
import Welcome from '@/pages/Welcome.tsx';
import WhatsAppAdmin from '@/pages/WhatsAppAdmin.tsx';
import FinancialAdmin from '@/pages/FinancialAdmin.tsx';
import CalculatorAdmin from '@/pages/CalculatorAdmin.tsx';
import Documentation from '@/pages/Documentation.tsx';
import Terms from '@/pages/Terms.tsx';
import Privacy from '@/pages/Privacy.tsx';
import ResetPassword from '@/pages/ResetPassword.tsx';
import CollaborativeNetwork from '@/pages/CollaborativeNetwork.tsx';
import ImagePolicyPage from '@/pages/ImagePolicyPage.tsx';
import Player from '@/pages/Player.tsx';
import { ShieldCheck, Loader2, RefreshCw, Maximize2, Minimize2, X, Radio, RotateCw, FlipHorizontal } from 'lucide-react';
import { Button } from '@/components/UI';
import { normalizeStreamUrl } from '@/lib/playerUtils';

const FreeCameraPagePopup: React.FC = () => {
  const [popupCam, setPopupCam] = useState<{ id: string; name: string; iframeCode: string } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRotated, setIsRotated] = useState(false);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [stageSize, setStageSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleTimeString('pt-BR'));
  const containerRef = React.useRef<HTMLDivElement>(null);
  const stageRef = React.useRef<HTMLElement>(null);

  useEffect(() => {
    const handleOpen = (e: any) => {
      if (e.detail) {
        setPopupCam(e.detail);
        setIsRotated(false);
        setFlipH(false);
        setFlipV(false);
      }
    };
    window.addEventListener('servcam:open_free_camera_popup', handleOpen);
    return () => window.removeEventListener('servcam:open_free_camera_popup', handleOpen);
  }, []);

  useEffect(() => {
    if (!popupCam) return;
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('pt-BR'));
    }, 1000);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement) {
        setPopupCam(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearInterval(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [popupCam]);

  useEffect(() => {
    if (!popupCam || !stageRef.current) return;
    const updateSize = () => {
      if (stageRef.current) {
        setStageSize({
          width: stageRef.current.clientWidth,
          height: stageRef.current.clientHeight
        });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(stageRef.current);
    window.addEventListener('resize', updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [popupCam]);

  if (!popupCam) return null;

  const isLoading = popupCam.iframeCode === '__LOADING__';
  const { isHtml, streamUrl, rawHtml } = normalizeStreamUrl(isLoading ? '' : popupCam.iframeCode);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const toggleOrientation = () => {
    const nextRotated = !isRotated;
    setIsRotated(nextRotated);
    try {
      const orientation = (window.screen as any)?.orientation;
      if (orientation && typeof orientation.lock === 'function') {
        orientation.lock(nextRotated ? 'landscape' : 'portrait').catch(() => {});
      }
    } catch {
      // Ignora em navegadores sem suporte a lock de orientação
    }
  };

  const transformStyle: React.CSSProperties = {
    width: isRotated && stageSize.height ? `${stageSize.height}px` : '100%',
    height: isRotated && stageSize.width ? `${stageSize.width}px` : '100%',
    transform: `rotate(${isRotated ? 90 : 0}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
    transition: 'transform 0.25s ease, width 0.25s ease, height 0.25s ease'
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[10000] bg-[#020202] text-white flex flex-col select-none overflow-hidden animate-in fade-in duration-200"
    >
      {/* Topo da Página Limpa (Sem Link / Sem Barra de Endereço) */}
      <header className="min-h-14 py-2 px-3 sm:px-6 bg-zinc-950 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-atalaia-neon flex items-center justify-center text-black font-black shadow-[0_0_12px_rgba(0,255,102,0.4)]">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-white tracking-tight">{popupCam.name}</span>
              <span className="hidden sm:inline-block text-[9px] px-1.5 py-0.5 rounded bg-atalaia-neon/10 text-atalaia-neon border border-atalaia-neon/20 font-mono font-bold uppercase">
                MONITOR AO VIVO
              </span>
            </div>
            <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">
              ServCam • Visualização Direta
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/10 border border-red-500/20 text-red-500">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="text-[10px] font-black font-mono tracking-widest uppercase">AO VIVO</span>
          </div>



          {/* Botão Espelhar / Virar na Horizontal */}
          <button
            onClick={() => setFlipH(prev => !prev)}
            className={`px-2 py-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
              flipH
                ? 'bg-atalaia-neon text-black border-atalaia-neon shadow-[0_0_10px_rgba(0,255,102,0.3)]'
                : 'bg-zinc-900 border-white/10 text-zinc-300 hover:text-white hover:border-white/20'
            }`}
            title="Inverter / Espelhar na Horizontal"
          >
            <FlipHorizontal size={14} />
            <span className="hidden sm:inline uppercase">Virar H</span>
          </button>


          <button
            onClick={() => setReloadKey(prev => prev + 1)}
            className="p-2 rounded-lg bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white hover:border-white/20 transition-all cursor-pointer"
            title="Recarregar Transmissão"
          >
            <RefreshCw size={14} />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white hover:border-white/20 transition-all cursor-pointer"
            title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>

          <button
            onClick={() => {
              if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
              }
              setPopupCam(null);
            }}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 text-zinc-300 hover:text-red-400 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Fechar Monitor"
          >
            <X size={15} />
            <span>Fechar</span>
          </button>
        </div>
      </header>

      {/* Área Central do Vídeo */}
      <main ref={stageRef} className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center text-white">
            <Loader2 className="text-atalaia-neon animate-spin mb-3" size={32} />
            <p className="text-xs text-zinc-400 font-mono uppercase tracking-wider">Abrindo transmissão ao vivo...</p>
          </div>
        ) : !popupCam.iframeCode ? (
          <div className="text-center p-6 text-zinc-400">
            <p className="text-sm font-bold uppercase tracking-wider">Câmera em Manutenção</p>
            <p className="text-xs text-zinc-500 mt-1">Transmissão temporariamente indisponível.</p>
          </div>
        ) : (
          <div style={transformStyle} className="relative flex items-center justify-center bg-black">
            {isHtml ? (
              <div
                key={reloadKey}
                className="w-full h-full [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:absolute [&_iframe]:inset-0 [&_video]:w-full [&_video]:h-full [&_video]:absolute [&_video]:inset-0 [&_iframe]:border-0 [&_video]:object-contain [&_iframe]:object-contain"
                dangerouslySetInnerHTML={{
                  __html: rawHtml
                    .replace(/<video([^>]*)>/gi, (_match, attrs) => {
                      const cleanAttrs = attrs.replace(/\b(autoplay|muted|playsinline|loop|controls)\b/gi, '');
                      return `<video ${cleanAttrs} autoplay="true" muted="true" playsinline="true" loop="true" controls="true" style="width:100%; height:100%; object-fit:contain; border:none;">`;
                    })
                    .replace(/<iframe([^>]*)>/gi, (_match, attrs) => {
                      const cleanAttrs = attrs.replace(/style=["']([^"']*)["']/gi, '');
                      return `<iframe ${cleanAttrs} style="width:100%; height:100%; position:absolute; inset:0; border:none;" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen="true">`;
                    })
                }}
              />
            ) : (streamUrl.toLowerCase().includes('.mp4') || streamUrl.toLowerCase().includes('.m3u8')) ? (
              <video
                key={reloadKey}
                src={streamUrl}
                autoPlay
                muted
                loop
                playsInline
                controls
                className="w-full h-full object-contain absolute inset-0 bg-black"
              />
            ) : (
              <iframe
                key={reloadKey}
                src={streamUrl}
                title={popupCam.name}
                className="w-full h-full border-0 absolute inset-0 bg-black"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              />
            )}
          </div>
        )}

        <div className="absolute bottom-4 left-4 pointer-events-none z-20 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2.5 text-[10px] font-mono text-zinc-400">
          <div className="flex items-center gap-1.5">
            <Radio size={12} className="text-atalaia-neon animate-pulse" />
            <span className="text-zinc-200 font-bold uppercase tracking-wider">SERVCAM MONITOR</span>
          </div>
          <span className="text-zinc-600">•</span>
          <span className="text-atalaia-neon font-bold">{currentTime}</span>
        </div>


      </main>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    let timer: any;
    if (loading) {
      timer = setTimeout(() => {
        setShowRetry(true);
      }, 7000);
    } else {
      setShowRetry(false);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white px-6 text-center">
        <Loader2 size={48} className="text-atalaia-neon animate-spin mb-4" />
        <div className="flex flex-col items-center gap-2">
           <div className="flex items-center gap-2 text-gray-400">
              <ShieldCheck size={18} />
              <span className="text-sm font-medium tracking-wider uppercase">Acessando link seguro...</span>
           </div>
           {showRetry && (
             <div className="mt-8 animate-in fade-in zoom-in">
                <p className="text-xs text-gray-600 mb-4 max-w-xs">A conexão com o servidor de segurança está demorando. Deseja tentar recarregar?</p>
                <Button onClick={() => window.location.reload()} variant="outline" className="text-xs">
                   <RefreshCw size={14} className="mr-2" /> Reiniciar Conexão
                </Button>
             </div>
           )}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    let target = '/login';
    if (typeof window !== 'undefined') {
      const savedLoginUrl = localStorage.getItem('atalaia_last_login_url');
      const savedIntegratorId = localStorage.getItem('atalaia_last_client_integrator_id');
      if (savedLoginUrl && (savedLoginUrl.startsWith('/logincliente') || savedLoginUrl.includes('integrator='))) {
        target = savedLoginUrl;
      } else if (savedIntegratorId) {
        target = `/logincliente?integrator=${savedIntegratorId}`;
      }
    }
    return <Navigate to={target} replace />;
  }
  return <>{children}</>;
};

const AppRoutes = () => {
  const { sessionTerminatedReason, clearSessionTerminatedReason } = useAuth();

  return (
    <>
      <FreeCameraPagePopup />
      {sessionTerminatedReason && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-zinc-950 border border-red-500/30 rounded-2xl p-6 md:p-8 shadow-[0_0_50px_rgba(239,68,68,0.15)] flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <div className="relative mb-6">
               <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 text-red-500 mb-1 animate-pulse">
                  <ShieldCheck size={32} />
               </div>
               <div className="absolute inset-x-0 -bottom-2 flex justify-center">
                  <span className="px-2 py-0.5 bg-red-500 text-[9px] font-black uppercase text-black tracking-widest rounded-sm">BLOQUEADO</span>
               </div>
            </div>

            <h3 className="text-xl font-bold text-white uppercase tracking-tight mb-3 font-sans">Sessão Interrompida</h3>
            
            <p className="text-xs text-zinc-400 leading-relaxed mb-6">
              {sessionTerminatedReason}
            </p>

            <div className="p-3.5 bg-red-500/5 border border-red-500/10 rounded-xl mb-6 text-left w-full text-[10px] text-zinc-500 leading-normal font-mono">
              💡 <strong>Controle de Compartilhamento ServCam:</strong> Para preservar a privacidade das imagens das câmeras táticas e sensores de segurança comunitários, o uso de sessões simultâneas é desativado por padrão.
            </div>

            <button
              onClick={clearSessionTerminatedReason}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(220,38,38,0.25)] hover:scale-[1.01]"
            >
              Entendido, Fazer Login Novamente
            </button>
          </div>
        </div>
      )}

      <Routes>
        <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/logincliente" element={<LoginCliente />} />
      <Route path="/login-cliente" element={<LoginCliente />} />
      <Route path="/colaborativa" element={<CollaborativeNetwork />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/docs" element={<Documentation />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/politica-imagens" element={<ImagePolicyPage />} />
      <Route path="/politica-fornecimento-imagens" element={<ImagePolicyPage />} />
      <Route path="/player/:id" element={<Player />} />
      <Route path="/player" element={<Player />} />
      
      {/* Protected Routes */}
      <Route path="/welcome" element={
        <ProtectedRoute>
          <Welcome />
        </ProtectedRoute>
      } />

      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/cameras" element={
        <ProtectedRoute>
          <Cameras />
        </ProtectedRoute>
      } />

      <Route path="/alerts" element={
        <ProtectedRoute>
          <Alerts />
        </ProtectedRoute>
      } />

      <Route path="/chat" element={
        <ProtectedRoute>
          <Chat />
        </ProtectedRoute>
      } />

      <Route path="/profile" element={
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      } />

      <Route path="/map" element={
        <ProtectedRoute>
          <MapPage />
        </ProtectedRoute>
      } />

      <Route path="/integrator/users" element={
        <ProtectedRoute>
          <IntegratorUsers />
        </ProtectedRoute>
      } />
      
      <Route path="/admin/whatsapp" element={
        <ProtectedRoute>
          <WhatsAppAdmin />
        </ProtectedRoute>
      } />
      
      <Route path="/admin/financial" element={
        <ProtectedRoute>
          <FinancialAdmin />
        </ProtectedRoute>
      } />
      
      <Route path="/admin/calculadora" element={
        <ProtectedRoute>
          <CalculatorAdmin />
        </ProtectedRoute>
      } />

      <Route path="/admin/calculator" element={
        <ProtectedRoute>
          <CalculatorAdmin />
        </ProtectedRoute>
      } />
      
      <Route path="/admin/bairros" element={<ProtectedRoute><Cameras /></ProtectedRoute>} />
      
      {/* Payment Routes */}
      <Route path="/payment-checkout" element={<ProtectedRoute><PaymentCheckout /></ProtectedRoute>} />
      <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
      <Route path="/payment/success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
};


const VersionChecker = () => {
  useEffect(() => {
    let checking = false;
    
    // Unregister any active Service Workers to avoid aggressive caching
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
          registration.unregister();
          console.log('ServiceWorker desregistrado com sucesso:', registration);
        }
      }).catch(function(err) {
        console.error('Falha ao desregistrar Service Worker:', err);
      });
    }

    const checkVersion = async () => {
      if (checking) return;
      checking = true;
      try {
        const res = await fetch(`/version.json?t=${new Date().getTime()}`, { cache: 'no-store' });
        const data = await res.json();
        
        // @ts-ignore
        if (data.version && typeof __APP_VERSION__ !== 'undefined') {
          // @ts-ignore
          if (data.version.toString() !== __APP_VERSION__.toString()) {
            console.log("Versão atualizada detectada (recarregamento automático desativado para estabilidade).");
          }
        }
      } catch (e) {
        // Ignora erros (como offline)
      } finally {
        checking = false;
      }
    };

    // Verifica no load inicial
    checkVersion();

    // Verifica ao voltar para a aba
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // E a cada 5 minutos
    const interval = setInterval(checkVersion, 5 * 60 * 1000);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return null;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <VersionChecker />
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
};

export default App;
