
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Zap, MessageSquare, Users, MapPin, MessageCircle, Menu, X, Lock, CreditCard, Printer, Video, Check, Wifi, XCircle, FileText, Scan, AlertTriangle, Star, Shield, Heart, Eye, Loader2, Home, Wrench, Server, Sliders } from 'lucide-react';
import { Button, Modal, Badge } from '@/components/UI';
import { ImagePolicyButton, ImagePolicyModal } from '@/components/ImagePolicyModal';
import { PricingCalculatorTable } from '@/components/PricingCalculatorTable';
import { MockService } from '@/services/mockService';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

import serverRackImg from '@/assets/images/server_rack_cameras_1790167890357.jpg';

// Fix Leaflet Default Icon in React using CDN URLs
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: iconUrl,
    shadowUrl: shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
if (typeof window !== 'undefined') {
  L.Marker.prototype.options.icon = DefaultIcon;
}

// Custom Camera Icon for map markers (Green pins showing camera locations)
const CameraIcon = L.divIcon({
    className: 'custom-camera-marker',
    html: `<div style="background-color: #00FF66; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px rgba(0,255,102,0.6); border: 2px solid #000;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
           </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

interface FitBoundsProps {
  cameras: any[];
}

const FitBounds: React.FC<FitBoundsProps> = ({ cameras }) => {
  const map = useMap();

  useEffect(() => {
    if (!cameras || cameras.length === 0) return;

    const validCameras = cameras.filter(cam => 
      typeof cam.lat === 'number' && 
      typeof cam.lng === 'number'
    );
    if (validCameras.length === 0) return;

    const bounds = L.latLngBounds(validCameras.map(cam => [cam.lat, cam.lng]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  }, [cameras, map]);

  return null;
};

const getEstadoSigla = (estado?: string): string => {
  if (!estado) return 'SC';
  const name = estado.toLowerCase().trim();
  if (name.includes('santa catarina')) return 'SC';
  if (name.includes('são paulo') || name.includes('sao paulo')) return 'SP';
  if (name.includes('rio de janeiro')) return 'RJ';
  if (name.includes('paraná') || name.includes('parana')) return 'PR';
  if (name.includes('rio grande do sul')) return 'RS';
  if (name.includes('minas gerais')) return 'MG';
  if (name.includes('bahia')) return 'BA';
  if (name.includes('goiás') || name.includes('goias')) return 'GO';
  if (name.includes('ceará') || name.includes('ceara')) return 'CE';
  if (name.includes('pernambuco')) return 'PE';
  if (name.includes('espírito santo') || name.includes('espirito santo')) return 'ES';
  if (name.includes('distrito federal')) return 'DF';
  if (name.includes('mato grosso do sul')) return 'MS';
  if (name.includes('mato grosso')) return 'MT';
  if (name.includes('amazonas')) return 'AM';
  if (name.includes('pará') || name.includes('para')) return 'PA';
  if (name.includes('maranhão') || name.includes('maranhao')) return 'MA';
  if (name.includes('paraíba') || name.includes('paraiba')) return 'PB';
  if (name.includes('rio grande do norte')) return 'RN';
  if (name.includes('alagoas')) return 'AL';
  if (name.includes('sergipe')) return 'SE';
  if (name.includes('rondônia') || name.includes('rondonia')) return 'RO';
  if (name.includes('tocantins')) return 'TO';
  if (name.includes('piauí') || name.includes('piaui')) return 'PI';
  if (name.includes('acre')) return 'AC';
  if (name.includes('amapá') || name.includes('amapa')) return 'AP';
  if (name.includes('roraima')) return 'RR';
  return estado;
};

interface CameraPopupProps {
  cam: any;
  neighborhoodName: string;
}

const CameraPopup: React.FC<CameraPopupProps> = ({ cam, neighborhoodName }) => {
  const [locInfo, setLocInfo] = useState<{ bairro: string; cidade: string; estado: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadLocation = async () => {
      if (!cam.lat || !cam.lng) return;
      
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${cam.lat}&lon=${cam.lng}&zoom=14&addressdetails=1`, {
          headers: {
            'User-Agent': 'AtalaiaSecurityApp/1.0',
            'Accept-Language': 'pt-BR'
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (active) {
            const addr = data.address || {};
            const bairro = addr.suburb || addr.neighbourhood || addr.quarter || addr.residential || neighborhoodName || 'Bairro Monitorado';
            const cidade = addr.city || addr.town || addr.village || addr.municipality || 'Florianópolis';
            const estado = addr.state || 'Santa Catarina';
            const estadoSigla = getEstadoSigla(estado);
            setLocInfo({
              bairro,
              cidade,
              estado: estadoSigla
            });
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn("Geocoding fetch failed:", err);
      }
      
      if (active) {
        setLocInfo({
          bairro: neighborhoodName || 'Bairro Monitorado',
          cidade: 'Florianópolis',
          estado: 'SC'
        });
        setLoading(false);
      }
    };

    loadLocation();
    return () => {
      active = false;
    };
  }, [cam.lat, cam.lng, neighborhoodName]);

  if (loading) {
    return (
      <div className="p-2 min-w-[220px] flex flex-col items-center justify-center h-20">
        <Loader2 className="animate-spin text-emerald-500 mb-2" size={20} />
        <span className="text-xs text-gray-400">Carregando localização...</span>
      </div>
    );
  }

  return (
    <div className="w-[240px] p-1 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Video size={18} className="text-emerald-500 animate-pulse shrink-0" />
        <div className="flex flex-col overflow-hidden">
          <strong className="text-sm font-bold text-zinc-900 leading-tight truncate">
            {locInfo?.bairro}
          </strong>
          <span className="text-xs text-zinc-600 font-medium truncate">
            {locInfo?.cidade} - {locInfo?.estado}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-medium">
        <MapPin size={12} className="text-zinc-400 shrink-0" />
        <span className="truncate">Poste Atalaia de Segurança</span>
      </div>
      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/60 rounded-md p-2.5 border border-emerald-200/80 text-center mt-1 w-full box-border shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-400 to-emerald-500"></div>
        <p className="text-[10px] text-emerald-800 font-extrabold flex items-center justify-center gap-1.5 uppercase mb-1 tracking-wide">
          <ShieldCheck size={14} className="text-emerald-500 animate-pulse drop-shadow-sm" /> ACESSO RESTRITO
        </p>
        <p className="text-[9px] text-emerald-700/90 leading-relaxed m-0 font-medium whitespace-normal break-words">
          Imagens ao vivo exclusivas para moradores cadastrados na plataforma.
        </p>
      </div>
    </div>
  );
};

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [plateModalOpen, setPlateModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactLoading, setContactLoading] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);

  const handleSendContact = (e: React.FormEvent) => {
    e.preventDefault();
    setContactLoading(true);
    setTimeout(() => {
      setContactLoading(false);
      setContactSuccess(true);
      setTimeout(() => {
        setContactSuccess(false);
        setContactModalOpen(false);
        setContactName('');
        setContactEmail('');
        setContactMessage('');
      }, 2000);
    }, 1000);
  };
  const [plateType, setPlateType] = useState<'resident' | 'camera'>('resident');
  const [cameras, setCameras] = useState<any[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch independently so a failure or hang in one doesn't block the other
      MockService.getAllSystemCameras()
        .then(setCameras)
        .catch(e => console.error("[Landing] Error fetching cameras:", e));

      MockService.getNeighborhoods()
        .then(setNeighborhoods)
        .catch(e => console.error("[Landing] Error fetching neighborhoods:", e));
    };
    fetchData();
  }, []);
  
  // State for WhatsApp Animation
  const [startWaAnimation, setStartWaAnimation] = useState(false);
  const waSectionRef = useRef<HTMLDivElement>(null);

  // Trigger animation when section is in view
  useEffect(() => {
      const observer = new IntersectionObserver(
          (entries) => {
              if (entries[0].isIntersecting) {
                  setStartWaAnimation(true);
                  observer.disconnect(); // Animate only once
              }
          },
          { threshold: 0.3 }
      );

      if (waSectionRef.current) {
          observer.observe(waSectionRef.current);
      }

      return () => observer.disconnect();
  }, []);

  const handleLogin = () => navigate('/login');
  const handleRegister = (plan?: string) => navigate(`/login?mode=register${plan ? `&plan=${plan}` : ''}`);


  const handleCustomPlanSelect = (planDetails: {
    cameras: number;
    retentionDays: number;
    rentalModelId: string;
    rentalModelName: string;
    selectedAiModuleIds: string[];
    billingCycle: 'monthly' | 'annual';
    total: number;
  }) => {
    const aiParam = planDetails.selectedAiModuleIds.join(',');
    navigate(`/login?mode=register&plan=CUSTOM&cameras=${planDetails.cameras}&retention=${planDetails.retentionDays}&rental=${encodeURIComponent(planDetails.rentalModelId)}&rentalName=${encodeURIComponent(planDetails.rentalModelName)}&ai=${encodeURIComponent(aiParam)}&cycle=${planDetails.billingCycle}&total=${planDetails.total.toFixed(2)}`);
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrintPlate = () => {
    const plateContent = document.getElementById('printable-plate');
    if (!plateContent) return;

    // Criar uma nova janela para impressão
    const printWindow = window.open('', '', 'width=900,height=700');
    if (!printWindow) {
      alert("Por favor, habilite pop-ups para imprimir a placa.");
      return;
    }

    // Gerar o conteúdo HTML da janela de impressão
    printWindow.document.write(`
      <html>
        <head>
          <title>Impressão de Placa Atalaia</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            body { 
              margin: 0; 
              padding: 0; 
              background: white; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              min-height: 100vh;
            }
            #plate-to-print {
              width: 100%;
              max-width: 800px;
              margin: auto;
            }
            @media print {
              body { padding: 0; }
              #plate-to-print { 
                width: 100vw; 
                height: 125vw; /* Mantém o aspect ratio 4:5 na página inteira em modo retrato */
                max-width: none;
                border-radius: 0;
              }
              .print-hidden { display: none; }
            }
          </style>
        </head>
        <body>
          <div id="plate-to-print">
            ${plateContent.outerHTML}
          </div>
          <script>
            // Aguarda o Tailwind e as fontes carregarem antes de abrir o diálogo
            setTimeout(() => {
              window.print();
              window.close();
            }, 800);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-[#010101] text-white font-sans overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-[#010101]/90 backdrop-blur-md border-b border-white/5 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* LOGO CLICÁVEL (VOLTAR AO TOPO) */}
            <button 
              onClick={scrollToTop}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none group"
            >
              <ShieldCheck className="text-atalaia-neon h-6 w-6 group-hover:scale-110 transition-transform" />
              <div className="flex flex-col items-start">
                  <span className="text-2xl font-black tracking-tighter text-white">ServCam</span>
                  <span className="text-[9px] text-gray-400 font-mono uppercase tracking-[0.2em] -mt-1">By Alien Sistemas de Segurança</span>
              </div>
            </button>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8 text-sm font-medium">
              <button onClick={scrollToTop} className="text-gray-300 hover:text-white transition-colors">Início</button>
              <button onClick={() => scrollToSection('planos')} className="text-gray-300 hover:text-white transition-colors">Planos</button>
              <button onClick={() => setContactModalOpen(true)} className="text-gray-300 hover:text-white transition-colors">Contato</button>
            </div>
            
             <div className="hidden md:flex items-center gap-3">
               <Button onClick={handleLogin} variant="primary" className="px-6 py-2 text-sm font-bold">
                 Login
               </Button>
             </div>

            <div className="md:hidden flex items-center">
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-300 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors"
                aria-label="Menu Principal"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
            <div className="md:hidden absolute top-20 left-0 w-full bg-[#040404] border-b border-white/5 px-4 py-6 flex flex-col gap-4 shadow-2xl animate-in slide-in-from-top-5">
               <button onClick={() => { scrollToTop(); setMobileMenuOpen(false); }} className="text-left text-base font-medium text-gray-300 hover:text-atalaia-neon py-2">Início</button>
               <button onClick={() => { scrollToSection('planos'); setMobileMenuOpen(false); }} className="text-left text-base font-medium text-gray-300 hover:text-atalaia-neon py-2">Planos</button>
               <button onClick={() => { setContactModalOpen(true); setMobileMenuOpen(false); }} className="text-left text-base font-medium text-gray-300 hover:text-atalaia-neon py-2">Contato</button>

             <hr className="border-white/5 my-1" />
             <Button onClick={handleLogin} variant="primary" className="w-full justify-center py-3 font-bold">
                 Login
             </Button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen min-h-[600px] flex items-center justify-center pt-20 overflow-hidden print:hidden bg-[#010101]">
        <div className="absolute inset-0 z-0 select-none pointer-events-none overflow-hidden">
          <img 
            src={serverRackImg} 
            alt="ServCam Server Rack with Cameras" 
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover md:object-contain object-left opacity-75 animate-in fade-in duration-1000 ease-out"
            style={{ 
                filter: 'brightness(0.7) contrast(1.4) grayscale(0.2)',
                WebkitMaskImage: `linear-gradient(to right, black 0%, black 45%, rgba(0,0,0,0.85) 52%, rgba(0,0,0,0.6) 62%, rgba(0,0,0,0.35) 72%, rgba(0,0,0,0.15) 82%, rgba(0,0,0,0.04) 90%, transparent 98%), linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)`,
                maskImage: `linear-gradient(to right, black 0%, black 45%, rgba(0,0,0,0.85) 52%, rgba(0,0,0,0.6) 62%, rgba(0,0,0,0.35) 72%, rgba(0,0,0,0.15) 82%, rgba(0,0,0,0.04) 90%, transparent 98%), linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)`,
                WebkitMaskComposite: 'source-in',
                maskComposite: 'intersect'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent via-45% via-[#010101]/40 via-60% via-[#010101]/80 via-75% to-[#010101] to-95%"></div>
          <div className="absolute inset-y-0 right-0 w-[35%] bg-[#010101]"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-end w-full text-right animate-in slide-in-from-right-10 duration-700 delay-150">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight mb-6 max-w-3xl drop-shadow-[0_0_30px_rgba(0,0,0,0.9)]">
            ServCam — <span className="text-atalaia-neon">Armazenamento</span><br />
            <span className="text-atalaia-neon">de Imagens</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-2xl mb-10 leading-relaxed font-medium drop-shadow-lg">
            Gravação, monitoramento e inteligência para suas câmeras de segurança.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto sm:justify-end">
            <Button onClick={handleLogin} className="h-12 sm:h-14 px-8 text-sm sm:text-base font-bold uppercase tracking-wide w-full sm:w-auto">
              Entrar no Sistema
            </Button>
          </div>
        </div>
      </section>

      {/* Seção Rede Colaborativa (Banner) */}
      <section className="py-24 bg-[#010101] border-y border-white/5 relative overflow-hidden font-sans print:hidden">
        <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-atalaia-neon/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="bg-[#040404] border border-white/10 rounded-3xl p-10 md:p-14 text-center shadow-2xl relative overflow-hidden group hover:border-atalaia-neon/30 transition-colors">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&auto=format&fit=crop&q=60')] opacity-5 mix-blend-luminosity bg-cover bg-center pointer-events-none" />
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-[#111] border border-atalaia-neon/30 text-atalaia-neon flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(0,255,102,0.15)] group-hover:scale-110 transition-transform">
                <ShieldCheck size={32} />
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Armazenamento de Imagens ServCam</h2>
              <p className="text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed text-lg">
                Sua câmera pode proteger toda a comunidade. Descubra como compartilhar voluntariamente imagens de áreas públicas e ajudar equipes de segurança, bombeiros e vizinhos em situações de emergência.
              </p>
              <button onClick={() => navigate('/colaborativa')} className="px-8 py-4 bg-atalaia-neon text-black font-bold uppercase tracking-wide rounded-xl hover:bg-emerald-400 transition-colors flex items-center gap-2 shadow-[0_0_20px_rgba(0,255,102,0.3)]">
                Conhecer o Programa <ShieldCheck size={20} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Propaganda Atalaia Segurança Colaborativa - Leve para o seu bairro */}
      <section className="py-20 bg-gradient-to-b from-[#010101] via-[#031d0f] to-[#010101] border-y border-atalaia-neon/30 relative overflow-hidden print:hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-atalaia-neon/15 rounded-full blur-[160px] pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-atalaia-neon/10 border border-atalaia-neon/30 text-atalaia-neon text-xs font-black uppercase tracking-widest mb-6 shadow-[0_0_20px_rgba(0,255,102,0.2)]">
            <ShieldCheck size={16} /> Segurança Colaborativa Inteligente
          </div>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-white mb-6 tracking-tight">
            Leve o <span className="text-atalaia-neon">Atalaia</span> para o <br />seu Bairro
          </h2>
          <p className="text-gray-300 text-base md:text-xl max-w-3xl mx-auto mb-10 leading-relaxed font-medium">
            Transforme câmeras comuns em uma rede de proteção inteligente integrada com vizinhos, vigilantes e forças de segurança. Proteja sua rua com tecnologia de ponta, gravação em nuvem e alertas instantâneos no WhatsApp.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a 
              href="https://atalaia.cloud" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-8 py-4 bg-atalaia-neon text-black font-black uppercase tracking-wider rounded-xl hover:bg-emerald-400 transition-all duration-300 shadow-[0_0_25px_rgba(0,255,102,0.4)] hover:shadow-[0_0_35px_rgba(0,255,102,0.7)] flex items-center gap-3 transform hover:-translate-y-1"
            >
              <span>Conhecer o Sistema</span>
              <ShieldCheck size={20} />
            </a>
          </div>
        </div>
      </section>

      {/* WhatsApp Section */}
      <section id="whatsapp-demo" ref={waSectionRef} className="py-20 bg-[#020202] border-y border-white/5 print:hidden overflow-hidden relative">
          <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] bg-green-900/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
              <div className="flex-1 text-center lg:text-left z-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] text-xs font-bold uppercase tracking-wider mb-6">
                      <MessageSquare size={14} /> Integração Oficial
                  </div>
                  <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Alertas Inteligentes no <span className="text-[#25D366]">WhatsApp</span></h2>
                  <p className="text-gray-400 text-lg mb-8 leading-relaxed">Não exige que todos os vizinhos tenham o aplicativo instalado. O ServCam envia notificações instantâneas diretamente para o WhatsApp do grupo ou de cada cliente.</p>
                  <ul className="space-y-4 mb-8 text-left max-w-md mx-auto lg:mx-0">
                      <li className="flex items-center gap-3 text-gray-300"><Check className="text-[#25D366]" size={18} /> Sem necessidade de app para receber</li>
                      <li className="flex items-center gap-3 text-gray-300"><Check className="text-[#25D366]" size={18} /> Detalhes completos: Quem, Onde e Quando</li>
                      <li className="flex items-center gap-3 text-gray-300"><Check className="text-[#25D366]" size={18} /> Link direto para câmeras ao vivo</li>
                  </ul>
                  <Button onClick={() => scrollToSection('planos')} className="h-12 px-8 bg-[#25D366] text-black hover:bg-[#20bd5a] font-bold shadow-[0_0_20px_rgba(37,211,102,0.3)]">Conectar Meu Sistema</Button>
              </div>
              <div className="flex-1 relative z-10 flex justify-center">
                  <div className="relative w-[300px] h-[600px] bg-black border-[8px] border-[#151515] rounded-[3rem] shadow-2xl overflow-hidden ring-1 ring-white/10">
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-2xl z-20"></div>
                      <div className="w-full h-full bg-[#0b141a] flex flex-col pt-10 relative">
                          <div className="bg-[#202c33] px-4 py-3 flex items-center gap-3 border-b border-[#202c33]">
                              <div className="w-8 h-8 rounded-full bg-atalaia-neon flex items-center justify-center text-black font-bold text-xs shrink-0">AT</div>
                              <div className="overflow-hidden">
                                  <p className="text-white text-xs font-bold truncate">ServCam Armazenamento de Imagens</p>
                                  <p className="text-[10px] text-gray-400">online</p>
                              </div>
                          </div>
                          <div className="flex-1 p-4 space-y-6 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-opacity-10 bg-repeat overflow-hidden relative">
                              <div className={`flex justify-center transition-all duration-700 ${startWaAnimation ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`} style={{ transitionDelay: '500ms' }}>
                                  <span className="bg-[#1e2a30] text-gray-400 text-[10px] px-3 py-1 rounded-lg uppercase shadow-sm">Hoje</span>
                              </div>
                              <div className={`flex flex-col items-start transition-all duration-700 ease-out transform ${startWaAnimation ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`} style={{ transitionDelay: '1500ms' }}>
                                  <div className="bg-[#202c33] p-3 rounded-lg rounded-tl-none max-w-[90%] shadow-md border-l-4 border-red-500 relative">
                                      <p className="text-[10px] text-red-400 font-bold mb-2">🛡️ SERVCAM - ALERTA DE SEGURANÇA</p>
                                      <p className="text-sm text-white font-bold mb-2">🚨🚨 PÂNICO</p>
                                      <div className="space-y-1 text-[10px] text-gray-300 leading-tight">
                                          <p>👤 <span className="font-bold text-gray-400">Solicitante:</span> Laura</p>
                                          <p>📍 <span className="font-bold text-gray-400">Local:</span> Bairro Centro</p>
                                          <p>📝 <span className="font-bold text-gray-400">Relato:</span> Alguém no pátio!</p>
                                          <p>🕒 <span className="font-bold text-gray-400">Horário:</span> 15:30:00</p>
                                      </div>
                                      <div className="mt-2 pt-2 border-t border-white/5">
                                          <p className="text-[#53bdeb] text-[10px] truncate">🔗 atalaia.cloud/#/login</p>
                                      </div>
                                      <span className="text-[9px] text-gray-500 absolute bottom-1 right-2">15:30</span>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </section>

      {/* Planos Section - Fixed Pricing Table ServCam / Alien */}
      <section id="planos" className="py-20 md:py-28 bg-[#010101] border-b border-white/5 print:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-atalaia-neon/10 border border-atalaia-neon/30 text-atalaia-neon text-xs font-bold uppercase tracking-wider mb-4">
                <Check size={14} className="text-atalaia-neon" strokeWidth={3} /> Tabela de Preços Oficial ServCam
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Planos por Câmera em Nuvem</h2>
              <p className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto">
                Tabela fixa regressiva com <strong className="text-white font-semibold">3 dias de gravação em nuvem contínua inclusos</strong> em todas as faixas.
              </p>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <PricingCalculatorTable onSelectPlan={handleCustomPlanSelect} />
          </div>
      </section>

      {/* Seção Infraestrutura ServCam & Alien Sistemas */}
      <section className="py-16 md:py-24 bg-[#030303] border-t border-white/5 relative overflow-hidden print:hidden font-sans">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-atalaia-neon/5 rounded-full blur-[140px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="bg-gradient-to-r from-[#070707] via-[#0b0b0f] to-[#070707] border border-atalaia-neon/30 rounded-3xl p-8 sm:p-12 shadow-[0_0_50px_rgba(0,255,102,0.06)] relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8 space-y-4">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-atalaia-neon/10 border border-atalaia-neon/30 text-atalaia-neon text-xs font-mono font-black tracking-wider uppercase">
                  <Server size={14} className="animate-pulse" /> Servidores Dedicados ServCam
                </div>
                
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-snug">
                  Tecnologia e Servidores <span className="text-atalaia-neon">ServCam</span>
                </h2>
                
                <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                  O sistema <strong className="text-white font-bold">Atalaia</strong> utiliza os servidores <strong className="text-atalaia-neon font-bold">ServCam</strong>, de propriedade da <strong className="text-white font-bold">Alien Sistemas de Segurança Eletrônica</strong>, garantindo máxima estabilidade, baixíssima latência na transmissão de vídeo ao vivo, segurança da informação e alta disponibilidade 24 horas por dia.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                  <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-atalaia-neon/10 text-atalaia-neon shrink-0">
                      <Server size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase font-mono">ServCam Cloud</h4>
                      <p className="text-[11px] text-gray-400">Servidores de alta performance</p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-atalaia-neon/10 text-atalaia-neon shrink-0">
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase font-mono">Alien Sistemas</h4>
                      <p className="text-[11px] text-gray-400">Segurança Eletrônica</p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-atalaia-neon/10 text-atalaia-neon shrink-0">
                      <Zap size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase font-mono">Transmissão 24/7</h4>
                      <p className="text-[11px] text-gray-400">Streaming ultra estável</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 sm:p-8 bg-[#040404] border border-white/10 rounded-2xl text-center shadow-xl">
                <div className="w-16 h-16 rounded-2xl bg-atalaia-neon/10 border border-atalaia-neon/40 flex items-center justify-center text-atalaia-neon mb-4 shadow-[0_0_25px_rgba(0,255,102,0.25)]">
                  <Server size={32} />
                </div>
                <h3 className="text-white font-black text-base sm:text-lg mb-1">ServCam Servers</h3>
                <p className="text-xs text-atalaia-neon font-mono font-bold uppercase mb-3">Alien Sistemas de Segurança Eletrônica</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Infraestrutura de ponta desenvolvida para monitoramento inteligente comunitário.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contato" className="py-16 bg-[#010101] border-t border-white/5 text-gray-400 text-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-12">
            {/* Brand Column */}
            <div className="col-span-2 lg:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <ShieldCheck className="text-atalaia-neon h-6 w-6" />
                <span className="text-xl font-bold text-white tracking-tight">ServCam</span>
              </div>
              <p className="text-gray-500 max-w-xs mb-4 leading-relaxed">
                A maior rede de armazenamento de imagens do Brasil. Unindo tecnologia e vizinhança para um ambiente mais seguro para todos.
              </p>
              <p className="text-xs text-gray-400 font-mono mb-6">
                Servidores <span className="text-atalaia-neon font-bold">ServCam</span> • Propriedade da <span className="text-white font-semibold">Alien Sistemas de Segurança Eletrônica</span>
              </p>
              <div className="flex gap-4">
                <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-atalaia-neon hover:text-black transition-all">
                  <MessageCircle size={18} />
                </button>
                <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-atalaia-neon hover:text-black transition-all">
                  <Users size={18} />
                </button>
              </div>
            </div>

            {/* Product Column */}
            <div>
              <h4 className="text-white font-bold mb-6 uppercase text-xs tracking-widest">Produto</h4>
              <ul className="space-y-4">
                <li><button onClick={() => scrollToSection('planos')} className="hover:text-atalaia-neon transition-colors">Planos e Preços</button></li>
              </ul>
            </div>

            {/* Support Column */}
            <div>
              <h4 className="text-white font-bold mb-6 uppercase text-xs tracking-widest">Suporte</h4>
              <ul className="space-y-4">
                <li><button onClick={() => navigate('/docs')} className="hover:text-atalaia-neon transition-colors">Documentação</button></li>
                <li><button onClick={() => navigate('/login')} className="hover:text-atalaia-neon transition-colors">Central de Ajuda</button></li>
                <li><button onClick={() => setContactModalOpen(true)} className="hover:text-atalaia-neon transition-colors">Contato</button></li>
              </ul>
            </div>

            {/* Legal Column */}
            <div>
              <h4 className="text-white font-bold mb-6 uppercase text-xs tracking-widest">Legal</h4>
              <ul className="space-y-4">
                <li><button onClick={() => navigate('/terms')} className="hover:text-atalaia-neon transition-colors">Termos de Uso</button></li>
                <li><button onClick={() => navigate('/privacy')} className="hover:text-atalaia-neon transition-colors">Privacidade</button></li>
                <li><ImagePolicyButton variant="subtle" label="Política de Imagens" /></li>
                <li><button className="hover:text-atalaia-neon transition-colors">Cookies</button></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] uppercase tracking-widest font-medium opacity-60">
            <p>© 2026 ALIEN SISTEMAS DE SEGURANÇA ELETRÔNICA LTDA. • SERVIDORES SERVCAM • TODOS OS DIREITOS RESERVADOS.</p>
            <div className="flex gap-8">
              <span>CNPJ: 51.482.661/0001-31</span>
              <span>SERVIDORES SERVCAM</span>
              <span>BRASIL</span>
            </div>
          </div>
        </div>
      </footer>

      {/* MODAL DE IMPRESSÃO DE PLACA */}
      <Modal isOpen={plateModalOpen} onClose={() => setPlateModalOpen(false)}>
        <div className="p-4 sm:p-8 flex flex-col items-center">
            <div className="mb-6 text-center print:hidden">
                <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                    <Printer className="text-atalaia-neon" /> Placa de Segurança Residencial
                </h2>
                <p className="text-gray-400 text-sm">Design exclusivo para residências e propriedades colaboradoras.</p>
            </div>

            {/* AREA DA PLACA - DESIGN ALTAMENTE LUXUOSO, LIMPO E PROFISSIONAL */}
            <div 
                id="printable-plate"
                className="bg-[#070708] w-full max-w-[420px] aspect-[4/5] border-[18px] border-[#39ff14] rounded-[32px] p-6 sm:p-8 flex flex-col items-center justify-between text-white shadow-[0_0_60px_rgba(57,255,20,0.3)] relative overflow-hidden select-none"
                style={{ fontFamily: "'Inter', sans-serif" }}
            >
                {/* Efeito de marca d'água de proteção sutil em background */}
                <div className="absolute inset-0 opacity-[0.02] flex flex-wrap gap-12 justify-center items-center p-4 pointer-events-none">
                    {[...Array(6)].map((_, i) => (<ShieldCheck key={i} size={160} />))}
                </div>

                {/* Linha fina de contorno interno para acabamento de alta classe */}
                <div className="absolute inset-2 border border-white/5 rounded-[22px] pointer-events-none" />

                {/* Cabeçalho Superior */}
                <div className="w-full flex justify-between items-start gap-4 z-10">
                  <div className="flex items-center gap-3">
                    <div className="border-2 border-[#39ff14] p-2.5 rounded-2xl bg-[#39ff14]/10 text-[#39ff14] shadow-[0_0_15px_rgba(57,255,20,0.25)]">
                      <Home size={34} className="stroke-[2.5]" />
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black tracking-widest text-[#39ff14] uppercase leading-none">SISTEMA SERVCAM</h3>
                      <p className="text-[9px] sm:text-[10px] font-extrabold text-white/80 tracking-widest mt-1.5 uppercase">Segurança Residencial</p>
                    </div>
                  </div>

                  {/* Carimbo circular elegante de Vigilância Integrada */}
                  <div className="border-[3px] border-[#39ff14] bg-[#39ff14]/5 rounded-full p-2 text-center flex flex-col items-center justify-center w-[96px] h-[96px] sm:w-[104px] sm:h-[104px] shadow-[0_0_20px_rgba(57,255,20,0.15)] shrink-0 relative">
                    <div className="absolute inset-1 border border-[#39ff14]/20 rounded-full" />
                    <span className="text-[7px] font-black text-[#39ff14] uppercase tracking-widest leading-none">VIZINHO</span>
                    <span className="text-[11px] font-black text-white uppercase leading-none tracking-tight my-0.5">ALERTA</span>
                    <span className="text-[6px] font-bold text-white/60 uppercase tracking-widest leading-none mt-0.5">MONITORADO</span>
                    <span className="text-[10px] font-black text-[#39ff14] tracking-wider uppercase leading-none mt-1">24H</span>
                  </div>
                </div>

                {/* Banner Vermelho de Atenção e Dissuasão */}
                <div className="bg-[#d90429] border-[3px] border-red-500 rounded-2xl p-4 sm:p-5 text-center my-4 shadow-xl relative z-10 w-full transform hover:scale-[1.01] transition-transform">
                  <h4 className="text-base sm:text-lg font-black tracking-[0.15em] text-white mb-2 uppercase leading-none">ATENÇÃO!</h4>
                  <p className="text-[10.5px] sm:text-[11.5px] font-extrabold leading-relaxed text-white uppercase tracking-wide">
                    Este imóvel faz parte de uma Rede Inteligente de Armazenamento de Imagens. Qualquer atividade suspeita será fotografada e reportada de imediato ao grupo de vizinhos e às forças policiais.
                  </p>
                </div>

                {/* Painel Inferior em 3 colunas de Altíssimo Acabamento */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 items-stretch z-10 w-full">
                  
                  {/* Coluna 1: QR Code para Reportar/Contatar */}
                  <div className="bg-white text-black p-2 sm:p-2.5 rounded-2xl flex flex-col items-center justify-center text-center shadow-md border border-white/20">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 flex flex-col gap-0.5 bg-white p-0.5 border border-gray-300 mx-auto">
                      <div className="flex justify-between w-full">
                        <div className="w-4 h-4 bg-black p-0.5"><div className="w-full h-full bg-white p-0.5"><div className="w-full h-full bg-black"></div></div></div>
                        <div className="w-4 h-4 bg-black p-0.5"><div className="w-full h-full bg-white p-0.5"><div className="w-full h-full bg-black"></div></div></div>
                      </div>
                      <div className="flex justify-between items-end h-full w-full">
                        <div className="w-4 h-4 bg-black p-0.5"><div className="w-full h-full bg-white p-0.5"><div className="w-full h-full bg-black"></div></div></div>
                        <div className="w-4 h-4 flex flex-wrap gap-[1px]">
                          <div className="w-1.5 h-1.5 bg-black"></div><div className="w-1.5 h-1.5 bg-black"></div>
                          <div className="w-1.5 h-1.5 bg-black"></div><div className="w-1.5 h-1.5 bg-black"></div>
                        </div>
                      </div>
                    </div>
                    <span className="text-[6.5px] font-black leading-none uppercase mt-1.5 text-zinc-800 tracking-tighter">Aponte a Câmera</span>
                  </div>

                  {/* Coluna 2: Selo do Tipo de Propriedade Protegida */}
                  <div className="bg-[#111] border-2 border-[#39ff14]/40 text-white p-2 sm:p-2.5 rounded-2xl flex flex-col items-center justify-center text-center shadow-lg">
                    <ShieldCheck size={22} className="text-[#39ff14] mb-1.5 animate-pulse" />
                    <span className="text-[7.5px] font-black leading-tight uppercase text-white tracking-widest">IMÓVEL</span>
                    <span className="text-[6px] font-bold text-gray-400 uppercase mt-0.5">CADASTRADO</span>
                  </div>

                  {/* Coluna 3: Números Oficiais de Socorro Emergencial */}
                  <div className="bg-[#020202] border border-white/10 rounded-2xl p-2 flex flex-col justify-between">
                    <span className="text-[6px] font-extrabold tracking-widest text-gray-500 uppercase text-center mb-1">EMERGÊNCIAS</span>
                    <div className="flex flex-col gap-0.5">
                      <div className="bg-[#0f2a4a] text-white rounded-[4px] py-0.5 text-[7px] font-black text-center leading-none tracking-wider">POLÍCIA 190</div>
                      <div className="bg-[#851821] text-white rounded-[4px] py-0.5 text-[7px] font-black text-center leading-none tracking-wider">BOMB. 193</div>
                      <div className="bg-[#b58105] text-white rounded-[4px] py-0.5 text-[7px] font-black text-center leading-none tracking-wider">SAMU 192</div>
                    </div>
                  </div>
                </div>

                {/* Rodapé institucional oficial */}
                <div className="w-full flex justify-between items-center z-10 pt-1 border-t border-white/5 opacity-40">
                  <span className="text-[6px] font-bold tracking-widest text-white uppercase">VIGILÂNCIA COLABORATIVA</span>
                  <span className="text-[6px] font-mono tracking-wider text-[#39ff14]">WWW.ATALAIA.CLOUD</span>
                </div>
            </div>

            <div className="mt-8 flex gap-4 w-full sm:w-auto print:hidden">
                <Button onClick={handlePrintPlate} className="flex-1 sm:flex-none h-12 px-8 bg-[#39ff14] text-black hover:bg-white hover:text-black font-black shadow-lg shadow-[#39ff14]/15">
                    <Printer className="mr-2" /> IMPRIMIR AGORA
                </Button>
                <Button onClick={() => setPlateModalOpen(false)} variant="outline" className="flex-1 sm:flex-none h-12">FECHAR</Button>
            </div>
        </div>
      </Modal>

      {/* MODAL DE CONTATO */}
      <Modal isOpen={contactModalOpen} onClose={() => setContactModalOpen(false)}>
        <div className="p-4 sm:p-8 max-w-md w-full flex flex-col items-center justify-center text-center">
            <div className="mb-6">
                <div className="w-12 h-12 rounded-xl bg-atalaia-neon/10 border border-atalaia-neon/30 text-atalaia-neon flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(0,255,102,0.2)]">
                    <MessageCircle size={24} />
                </div>
                <h2 className="text-xl font-bold text-white mb-1">Fale Conosco</h2>
                <p className="text-gray-400 text-xs">Preencha os dados do remetente para enviar sua mensagem</p>
            </div>

            {contactSuccess ? (
                <div className="py-8 text-center space-y-4 animate-in zoom-in duration-300">
                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(34,197,94,0.5)]">
                        <Check size={32} className="text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Mensagem Enviada!</h3>
                    <p className="text-xs text-gray-300">Agradecemos o contato. Retornaremos em breve no e-mail informado.</p>
                </div>
            ) : (
                <form onSubmit={handleSendContact} className="w-full space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">Nome Completo</label>
                        <input
                            type="text"
                            required
                            placeholder="Seu nome"
                            value={contactName}
                            onChange={(e) => setContactName(e.target.value)}
                            className="w-full bg-black/60 border border-gray-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-atalaia-neon"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">E-mail do Remetente</label>
                        <input
                            type="email"
                            required
                            placeholder="seu@email.com"
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                            className="w-full bg-black/60 border border-gray-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-atalaia-neon"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">Sua Mensagem / Dúvida</label>
                        <textarea
                            required
                            rows={4}
                            placeholder="Como podemos ajudar?"
                            value={contactMessage}
                            onChange={(e) => setContactMessage(e.target.value)}
                            className="w-full bg-black/60 border border-gray-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-atalaia-neon"
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <Button
                            type="submit"
                            className="flex-1 py-3 bg-atalaia-neon text-black font-bold uppercase tracking-wider rounded-lg hover:bg-emerald-400"
                            disabled={contactLoading}
                        >
                            {contactLoading ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'Enviar Mensagem'}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setContactModalOpen(false)}
                            className="px-4 py-3"
                        >
                            Fechar
                        </Button>
                    </div>
                </form>
            )}
        </div>
      </Modal>

      {/* Botão WhatsApp Flutuante */}
      <a 
        href="https://wa.me/5548992067665" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-[60] flex items-center gap-3 bg-[#25D366] text-white px-5 py-3 rounded-full shadow-[0_10px_30px_rgba(37,211,102,0.5)] hover:scale-105 transition-transform group animate-in fade-in slide-in-from-bottom-10 duration-1000"
      >
        <div className="flex flex-col items-end leading-tight">
          <span className="text-[10px] font-black uppercase tracking-widest opacity-90">Estamos online</span>
          <span className="text-sm font-bold">Suporte Atalaia</span>
        </div>
        <div className="relative">
            <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-20"></div>
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center relative z-10">
                <MessageSquare size={22} fill="currentColor" />
            </div>
        </div>
      </a>
    </div>
  );
};

export default Landing;
