
import React, { useEffect, useState, useCallback } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/auth/context';
import { UserRole, Alert, Neighborhood, Notification, User, ServiceRequest, SupportTicket, Camera } from '@/types';
import { Card, Badge, Button, Modal, Input } from '@/components/UI';
import { UpgradeModal } from '@/components/UpgradeModal';
import { ContractSignature } from '@/components/ContractSignature';
import { MockService } from '@/services/mockService';
import { supabase } from '@/lib/supabaseClient';
import { 
    AlertTriangle, Video, Users, Activity, MapPin, Inbox, Copy, Trash2, 
    Heart, DollarSign, Loader2, Navigation, FileText, 
    Shield, Star, Lock, Send, Search, CheckCircle, UserCheck, XCircle,
    Wrench, MessageSquare, DoorOpen, LightbulbOff, Eye, ShieldAlert, UserX,
    VolumeX, Package, Droplet, Sparkles, Bell, Upload, Globe, ArrowRight, Play
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PaymentService } from '@/services/paymentService';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { openCameraPopup } from '@/lib/playerUtils';

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

// Custom Camera Icon for map markers
const CameraIcon = L.divIcon({
    className: 'custom-camera-marker',
    html: `<div style="background-color: #00FF66; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px rgba(0,255,102,0.6); border: 2px solid #000;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
           </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

// SATELLITE LAYER CONFIGURATION
const SATELLITE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const SATELLITE_ATTRIBUTION = 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';

const MapResizer = () => {
    const map = useMap();
    useEffect(() => {
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 100);
        return () => clearTimeout(timer);
    }, [map]);
    return null;
};

const MapBoundsSetter: React.FC<{ cameras: Camera[] }> = ({ cameras }) => {
    const map = useMap();
    useEffect(() => {
        if (cameras && cameras.length > 0) {
            const points = cameras.filter(c => c.lat !== undefined && c.lng !== undefined).map(c => [c.lat!, c.lng!] as [number, number]);
            if (points.length > 0) {
                const bounds = L.latLngBounds(points);
                // Use a slightly larger padding and a sensible maxZoom to focus
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
            }
        }
    }, [cameras, map]);
    return null;
};

const CameraPopupContent: React.FC<{ cam: Camera; onUpgrade: () => void }> = ({ cam, onUpgrade }) => {
  const [showLive, setShowLive] = useState(false);
  const { user } = useAuth();
  const isFreeResident = false;

  return (
    <div className="min-w-[280px]">
      <div className="flex items-center gap-2 mb-1">
          <Video size={16} />
          <strong className="text-sm">Câmera: {cam.name}</strong>
      </div>
      <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-green-600 font-bold animate-pulse">● EM OPERAÇÃO</span>
          <span className="text-[9px] text-gray-400 font-mono">{cam.lat?.toFixed(4)}, {cam.lng?.toFixed(4)}</span>
      </div>
      
      <div className="w-full aspect-video bg-black rounded-lg overflow-hidden border border-gray-200 shadow-inner mt-1 relative">
          {showLive ? (
              isFreeResident ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 px-4 text-center">
                    <Lock className="text-atalaia-neon/40 mb-2" size={24} />
                    <h4 className="text-white font-bold text-[10px] uppercase mb-1">Acesso Bloqueado</h4>
                    <p className="text-[8px] text-gray-500 mb-2">
                        Requer assinatura para monitorar.
                    </p>
                    <div className="flex flex-col gap-1 w-full">
                        <button 
                            onClick={onUpgrade}
                            className="bg-yellow-600 text-white text-[8px] font-black py-1 rounded uppercase"
                        >
                            Plano Família (R$ 29,90)
                        </button>
                        <button 
                            onClick={onUpgrade}
                            className="bg-atalaia-neon text-black text-[8px] font-black py-1 rounded uppercase"
                        >
                            Plano Prêmio (R$ 49,90)
                        </button>
                    </div>
                </div>
              ) : !cam.iframeCode || cam.iframeCode.trim() === '' ? (
                  <div className="w-full h-full relative flex flex-col items-center justify-center bg-[#0a0a0a] text-center overflow-hidden p-2">
                      {cam.maintenancePhotoUrl ? (
                          <>
                             <img src={cam.maintenancePhotoUrl} alt="Manutenção" className="absolute inset-0 w-full h-full object-cover" />
                          </>
                      ) : (
                          <>
                              <Wrench className="text-gray-500 mb-1 animate-pulse" size={24} />
                              <h4 className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Em Manutenção</h4>
                              <p className="text-[8px] text-gray-500 mt-1 max-w-[150px]">Em breve estará transmitindo.</p>
                          </>
                      )}
                  </div>
              ) : cam.iframeCode.trim().startsWith('<') ? (
                  <iframe 
                      srcDoc={`
                          <html>
                              <head>
                                  <style>
                                      body { margin: 0; padding: 0; background: black; overflow: hidden; display: flex; align-items: center; justify-content: center; height: 100vh; }
                                      video, iframe { width: 100%; height: 100%; object-fit: contain; border: none; }
                                  </style>
                              </head>
                              <body>${cam.iframeCode}</body>
                          </html>
                      `}
                      className="w-full h-full border-0 pointer-events-none"
                          allowFullScreen
                  />
              ) : (cam.iframeCode.trim().toLowerCase().startsWith('http://') || (cam.iframeCode.trim().startsWith('<') && cam.iframeCode.toLowerCase().includes('src="http://'))) ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 border border-amber-500/20 px-4 text-center">
                    <AlertTriangle className="text-amber-500 mb-1" size={20} />
                    <h4 className="text-white font-bold text-[9px] uppercase mb-1">Conteúdo Inseguro</h4>
                    <p className="text-[7px] text-gray-500 leading-tight mb-2">
                        O navegador bloqueia esse link <code className="text-amber-500">http</code> por segurança dentro do mapa.
                    </p>
                    <button 
                        onClick={() => openCameraPopup(cam.id, cam.name, cam.iframeCode)}
                        className="px-2 py-1 bg-atalaia-neon border border-black rounded-md text-[8px] font-black text-black hover:scale-105 transition-transform shadow-[0_0_10px_rgba(0,255,102,0.4)]"
                    >
                        ABRIR MONITOR
                    </button>
                </div>
              ) : (
                  <div className="relative w-full h-full group/map-cam">
                      <iframe 
                          src={cam.iframeCode} 
                          title={cam.name}
                          className="w-full h-full border-0 pointer-events-none"
                          allowFullScreen 
                          referrerPolicy="no-referrer"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/map-cam:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                          <button 
                              onClick={() => openCameraPopup(cam.id, cam.name, cam.iframeCode)}
                              className="pointer-events-auto bg-atalaia-neon text-black px-2 py-1 rounded text-[8px] font-black uppercase shadow-lg transform active:scale-95 transition-all"
                          >
                              Abrir Monitor
                          </button>
                      </div>
                  </div>
              )
          ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  {cam.locationPhotoUrl ? (
                      <img src={cam.locationPhotoUrl} className="w-full h-full object-cover" alt="Local do Poste" />
                  ) : (
                      <div className="text-center p-4">
                          <MapPin className="mx-auto text-gray-300 mb-2" size={24} />
                          <p className="text-gray-400 text-[10px] font-bold uppercase">Foto do poste não disponível</p>
                      </div>
                  )}
              </div>
          )}
          
          <button 
            onClick={() => setShowLive(!showLive)}
            className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white text-[9px] font-bold px-2 py-1 rounded backdrop-blur-sm border border-white/20 transition-all z-10"
          >
            {showLive ? 'Ver Foto do Poste' : (isFreeResident ? 'Desbloquear Câmera' : 'Ver Câmera ao Vivo')}
          </button>
      </div>
      <div className="mt-2 text-[9px] text-gray-500 italic text-center">
          {showLive ? (isFreeResident ? '🔒 Plano Premium Requerido' : 'Monitoramento em tempo real Atalaia') : 'Localização física do poste de monitoramento'}
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: SCR TACTICAL DASHBOARD ---
const SCRDashboard = ({ user, neighborhood }: { user: User, neighborhood?: Neighborhood }) => {
    const navigate = useNavigate();
    const [patrolLoading, setPatrolLoading] = useState(false);
    const [quickIncidents, setQuickIncidents] = useState<Alert[]>([]);
    const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
    
    // Resident Selection Logic
    const [residents, setResidents] = useState<User[]>([]);
    const [isResidentModalOpen, setIsResidentModalOpen] = useState(false);
    const [residentSearch, setResidentSearch] = useState('');
    const [pendingAction, setPendingAction] = useState<{type: 'CHECKIN' | 'LOG' | 'PANIC', note?: string} | null>(null);

    // Dynamic Feedback state for beautiful UX without browser-blocking alerts
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 5000);
    };

    useEffect(() => {
        const loadData = async () => {
             // Carrega incidentes
             const alerts = await MockService.getAlerts(user.neighborhoodId);
             setQuickIncidents(alerts.slice(0, 4));

             // Carrega solicitações VIP
             if (user.neighborhoodId) {
                  const requests = await MockService.getServiceRequests(user.neighborhoodId);
                  setServiceRequests(requests.filter(r => r.status === 'PENDING'));
                  
                  // Pre-load residents for selector
                  const users = await MockService.getUsers(user.neighborhoodId);
                  
                  // FILTRO: Mostrar TODOS os moradores do bairro no seletor para o Motovigia, alertando se é Premium ou Regular
                  setResidents(users.filter(u => u.role === UserRole.RESIDENT));
             }
        };
        loadData();
    }, [user.neighborhoodId]);

    const initiateAction = (type: 'CHECKIN' | 'LOG' | 'PANIC', note?: string) => {
        setPendingAction({ type, note });
        setIsResidentModalOpen(true);
    };

    const confirmAction = async (targetUserId?: string) => {
        if (!user.neighborhoodId || !pendingAction) return;
        setIsResidentModalOpen(false);
        setPatrolLoading(true);

        const targetUser = residents.find(r => r.id === targetUserId);
        const logNote = targetUser 
            ? `${pendingAction.note || 'AÇÃO'} - Ref: ${targetUser.name} (${targetUser.address})`
            : pendingAction.note || 'AÇÃO GERAL';

        try {
            if (pendingAction.type === 'CHECKIN') {
                 if ('geolocation' in navigator) {
                    navigator.geolocation.getCurrentPosition(async (position) => {
                        try {
                            
                        await MockService.registerPatrol(
                            user.id,
                            user.neighborhoodId!,
                            "RONDA PADRÃO - CHECK-IN",
                            position.coords.latitude,
                            position.coords.longitude,
                            targetUserId
                        );
                        
                            showToast(`Check-in de ronda concluído! ${targetUser ? `Notificação enviada para o WhatsApp de ${targetUser.name}.` : ''}`, 'success');
                        } catch (err: any) {
                            showToast("Erro ao registrar ronda: " + (err.message || 'Falha desconhecida'), 'error');
                        } finally {
                            setPatrolLoading(false);
                        }
                    }, (error) => {
                        showToast("Erro ao obter GPS: " + error.message, 'error');
                        setPatrolLoading(false);
                    });
                } else {
                    showToast("Recurso de GPS não suportado neste navegador.", 'error');
                    setPatrolLoading(false);
                }
            } else if (pendingAction.type === 'LOG') {
                try {
                    await MockService.registerPatrol(
                        user.id, 
                        user.neighborhoodId!, 
                        `OCORRÊNCIA: ${pendingAction.note}`,
                        undefined,
                        undefined,
                        targetUserId
                    );
                    showToast(`Registro inserido! ${targetUser ? `Alerta WhatsApp disparado para ${targetUser.name}.` : 'Ocorrência geral registrada.'}`, 'success');
                } catch (err: any) {
                    showToast("Erro ao registrar ocorrência: " + (err.message || 'Falha desconhecida'), 'error');
                } finally {
                    setPatrolLoading(false);
                }
                
                // Refresh local timeline
                const alerts = await MockService.getAlerts(user.neighborhoodId);
                setQuickIncidents(alerts.slice(0, 4));
            } else if (pendingAction.type === 'PANIC') {
                await MockService.createAlert({
                    type: 'DANGER',
                    userId: user.id,
                    userName: user.name,
                    neighborhoodId: user.neighborhoodId!,
                    userRole: UserRole.SCR,
                    message: logNote
                });
                showToast("🚨 Chamado tático e alerta geral enviados para a central!", 'success');
                setPatrolLoading(false);
            }
        } catch (e) {
            showToast("Erro de processamento no banco Atalaia.", 'error');
            setPatrolLoading(false);
        }
    };

    const filteredResidents = residents.filter(r => 
        r.name.toLowerCase().includes(residentSearch.toLowerCase()) ||
        (r.address && r.address.toLowerCase().includes(residentSearch.toLowerCase()))
    );

    return (
        <Layout>
            <div className="flex flex-col h-full gap-4">
                <div className="bg-atalaia-neon/10 border-l-4 border-atalaia-neon p-4 rounded-r-lg mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tighter uppercase flex items-center gap-2">
                            <ShieldCheckIcon /> PAINEL DO MOTOVIGIA
                        </h1>
                        <p className="text-atalaia-neon font-mono text-xs uppercase tracking-widest">
                            OPERADOR: {user.name} | BAIRRO: {neighborhood?.name || 'VILA INTEGRADA'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-widest">PATRULHA ATIVA</span>
                    </div>
                </div>

                {/* BIG BUTTONS FOR GLOVED HANDS */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button 
                        onClick={() => initiateAction('CHECKIN')}
                        disabled={patrolLoading}
                        className="h-28 sm:h-32 bg-emerald-950/70 hover:bg-emerald-900 active:bg-emerald-800 text-white rounded-xl border-2 border-emerald-500/50 hover:border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)] flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                    >
                        {patrolLoading ? <Loader2 className="animate-spin w-8 h-8 text-emerald-400" /> : <MapPin className="w-8 h-8 text-emerald-400" />}
                        <span className="text-xs sm:text-sm font-black uppercase tracking-wider">CHECK-IN RONDA</span>
                    </button>

                    <button 
                        onClick={() => initiateAction('PANIC')}
                        className="h-28 sm:h-32 bg-red-950/70 hover:bg-red-900 active:bg-red-800 text-white rounded-xl border-2 border-red-500/50 hover:border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.15)] flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                    >
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                        <span className="text-xs sm:text-sm font-black uppercase tracking-wider">PANICO / PERIGO</span>
                    </button>

                    <button 
                        id="btn-scr-view-cameras"
                        onClick={() => navigate('/cameras')}
                        className="h-28 sm:h-32 bg-cyan-950/70 hover:bg-cyan-900 active:bg-cyan-800 text-white rounded-xl border-2 border-atalaia-neon/60 hover:border-atalaia-neon shadow-[0_0_20px_rgba(0,240,255,0.2)] flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                    >
                        <Video className="w-8 h-8 text-atalaia-neon" />
                        <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-atalaia-neon">VER CÂMERAS</span>
                    </button>
                </div>



                {/* RESIDENT SELECTION MODAL */}
                <Modal isOpen={isResidentModalOpen} onClose={() => setIsResidentModalOpen(false)}>
                    <div className="p-5 font-sans">
                        <h2 className="text-lg font-black text-white uppercase tracking-tight mb-1 flex items-center gap-2">
                            <Users size={20} className="text-atalaia-neon" /> Vincular e Notificar Morador
                        </h2>
                        <p className="text-zinc-400 text-xs mb-5">
                            Selecione o morador correspondente. O sistema irá registrar o log da ronda e enviar um alerta completo de imediato via **WhatsApp** para proteger e notificar o morador.
                        </p>

                        <div className="relative mb-4">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                            <input 
                                type="text" 
                                placeholder="Discar nome ou endereço..."
                                value={residentSearch}
                                onChange={(e) => setResidentSearch(e.target.value)}
                                autoFocus
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-atalaia-neon focus:outline-none placeholder-zinc-600"
                            />
                        </div>

                        <div className="max-h-60 overflow-y-auto space-y-2 mb-5 pr-1">
                            {filteredResidents.map(resident => (
                                <div 
                                    key={resident.id}
                                    onClick={() => confirmAction(resident.id)}
                                    className="p-3 bg-zinc-900/40 hover:bg-zinc-900 border border-white/5 hover:border-atalaia-neon/30 rounded-xl cursor-pointer flex justify-between items-center group transition-all"
                                >
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-white font-bold text-sm group-hover:text-atalaia-neon transition-colors">{resident.name}</p>
                                            <Badge color="green" className="text-[9px] uppercase">
                                                PRÊMIO
                                            </Badge>
                                        </div>
                                        <p className="text-zinc-500 text-xs font-mono">{resident.address || 'Sem endereço registrado'}</p>
                                    </div>
                                    <div className="p-1 px-3 bg-zinc-950 group-hover:bg-atalaia-neon text-zinc-400 group-hover:text-black font-mono text-[10px] font-black uppercase rounded-lg transition-colors border border-white/5">
                                        Selecionar
                                    </div>
                                </div>
                            ))}
                            {filteredResidents.length === 0 && <p className="text-center text-zinc-500 py-6 text-xs">Nenhum morador localizado com este termo.</p>}
                        </div>

                        <Button onClick={() => confirmAction(undefined)} variant="outline" className="w-full uppercase text-xs tracking-wider py-3 rounded-xl">
                            Pular Seleção (Apenas Registro Geral no Setor)
                        </Button>
                    </div>
                </Modal>
            </div>

            {/* Premium Toast Notification System */}
            <AnimatePresence>
                {toast && (
                    <motion.div 
                        initial={{ opacity: 0, y: 50, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.95 }}
                        className={`fixed bottom-6 right-6 z-[80] p-4 rounded-xl shadow-2xl border flex items-center gap-3 backdrop-blur-md ${toast.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300' : 'bg-red-950/90 border-red-500/30 text-red-300'}`}
                    >
                        <CheckCircle size={18} className={toast.type === 'success' ? 'text-emerald-400' : 'text-red-400'} />
                        <span className="text-xs font-bold font-sans tracking-wide uppercase">{toast.msg}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </Layout>
    )
}

const ShieldCheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
)

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ alerts: 0, cameras: 0, users: 0 });
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [myNeighborhood, setMyNeighborhood] = useState<Neighborhood | undefined>();
  const [allNeighborhoods, setAllNeighborhoods] = useState<Neighborhood[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  
  // Donation State
  const [donationAmount, setDonationAmount] = useState('10.00');
  const [neighborhoodIntegrator, setNeighborhoodIntegrator] = useState<User | null>(null);
  const [processingDonation, setProcessingDonation] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Service Request Loading State
  const [requestLoading, setRequestLoading] = useState<string | null>(null);

  // Upgrade Modal visibility
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isPromoCheckoutLoading, setIsPromoCheckoutLoading] = useState(false);
  const [showPromoRedirectModal, setShowPromoRedirectModal] = useState(false);
  const [isManualVerifying, setIsManualVerifying] = useState(false);
  const [promoReceiptName, setPromoReceiptName] = useState('');
  const [promoReceiptBase64, setPromoReceiptBase64] = useState('');
  
  // POPUP FEEDBACK STATE
  const [feedback, setFeedback] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

  const [contractSigned, setContractSigned] = useState(false);

  useEffect(() => {
    if (user) {
      setContractSigned(localStorage.getItem(`atalaia_contract_signed_${user.id}`) !== null);
    }
  }, [user]);

  const [notifToDelete, setNotifToDelete] = useState<string | null>(null);
  const [notifUserToReject, setNotifUserToReject] = useState<{ notifId: string, pendingUserId: string } | null>(null);
  const [serviceToRequest, setServiceToRequest] = useState<'ESCORT' | 'EXTRA_ROUND' | 'TRAVEL_NOTICE' | null>(null);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);

  const handleDownloadReceipt = async () => {
    if (!user?.id) return;
    setDownloadingReceipt(true);
    try {
      // 1. Procurar no banco de dados por um pagamento desse usuário
      const { data: userPayments, error: dbError } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .order('payment_date', { ascending: false });

      if (dbError) throw dbError;

      if (!userPayments || userPayments.length === 0) {
        throw new Error("Comprovante de pagamento não encontrado no histórico.");
      }

      // Procurar algum p que tenha anexo ou pegar o mais recente
      const matchMonth = userPayments.find(p => p.reference_month?.includes("(Anexo:"));
      const paymentWithReceipt = userPayments.find(p => p.receipt_base64 || p.receipt_name) || matchMonth || userPayments[0];

      let receiptName = paymentWithReceipt.receipt_name || "comprovante.png";
      let receiptBase64 = paymentWithReceipt.receipt_base64;

      const match = paymentWithReceipt.reference_month?.match(/\(Anexo:\s*(.*?)\)/);
      if (match && (!receiptName || receiptName === "comprovante.png")) {
        receiptName = match[1];
      }

      // Se não tiver o base64 direto, tenta ler do localStorage como fallback de cache
      if (!receiptBase64) {
        receiptBase64 = localStorage.getItem(`receipt_data_${paymentWithReceipt.id}`) || null;
      }
      if (receiptName === "comprovante.png") {
        receiptName = localStorage.getItem(`receipt_name_${paymentWithReceipt.id}`) || "comprovante.png";
      }

      // Se ainda não tiver o base64, buscar nas configurações gerais (system_settings)
      if (!receiptBase64) {
        try {
          const { data: dataRow } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', `receipt_data_${paymentWithReceipt.id}`)
            .maybeSingle();
          if (dataRow && dataRow.value) {
            receiptBase64 = dataRow.value;
          }
        } catch (e) {}
      }
      if (!receiptBase64) {
        try {
          const { data: userReceiptIdRow } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', `user_receipt_id_${user.id}`)
            .maybeSingle();
          if (userReceiptIdRow && userReceiptIdRow.value) {
            const pId = userReceiptIdRow.value;
            const { data: dataRow } = await supabase
              .from('system_settings')
              .select('value')
              .eq('key', `receipt_data_${pId}`)
              .maybeSingle();
            if (dataRow && dataRow.value) {
              receiptBase64 = dataRow.value;
            }
          }
        } catch (e) {}
      }

      if (receiptName === "comprovante.png") {
        try {
          const { data: rowName } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', `receipt_name_${paymentWithReceipt.id}`)
            .maybeSingle();
          if (rowName && rowName.value) {
            receiptName = rowName.value;
          }
        } catch (e) {}
      }

      // 2. Se não possuir o base64, vamos tentar acessar o bucket 'receipts' do Supabase
      if (!receiptBase64) {
        try {
          const { data: blob, error: storageError } = await supabase
            .storage
            .from('receipts')
            .download(`${user.id}/${receiptName}`);

          if (storageError) {
            // Tenta outro padrão comum de bucket caso exista
            const { data: blobAlt, error: storageErrorAlt } = await supabase
              .storage
              .from('payments')
              .download(receiptName);
            
            if (storageErrorAlt) throw storageError; // repassa o erro original
            if (blobAlt) {
              const url = window.URL.createObjectURL(blobAlt);
              const a = document.createElement('a');
              a.href = url;
              a.download = receiptName;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
              return;
            }
          }

          if (blob) {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = receiptName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            return;
          }
        } catch (storageErr: any) {
          console.warn("Storage bucket error, falling back to database payload:", storageErr);
        }
      }

      // 3. Se obtivemos o base64, disparamos o download automático do base64
      if (receiptBase64) {
        const a = document.createElement('a');
        a.href = receiptBase64;
        a.download = receiptName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        throw new Error("Não foi possível carregar o arquivo ou dados do comprovante.");
      }
    } catch (err: any) {
      console.error("Erro ao baixar o comprovante:", err);
      // fallback mock download in case database is empty or bucket not created
      try {
        const fallbackBase64 = localStorage.getItem(`receipt_data_${user.id}`);
        const fallbackName = localStorage.getItem(`receipt_name_${user.id}`) || "comprovante.png";
        if (fallbackBase64) {
          const a = document.createElement('a');
          a.href = fallbackBase64;
          a.download = fallbackName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } else {
          alert("Não foi possível recuperar o comprovante do banco nem do armazenamento: " + (err.message || err));
        }
      } catch (e) {
        alert("Erro no download: " + (err.message || err));
      }
    } finally {
      setDownloadingReceipt(false);
    }
  };

  // Sincronização em segundo plano de comprovantes locais para a nuvem globalmente compartilhada
  useEffect(() => {
    const syncLocalReceiptsToDB = async () => {
      if (user?.role === 'RESIDENT') {
        try {
          const { data: userPayments } = await supabase
            .from('payments')
            .select('id')
            .eq('user_id', user.id);

          if (userPayments && userPayments.length > 0) {
            for (const payment of userPayments) {
              const localData = localStorage.getItem(`receipt_data_${payment.id}`);
              const localName = localStorage.getItem(`receipt_name_${payment.id}`) || "comprovante.png";

              if (localData) {
                const { data: existingRow } = await supabase
                  .from('system_settings')
                  .select('key')
                  .eq('key', `receipt_data_${payment.id}`)
                  .maybeSingle();

                if (!existingRow) {
                  await supabase.from('system_settings').upsert([{
                    key: `receipt_data_${payment.id}`,
                    value: localData
                  }]);
                  await supabase.from('system_settings').upsert([{
                    key: `receipt_name_${payment.id}`,
                    value: localName
                  }]);
                  await supabase.from('system_settings').upsert([{
                    key: `user_receipt_id_${user.id}`,
                    value: payment.id
                  }]);
                  console.log(`[Sync] Comprovante ${payment.id} sincronizado com sucesso.`);
                }
              }
            }
          }
        } catch (error) {
          console.warn("[Sync] Erro na sincronização de comprovantes:", error);
        }
      }
    };

    if (user) syncLocalReceiptsToDB();
  }, [user]);

  const fetchData = useCallback(async () => {
    try {
        // Fetch alerts
        const alerts = await MockService.getAlerts(user?.role === UserRole.ADMIN ? undefined : user?.neighborhoodId);
        setRecentAlerts(alerts.slice(0, 5));
        setStats(prev => ({ ...prev, alerts: alerts.length }));

        // Fetch Neighborhood Info
        const allHoods = await MockService.getNeighborhoods();
        setAllNeighborhoods(allHoods);

        if (user?.role === UserRole.ADMIN) {
          setStats(prev => ({ ...prev, cameras: allHoods.length, users: 154 })); // Mock user count
          
          // Fetch Admin Notifications
          const notifs = await MockService.getNotifications(); // All notifications for admin
          setNotifications(notifs);

          // Fetch Support Tickets
          const tickets = await MockService.getSupportTickets();
          setSupportTickets(tickets.filter(t => t.status !== 'CLOSED'));

        } else if (user?.role === UserRole.INTEGRATOR) {
          // Empresa Integradora gerencia exclusivamente seus próprios sistemas
          const myHoods = allHoods.filter(h => h.integratorId === user.id);
          if (myHoods.length > 0) {
            setMyNeighborhood(myHoods[0]);
          } else {
            setMyNeighborhood(undefined);
          }
          setStats(prev => ({ ...prev, cameras: myHoods.length, users: 0 }));
        } else if (user?.neighborhoodId) {
          const hood = await MockService.getNeighborhoodById(user.neighborhoodId);
          setMyNeighborhood(hood);
          setStats(prev => ({ ...prev, cameras: 1, users: 42 }));
        }

        // Check for Integrator to receive donations & custom co-branding Partner information
        if (user?.role === UserRole.RESIDENT) {
            const integrator = await MockService.getNeighborhoodIntegrator(user.neighborhoodId || '');
            setNeighborhoodIntegrator(integrator);
        }

        // Fetch user notifications
        if (user?.id) {
          const myNotifs = await MockService.getNotifications(user.id);
          setNotifications(myNotifs.filter(n => !n.read));
        }

        // Fetch All System Cameras
        const allCameras = await MockService.getAllSystemCameras();
        const filteredCameras = user?.role === UserRole.ADMIN
          ? allCameras
          : user?.role === UserRole.INTEGRATOR
            ? allCameras.filter(c => {
                const hood = allHoods.find(h => h.id === c.neighborhoodId);
                return hood?.integratorId === user.id;
              })
            : allCameras.filter(c => c.neighborhoodId === user?.neighborhoodId || c.neighborhoodId === user?.secondaryNeighborhoodId);
        setCameras(filteredCameras);
    } catch (e: any) {
        console.error("[Dashboard] Error fetching data:", e);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchData();

    const subAlerts = MockService.subscribeToTable('alerts', fetchData);
    const subNotifs = MockService.subscribeToTable('notifications', fetchData);
    const subHoods = MockService.subscribeToTable('neighborhoods', fetchData);
    const subTickets = MockService.subscribeToTable('support_tickets', fetchData);
    const subCameras = MockService.subscribeToTable('cameras', fetchData);

    return () => {
        supabase.removeChannel(subAlerts);
        supabase.removeChannel(subNotifs);
        supabase.removeChannel(subHoods);
        supabase.removeChannel(subTickets);
        supabase.removeChannel(subCameras);
    };
  }, [user, fetchData]);

  // --- RENDER TACTICAL DASHBOARD FOR SCR ---
  // if (user?.role === UserRole.SCR) {
  //     return <SCRDashboard user={user} neighborhood={myNeighborhood} />;
  // }
  
  const showFeedback = (msg: string, type: 'success' | 'error') => {
      setFeedback({ msg, type });
      setTimeout(() => setFeedback(null), 4000);
  };

  const executeDeleteNotification = async (id: string) => {
    await MockService.deleteNotification(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleDeleteNotification = async (id: string) => {
    setNotifToDelete(id);
  };

  const handleApproveFromNotification = async (notifId: string, pendingUserId: string) => {
      setActionLoading(notifId);
      try {
          await MockService.approveUser(pendingUserId);
          await MockService.deleteNotification(notifId);
          setNotifications(prev => prev.filter(n => n.id !== notifId));
          showFeedback('Acesso liberado com sucesso!', 'success');
      } catch (e: any) {
          showFeedback('Erro: ' + e.message, 'error');
      } finally {
          setActionLoading(null);
      }
  };

  const executeRejectFromNotification = async (notifId: string, pendingUserId: string) => {
      setActionLoading(notifId);
      try {
          await MockService.deleteUser(pendingUserId);
          await MockService.deleteNotification(notifId);
          setNotifications(prev => prev.filter(n => n.id !== notifId));
          showFeedback('Cadastro rejeitado e removido.', 'success');
      } catch (e: any) {
          showFeedback('Erro ao rejeitar: ' + e.message, 'error');
      } finally {
          setActionLoading(null);
      }
  };

  const handleRejectFromNotification = async (notifId: string, pendingUserId: string) => {
      setNotifUserToReject({ notifId, pendingUserId });
  };

  const handleDonation = async () => {
      if (!user || !neighborhoodIntegrator?.mpAccessToken) return;
      
      setProcessingDonation(true);
      try {
          const amount = parseFloat(donationAmount);
          if (isNaN(amount) || amount <= 0) throw new Error("Valor inválido");

          // Cria preferência de pagamento usando o TOKEN do INTEGRADOR
          const checkoutUrl = await PaymentService.createDonationPreference(
              amount, 
              user.email, 
              user.name, 
              neighborhoodIntegrator.mpAccessToken
          );
          
          window.location.href = checkoutUrl;
      } catch (error: any) {
          alert('Erro ao processar doação: ' + error.message);
          setProcessingDonation(false);
      }
  };

  const handlePromoCheckout = async () => {
      if (!user) return;
      setIsPromoCheckoutLoading(true);
      try {
          // Validamos e garantimos que o cupom promocional TESTE7DIAS5REAIS se aplica para o usuário
          const res = await MockService.validateCoupon('TESTE7DIAS5REAIS', user.id);
          if (!res.success) {
              throw new Error(res.message || "Você não está elegível para esta oferta.");
          }
          setShowPromoRedirectModal(true);
      } catch (error: any) {
          console.error("Erro ao resgatar oferta de R$ 5,00:", error);
          showFeedback(error.message || "Não foi possível processar a oferta promocional.", 'error');
      } finally {
          setIsPromoCheckoutLoading(false);
      }
  };

  const handleManualConfirmPayment = async () => {
      if (!user) return;
      
      // EXIGIR COMPROVANTE E AVISAR CLIENTE
      if (!promoReceiptBase64) {
          showFeedback("Por favor, anexe o comprovante de pagamento antes de prosseguir.", "error");
          return;
      }

      setIsManualVerifying(true);
      try {
          // Pequeno delay de carregamento simulado para conferência de comprovante
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const res = await MockService.manualConfirmPromoTrialPayment(user.id, promoReceiptName, promoReceiptBase64);
          if (res.success) {
              showFeedback("Pagamento de R$ 5,00 validado com sucesso! Plano Família de teste ativado.", "success");
              setTimeout(() => {
                  window.location.reload();
              }, 2000);
          } else {
              throw new Error(res.message);
          }
      } catch (error: any) {
          console.error("Erro ao validar pagamento manual de R$ 5,00:", error);
          showFeedback(error.message || "Não foi possível validar seu pagamento.", 'error');
          setIsManualVerifying(false);
      }
  };

  const executeRequestService = async (type: 'ESCORT' | 'EXTRA_ROUND' | 'TRAVEL_NOTICE') => {
      setRequestLoading(type);
      try {
          await MockService.createServiceRequest(user.id, user.name, user.neighborhoodId!, type);
          showFeedback("Solicitação enviada via WhatsApp para a Equipe Tática!", 'success');
      } catch (e) {
          showFeedback("Erro ao enviar solicitação.", 'error');
      } finally {
          setRequestLoading(null);
      }
  };

  const handleRequestService = async (type: 'ESCORT' | 'EXTRA_ROUND' | 'TRAVEL_NOTICE') => {
      if (!user || !user.neighborhoodId) return;
      if (user.plan !== 'PREMIUM') {
          setShowUpgradeModal(true);
          return;
      }
      setServiceToRequest(type);
  };

  const StatCard = ({ icon: Icon, label, value, color }: any) => (
    <Card className="p-6 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
      <div>
        <p className="text-gray-400 text-sm font-medium uppercase">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </Card>
  );

  const getDaysRemaining = () => {
      if (!user || !user.promoEnd) return 0;
      const promoEndMs = new Date(user.promoEnd).getTime();
      const nowMs = new Date().getTime();
      const diffMs = promoEndMs - nowMs;
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return Math.max(0, diffDays);
  };

  const getIntegratorWhatsAppUrl = () => {
      const rawPhone = neighborhoodIntegrator?.phone || '';
      let clean = rawPhone.replace(/\D/g, '');
      if (!clean) return null;
      if (clean.length === 10 || clean.length === 11) {
          clean = '55' + clean;
      }
      const integratorLabel = neighborhoodIntegrator?.companyName || neighborhoodIntegrator?.razaoSocial || neighborhoodIntegrator?.name || 'Empresa Integradora';
      const text = encodeURIComponent(`Olá ${integratorLabel}! Sou o cliente ${user?.name || ''} (${myNeighborhood?.name || 'ServCam'}) e gostaria de atendimento.`);
      return `https://wa.me/${clean}?text=${text}`;
  };

  const integratorWaUrl = getIntegratorWhatsAppUrl();

  const isTrialExpired = user?.role === UserRole.RESIDENT && (
      localStorage.getItem(`atalaia_trial_expired_${user.id}`) === 'true' || 
      (user.promoCoupon && !user.promoActive) ||
      (user.promoEnd && new Date(user.promoEnd) < new Date())
  );

  if (user?.role === UserRole.RESIDENT && isTrialExpired) {
      return (
          <Layout>
              <div className="flex flex-col items-center justify-center p-4 min-h-[70vh] text-center max-w-xl mx-auto animate-in fade-in duration-500">
                  <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 text-red-500 rounded-2xl flex items-center justify-center mb-6 animate-pulse">
                      <Lock size={32} />
                  </div>
                  <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-3">
                      Seu Período de Testes Expirou
                  </h2>
                  <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                      Seu período exclusivo de testes de 7 dias com funções superiores do <strong>Plano Família</strong> chegou ao fim. Para continuar desfrutando de recursos como câmeras ao vivo, patrulha interativa e alertas de pânico para sua família, ative um plano definitivo.
                  </p>
                  
                  <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl mb-8 text-left space-y-3 w-full">
                      <div className="flex items-center justify-between text-xs text-zinc-300">
                          <span>Plano de Teste:</span>
                          <span className="text-red-500 font-bold uppercase tracking-wide">Expirado / Bloqueado</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-zinc-300">
                          <span>Status de Acesso:</span>
                          <span>Apenas Planos Pagos Disponíveis</span>
                      </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 w-full">
                      <Button
                          onClick={() => setShowUpgradeModal(true)}
                          className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase text-xs tracking-wider py-4 rounded-xl shadow-lg cursor-pointer flex items-center justify-center"
                      >
                          💳 Ativar Plano Pago / Upgrade
                      </Button>
                      <Button
                          variant="outline"
                          onClick={() => {
                              localStorage.clear();
                              window.location.href = '/#/login';
                              window.location.reload();
                          }}
                          className="w-full text-zinc-400 border-white/10 hover:bg-white/5 text-xs font-bold cursor-pointer"
                      >
                          Sair da Conta
                      </Button>
                  </div>
              </div>
              
              <UpgradeModal 
                  isOpen={showUpgradeModal} 
                  onClose={() => setShowUpgradeModal(false)} 
              />
          </Layout>
      );
  }

  return (
    <Layout>
      {/* POPUP FEEDBACK TOAST */}
      {feedback && (
            <div className={`
                fixed bottom-6 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-right-10 duration-300
                ${feedback.type === 'success' ? 'bg-[#0f1a12] border-atalaia-neon text-white' : 'bg-red-900/90 border-red-500 text-white'}
            `}>
                <div className={`p-2 rounded-full ${feedback.type === 'success' ? 'bg-atalaia-neon text-black' : 'bg-red-500 text-white'}`}>
                    {feedback.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
                </div>
                <div>
                    <h4 className="font-bold text-sm uppercase">{feedback.type === 'success' ? 'Sucesso' : 'Erro'}</h4>
                    <p className="text-sm text-gray-300">{feedback.msg}</p>
                </div>
            </div>
      )}
    
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-white mb-2">Painel de Controle</h1>
            <p className="text-gray-400">Bem-vindo, {user?.name}. Sistema operacional e vigilante.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {myNeighborhood && (
                <div className="px-4 py-2 bg-atalaia-neon/10 border border-atalaia-neon/20 rounded-full text-atalaia-neon text-sm font-bold flex items-center gap-2">
                    <MapPin size={16} />
                    {user?.role === UserRole.INTEGRATOR 
                        ? `Sistemas Gerenciados: ${stats.cameras}`
                        : user?.secondaryNeighborhoodId 
                            ? `Sistemas: ${myNeighborhood.name} + 1` 
                            : `Sistema: ${myNeighborhood.name}`}
                </div>
          )}
        </div>
      </div>

      {/* PROMINENT ACTION CARD: QUERO VER MINHAS CÂMERAS */}
      <div className="mb-6 sm:mb-8 animate-in slide-in-from-top-4">
        <button
          id="btn-dashboard-view-cameras"
          onClick={() => navigate('/cameras')}
          className="w-full text-left p-4 sm:p-6 md:p-7 rounded-2xl border-2 border-atalaia-neon/50 hover:border-atalaia-neon shadow-[0_0_35px_rgba(0,0,0,0.8)] hover:shadow-[0_0_40px_rgba(var(--atalaia-neon-rgb,0,255,102),0.25)] transition-all duration-300 group relative overflow-hidden flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 sm:gap-6 cursor-pointer transform hover:-translate-y-0.5 active:scale-[0.99]"
          style={{ backgroundColor: '#090b10' }}
        >
          {/* Subtle Ambient Glows */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-atalaia-neon/10 rounded-full blur-[90px] -translate-y-1/2 translate-x-1/3 pointer-events-none group-hover:bg-atalaia-neon/20 transition-all duration-500" />
          <div className="absolute bottom-0 left-10 w-48 h-48 bg-emerald-500/5 rounded-full blur-[70px] pointer-events-none" />

          {/* Left info & Icon */}
          <div className="flex items-start sm:items-center gap-3.5 sm:gap-5 relative z-10 w-full md:w-auto">
            <div className="relative shrink-0">
              <div className="w-13 h-13 sm:w-16 sm:h-16 rounded-2xl bg-black/80 border border-atalaia-neon/40 flex items-center justify-center text-atalaia-neon shadow-[0_0_20px_rgba(var(--atalaia-neon-rgb,0,255,102),0.25)] group-hover:scale-105 group-hover:bg-atalaia-neon group-hover:text-black transition-all duration-300">
                <Video size={26} className="shrink-0 sm:hidden" />
                <Video size={30} className="shrink-0 hidden sm:block" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-black"></span>
              </span>
            </div>

            <div className="space-y-1.5 sm:space-y-2.5 min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1 rounded-full bg-black/90 border border-atalaia-neon/60 text-atalaia-neon text-[10px] sm:text-xs font-black tracking-widest uppercase shadow-md">
                  <span className="w-2 h-2 rounded-full bg-atalaia-neon animate-ping"></span>
                  Transmissão ao Vivo
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1 rounded-full bg-black/90 border border-white/20 text-[10px] sm:text-xs shadow-md">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-emerald-400 font-black">{cameras.length}</span>
                  <span className="text-zinc-200 font-bold">{cameras.length === 1 ? 'Câmera Ativa' : 'Câmeras Ativas'}</span>
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight group-hover:text-atalaia-neon transition-colors drop-shadow-md">
                Quero ver minhas câmeras
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300 max-w-xl font-medium leading-relaxed drop-shadow-sm line-clamp-2 sm:line-clamp-none">
                Acesse o painel de monitoramento em tempo real do seu sistema, gerencie gravações em nuvem e solicite imagens diretamente pelo sistema.
              </p>
            </div>
          </div>

          {/* Right Action CTA Button */}
          <div className="relative z-10 w-full md:w-auto shrink-0 flex items-center justify-end">
            <div className="w-full md:w-auto px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl bg-atalaia-neon text-black font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(var(--atalaia-neon-rgb,0,255,102),0.4)] group-hover:shadow-[0_0_35px_rgba(var(--atalaia-neon-rgb,0,255,102),0.6)] group-hover:scale-105 transition-all duration-300">
              <Play size={16} fill="black" />
              <span>Acessar Câmeras</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </button>
      </div>

       {/* ACTIVE TRIAL COUNTDOWN WARNING BANNER */}
      {user?.role === UserRole.RESIDENT && user?.promoActive && user?.promoEnd && (
          <div className="mb-8 p-4 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-500/15 border border-yellow-500/20 text-yellow-500 rounded-xl flex items-center justify-center shrink-0 animate-pulse">
                      <Sparkles size={20} />
                  </div>
                  <div>
                      <h4 className="font-bold text-sm text-yellow-500 flex items-center gap-1.5">
                          Atalaia - Período de Testes do Plano Família
                      </h4>
                      <p className="text-xs text-zinc-300 mt-0.5">
                          Você ainda tem <strong>{getDaysRemaining()} {getDaysRemaining() === 1 ? 'dia' : 'dias'}</strong> de teste para desfrutar de toda a segurança premium!
                      </p>
                  </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                  <button
                      onClick={handleDownloadReceipt}
                      disabled={downloadingReceipt}
                      className="px-4 py-2 bg-zinc-900 border border-white/10 hover:border-zinc-800 text-zinc-300 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                      {downloadingReceipt ? (
                          <>
                              <Loader2 size={13} className="animate-spin text-yellow-500" />
                              Buscando...
                          </>
                      ) : (
                          <>
                              <FileText size={13} className="text-yellow-500" />
                              Baixar Comprovante
                          </>
                      )}
                  </button>
                  <Button
                      onClick={() => setShowUpgradeModal(true)}
                      className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shrink-0 cursor-pointer"
                  >
                      Fixar Plano Definitivo
                  </Button>
              </div>
          </div>
      )}

      {/* WARNING REMINDER: CONTRACT SIGNATURE PENDING */}
      {user?.role === UserRole.RESIDENT && !contractSigned && (
          <div className="mb-8 p-4 bg-yellow-500/10 border-2 border-dashed border-yellow-500/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top-4">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-500/20 text-yellow-500 rounded-xl">
                      <AlertTriangle size={20} />
                  </div>
                  <div>
                      <h4 className="font-bold text-sm text-white">Pendência de Segurança: Contrato de Adesão</h4>
                      <p className="text-xs text-zinc-400 mt-0.5">O contrato Atalaia SaaS está pendente de sua assinatura eletrônica ativa e verificação digital.</p>
                  </div>
              </div>
              <a 
                  href="#contrato-adesao-morador" 
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shrink-0 text-center"
              >
                  Assinar Agora
              </a>
          </div>
      )}

      {/* DONATION CARD (Only for FREE Residents with Integrator Configured) */}
      {user?.role === UserRole.RESIDENT && user?.plan === 'FREE' && neighborhoodIntegrator?.mpAccessToken && (
          <div className="mb-8 animate-in slide-in-from-top-4">
              <Card className="p-6 bg-gradient-to-r from-emerald-950/40 to-zinc-900/40 border-atalaia-neon/30 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-atalaia-neon/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                  
                   <div className="flex items-start gap-4 relative z-10">
                      <div className="p-1 bg-white/5 rounded-2xl border border-white/20 shrink-0 flex items-center justify-center overflow-hidden w-16 h-16">
                          {neighborhoodIntegrator.companyLogo ? (
                              <img referrerPolicy="no-referrer" src={neighborhoodIntegrator.companyLogo} alt="Logo" className="w-full h-full object-cover rounded-xl bg-zinc-800" />
                          ) : (
                              <div className="p-3">
                                  <Heart size={28} className="text-atalaia-neon" fill="currentColor" />
                              </div>
                          )}
                      </div>
                      <div>
                          <h2 className="text-xl font-bold text-white mb-2">Apoie a Segurança do seu Bairro</h2>
                          <p className="text-gray-300 text-sm max-w-lg leading-relaxed">
                              O plano gratuito é mantido sob esforço comunitário voluntário. Contribua com qualquer valor para ajudar nosso integrador parceiro 
                              <strong className="text-atalaia-neon font-black"> {neighborhoodIntegrator.companyName || neighborhoodIntegrator.name}</strong> a manter ativa a infraestrutura e os motovigias locais.
                          </p>
                      </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto relative z-10">
                      <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</span>
                          <input 
                              type="number" 
                              value={donationAmount}
                              onChange={e => setDonationAmount(e.target.value)}
                              className="w-32 bg-black/50 border border-atalaia-neon/30 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-atalaia-neon font-bold"
                              min="1"
                              step="0.01"
                          />
                      </div>
                      <Button onClick={handleDonation} disabled={processingDonation} className="bg-atalaia-neon hover:bg-atalaia-neon/90 text-black font-bold shadow-atalaia-neon/20 whitespace-nowrap h-[46px]">
                          {processingDonation ? <Loader2 className="animate-spin" /> : <><DollarSign size={18} /> Doar Agora</>}
                      </Button>
                  </div>
              </Card>
          </div>
      )}

      {/* VIP SUPPORT CARD REMOVED */}
      {false && user?.plan === 'PREMIUM' && user?.role === UserRole.RESIDENT && (
        <Card className="p-6 mb-8 border-atalaia-neon/30 bg-atalaia-neon/5 animate-in slide-in-from-top-4">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-white">
                <Star className="text-atalaia-neon" size={20} fill="currentColor" />
                Apoio Tático VIP
            </h2>
            <p className="text-sm text-gray-400 mb-6">
                Como assinante Prêmio, você tem acesso direto à equipe de Motovigia (SCR) para serviços exclusivos.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <Button onClick={() => handleRequestService('ESCORT')} disabled={!!requestLoading} className="bg-atalaia-neon/20 border border-atalaia-neon/50 hover:bg-atalaia-neon/40 text-atalaia-neon font-bold">
                     {requestLoading === 'ESCORT' ? <Loader2 className="animate-spin mr-2" size={18} /> : <Shield size={18} className="mr-2"/>} Solicitar Escolta
                 </Button>
                 <Button onClick={() => handleRequestService('EXTRA_ROUND')} disabled={!!requestLoading} className="bg-atalaia-neon/20 border border-atalaia-neon/50 hover:bg-atalaia-neon/40 text-atalaia-neon font-bold">
                     {requestLoading === 'EXTRA_ROUND' ? <Loader2 className="animate-spin mr-2" size={18} /> : <Navigation size={18} className="mr-2"/>} Ronda Extra no Local
                 </Button>
                 <Button onClick={() => handleRequestService('TRAVEL_NOTICE')} disabled={!!requestLoading} className="bg-atalaia-neon/20 border border-atalaia-neon/50 hover:bg-atalaia-neon/40 text-atalaia-neon font-bold">
                     {requestLoading === 'TRAVEL_NOTICE' ? <Loader2 className="animate-spin mr-2" size={18} /> : <MapPin size={18} className="mr-2"/>} Aviso de Viagem
                 </Button>
            </div>
        </Card>
      )}

          {/* GESTÃO GERAL (ADMIN ONLY) */}
          {user?.role === UserRole.ADMIN && (
              <Card className="p-4 sm:p-6 mb-6 sm:mb-8 border-atalaia-neon/30 bg-atalaia-neon/5 animate-in slide-in-from-top-4">
                  <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 mb-3 sm:mb-4 text-white">
                      <Shield className="text-atalaia-neon" size={20} />
                      Atalhos Administrativos
                  </h2>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                      <Button onClick={() => navigate('/admin/whatsapp')} className="h-11 sm:h-12 bg-green-600/20 border border-green-500/40 hover:bg-green-600/30 text-green-400 font-bold text-xs sm:text-sm px-2 flex items-center justify-center">
                          <MessageSquare size={16} className="mr-1.5 shrink-0"/> <span className="truncate">Central WhatsApp</span>
                      </Button>
                      <Button onClick={() => navigate('/integrator/users')} className="h-11 sm:h-12 bg-blue-600/20 border border-blue-500/40 hover:bg-blue-600/30 text-blue-400 font-bold text-xs sm:text-sm px-2 flex items-center justify-center">
                          <Users size={16} className="mr-1.5 shrink-0"/> <span className="truncate">Gestão Clientes</span>
                      </Button>
                      <Button onClick={() => navigate('/admin/financial')} className="h-11 sm:h-12 bg-yellow-600/20 border border-yellow-500/40 hover:bg-yellow-600/30 text-yellow-400 font-bold text-xs sm:text-sm px-2 flex items-center justify-center">
                          <DollarSign size={16} className="mr-1.5 shrink-0"/> <span className="truncate">Financeiro</span>
                      </Button>
                      <Button onClick={() => navigate('/cameras')} className="h-11 sm:h-12 bg-atalaia-neon/20 border border-atalaia-neon/40 hover:bg-atalaia-neon/30 text-atalaia-neon font-bold text-xs sm:text-sm px-2 flex items-center justify-center">
                          <Video size={16} className="mr-1.5 shrink-0"/> <span className="truncate">Config. Câmeras</span>
                      </Button>
                  </div>
              </Card>
          )}

          {/* SUPPORT TICKETS FEED (Admins only) */}
      {user?.role === UserRole.ADMIN && supportTickets.length > 0 && (
          <Card className="p-4 sm:p-6 mb-6 sm:mb-8 border-atalaia-neon/30 bg-atalaia-neon/5">
              <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 mb-4 text-white uppercase italic tracking-tighter">
                  <Wrench className="text-atalaia-neon" size={20} />
                  Chamados de Suporte Técnico
                  <Badge color="blue">{supportTickets.length}</Badge>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {supportTickets.map(ticket => {
                          const isRtmpTicket = /rtmp/i.test(ticket.message);
                          const cameraMatch = ticket.message.match(/Câmera:\s*"?([^"\n]+)"?/i);
                          const extractedCameraName = cameraMatch ? cameraMatch[1].trim() : '';
                          const systemMatch = ticket.message.match(/Sistema:\s*"?([^"\n]+)"?/i);
                          const hoodObj = allNeighborhoods.find(h => h.id === ticket.neighborhoodId);
                          const extractedSystemName = systemMatch ? systemMatch[1].trim() : (hoodObj ? hoodObj.name : 'Sistema Não Especificado');
                          const rtmpMatch = ticket.message.match(/(rtmp:\/\/[^\s]+)/i);
                          const extractedRtmpUrl = rtmpMatch ? rtmpMatch[1].trim() : '';

                          return (
                          <div key={ticket.id} className="bg-black/60 p-4 rounded-2xl border border-white/10 flex flex-col justify-between space-y-3">
                              <div>
                                  <div className="flex justify-between items-start mb-2">
                                      <Badge color={ticket.status === 'OPEN' ? 'red' : 'yellow'}>
                                          {ticket.status === 'OPEN' ? 'ABERTO' : 'EM ATENDIMENTO'}
                                      </Badge>
                                      <span className="text-[10px] text-gray-500">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                                  </div>
                                  <p className="text-sm text-white font-bold mb-1">{ticket.userName}</p>
                                  <p className="text-xs text-gray-400 line-clamp-4 mb-3 italic bg-white/5 p-2 rounded-lg border border-white/5 font-mono">
                                      "{ticket.message}"
                                  </p>

                                  {isRtmpTicket && (
                                      <div className="mb-3 p-2.5 bg-emerald-950/30 border border-atalaia-neon/30 rounded-xl space-y-2">
                                          <div className="text-[10px] font-black uppercase text-atalaia-neon tracking-wider flex items-center gap-1 font-mono">
                                              <Video size={12} />
                                              <span>Solicitação de Configuração RTMP</span>
                                          </div>
                                          
                                          <Button
                                              type="button"
                                              onClick={async () => {
                                                  const copyPayload = `Sistema: ${extractedSystemName}\nCâmera: ${extractedCameraName || 'Sem Nome'}\nLink RTMP: ${extractedRtmpUrl || ticket.message}`;
                                                  try {
                                                      await navigator.clipboard.writeText(copyPayload);
                                                      setFeedback({
                                                          msg: `✅ Informações do RTMP copiadas com sucesso!\n\n• Sistema: ${extractedSystemName}\n• Câmera: ${extractedCameraName || 'Sem Nome'}\n• Link RTMP: ${extractedRtmpUrl || ticket.message}`,
                                                          type: 'success'
                                                      });
                                                  } catch (err) {
                                                      setFeedback({
                                                          msg: `✅ Copiado:\n\n${copyPayload}`,
                                                          type: 'success'
                                                      });
                                                  }
                                              }}
                                              className="w-full text-[10px] h-8 bg-atalaia-neon/10 border border-atalaia-neon/40 hover:bg-atalaia-neon/20 text-atalaia-neon font-bold flex items-center justify-center gap-1.5"
                                          >
                                              <Copy size={12} />
                                              <span>Copiar Link RTMP e Dados</span>
                                          </Button>

                                          <Button
                                              type="button"
                                              onClick={async () => {
                                                  const camName = extractedCameraName || 'camera';
                                                  const slug = camName
                                                      .toLowerCase()
                                                      .normalize("NFD")
                                                      .replace(/[\u0300-\u036f]/g, "")
                                                      .replace(/[^a-z0-9]/g, "");
                                                  const playerUrl = `https://servcam.com.br:4433/${slug || 'eonomedacamera'}.mp4`;

                                                  // Localiza o sistema (bairro) exato a partir da solicitação
                                                  let targetHood = allNeighborhoods.find(h => h.id === ticket.neighborhoodId);
                                                  if (!targetHood && extractedSystemName) {
                                                      const cleanSys = extractedSystemName.toLowerCase().trim();
                                                      targetHood = allNeighborhoods.find(h => h.name.toLowerCase().trim() === cleanSys);
                                                  }
                                                  if (!targetHood && ticket.userId) {
                                                      targetHood = allNeighborhoods.find(h => h.integratorId === ticket.userId);
                                                  }

                                                  let hoodId = targetHood ? targetHood.id : (ticket.neighborhoodId || 'hood-demo-1');

                                                  // Se não existir um sistema cadastrado para esse nome, cria o sistema automaticamente para vinculação perfeita
                                                  if (!targetHood && extractedSystemName && extractedSystemName !== 'Sistema Não Especificado') {
                                                      try {
                                                          const newHood = await MockService.createNeighborhood(
                                                              extractedSystemName,
                                                              'Sistema monitorado ServCam.',
                                                              '',
                                                              ticket.userId
                                                          );
                                                          if (newHood && newHood.id) {
                                                              hoodId = newHood.id;
                                                          }
                                                      } catch (_) {}
                                                  }

                                                  const existingCams = await MockService.getAdditionalCameras(hoodId);
                                                  const matchCam = existingCams.find(c => 
                                                      c.name.toLowerCase().trim() === camName.toLowerCase().trim() ||
                                                      c.name.toLowerCase().replace(/[^a-z0-9]/g, '') === slug
                                                  );

                                                  if (matchCam) {
                                                      await MockService.updateCamera(
                                                          matchCam.id, 
                                                          matchCam.name, 
                                                          playerUrl, 
                                                          matchCam.lat, 
                                                          matchCam.lng, 
                                                          matchCam.locationPhotoUrl, 
                                                          matchCam.maintenancePhotoUrl, 
                                                          hoodId
                                                      );
                                                  } else {
                                                      await MockService.addCamera(hoodId, camName, playerUrl);
                                                  }

                                                  // Também garante que a lista local de câmeras disparará atualização para os componentes em escuta
                                                  if (typeof window !== 'undefined') {
                                                      window.dispatchEvent(new Event('atalaia_cameras_updated'));
                                                  }

                                                  await MockService.updateSupportTicketStatus(ticket.id, 'CLOSED');
                                                  await fetchData();

                                                  setFeedback({
                                                      msg: `✅ Link HTTPS do Player gerado e enviado com sucesso ao Integrador!\n\n• Sistema: ${extractedSystemName || (targetHood?.name ?? 'Sistema Monitorado')}\n• Câmera: ${camName}\n• Link do Player: ${playerUrl}\n\n🕒 A câmera estará online em um prazo de 1 a 24 horas.\n\nO link já aparece preenchido e configurado no painel do integrador.`,
                                                      type: 'success'
                                                  });
                                              }}
                                              className="w-full text-[10px] h-8 bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-1.5"
                                          >
                                              <Play size={12} />
                                              <span>Enviar Link para Gerar Player</span>
                                          </Button>
                                      </div>
                                  )}
                          </div>
                          <div className="flex gap-2 pt-1 border-t border-white/5">
                              <Button 
                                onClick={async () => {
                                    await MockService.updateSupportTicketStatus(ticket.id, 'IN_PROGRESS');
                                    fetchData();
                                }}
                                disabled={ticket.status === 'IN_PROGRESS'}
                                className="flex-1 text-[10px] h-8 bg-blue-600 hover:bg-blue-500"
                              >
                                ATENDER
                              </Button>
                              <Button 
                                onClick={async () => {
                                    await MockService.updateSupportTicketStatus(ticket.id, 'CLOSED');
                                    fetchData();
                                }}
                                className="flex-1 text-[10px] h-8 bg-black border border-white/20 hover:bg-white/5"
                              >
                                CONCLUIR
                              </Button>
                          </div>
                      </div>
                  )})}
              </div>
          </Card>
      )}

      {/* NOTIFICATIONS FEED */}
      {notifications.length > 0 && (
          <Card className="p-6 mb-8 border-atalaia-neon/30 bg-atalaia-neon/5">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-white">
                  <Inbox className="text-atalaia-neon" size={20} />
                  Minhas Notificações
                  <Badge color="green">{notifications.length}</Badge>
              </h2>
              <div className="space-y-4">
                  {notifications
                    // FILTER 1: Hide protocol submissions from non-admins
                    .filter(notif => user?.role === UserRole.ADMIN || notif.type !== 'PROTOCOL_SUBMISSION')
                    // FILTER 2: Hide REGISTRATION_REQUEST from non-admins (Double check safety)
                    .filter(notif => user?.role === UserRole.ADMIN || notif.type !== 'REGISTRATION_REQUEST')
                    .map(notif => (
                      <div key={notif.id} className="bg-black/50 p-4 rounded-lg border border-white/10 group">
                          <div className="flex justify-between items-start mb-2">
                              <div>
                                  <h4 className="font-bold text-white text-sm">{notif.title}</h4>
                                  <p className="text-xs text-gray-400">De: {notif.fromUserName} • {new Date(notif.timestamp).toLocaleString()}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs bg-atalaia-accent text-white px-2 py-0.5 rounded">Novo</span>
                                <button 
                                    onClick={() => handleDeleteNotification(notif.id)}
                                    className="p-1 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                    title="Excluir notificação"
                                >
                                    <Trash2 size={16} className="pointer-events-none" />
                                </button>
                              </div>
                          </div>
                          <p className="text-sm text-gray-300 mb-3">{notif.message}</p>
                          
                          {/* ACTION BUTTONS FOR REGISTRATION REQUEST */}
                          {notif.type === 'REGISTRATION_REQUEST' && notif.data?.pendingUserId ? (
                              <div className="flex gap-2 mt-3 animate-in fade-in">
                                  <Button 
                                    onClick={() => handleApproveFromNotification(notif.id, notif.data.pendingUserId)} 
                                    disabled={actionLoading === notif.id}
                                    className="bg-green-600 hover:bg-green-500 text-xs py-1 h-auto"
                                  >
                                      {actionLoading === notif.id ? <Loader2 size={14} className="animate-spin" /> : <><UserCheck size={14} className="mr-1"/> Aprovar Acesso</>}
                                  </Button>
                                  <Button 
                                    onClick={() => handleRejectFromNotification(notif.id, notif.data.pendingUserId)} 
                                    disabled={actionLoading === notif.id}
                                    className="bg-red-600 hover:bg-red-500 text-xs py-1 h-auto"
                                  >
                                      <XCircle size={14} className="mr-1"/> Rejeitar
                                  </Button>
                              </div>
                          ) : notif.type === 'REGISTRATION_REQUEST' && (
                              <div className="mt-2 text-xs text-yellow-500 italic bg-yellow-900/20 p-2 rounded">
                                  Nota: Aprove este usuário manualmente em "Gestão Geral do Sistema" caso os botões não apareçam (notificação antiga).
                              </div>
                          )}

                          {notif.type === 'PROTOCOL_SUBMISSION' && notif.data && (
                              <div className="space-y-2 mt-2">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      <div className="bg-black p-2 rounded border border-gray-800 flex items-center justify-between">
                                          <code className="text-xs text-atalaia-neon truncate mr-2">{notif.data.rtmp}</code>
                                          <button onClick={() => navigator.clipboard.writeText(notif.data.rtmp)} title="Copiar RTMP"><Copy size={14} className="text-gray-500 hover:text-white"/></button>
                                      </div>
                                      <div className="bg-black p-2 rounded border border-gray-800 flex items-center justify-between">
                                          <code className="text-xs text-blue-400 truncate mr-2">{notif.data.rtsp}</code>
                                          <button onClick={() => navigator.clipboard.writeText(notif.data.rtsp)} title="Copiar RTSP"><Copy size={14} className="text-gray-500 hover:text-white"/></button>
                                      </div>
                                  </div>
                                  
                                  {/* Coordinates Display */}
                                  {(notif.data.lat || notif.data.lng) && (
                                    <div className="grid grid-cols-2 gap-2">
                                         <div className="bg-black p-2 rounded border border-gray-800 flex items-center justify-between">
                                            <span className="text-xs text-gray-400">Lat: <span className="text-white">{notif.data.lat}</span></span>
                                            <button onClick={() => navigator.clipboard.writeText(String(notif.data.lat))} title="Copiar Latitude"><Copy size={14} className="text-gray-500 hover:text-white"/></button>
                                        </div>
                                        <div className="bg-black p-2 rounded border border-gray-800 flex items-center justify-between">
                                            <span className="text-xs text-gray-400">Lng: <span className="text-white">{notif.data.lng}</span></span>
                                            <button onClick={() => navigator.clipboard.writeText(String(notif.data.lng))} title="Copiar Longitude"><Copy size={14} className="text-gray-500 hover:text-white"/></button>
                                        </div>
                                    </div>
                                  )}
                              </div>
                          )}
                      </div>
                  ))}
              </div>
          </Card>
      )}

      {/* CONTRACT SIGNATURE SYSTEM (Only for RESIDENTS) */}
      {user?.role === UserRole.RESIDENT && (
          <div className="mb-8">
              <ContractSignature 
                  user={user} 
                  onSignComplete={() => setContractSigned(true)} 
              />
          </div>
      )}



        {/* Real-time Camera Map Card */}
        <Card className="p-6 flex flex-col h-[480px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Video className="text-atalaia-neon" size={20} />
              Câmeras em Tempo Real
            </h2>
            <Button variant="outline" className="text-xs px-2 py-1 h-auto" onClick={() => navigate('/map')}>
              Ver Mapa Completo
            </Button>
          </div>
          
          <div className="flex-1 rounded-xl overflow-hidden border border-zinc-800 relative z-0 min-h-[300px]">
            {cameras.length === 0 ? (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-center p-4">
                <p className="text-gray-400">Nenhuma câmera disponível na sua região.</p>
              </div>
            ) : (
              <MapContainer 
                center={user?.lat && user?.lng ? [user.lat, user.lng] : myNeighborhood?.lat && myNeighborhood?.lng ? [myNeighborhood.lat, myNeighborhood.lng] : [-27.5969, -48.5495]} 
                zoom={14} 
                style={{ height: '100%', width: '100%', background: '#0a0a0a' }}
                scrollWheelZoom={true}
              >
                <MapResizer />
                <MapBoundsSetter cameras={cameras} />
                <TileLayer
                  attribution={SATELLITE_ATTRIBUTION}
                  url={SATELLITE_URL}
                />
                <TileLayer
                  url='https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'
                />
                <TileLayer
                  url='https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}'
                />
                
                {cameras.map((cam) => (
                  cam.lat && cam.lng && (
                    <Marker key={`cam-${cam.id}`} position={[cam.lat, cam.lng]} icon={CameraIcon}>
                      <Popup className="text-black" minWidth={300}>
                        <CameraPopupContent cam={cam} onUpgrade={() => setShowUpgradeModal(true)} />
                      </Popup>
                    </Marker>
                  )
                ))}
              </MapContainer>
            )}
          </div>
        </Card>

       {/* Modal Upgrade Global */}
       <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />

       <AnimatePresence>
            {/* Custom delete notification modal */}
            {notifToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden text-center"
                    >
                        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
                        <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 font-sans">
                            <AlertTriangle size={24} className="mx-auto text-red-500" />
                        </div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-2 font-mono">
                            Excluir Notificação
                        </h3>
                        <p className="text-xs text-zinc-400 mb-6 leading-relaxed font-sans">
                            Deseja realmente excluir esta notificação?
                        </p>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setNotifToDelete(null)}
                                className="flex-1 py-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-zinc-900 text-zinc-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer font-sans"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    if (notifToDelete) {
                                        await executeDeleteNotification(notifToDelete);
                                        setNotifToDelete(null);
                                    }
                                }}
                                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-500/15 cursor-pointer font-sans"
                            >
                                Excluir
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Custom reject user modal */}
            {notifUserToReject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden text-center"
                    >
                        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
                        <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 font-sans">
                            <XCircle size={24} className="mx-auto text-red-500" />
                        </div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-2 font-mono">
                            Rejeitar Usuário
                        </h3>
                        <p className="text-xs text-zinc-400 mb-6 leading-relaxed font-sans">
                            Deseja rejeitar e remover este cadastro do sistema?
                        </p>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setNotifUserToReject(null)}
                                className="flex-1 py-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-zinc-900 text-zinc-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer font-sans"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    if (notifUserToReject) {
                                        await executeRejectFromNotification(notifUserToReject.notifId, notifUserToReject.pendingUserId);
                                        setNotifUserToReject(null);
                                    }
                                }}
                                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-500/15 cursor-pointer font-sans"
                            >
                                Rejeitar
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Custom request service confirm modal */}
            {serviceToRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden text-center"
                    >
                        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-atalaia-neon/50 to-transparent" />
                        <div className="w-12 h-12 bg-atalaia-neon/10 border border-atalaia-neon/20 text-atalaia-neon rounded-full flex items-center justify-center mx-auto mb-4">
                            <Navigation size={22} className="text-atalaia-neon mx-auto" />
                        </div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-2 font-mono">
                            Confirmar Serviço
                        </h3>
                        <p className="text-xs text-zinc-400 mb-6 leading-relaxed font-sans">
                            Deseja confirmar o pedido de <span className="text-white font-bold">{serviceToRequest === 'ESCORT' ? 'Acompanhamento Seguro' : serviceToRequest === 'EXTRA_ROUND' ? 'Ronda Extra' : 'Aviso de Viagem'}</span> para o Motovigia da sua região?
                        </p>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setServiceToRequest(null)}
                                className="flex-1 py-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-zinc-900 text-zinc-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer font-sans"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    if (serviceToRequest) {
                                        const type = serviceToRequest;
                                        setServiceToRequest(null);
                                        await executeRequestService(type);
                                    }
                                }}
                                className="flex-1 py-2.5 rounded-xl bg-atalaia-neon text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-atalaia-neon/15 cursor-pointer font-sans"
                            >
                                Confirmar
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Custom feedback modal for RTMP and admin actions */}
            {feedback && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="w-full max-w-md bg-[#0a0a0a] border border-atalaia-neon/40 rounded-2xl p-6 shadow-2xl relative overflow-hidden text-center"
                    >
                        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-atalaia-neon to-transparent" />
                        <div className="w-12 h-12 bg-atalaia-neon/10 border border-atalaia-neon/30 text-atalaia-neon rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle size={26} className="text-atalaia-neon" />
                        </div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-2 font-mono">
                            Aviso de Configuração
                        </h3>
                        <p className="text-xs text-zinc-300 mb-6 leading-relaxed font-mono whitespace-pre-line bg-black/60 p-3 rounded-xl border border-white/10 text-left">
                            {feedback.msg}
                        </p>
                        <button
                            type="button"
                            onClick={() => setFeedback(null)}
                            className="w-full py-2.5 rounded-xl bg-atalaia-neon text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-atalaia-neon/15 cursor-pointer font-sans hover:bg-atalaia-neon/90"
                        >
                            OK / Entendido
                        </button>
                    </motion.div>
                </div>
            )}

        </AnimatePresence>
    </Layout>
  );
};

export default Dashboard;
