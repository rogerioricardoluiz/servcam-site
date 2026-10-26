import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MockService } from '@/services/mockService';
import { Camera, Neighborhood } from '@/types';
import { 
  ShieldCheck, 
  Maximize2, 
  Minimize2, 
  RefreshCw, 
  AlertTriangle, 
  X, 
  Loader2,
  Radio,
  RotateCw,
  FlipHorizontal
} from 'lucide-react';
import { normalizeStreamUrl } from '@/lib/playerUtils';

const Player: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [camera, setCamera] = useState<Camera | null>(null);
  const [neighborhood, setNeighborhood] = useState<Neighborhood | null>(null);
  const [loadingCamera, setLoadingCamera] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRotated, setIsRotated] = useState(false);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [stageSize, setStageSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [reloadKey, setReloadKey] = useState(0);
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleTimeString('pt-BR'));

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('pt-BR'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!stageRef.current) return;
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
  }, [camera, loadingCamera]);

  // Busca a câmera livremente (sem exigir login ou exibir links)
  useEffect(() => {
    if (!id) {
      setLoadingCamera(false);
      return;
    }

    let isMounted = true;
    const fetchCamera = async () => {
      setLoadingCamera(true);
      try {
        const cam = await MockService.getCameraById(id);
        if (!isMounted) return;

        if (!cam) {
          setCamera(null);
          setLoadingCamera(false);
          return;
        }

        setCamera(cam);

        if (cam.neighborhoodId) {
          try {
            const hoods = await MockService.getNeighborhoods(false);
            const foundHood = hoods.find(h => h.id === cam.neighborhoodId);
            if (foundHood) setNeighborhood(foundHood);
          } catch (e) {
            console.warn("[Player] Erro ao carregar bairro:", e);
          }
        }
      } catch (err) {
        console.error("[Player] Erro ao carregar câmera:", err);
      } finally {
        if (isMounted) setLoadingCamera(false);
      }
    };

    fetchCamera();
    return () => { isMounted = false; };
  }, [id]);

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

  const handleReloadStream = () => {
    setReloadKey(prev => prev + 1);
  };

  const handleClose = () => {
    try {
      window.close();
      setTimeout(() => {
        navigate(-1);
      }, 150);
    } catch {
      navigate('/');
    }
  };

  if (loadingCamera) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white px-4">
        <Loader2 className="text-atalaia-neon animate-spin mb-3" size={32} />
        <p className="text-xs text-zinc-400 font-mono tracking-wider uppercase">Abrindo monitor da câmera...</p>
      </div>
    );
  }

  if (!camera) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-4">
        <div className="max-w-md bg-zinc-950 border border-white/10 rounded-2xl p-6 text-center">
          <AlertTriangle className="text-zinc-500 mx-auto mb-3" size={36} />
          <h2 className="text-lg font-bold uppercase mb-2">Câmera Não Localizada</h2>
          <p className="text-xs text-zinc-400 mb-6">
            Esta câmera não está disponível no momento.
          </p>
          <button
            onClick={handleClose}
            className="py-2.5 px-6 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  const { isHtml, streamUrl, rawHtml } = normalizeStreamUrl(camera.iframeCode || '');

  const transformStyle: React.CSSProperties = {
    width: isRotated && stageSize.height ? `${stageSize.height}px` : '100%',
    height: isRotated && stageSize.width ? `${stageSize.width}px` : '100%',
    transform: `rotate(${isRotated ? 90 : 0}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
    transition: 'transform 0.25s ease, width 0.25s ease, height 0.25s ease'
  };

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-[#020202] text-white flex flex-col select-none overflow-hidden"
    >
      {/* Barra de Topo Limpa (Sem Links) */}
      <header className="min-h-14 py-2 px-4 bg-zinc-950/90 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 shrink-0 backdrop-blur-md z-30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-atalaia-neon flex items-center justify-center text-black font-black shadow-[0_0_12px_rgba(0,255,102,0.4)]">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white tracking-tight">ServCam</span>
                <span className="hidden sm:inline-block text-[9px] px-1.5 py-0.5 rounded bg-atalaia-neon/10 text-atalaia-neon border border-atalaia-neon/20 font-mono font-bold uppercase">
                  MONITOR AO VIVO
                </span>
              </div>
              <p className="text-[8px] text-zinc-500 font-mono uppercase tracking-widest -mt-0.5">
                Alien Monitoramento Eletrônico
              </p>
            </div>
          </div>

          <div className="hidden sm:block h-6 w-px bg-white/10" />

          <div className="flex flex-col">
            <h2 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
              <span>{camera.name}</span>
              {neighborhood && (
                <span className="text-[10px] text-zinc-400 font-normal">
                  • {neighborhood.name}
                </span>
              )}
            </h2>
          </div>
        </div>

        {/* Lado Direito: Status e Ações (Sem botão de link) */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/10 border border-red-500/20 text-red-500">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="text-[10px] font-black font-mono tracking-widest uppercase">AO VIVO</span>
          </div>



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
            onClick={handleReloadStream}
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
            onClick={handleClose}
            className="p-2 rounded-lg bg-zinc-900 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 text-zinc-400 hover:text-red-400 transition-all cursor-pointer"
            title="Fechar Monitor"
          >
            <X size={14} />
          </button>
        </div>
      </header>

      {/* Área Central do Vídeo */}
      <main ref={stageRef} className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
        {!camera.iframeCode ? (
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
            ) : (
              <iframe
                key={reloadKey}
                src={streamUrl}
                title={camera.name}
                className="w-full h-full border-0 absolute inset-0 bg-black"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              />
            )}
          </div>
        )}

        {/* Marca d'água Tática */}
        <div 
          data-watermark="true"
          className="absolute bottom-4 left-4 pointer-events-none z-20 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2.5 text-[10px] font-mono text-zinc-400"
        >
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

export default Player;
