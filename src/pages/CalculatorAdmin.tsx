import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '@/auth/context';
import { UserRole } from '../types';
import { 
  PricingConfigService, 
  PricingCalculatorConfig, 
  RetentionOption, 
  CameraRentalModel, 
  AiModule, 
  VolumeDiscountTier, 
  DEFAULT_PRICING_CONFIG,
  DEFAULT_RETENTION_OPTIONS,
  DEFAULT_CAMERA_RENTAL_MODELS,
  DEFAULT_AI_MODULES,
  DEFAULT_VOLUME_DISCOUNTS,
  DEFAULT_GENERAL_CONDITIONS,
  PRESET_CAMERA_IMAGES
} from '../services/pricingConfigService';
import { Card, Button, Input, Badge, Modal } from '../components/UI';
import { 
  Sliders, 
  Save, 
  RotateCcw, 
  Eye, 
  Video, 
  ShieldCheck, 
  Cpu, 
  Calendar, 
  Plus, 
  Trash2, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  DollarSign, 
  Layers, 
  Check, 
  Tag, 
  Smartphone,
  ExternalLink,
  ChevronRight,
  Info,
  RefreshCw,
  Percent,
  Settings,
  Shield,
  ArrowRight,
  Image as ImageIcon,
  Link2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const CalculatorAdmin: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [config, setConfig] = useState<PricingCalculatorConfig>(DEFAULT_PRICING_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'retention' | 'cameras' | 'ai' | 'discounts' | 'simulator'>('retention');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Modals for adding new items
  const [showAddRetentionModal, setShowAddRetentionModal] = useState(false);
  const [newRetention, setNewRetention] = useState<RetentionOption>({
    days: 45,
    label: '45 Dias',
    badge: 'Especial',
    basePricePerCam: 79.90,
    description: 'Histórico estendido para maior tranquilidade.',
    enabled: true
  });

  const [showAddCameraModal, setShowAddCameraModal] = useState(false);
  const [newCamera, setNewCamera] = useState<CameraRentalModel>({
    id: '',
    name: '',
    category: 'Externa',
    pricePerMonth: 25.00,
    badge: 'Lançamento',
    description: 'Câmera com alta performance e confiabilidade.',
    features: ['Resolução 1080p', 'Visão Noturna', 'Garantia total'],
    enabled: true,
    imageUrl: '/images/cameras/camera_bullet.jpg'
  });
  const [newCameraFeatureInput, setNewCameraFeatureInput] = useState('');

  const [showAddAiModal, setShowAddAiModal] = useState(false);
  const [newAi, setNewAi] = useState<AiModule>({
    id: '',
    name: '',
    shortName: '',
    pricePerCam: 15.00,
    badge: 'Inteligente',
    description: 'Processamento neural de vídeo em tempo real.',
    highlight: 'Receba alertas imediatos com alta precisão.',
    enabled: true
  });

  // Simulator state inside Admin panel
  const [simCameras, setSimCameras] = useState<number>(4);
  const [simRetentionDays, setSimRetentionDays] = useState<number>(7);
  const [simRentalId, setSimRentalId] = useState<string>('bullet_hd');
  const [simAiIds, setSimAiIds] = useState<string[]>(['person_vehicle']);
  const [simBillingCycle, setSimBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  // Load configuration on mount
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const loaded = await PricingConfigService.loadConfig(true);
        if (isMounted) {
          setConfig(loaded);
        }
      } catch (e: any) {
        console.warn("[CalculatorAdmin] Falha ao carregar configurações:", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, []);

  // Format currency
  const formatBRL = (val: number) => {
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Check Master Admin Access
  if (user && user.role !== UserRole.ADMIN) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-20 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-4">
            <Shield size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Acesso Exclusivo ao Administrador Master</h2>
          <p className="text-gray-400 mb-6 text-sm">
            A configuração da Calculadora de Planos & Preços é restrita ao perfil Admin Master do sistema ServCam.
          </p>
          <Button onClick={() => navigate('/dashboard')} className="bg-white/10 hover:bg-white/20 text-white">
            Voltar ao Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  // Handle Save
  const handleSave = async () => {
    setSaving(true);
    setErrorToast(null);
    try {
      const saved = await PricingConfigService.saveConfig(config, user?.email || 'admin@servcam.com');
      setConfig(saved);
      setSuccessToast("Condições da Calculadora salvas com sucesso! A calculadora pública já está atualizada.");
      setTimeout(() => setSuccessToast(null), 5000);
    } catch (e: any) {
      setErrorToast("Erro ao salvar configuração: " + (e.message || String(e)));
      setTimeout(() => setErrorToast(null), 6000);
    } finally {
      setSaving(false);
    }
  };

  // Handle Reset to Defaults
  const handleResetToDefaults = async () => {
    setSaving(true);
    setShowResetConfirm(false);
    try {
      const reset = await PricingConfigService.resetToDefaults(user?.email || 'admin@servcam.com');
      setConfig(reset);
      setSuccessToast("Condições originais de fábrica restauradas com sucesso!");
      setTimeout(() => setSuccessToast(null), 5000);
    } catch (e: any) {
      setErrorToast("Erro ao restaurar padrões: " + (e.message || String(e)));
    } finally {
      setSaving(false);
    }
  };

  // Updaters for Retention
  const updateRetentionItem = (index: number, updates: Partial<RetentionOption>) => {
    setConfig(prev => {
      const updated = [...prev.retentionOptions];
      updated[index] = { ...updated[index], ...updates };
      return { ...prev, retentionOptions: updated };
    });
  };

  const removeRetentionItem = (index: number) => {
    setConfig(prev => ({
      ...prev,
      retentionOptions: prev.retentionOptions.filter((_, i) => i !== index)
    }));
  };

  const addRetentionItem = () => {
    if (!newRetention.days || newRetention.days <= 0) {
      setErrorToast("Por favor insira uma quantidade de dias válida.");
      return;
    }
    setConfig(prev => ({
      ...prev,
      retentionOptions: [...prev.retentionOptions, { ...newRetention }]
    }));
    setShowAddRetentionModal(false);
    setNewRetention({
      days: 45,
      label: '45 Dias',
      badge: 'Especial',
      basePricePerCam: 79.90,
      description: 'Histórico estendido para maior tranquilidade.',
      enabled: true
    });
  };

  // Updaters for Camera Rental
  const updateCameraItem = (index: number, updates: Partial<CameraRentalModel>) => {
    setConfig(prev => {
      const updated = [...prev.cameraRentalModels];
      updated[index] = { ...updated[index], ...updates };
      return { ...prev, cameraRentalModels: updated };
    });
  };

  const removeCameraItem = (index: number) => {
    setConfig(prev => ({
      ...prev,
      cameraRentalModels: prev.cameraRentalModels.filter((_, i) => i !== index)
    }));
  };

  const addCameraItem = () => {
    if (!newCamera.name.trim()) {
      setErrorToast("Por favor insira um nome para o modelo de câmera.");
      return;
    }
    const safeId = newCamera.id.trim() || `cam_${Date.now()}`;
    setConfig(prev => ({
      ...prev,
      cameraRentalModels: [...prev.cameraRentalModels, { ...newCamera, id: safeId }]
    }));
    setShowAddCameraModal(false);
    setNewCamera({
      id: '',
      name: '',
      category: 'Externa',
      pricePerMonth: 25.00,
      badge: 'Lançamento',
      description: 'Câmera com alta performance e confiabilidade.',
      features: ['Resolução 1080p', 'Visão Noturna', 'Garantia total'],
      enabled: true,
      imageUrl: '/images/cameras/camera_bullet.jpg'
    });
    setNewCameraFeatureInput('');
  };

  // Updaters for AI Modules
  const updateAiItem = (index: number, updates: Partial<AiModule>) => {
    setConfig(prev => {
      const updated = [...prev.aiModules];
      updated[index] = { ...updated[index], ...updates };
      return { ...prev, aiModules: updated };
    });
  };

  const removeAiItem = (index: number) => {
    setConfig(prev => ({
      ...prev,
      aiModules: prev.aiModules.filter((_, i) => i !== index)
    }));
  };

  const addAiItem = () => {
    if (!newAi.name.trim()) {
      alert("Por favor informe o nome do módulo de IA.");
      return;
    }
    const safeId = newAi.id.trim() || `ai_${Date.now()}`;
    setConfig(prev => ({
      ...prev,
      aiModules: [...prev.aiModules, { ...newAi, id: safeId, shortName: newAi.shortName || newAi.name }]
    }));
    setShowAddAiModal(false);
    setNewAi({
      id: '',
      name: '',
      shortName: '',
      pricePerCam: 15.00,
      badge: 'Inteligente',
      description: 'Processamento neural de vídeo em tempo real.',
      highlight: 'Receba alertas imediatos com alta precisão.',
      enabled: true
    });
  };

  // Updaters for Volume Discounts
  const updateDiscountTier = (index: number, updates: Partial<VolumeDiscountTier>) => {
    setConfig(prev => {
      const updated = [...prev.volumeDiscounts];
      updated[index] = { ...updated[index], ...updates };
      return { ...prev, volumeDiscounts: updated };
    });
  };

  const removeDiscountTier = (index: number) => {
    setConfig(prev => ({
      ...prev,
      volumeDiscounts: prev.volumeDiscounts.filter((_, i) => i !== index)
    }));
  };

  const addDiscountTier = () => {
    const minCams = prompt("Quantidade mínima de câmeras para a nova faixa:");
    const percent = prompt("Porcentagem de desconto (apenas números, ex: 30):");
    if (!minCams || !percent) return;
    const numMin = parseInt(minCams, 10);
    const numPercent = parseFloat(percent);
    if (isNaN(numMin) || isNaN(numPercent)) {
      alert("Valores inválidos");
      return;
    }
    setConfig(prev => ({
      ...prev,
      volumeDiscounts: [
        ...prev.volumeDiscounts,
        { minCameras: numMin, discountPercent: numPercent, label: `${numMin}+ câmeras (${numPercent}% off)` }
      ].sort((a, b) => b.minCameras - a.minCameras)
    }));
  };

  // Updaters for General Conditions
  const updateGeneralCondition = (field: keyof typeof config.generalConditions, value: any) => {
    setConfig(prev => ({
      ...prev,
      generalConditions: {
        ...prev.generalConditions,
        [field]: value
      }
    }));
  };

  // Live Simulator Calculation based on currently edited config in admin!
  const simResults = useMemo(() => {
    const activeRetention = config.retentionOptions.find(r => r.days === simRetentionDays && r.enabled !== false) 
      || config.retentionOptions[0] 
      || DEFAULT_RETENTION_OPTIONS[0];

    const activeRental = config.cameraRentalModels.find(m => m.id === simRentalId && m.enabled !== false) 
      || config.cameraRentalModels[0] 
      || DEFAULT_CAMERA_RENTAL_MODELS[0];

    const activeAi = config.aiModules.filter(m => simAiIds.includes(m.id) && m.enabled !== false);

    // Calculate volume discount
    let volumeDiscountRate = 0;
    const sortedTiers = [...config.volumeDiscounts].sort((a, b) => b.minCameras - a.minCameras);
    for (const tier of sortedTiers) {
      if (simCameras >= tier.minCameras) {
        volumeDiscountRate = tier.discountPercent / 100;
        break;
      }
    }

    const baseStorageRate = activeRetention.basePricePerCam;
    const storageRateAfterDiscount = baseStorageRate * (1 - volumeDiscountRate);
    const storageTotal = storageRateAfterDiscount * simCameras;

    const rentalRate = activeRental.pricePerMonth;
    const rentalTotal = rentalRate * simCameras;

    const aiRate = activeAi.reduce((acc, curr) => acc + curr.pricePerCam, 0);
    const aiTotal = aiRate * simCameras;

    const subtotalMonthly = storageTotal + rentalTotal + aiTotal;

    const annualDiscountRate = simBillingCycle === 'annual' ? (config.generalConditions.annualDiscountPercent / 100) : 0;
    const finalMonthlyTotal = subtotalMonthly * (1 - annualDiscountRate);
    const finalAnnualTotal = finalMonthlyTotal * 12;

    const fullOriginalPrice = (baseStorageRate + rentalRate + aiRate) * simCameras;
    const totalSavings = fullOriginalPrice - finalMonthlyTotal;

    return {
      activeRetention,
      activeRental,
      activeAi,
      volumeDiscountRate,
      annualDiscountRate,
      storageRateAfterDiscount,
      storageTotal,
      rentalRate,
      rentalTotal,
      aiRate,
      aiTotal,
      subtotalMonthly,
      finalMonthlyTotal,
      finalAnnualTotal,
      fullOriginalPrice,
      totalSavings,
      effectivePerCam: finalMonthlyTotal / simCameras
    };
  }, [config, simCameras, simRetentionDays, simRentalId, simAiIds, simBillingCycle]);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto pb-24 px-4 sm:px-6">
        
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-atalaia-neon/30 rounded-3xl p-6 sm:p-8 mb-8 shadow-[0_0_40px_rgba(0,255,102,0.06)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-atalaia-neon/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full bg-atalaia-neon/10 border border-atalaia-neon/30 text-atalaia-neon text-[11px] font-black tracking-widest uppercase flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,255,102,0.2)]">
                  <ShieldCheck size={14} /> Painel Exclusivo Admin Master
                </span>
                <span className="text-zinc-500 text-xs font-mono">
                  v{config.version || 1}.0 • ServCam Core
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight flex items-center gap-3">
                <Sliders className="text-atalaia-neon" size={32} />
                Calculadora de Planos & Preços
              </h1>
              <p className="text-zinc-400 text-sm mt-2 max-w-3xl leading-relaxed">
                Configure as condições comerciais que alimentam a Calculadora Interativa pública do site: valores de retenção em nuvem, mensalidades de locação de câmeras, adicionais de IA, faixas de desconto progressivo e termos contratuais.
              </p>
              
              <div className="mt-3 flex items-center gap-3 text-xs text-zinc-500 font-mono">
                <span>Última atualização: {new Date(config.lastUpdated).toLocaleString('pt-BR')}</span>
                <span>•</span>
                <span className="text-zinc-400">Por: {config.updatedBy || 'Admin Master'}</span>
              </div>
            </div>

            {/* Top Quick Actions */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Button
                variant="outline"
                onClick={() => setShowResetConfirm(true)}
                disabled={saving}
                className="border-white/10 hover:border-red-500/40 text-zinc-400 hover:text-red-400 text-xs py-2.5 px-4 rounded-xl flex items-center gap-2"
                title="Restaura os valores padrões recomendados"
              >
                <RotateCcw size={15} /> Restaurar Padrões
              </Button>

              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-atalaia-neon hover:bg-emerald-400 text-black font-extrabold text-sm py-3 px-6 rounded-xl shadow-[0_0_25px_rgba(0,255,102,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" /> Salvando...
                  </>
                ) : (
                  <>
                    <Save size={16} /> Salvar Condições
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Notifications / Toasts */}
        {successToast && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={20} className="shrink-0 text-emerald-400" />
              <span>{successToast}</span>
            </div>
            <button onClick={() => setSuccessToast(null)} className="text-emerald-500 hover:text-white text-xs">
              ✕
            </button>
          </div>
        )}

        {errorToast && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="shrink-0 text-red-400" />
              <span>{errorToast}</span>
            </div>
            <button onClick={() => setErrorToast(null)} className="text-red-500 hover:text-white text-xs">
              ✕
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 border-b border-white/10 no-scrollbar">
          <button
            onClick={() => setActiveTab('retention')}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'retention'
                ? 'bg-atalaia-neon text-black shadow-[0_0_20px_rgba(0,255,102,0.25)]'
                : 'bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/5'
            }`}
          >
            <Calendar size={17} />
            <span>1. Dias de Retenção (Nuvem)</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${activeTab === 'retention' ? 'bg-black text-atalaia-neon' : 'bg-white/10 text-zinc-300'}`}>
              {config.retentionOptions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('cameras')}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'cameras'
                ? 'bg-atalaia-neon text-black shadow-[0_0_20px_rgba(0,255,102,0.25)]'
                : 'bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/5'
            }`}
          >
            <Video size={17} />
            <span>2. Modelos de Locação (Equipamentos)</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${activeTab === 'cameras' ? 'bg-black text-atalaia-neon' : 'bg-white/10 text-zinc-300'}`}>
              {config.cameraRentalModels.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'ai'
                ? 'bg-atalaia-neon text-black shadow-[0_0_20px_rgba(0,255,102,0.25)]'
                : 'bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/5'
            }`}
          >
            <Cpu size={17} />
            <span>3. Módulos de IA Adicional</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${activeTab === 'ai' ? 'bg-black text-atalaia-neon' : 'bg-white/10 text-zinc-300'}`}>
              {config.aiModules.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('discounts')}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'discounts'
                ? 'bg-atalaia-neon text-black shadow-[0_0_20px_rgba(0,255,102,0.25)]'
                : 'bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/5'
            }`}
          >
            <Percent size={17} />
            <span>4. Descontos & Faturamento</span>
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'simulator'
                ? 'bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                : 'bg-zinc-900/60 hover:bg-zinc-800 text-blue-400 hover:text-white border border-blue-500/20'
            }`}
          >
            <Eye size={17} />
            <span>5. Simulador em Tempo Real</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-400/20 text-blue-300 font-mono">
              PREVIEW
            </span>
          </button>
        </div>

        {/* TAB 1: DIAS DE RETENÇÃO EM NUVEM */}
        {activeTab === 'retention' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-950 p-5 rounded-2xl border border-white/5">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Calendar className="text-atalaia-neon" size={20} />
                  Prazos de Retenção & Gravação em Nuvem
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Defina o custo base por câmera para cada histórico de gravação (ex: 3, 7, 15, 30 ou 60 dias). O cliente pode selecionar qualquer uma dessas opções na calculadora.
                </p>
              </div>
              <Button
                onClick={() => setShowAddRetentionModal(true)}
                className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 shrink-0"
              >
                <Plus size={16} /> Adicionar Novo Prazo
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {config.retentionOptions.map((opt, idx) => (
                <div 
                  key={idx}
                  className={`bg-zinc-950 border rounded-2xl p-5 flex flex-col justify-between transition-all ${
                    opt.enabled !== false ? 'border-white/10 hover:border-atalaia-neon/40' : 'border-white/5 opacity-60'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-black text-white">{opt.days} Dias</span>
                        <input
                          type="text"
                          value={opt.badge || ''}
                          onChange={(e) => updateRetentionItem(idx, { badge: e.target.value })}
                          placeholder="Badge (ex: Popular)"
                          className="bg-zinc-900 border border-white/10 text-atalaia-neon text-[10px] font-bold px-2 py-0.5 rounded-md max-w-[110px]"
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-zinc-400 font-medium flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={opt.enabled !== false}
                            onChange={(e) => updateRetentionItem(idx, { enabled: e.target.checked })}
                            className="rounded bg-zinc-900 border-white/20 text-atalaia-neon focus:ring-0"
                          />
                          {opt.enabled !== false ? 'Ativo' : 'Oculto'}
                        </label>
                        {config.retentionOptions.length > 2 && (
                          <button
                            onClick={() => removeRetentionItem(idx)}
                            className="text-zinc-600 hover:text-red-400 transition-colors p-1"
                            title="Remover opção"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                        Rótulo de Exibição
                      </label>
                      <input
                        type="text"
                        value={opt.label}
                        onChange={(e) => updateRetentionItem(idx, { label: e.target.value })}
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-atalaia-neon/50 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5 flex items-center justify-between">
                        <span>Preço Base por Câmera</span>
                        <span className="text-atalaia-neon font-mono text-xs">
                          {formatBRL(opt.basePricePerCam)} /cam/mês
                        </span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-zinc-500 text-sm font-bold">R$</span>
                        <input
                          type="number"
                          step="0.10"
                          value={opt.basePricePerCam}
                          onChange={(e) => updateRetentionItem(idx, { basePricePerCam: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white font-mono font-bold focus:border-atalaia-neon/50 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                        Descrição para o Morador
                      </label>
                      <textarea
                        rows={2}
                        value={opt.description}
                        onChange={(e) => updateRetentionItem(idx, { description: e.target.value })}
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-xs text-zinc-300 focus:border-atalaia-neon/50 outline-none resize-none leading-relaxed"
                      />
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                    <span>Simulação 4 câmeras:</span>
                    <span className="text-zinc-300 font-bold">
                      {formatBRL(opt.basePricePerCam * 4)} /mês
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: MODELOS DE LOCAÇÃO DE CÂMERAS & EQUIPAMENTOS */}
        {activeTab === 'cameras' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-950 p-5 rounded-2xl border border-white/5">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Video className="text-atalaia-neon" size={20} />
                  Modelos de Locação de Equipamentos (Câmeras)
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Configure os modelos de câmeras disponíveis para locação mensal com substituição inclusa, ou opção de câmeras próprias (R$ 0,00/mês).
                </p>
              </div>
              <Button
                onClick={() => setShowAddCameraModal(true)}
                className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 shrink-0"
              >
                <Plus size={16} /> Adicionar Novo Modelo
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {config.cameraRentalModels.map((cam, idx) => (
                <div
                  key={cam.id || idx}
                  className={`bg-zinc-950 border rounded-2xl p-6 flex flex-col justify-between transition-all ${
                    cam.enabled !== false ? 'border-white/10 hover:border-atalaia-neon/40' : 'border-white/5 opacity-60'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                            ID: {cam.id}
                          </span>
                          <input
                            type="text"
                            value={cam.badge || ''}
                            onChange={(e) => updateCameraItem(idx, { badge: e.target.value })}
                            placeholder="Destaque / Badge"
                            className="bg-zinc-900 border border-white/10 text-atalaia-neon text-[10px] font-bold px-2 py-0.5 rounded max-w-[130px]"
                          />
                        </div>
                        <input
                          type="text"
                          value={cam.name}
                          onChange={(e) => updateCameraItem(idx, { name: e.target.value })}
                          className="text-base font-bold text-white bg-transparent border-b border-transparent hover:border-white/20 focus:border-atalaia-neon outline-none w-full"
                        />
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <label className="text-[10px] text-zinc-400 font-medium flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={cam.enabled !== false}
                            onChange={(e) => updateCameraItem(idx, { enabled: e.target.checked })}
                            className="rounded bg-zinc-900 border-white/20 text-atalaia-neon focus:ring-0"
                          />
                          {cam.enabled !== false ? 'Ativo' : 'Oculto'}
                        </label>
                        {config.cameraRentalModels.length > 1 && (
                          <button
                            onClick={() => removeCameraItem(idx)}
                            className="text-zinc-600 hover:text-red-400 transition-colors p-1"
                            title="Remover modelo"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                          Categoria
                        </label>
                        <input
                          type="text"
                          value={cam.category}
                          onChange={(e) => updateCameraItem(idx, { category: e.target.value })}
                          className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-atalaia-neon/50 outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                          Locação Mensal / Câmera
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-zinc-500 text-xs font-bold">R$</span>
                          <input
                            type="number"
                            step="0.50"
                            value={cam.pricePerMonth}
                            onChange={(e) => updateCameraItem(idx, { pricePerMonth: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white font-mono font-bold focus:border-atalaia-neon/50 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Link para URL de Foto do Equipamento */}
                    <div className="p-3.5 bg-zinc-900/60 border border-white/10 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                          <ImageIcon size={14} className="text-atalaia-neon" />
                          Link / URL da Foto do Equipamento
                        </label>
                        {cam.imageUrl && (
                          <a
                            href={cam.imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-atalaia-neon hover:underline flex items-center gap-1 font-semibold"
                            title="Abrir foto em nova aba"
                          >
                            <ExternalLink size={12} /> Abrir Foto
                          </a>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        {/* Miniatura da Foto */}
                        <div className="w-full sm:w-24 h-20 rounded-xl overflow-hidden bg-black border border-white/10 shrink-0 flex items-center justify-center relative group">
                          {cam.imageUrl ? (
                            <img
                              src={cam.imageUrl}
                              alt={cam.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-zinc-600 text-[10px] gap-1 p-2 text-center">
                              <Video size={18} className="text-zinc-500" />
                              <span>Sem foto</span>
                            </div>
                          )}
                        </div>

                        {/* Campo de URL + Seletor de Catálogo */}
                        <div className="flex-1 space-y-2">
                          <div className="relative">
                            <Link2 size={14} className="absolute left-3 top-2.5 text-zinc-500" />
                            <input
                              type="url"
                              value={cam.imageUrl || ''}
                              onChange={(e) => updateCameraItem(idx, { imageUrl: e.target.value })}
                              placeholder="Cole o link da foto (https://... ou /images/cameras/...)"
                              className="w-full bg-zinc-950 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white font-mono focus:border-atalaia-neon/50 outline-none"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <select
                              value={PRESET_CAMERA_IMAGES.some(p => p.url === cam.imageUrl) ? cam.imageUrl : ''}
                              onChange={(e) => {
                                if (e.target.value !== undefined) {
                                  updateCameraItem(idx, { imageUrl: e.target.value });
                                }
                              }}
                              className="flex-1 bg-zinc-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-[11px] text-zinc-300 focus:border-atalaia-neon/50 outline-none"
                            >
                              <option value="">Escolher foto pronta do catálogo...</option>
                              {PRESET_CAMERA_IMAGES.map((preset, pIdx) => (
                                <option key={pIdx} value={preset.url}>
                                  📷 {preset.label}
                                </option>
                              ))}
                            </select>

                            {cam.imageUrl && (
                              <button
                                type="button"
                                onClick={() => updateCameraItem(idx, { imageUrl: '' })}
                                className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 border border-white/10 text-[11px] transition-colors"
                                title="Limpar URL da foto"
                              >
                                Limpar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                        Descrição do Equipamento
                      </label>
                      <textarea
                        rows={2}
                        value={cam.description}
                        onChange={(e) => updateCameraItem(idx, { description: e.target.value })}
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-xs text-zinc-300 focus:border-atalaia-neon/50 outline-none resize-none leading-relaxed"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5 flex items-center justify-between">
                        <span>Diferenciais e Recursos (Inclusos)</span>
                        <span className="text-[10px] text-zinc-500">Separados por vírgula</span>
                      </label>
                      <input
                        type="text"
                        value={cam.features?.join(', ') || ''}
                        onChange={(e) => updateCameraItem(idx, { 
                          features: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                        })}
                        placeholder="Ex: 1080p Full HD, Visão Noturna 30m, IP67"
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:border-atalaia-neon/50 outline-none"
                      />
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {cam.features?.map((f, fi) => (
                          <span key={fi} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-300 flex items-center gap-1">
                            <Check size={10} className="text-atalaia-neon" /> {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between text-xs text-zinc-400">
                    <span>Custo mensal para 4 unidades:</span>
                    <span className="text-atalaia-neon font-bold font-mono text-sm">
                      {formatBRL(cam.pricePerMonth * 4)} /mês
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: MÓDULOS DE INTELIGÊNCIA ARTIFICIAL (IA) */}
        {activeTab === 'ai' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-950 p-5 rounded-2xl border border-white/5">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Cpu className="text-atalaia-neon" size={20} />
                  Módulos de Inteligência Artificial Adicionais
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Ative ou desative módulos de IA e configure a mensalidade adicional cobrada por câmera ativa (ex: LPR, Reconhecimento Facial, Detecção de Pessoas).
                </p>
              </div>
              <Button
                onClick={() => setShowAddAiModal(true)}
                className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 shrink-0"
              >
                <Plus size={16} /> Adicionar Novo Módulo IA
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {config.aiModules.map((ai, idx) => (
                <div
                  key={ai.id || idx}
                  className={`bg-zinc-950 border rounded-2xl p-5 flex flex-col justify-between transition-all ${
                    ai.enabled !== false ? 'border-white/10 hover:border-atalaia-neon/40' : 'border-white/5 opacity-60'
                  }`}
                >
                  <div className="space-y-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                            {ai.id}
                          </span>
                          <input
                            type="text"
                            value={ai.badge || ''}
                            onChange={(e) => updateAiItem(idx, { badge: e.target.value })}
                            placeholder="Destaque / Badge"
                            className="bg-zinc-900 border border-white/10 text-atalaia-neon text-[10px] font-bold px-2 py-0.5 rounded max-w-[130px]"
                          />
                        </div>
                        <input
                          type="text"
                          value={ai.name}
                          onChange={(e) => updateAiItem(idx, { name: e.target.value })}
                          className="text-sm font-bold text-white bg-transparent border-b border-transparent hover:border-white/20 focus:border-atalaia-neon outline-none w-full"
                        />
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <label className="text-[10px] text-zinc-400 font-medium flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={ai.enabled !== false}
                            onChange={(e) => updateAiItem(idx, { enabled: e.target.checked })}
                            className="rounded bg-zinc-900 border-white/20 text-atalaia-neon focus:ring-0"
                          />
                          {ai.enabled !== false ? 'Ativo' : 'Oculto'}
                        </label>
                        {config.aiModules.length > 1 && (
                          <button
                            onClick={() => removeAiItem(idx)}
                            className="text-zinc-600 hover:text-red-400 transition-colors p-1"
                            title="Remover módulo"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                        Nome Curto para Tabela
                      </label>
                      <input
                        type="text"
                        value={ai.shortName || ai.name}
                        onChange={(e) => updateAiItem(idx, { shortName: e.target.value })}
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:border-atalaia-neon/50 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1 flex items-center justify-between">
                        <span>Valor Adicional / Câmera</span>
                        <span className="text-atalaia-neon font-mono text-xs">
                          +{formatBRL(ai.pricePerCam)} /cam
                        </span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-zinc-500 text-xs font-bold">R$</span>
                        <input
                          type="number"
                          step="0.50"
                          value={ai.pricePerCam}
                          onChange={(e) => updateAiItem(idx, { pricePerCam: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white font-mono font-bold focus:border-atalaia-neon/50 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                        Frase de Destaque / Benefício
                      </label>
                      <input
                        type="text"
                        value={ai.highlight || ''}
                        onChange={(e) => updateAiItem(idx, { highlight: e.target.value })}
                        placeholder="Ex: Receba alertas apenas quando um humano..."
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-atalaia-neon/80 focus:border-atalaia-neon/50 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                        Descrição Completa
                      </label>
                      <textarea
                        rows={2}
                        value={ai.description}
                        onChange={(e) => updateAiItem(idx, { description: e.target.value })}
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2 text-xs text-zinc-300 focus:border-atalaia-neon/50 outline-none resize-none leading-relaxed"
                      />
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between text-xs text-zinc-500 font-mono">
                    <span>Adicional 4 câmeras:</span>
                    <span className="text-zinc-300 font-bold">
                      +{formatBRL(ai.pricePerCam * 4)} /mês
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: REGRAS DE DESCONTOS & FATURAMENTO */}
        {activeTab === 'discounts' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Faixas de Desconto por Volume */}
            <div className="bg-zinc-950 border border-white/10 rounded-3xl p-6 sm:p-7 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Percent className="text-atalaia-neon" size={20} />
                    Desconto Progressivo por Volume de Câmeras
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Desconto aplicado automaticamente sobre o valor de armazenamento em nuvem quanto mais câmeras forem contratadas.
                  </p>
                </div>
                <Button
                  onClick={addDiscountTier}
                  className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2 px-3 rounded-xl flex items-center gap-1.5 shrink-0"
                >
                  <Plus size={14} /> Nova Faixa
                </Button>
              </div>

              <div className="space-y-3">
                {config.volumeDiscounts.map((tier, idx) => (
                  <div 
                    key={idx}
                    className="p-3.5 bg-zinc-900/70 border border-white/5 rounded-2xl flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-atalaia-neon/10 border border-atalaia-neon/20 text-atalaia-neon flex items-center justify-center font-bold text-sm">
                        {tier.minCameras}+
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">
                          A partir de {tier.minCameras} câmeras
                        </div>
                        <input
                          type="text"
                          value={tier.label || ''}
                          onChange={(e) => updateDiscountTier(idx, { label: e.target.value })}
                          placeholder="Rótulo da faixa"
                          className="bg-transparent border-b border-transparent hover:border-white/20 text-[10px] text-zinc-400 outline-none w-36"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 bg-black border border-white/10 rounded-xl px-2.5 py-1">
                        <input
                          type="number"
                          value={tier.discountPercent}
                          onChange={(e) => updateDiscountTier(idx, { discountPercent: parseFloat(e.target.value) || 0 })}
                          className="w-12 bg-transparent text-right font-mono font-bold text-atalaia-neon text-sm outline-none"
                        />
                        <span className="text-zinc-500 font-bold text-xs">% OFF</span>
                      </div>

                      {config.volumeDiscounts.length > 1 && (
                        <button
                          onClick={() => removeDiscountTier(idx)}
                          className="text-zinc-600 hover:text-red-400 transition-colors p-1"
                          title="Remover faixa"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-atalaia-neon/5 border border-atalaia-neon/15 rounded-2xl text-xs text-zinc-400 space-y-1">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Sparkles size={14} className="text-atalaia-neon" /> Regra Ativa:
                </span>
                <p>
                  O desconto progressivo incentiva condomínios e empresas a adicionarem mais pontos de monitoramento, reduzindo o custo por câmera.
                </p>
              </div>
            </div>

            {/* Ciclo Anual, Setup & Limites Gerais */}
            <div className="space-y-6">
              
              {/* Desconto Ciclo Anual */}
              <div className="bg-zinc-950 border border-white/10 rounded-3xl p-6 sm:p-7 space-y-5">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <DollarSign className="text-atalaia-neon" size={20} />
                  Faturamento & Ciclos de Cobrança
                </h3>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-white uppercase tracking-wider">
                      Desconto no Plano Anual
                    </label>
                    <span className="text-base font-black text-atalaia-neon font-mono">
                      {config.generalConditions.annualDiscountPercent}% OFF
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    value={config.generalConditions.annualDiscountPercent}
                    onChange={(e) => updateGeneralCondition('annualDiscountPercent', parseInt(e.target.value, 10))}
                    className="w-full accent-atalaia-neon cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1">
                    <span>0% (Sem desconto)</span>
                    <span>Padrão 20%</span>
                    <span>50% (Máximo)</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                      Taxa de Instalação (R$/câmera)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-zinc-500 text-xs font-bold">R$</span>
                      <input
                        type="number"
                        step="5.00"
                        value={config.generalConditions.installationFeePerCam}
                        onChange={(e) => updateGeneralCondition('installationFeePerCam', parseFloat(e.target.value) || 0)}
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white font-mono font-bold focus:border-atalaia-neon outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                      Isenção / Instalação Grátis
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-zinc-900 border border-white/10 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.generalConditions.installationFeeWaived}
                        onChange={(e) => updateGeneralCondition('installationFeeWaived', e.target.checked)}
                        className="rounded bg-black border-white/20 text-atalaia-neon focus:ring-0"
                      />
                      <span className="text-xs font-bold text-white">
                        {config.generalConditions.installationFeeWaived ? 'Isenção Ativa' : 'Cobrar Taxa'}
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                    Badge de Isenção da Instalação
                  </label>
                  <input
                    type="text"
                    value={config.generalConditions.installationFeeBadge}
                    onChange={(e) => updateGeneralCondition('installationFeeBadge', e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-atalaia-neon outline-none"
                  />
                </div>
              </div>

              {/* Limites e WhatsApp Comercial */}
              <div className="bg-zinc-950 border border-white/10 rounded-3xl p-6 sm:p-7 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Smartphone className="text-atalaia-neon" size={17} />
                  Contatos & Termos da Calculadora
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                      Mínimo de Câmeras
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={config.generalConditions.minCameras}
                      onChange={(e) => updateGeneralCondition('minCameras', parseInt(e.target.value, 10) || 1)}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                      Máximo de Câmeras
                    </label>
                    <input
                      type="number"
                      max="200"
                      value={config.generalConditions.maxCameras}
                      onChange={(e) => updateGeneralCondition('maxCameras', parseInt(e.target.value, 10) || 64)}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    WhatsApp Comercial para Orçamentos Sob Medida
                  </label>
                  <input
                    type="text"
                    value={config.generalConditions.whatsappSalesNumber}
                    onChange={(e) => updateGeneralCondition('whatsappSalesNumber', e.target.value)}
                    placeholder="Ex: 5548988776655"
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Nota de Rodapé dos Termos de Contratação
                  </label>
                  <textarea
                    rows={2}
                    value={config.generalConditions.customContractTermsNote}
                    onChange={(e) => updateGeneralCondition('customContractTermsNote', e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-xs text-zinc-300 outline-none resize-none leading-relaxed"
                  />
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 5: SIMULADOR EM TEMPO REAL (PREVIEW) */}
        {activeTab === 'simulator' && (
          <div className="space-y-8">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <span className="text-[11px] uppercase tracking-widest font-black text-blue-400 bg-blue-500/20 px-3 py-1 rounded-full border border-blue-500/30">
                  Simulação Dinâmica
                </span>
                <h3 className="text-2xl font-bold text-white mt-2">
                  Teste o Impacto dos Valores em Tempo Real
                </h3>
                <p className="text-sm text-zinc-300 mt-1 max-w-2xl leading-relaxed">
                  Modifique a quantidade de câmeras, retenção e opcionais abaixo para verificar exatamente o valor final e o discriminativo que será apresentado para o cliente.
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs text-zinc-400 uppercase font-mono block">Resultado Mensal Final:</span>
                <span className="text-3xl sm:text-4xl font-black text-atalaia-neon font-mono">
                  {formatBRL(simResults.finalMonthlyTotal)}
                </span>
                <span className="text-xs text-zinc-400 block mt-0.5">
                  ({formatBRL(simResults.effectivePerCam)} /câmera)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Controles de Simulação */}
              <div className="lg:col-span-2 space-y-6 bg-zinc-950 border border-white/10 rounded-3xl p-6 sm:p-8">
                
                {/* 1. Quantidade de Câmeras */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                      <Video className="text-atalaia-neon" size={18} />
                      1. Quantidade de Câmeras:
                    </span>
                    <span className="text-xl font-black text-atalaia-neon font-mono">
                      {simCameras} {simCameras === 1 ? 'Câmera' : 'Câmeras'}
                    </span>
                  </div>

                  <input
                    type="range"
                    min={config.generalConditions.minCameras}
                    max={config.generalConditions.maxCameras}
                    value={simCameras}
                    onChange={(e) => setSimCameras(parseInt(e.target.value, 10))}
                    className="w-full accent-atalaia-neon cursor-pointer h-2 bg-zinc-800 rounded-lg"
                  />

                  <div className="flex flex-wrap gap-2 mt-4">
                    {config.generalConditions.presetCameras.map(p => (
                      <button
                        key={p}
                        onClick={() => setSimCameras(p)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          simCameras === p 
                            ? 'bg-atalaia-neon text-black font-extrabold shadow-[0_0_15px_rgba(0,255,102,0.3)]' 
                            : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/5'
                        }`}
                      >
                        {p} cams
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Retenção em Nuvem */}
                <div className="pt-6 border-t border-white/5">
                  <span className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                    <Calendar className="text-atalaia-neon" size={18} />
                    2. Período de Retenção em Nuvem:
                  </span>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {config.retentionOptions.filter(r => r.enabled !== false).map(r => (
                      <button
                        key={r.days}
                        onClick={() => setSimRetentionDays(r.days)}
                        className={`p-3 rounded-2xl text-left border transition-all ${
                          simRetentionDays === r.days
                            ? 'bg-atalaia-neon/10 border-atalaia-neon text-white shadow-[0_0_15px_rgba(0,255,102,0.15)]'
                            : 'bg-zinc-900 border-white/5 hover:border-white/20 text-zinc-400'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-white">{r.label}</span>
                          {r.badge && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-atalaia-neon/20 text-atalaia-neon font-black">
                              {r.badge}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-atalaia-neon font-mono block mt-1">
                          {formatBRL(r.basePricePerCam)} /cam
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Modelo de Câmera */}
                <div className="pt-6 border-t border-white/5">
                  <span className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                    <Video className="text-atalaia-neon" size={18} />
                    3. Modelo de Locação (Equipamentos):
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {config.cameraRentalModels.filter(m => m.enabled !== false).map(m => (
                      <button
                        key={m.id}
                        onClick={() => setSimRentalId(m.id)}
                        className={`p-3.5 rounded-2xl text-left border transition-all flex items-center gap-3 ${
                          simRentalId === m.id
                            ? 'bg-atalaia-neon/10 border-atalaia-neon text-white shadow-[0_0_15px_rgba(0,255,102,0.15)]'
                            : 'bg-zinc-900 border-white/5 hover:border-white/20 text-zinc-400'
                        }`}
                      >
                        {m.imageUrl ? (
                          <img
                            src={m.imageUrl}
                            alt={m.name}
                            className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0 bg-black"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-white/10 flex items-center justify-center shrink-0 text-atalaia-neon/70">
                            <Video size={18} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-xs text-white truncate">{m.name}</span>
                            <span className="text-xs font-mono font-bold text-atalaia-neon shrink-0">
                              {m.pricePerMonth === 0 ? 'Grátis' : `${formatBRL(m.pricePerMonth)}/mês`}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-400 mt-1 line-clamp-1">
                            {m.description}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Módulos de IA */}
                <div className="pt-6 border-t border-white/5">
                  <span className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                    <Cpu className="text-atalaia-neon" size={18} />
                    4. Adicionais de Inteligência Artificial:
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {config.aiModules.filter(a => a.enabled !== false).map(a => {
                      const selected = simAiIds.includes(a.id);
                      return (
                        <button
                          key={a.id}
                          onClick={() => {
                            setSimAiIds(prev => 
                              prev.includes(a.id) ? prev.filter(x => x !== a.id) : [...prev, a.id]
                            );
                          }}
                          className={`p-3 rounded-2xl text-left border flex items-center justify-between gap-2 transition-all ${
                            selected
                              ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                              : 'bg-zinc-900 border-white/5 hover:border-white/20 text-zinc-400'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center text-xs ${selected ? 'bg-emerald-500 text-black font-bold' : 'border border-white/20'}`}>
                              {selected && <Check size={12} />}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-white block">{a.shortName || a.name}</span>
                              <span className="text-[10px] text-zinc-400">+{formatBRL(a.pricePerCam)} /cam/mês</span>
                            </div>
                          </div>
                          {a.badge && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 font-bold">
                              {a.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Ciclo de Faturamento */}
                <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <DollarSign className="text-atalaia-neon" size={18} />
                    Ciclo de Cobrança:
                  </span>

                  <div className="flex items-center p-1 bg-zinc-900 rounded-xl border border-white/10">
                    <button
                      onClick={() => setSimBillingCycle('monthly')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        simBillingCycle === 'monthly' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Mensal
                    </button>
                    <button
                      onClick={() => setSimBillingCycle('annual')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        simBillingCycle === 'annual' ? 'bg-atalaia-neon text-black font-extrabold shadow-sm' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Anual ({config.generalConditions.annualDiscountPercent}% OFF)
                    </button>
                  </div>
                </div>

              </div>

              {/* Demonstrativo Financeiro Detalhado */}
              <div className="space-y-6">
                <div className="bg-zinc-950 border border-white/10 rounded-3xl p-6 sm:p-7 space-y-5 sticky top-6">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <h4 className="text-base font-bold text-white">Demonstrativo do Cálculo</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-atalaia-neon/10 text-atalaia-neon font-mono font-bold">
                      ServCam Engine
                    </span>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    {/* Nuvem */}
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-zinc-300 font-bold block">
                          Nuvem ({simResults.activeRetention.days} dias)
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {simCameras} cams × {formatBRL(simResults.activeRetention.basePricePerCam)}
                          {simResults.volumeDiscountRate > 0 && ` (-${simResults.volumeDiscountRate * 100}% volume)`}
                        </span>
                      </div>
                      <span className="font-mono text-white font-bold">
                        {formatBRL(simResults.storageTotal)}
                      </span>
                    </div>

                    {/* Locação */}
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-zinc-300 font-bold block truncate max-w-[170px]" title={simResults.activeRental.name}>
                          {simResults.activeRental.name}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {simCameras} cams × {formatBRL(simResults.activeRental.pricePerMonth)}
                        </span>
                      </div>
                      <span className="font-mono text-white font-bold">
                        {formatBRL(simResults.rentalTotal)}
                      </span>
                    </div>

                    {/* IA */}
                    {simResults.activeAi.length > 0 && (
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-zinc-300 font-bold block">
                            Módulos de IA ({simResults.activeAi.length})
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {simCameras} cams × {formatBRL(simResults.aiRate)}
                          </span>
                        </div>
                        <span className="font-mono text-white font-bold">
                          {formatBRL(simResults.aiTotal)}
                        </span>
                      </div>
                    )}

                    {/* Desconto Anual */}
                    {simResults.annualDiscountRate > 0 && (
                      <div className="flex justify-between items-start text-atalaia-neon pt-2 border-t border-white/5">
                        <div>
                          <span className="font-bold block">Desconto Plano Anual</span>
                          <span className="text-[10px] opacity-80">{config.generalConditions.annualDiscountPercent}% economia</span>
                        </div>
                        <span className="font-mono font-bold">
                          -{formatBRL(simResults.subtotalMonthly * simResults.annualDiscountRate)}
                        </span>
                      </div>
                    )}

                    {/* Instalação */}
                    <div className="flex justify-between items-start pt-2 border-t border-white/5">
                      <div>
                        <span className="text-zinc-300 font-bold block">Taxa de Instalação</span>
                        <span className="text-[10px] text-emerald-400 font-bold">
                          {config.generalConditions.installationFeeWaived ? 'Isenção Promocional' : 'Cobrança padrão'}
                        </span>
                      </div>
                      <span className="font-mono text-emerald-400 font-bold">
                        {config.generalConditions.installationFeeWaived ? 'R$ 0,00' : formatBRL(config.generalConditions.installationFeePerCam * simCameras)}
                      </span>
                    </div>
                  </div>

                  {/* Valor Total Destacado */}
                  <div className="p-4 rounded-2xl bg-zinc-900 border border-white/10 space-y-2">
                    <div className="flex justify-between items-center text-xs text-zinc-400">
                      <span>Valor Mensal Total:</span>
                      {simResults.totalSavings > 0 && (
                        <span className="text-emerald-400 font-bold">
                          Economia: {formatBRL(simResults.totalSavings)}/mês
                        </span>
                      )}
                    </div>
                    <div className="text-3xl font-black text-white font-mono flex items-baseline justify-between">
                      <span className="text-atalaia-neon">
                        {formatBRL(simResults.finalMonthlyTotal)}
                      </span>
                      <span className="text-xs text-zinc-500 font-normal">/mês</span>
                    </div>
                    {simBillingCycle === 'annual' && (
                      <div className="text-[11px] text-zinc-400 font-mono pt-2 border-t border-white/5 flex justify-between">
                        <span>Anual faturado:</span>
                        <span className="text-white font-bold">{formatBRL(simResults.finalAnnualTotal)} /ano</span>
                      </div>
                    )}
                  </div>

                  <Link
                    to="/"
                    target="_blank"
                    className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs flex items-center justify-center gap-2 border border-white/10 transition-all"
                  >
                    <ExternalLink size={14} /> Ver Calculadora Pública na Landing
                  </Link>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* MODAL: ADICIONAR PRAZO DE RETENÇÃO */}
        <Modal
          isOpen={showAddRetentionModal}
          onClose={() => setShowAddRetentionModal(false)}
          title="Adicionar Novo Prazo de Retenção em Nuvem"
        >
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-bold text-zinc-400 block mb-1">Dias de Retenção</label>
              <input
                type="number"
                value={newRetention.days}
                onChange={(e) => {
                  const d = parseInt(e.target.value, 10) || 0;
                  setNewRetention(p => ({ ...p, days: d, label: `${d} Dias` }));
                }}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-400 block mb-1">Rótulo (Label)</label>
              <input
                type="text"
                value={newRetention.label}
                onChange={(e) => setNewRetention(p => ({ ...p, label: e.target.value }))}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-400 block mb-1">Badge de Destaque</label>
              <input
                type="text"
                value={newRetention.badge || ''}
                onChange={(e) => setNewRetention(p => ({ ...p, badge: e.target.value }))}
                placeholder="Ex: Intermediário"
                className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-400 block mb-1">Preço Base por Câmera (R$)</label>
              <input
                type="number"
                step="0.50"
                value={newRetention.basePricePerCam}
                onChange={(e) => setNewRetention(p => ({ ...p, basePricePerCam: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-white text-sm font-mono font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-400 block mb-1">Descrição</label>
              <textarea
                rows={2}
                value={newRetention.description}
                onChange={(e) => setNewRetention(p => ({ ...p, description: e.target.value }))}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-zinc-300 text-xs"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <Button variant="outline" onClick={() => setShowAddRetentionModal(false)}>Cancelar</Button>
              <Button onClick={addRetentionItem} className="bg-atalaia-neon text-black font-bold">Adicionar Prazo</Button>
            </div>
          </div>
        </Modal>

        {/* MODAL: ADICIONAR MODELO DE CÂMERA */}
        <Modal
          isOpen={showAddCameraModal}
          onClose={() => setShowAddCameraModal(false)}
          title="Cadastrar Novo Modelo de Câmera / Locação"
        >
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-bold text-zinc-400 block mb-1">Nome do Equipamento</label>
              <input
                type="text"
                value={newCamera.name}
                onChange={(e) => setNewCamera(p => ({ ...p, name: e.target.value }))}
                placeholder="Ex: Câmera Solar 4G Noturna"
                className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-white text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-zinc-400 block mb-1">Categoria</label>
                <input
                  type="text"
                  value={newCamera.category}
                  onChange={(e) => setNewCamera(p => ({ ...p, category: e.target.value }))}
                  placeholder="Ex: Externa / 4G"
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-white text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-400 block mb-1">Mensalidade (R$/mês)</label>
                <input
                  type="number"
                  step="0.50"
                  value={newCamera.pricePerMonth}
                  onChange={(e) => setNewCamera(p => ({ ...p, pricePerMonth: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-white text-sm font-mono font-bold"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-400 block mb-1">Badge de Destaque</label>
              <input
                type="text"
                value={newCamera.badge || ''}
                onChange={(e) => setNewCamera(p => ({ ...p, badge: e.target.value }))}
                placeholder="Ex: Lançamento 2026"
                className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-400 block mb-1 flex items-center justify-between">
                <span>Link / URL da Foto da Câmera</span>
                {newCamera.imageUrl && (
                  <a
                    href={newCamera.imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-atalaia-neon hover:underline flex items-center gap-1"
                  >
                    <ExternalLink size={11} /> Testar Link
                  </a>
                )}
              </label>
              <div className="flex items-center gap-3">
                <div className="w-16 h-14 rounded-xl overflow-hidden bg-black border border-white/10 shrink-0 flex items-center justify-center">
                  {newCamera.imageUrl ? (
                    <img src={newCamera.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={18} className="text-zinc-600" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    type="url"
                    value={newCamera.imageUrl || ''}
                    onChange={(e) => setNewCamera(p => ({ ...p, imageUrl: e.target.value }))}
                    placeholder="https://exemplo.com/foto-camera.jpg"
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2 text-white text-xs font-mono"
                  />
                  <select
                    value={PRESET_CAMERA_IMAGES.some(p => p.url === newCamera.imageUrl) ? newCamera.imageUrl : ''}
                    onChange={(e) => {
                      if (e.target.value) setNewCamera(p => ({ ...p, imageUrl: e.target.value }));
                    }}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-zinc-300"
                  >
                    <option value="">Ou escolha uma foto do catálogo...</option>
                    {PRESET_CAMERA_IMAGES.map((preset, idx) => (
                      <option key={idx} value={preset.url}>
                        📷 {preset.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-400 block mb-1">Descrição</label>
              <textarea
                rows={2}
                value={newCamera.description}
                onChange={(e) => setNewCamera(p => ({ ...p, description: e.target.value }))}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-zinc-300 text-xs"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <Button variant="outline" onClick={() => setShowAddCameraModal(false)}>Cancelar</Button>
              <Button onClick={addCameraItem} className="bg-atalaia-neon text-black font-bold">Cadastrar Câmera</Button>
            </div>
          </div>
        </Modal>

        {/* MODAL: ADICIONAR MÓDULO IA */}
        <Modal
          isOpen={showAddAiModal}
          onClose={() => setShowAddAiModal(false)}
          title="Cadastrar Novo Módulo de IA"
        >
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-bold text-zinc-400 block mb-1">Nome Completo do Módulo</label>
              <input
                type="text"
                value={newAi.name}
                onChange={(e) => setNewAi(p => ({ ...p, name: e.target.value }))}
                placeholder="Ex: Detecção de Quedas & Socorro"
                className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-white text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-zinc-400 block mb-1">Nome Curto</label>
                <input
                  type="text"
                  value={newAi.shortName}
                  onChange={(e) => setNewAi(p => ({ ...p, shortName: e.target.value }))}
                  placeholder="Ex: IA Quedas & Socorro"
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-white text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-400 block mb-1">Valor Adicional (R$/cam)</label>
                <input
                  type="number"
                  step="0.50"
                  value={newAi.pricePerCam}
                  onChange={(e) => setNewAi(p => ({ ...p, pricePerCam: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-white text-sm font-mono font-bold"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-400 block mb-1">Badge</label>
              <input
                type="text"
                value={newAi.badge || ''}
                onChange={(e) => setNewAi(p => ({ ...p, badge: e.target.value }))}
                placeholder="Ex: Saúde & Idosos"
                className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-400 block mb-1">Frase de Destaque / Benefício</label>
              <input
                type="text"
                value={newAi.highlight || ''}
                onChange={(e) => setNewAi(p => ({ ...p, highlight: e.target.value }))}
                placeholder="Ex: Alerta imediato caso um morador caia no quintal."
                className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-400 block mb-1">Descrição</label>
              <textarea
                rows={2}
                value={newAi.description}
                onChange={(e) => setNewAi(p => ({ ...p, description: e.target.value }))}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-zinc-300 text-xs"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <Button variant="outline" onClick={() => setShowAddAiModal(false)}>Cancelar</Button>
              <Button onClick={addAiItem} className="bg-atalaia-neon text-black font-bold">Cadastrar IA</Button>
            </div>
          </div>
        </Modal>

        {/* MODAL: CONFIRMAÇÃO RESTAURAR PADRÕES */}
        <Modal
          isOpen={showResetConfirm}
          onClose={() => setShowResetConfirm(false)}
          title="Restaurar Padrões de Fábrica?"
        >
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl text-yellow-400 text-xs">
              <AlertTriangle size={24} className="shrink-0" />
              <span>
                Esta ação redefinirá todas as tabelas de retenção, locação de câmeras, adicionais de inteligência artificial e faixas de desconto para os valores recomendados originais de fábrica do ServCam.
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Deseja realmente restaurar os valores padrão? Você poderá editá-los e salvá-los novamente a qualquer momento.
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <Button variant="outline" onClick={() => setShowResetConfirm(false)}>Cancelar</Button>
              <Button onClick={handleResetToDefaults} className="bg-red-600 hover:bg-red-700 text-white font-bold">
                Sim, Restaurar Padrões
              </Button>
            </div>
          </div>
        </Modal>

      </div>
    </Layout>
  );
};

export default CalculatorAdmin;
