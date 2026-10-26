import { MockService } from './mockService';

export interface RetentionOption {
  days: number;
  label: string;
  badge?: string;
  basePricePerCam: number;
  description: string;
  enabled?: boolean;
}

export interface CameraRentalModel {
  id: string;
  name: string;
  category: string;
  pricePerMonth: number;
  badge?: string;
  description: string;
  features: string[];
  enabled?: boolean;
  imageUrl?: string;
}

export interface AiModule {
  id: string;
  name: string;
  shortName: string;
  pricePerCam: number;
  badge?: string;
  description: string;
  highlight: string;
  enabled?: boolean;
}

export interface VolumeDiscountTier {
  minCameras: number;
  discountPercent: number; // e.g. 10 for 10%
  label?: string;
}

export interface GeneralPricingConditions {
  annualDiscountPercent: number; // e.g. 20 for 20%
  minCameras: number;
  maxCameras: number;
  presetCameras: number[];
  installationFeePerCam: number;
  installationFeeWaived: boolean;
  installationFeeBadge: string;
  freeTrialDays: number;
  whatsappSalesNumber: string;
  customContractTermsNote: string;
}

export interface PricingCalculatorConfig {
  version: number;
  lastUpdated: string;
  updatedBy?: string;
  retentionOptions: RetentionOption[];
  cameraRentalModels: CameraRentalModel[];
  aiModules: AiModule[];
  volumeDiscounts: VolumeDiscountTier[];
  generalConditions: GeneralPricingConditions;
}

export const DEFAULT_RETENTION_OPTIONS: RetentionOption[] = [
  { 
    days: 3, 
    label: '3 Dias', 
    badge: 'Econômico',
    basePricePerCam: 19.90,
    description: 'Histórico dos últimos 3 dias para residências com baixo fluxo.',
    enabled: true
  },
  { 
    days: 7, 
    label: '7 Dias', 
    badge: 'Mais Escolhido',
    basePricePerCam: 29.90,
    description: 'Padrão recomendado para residências, condomínios e pequenos comércios.',
    enabled: true
  },
  { 
    days: 15, 
    label: '15 Dias', 
    badge: 'Intermediário',
    basePricePerCam: 44.90,
    description: 'Ideal para períodos de viagens, comércio médio e entradas principais.',
    enabled: true
  },
  { 
    days: 30, 
    label: '30 Dias', 
    badge: 'Avançado',
    basePricePerCam: 64.90,
    description: 'Gravação de um mês inteiro para conformidade e segurança patrimonial.',
    enabled: true
  },
  { 
    days: 60, 
    label: '60 Dias', 
    badge: 'Corporativo',
    basePricePerCam: 99.90,
    description: 'Máxima retenção para indústrias, frotas e exigências regulatórias.',
    enabled: true
  }
];

export const PRESET_CAMERA_IMAGES = [
  { label: 'Câmera Bullet IP Full HD (Externa)', url: '/images/cameras/camera_bullet.jpg' },
  { label: 'Câmera Dome Antivandalismo IK10 (Interna)', url: '/images/cameras/camera_dome.jpg' },
  { label: 'Câmera Full Color 24h Noturna (Cores no Escuro)', url: '/images/cameras/camera_fullcolor.jpg' },
  { label: 'Câmera Especialista LPR (Leitura de Placas)', url: '/images/cameras/camera_lpr.jpg' },
  { label: 'Speed Dome PTZ 360° Zoom 25x (Vigilância Ativa)', url: '/images/cameras/camera_ptz.jpg' }
];

export const enrichCameraImages = (models: CameraRentalModel[]): CameraRentalModel[] => {
  if (!Array.isArray(models)) return [];
  const map: Record<string, string> = {
    'bullet_hd': '/images/cameras/camera_bullet.jpg',
    'dome_hd': '/images/cameras/camera_dome.jpg',
    'fullcolor_night': '/images/cameras/camera_fullcolor.jpg',
    'lpr_dedicated': '/images/cameras/camera_lpr.jpg',
    'ptz_speed': '/images/cameras/camera_ptz.jpg'
  };

  return models.map(m => {
    if (m.id === 'none') {
      return { ...m, imageUrl: m.imageUrl || '' };
    }
    if (!m.imageUrl) {
      const matched = map[m.id];
      if (matched) return { ...m, imageUrl: matched };
      // Fallback heuristics based on name if custom id
      const lower = (m.name || '').toLowerCase();
      if (lower.includes('dome') && !lower.includes('speed')) return { ...m, imageUrl: map['dome_hd'] };
      if (lower.includes('speed') || lower.includes('ptz')) return { ...m, imageUrl: map['ptz_speed'] };
      if (lower.includes('color') || lower.includes('noturna')) return { ...m, imageUrl: map['fullcolor_night'] };
      if (lower.includes('placa') || lower.includes('lpr')) return { ...m, imageUrl: map['lpr_dedicated'] };
      return { ...m, imageUrl: map['bullet_hd'] };
    }
    return m;
  });
};

export const DEFAULT_CAMERA_RENTAL_MODELS: CameraRentalModel[] = [
  {
    id: 'none',
    name: 'Sem Locação (Já possuo câmeras)',
    category: 'Câmeras Próprias',
    pricePerMonth: 0,
    badge: 'Apenas Nuvem',
    description: 'Utilize suas próprias câmeras IP, RTSP ou DVR existente (Intelbras, Hikvision, Tecvoz, etc.).',
    features: ['Compatível com 99% das marcas de mercado', 'Sem custo mensal de locação', 'Conexão via RTSP / ONVIF'],
    enabled: true,
    imageUrl: ''
  },
  {
    id: 'bullet_hd',
    name: 'Câmera Bullet IP Full HD 1080p',
    category: 'Externa Noturna',
    pricePerMonth: 19.90,
    badge: 'Mais Popular',
    description: 'Lente 2.8mm angular, visão noturna IR 30 metros e vedação IP67 contra sol intenso e tempestades.',
    features: ['Resolução 1080p Full HD', 'Infravermelho inteligente 30m', 'Proteção IP67 chuva e poeira', 'Troca expressa inclusa'],
    enabled: true,
    imageUrl: '/images/cameras/camera_bullet.jpg'
  },
  {
    id: 'dome_hd',
    name: 'Câmera Dome Antivandalismo IK10',
    category: 'Interna / Semisférica',
    pricePerMonth: 22.90,
    badge: 'Proteção Antivandalismo',
    description: 'Cúpula reforçada resistente a marteladas e impactos IK10. Perfeita para halls, garagens e elevadores.',
    features: ['Resistência a impacto IK10', 'Design discreto e compacto', 'Ângulo de visão amplo 110°', 'Troca expressa inclusa'],
    enabled: true,
    imageUrl: '/images/cameras/camera_dome.jpg'
  },
  {
    id: 'fullcolor_night',
    name: 'Câmera Full Color 24h Noturna',
    category: 'Visão Colorida no Escuro',
    pricePerMonth: 29.90,
    badge: 'Cores no Escuro',
    description: 'Lente com abertura F1.0 e sensor ultra-sensível. Mantém imagens coloridas mesmo na escuridão total.',
    features: ['Cores vivas 24 horas por dia', 'Identificação exata de roupas e carros', 'Iluminação LED auxiliar suave', 'Troca expressa inclusa'],
    enabled: true,
    imageUrl: '/images/cameras/camera_fullcolor.jpg'
  },
  {
    id: 'lpr_dedicated',
    name: 'Câmera Especialista em Placas (LPR)',
    category: 'Tráfego & Portões',
    pricePerMonth: 59.90,
    badge: 'Alta Velocidade',
    description: 'Sensor com shutter de altíssima velocidade e anti-ofuscamento contra farol alto de automóveis.',
    features: ['Captura veículos em até 80 km/h', 'Anti-farol de alta intensidade', 'Lente varifocal motorizada', 'Troca expressa inclusa'],
    enabled: true,
    imageUrl: '/images/cameras/camera_lpr.jpg'
  },
  {
    id: 'ptz_speed',
    name: 'Speed Dome PTZ 360° com Zoom 25x',
    category: 'Ronda Automática',
    pricePerMonth: 79.90,
    badge: 'Alta Vigilância',
    description: 'Giro horizontal 360° contínuo, zoom óptico potente de 25x e autotracking de alvos suspeitos.',
    features: ['Giro contínuo 360° sem ponto cego', 'Zoom óptico de até 200 metros', 'Rondas automáticas programáveis', 'Troca expressa inclusa'],
    enabled: true,
    imageUrl: '/images/cameras/camera_ptz.jpg'
  }
];

export const DEFAULT_AI_MODULES: AiModule[] = [
  {
    id: 'person_vehicle',
    name: 'Detecção Inteligente de Pessoas & Veículos',
    shortName: 'IA Pessoas & Veículos',
    pricePerCam: 9.90,
    badge: 'Reduz 98% Alarmes Falsos',
    description: 'Rede neural artificial que diferencia pessoas e automóveis de animais, folhas balançando, chuva e insetos.',
    highlight: 'Receba alertas apenas quando um humano ou carro estiver no local.',
    enabled: true
  },
  {
    id: 'lpr_plates',
    name: 'Leitura e Reconhecimento de Placas (LPR / OCR)',
    shortName: 'IA Leitura de Placas (LPR)',
    pricePerCam: 24.90,
    badge: 'Busca de Veículos',
    description: 'Identifica placas Mercosul e antigas em tempo real, gera histórico com fotos e avisa sobre veículos suspeitos cadastrados.',
    highlight: 'Busque no histórico pela placa do veículo e receba alertas imediatos.',
    enabled: true
  },
  {
    id: 'facial_rec',
    name: 'Reconhecimento Facial & Controle de Visitantes',
    shortName: 'IA Reconhecimento Facial',
    pricePerCam: 29.90,
    badge: 'Identidade Segura',
    description: 'Identifica moradores cadastrados, prestadores de serviço e alerta caso indivíduos não autorizados ingressem na propriedade.',
    highlight: 'Controle de acesso por biometria facial sem necessidade de chaves.',
    enabled: true
  },
  {
    id: 'virtual_fence',
    name: 'Linha Virtual & Cerca de Intrusão Perimetral',
    shortName: 'IA Cerca Virtual',
    pricePerCam: 12.90,
    badge: 'Anti-Invasão',
    description: 'Desenhe linhas de perímetro virtuais sobre muros, portões e telhados. Se alguém cruzar no sentido proibido, dispara alerta imediato.',
    highlight: 'Proteção ativa do perímetro antes da invasão se concretizar.',
    enabled: true
  },
  {
    id: 'flow_counting',
    name: 'Contagem de Fluxo & Mapa de Calor',
    shortName: 'IA Contagem & BI',
    pricePerCam: 14.90,
    badge: 'Gestão & Comércio',
    description: 'Contabiliza fluxo de entrada/saída de pessoas e veículos e exibe mapas de calor das áreas com maior permanência.',
    highlight: 'Métricas exatas de movimentação para condomínios e estabelecimentos.',
    enabled: true
  }
];

export const DEFAULT_VOLUME_DISCOUNTS: VolumeDiscountTier[] = [
  { minCameras: 24, discountPercent: 25, label: '24+ câmeras (25% off)' },
  { minCameras: 16, discountPercent: 20, label: '16+ câmeras (20% off)' },
  { minCameras: 8,  discountPercent: 15, label: '8+ câmeras (15% off)' },
  { minCameras: 4,  discountPercent: 10, label: '4+ câmeras (10% off)' },
  { minCameras: 2,  discountPercent: 5,  label: '2+ câmeras (5% off)' }
];

export const DEFAULT_GENERAL_CONDITIONS: GeneralPricingConditions = {
  annualDiscountPercent: 20,
  minCameras: 1,
  maxCameras: 64,
  presetCameras: [1, 2, 4, 8, 16, 24, 32],
  installationFeePerCam: 0,
  installationFeeWaived: true,
  installationFeeBadge: 'Instalação Grátis no Plano',
  freeTrialDays: 7,
  whatsappSalesNumber: '5548988776655',
  customContractTermsNote: 'Sem fidelidade obrigatória para câmeras próprias. Contrato padrão de 12 meses com substituição expressa para equipamentos locados.'
};

export const DEFAULT_PRICING_CONFIG: PricingCalculatorConfig = {
  version: 1,
  lastUpdated: new Date().toISOString(),
  updatedBy: 'Admin Master Padrão',
  retentionOptions: DEFAULT_RETENTION_OPTIONS,
  cameraRentalModels: DEFAULT_CAMERA_RENTAL_MODELS,
  aiModules: DEFAULT_AI_MODULES,
  volumeDiscounts: DEFAULT_VOLUME_DISCOUNTS,
  generalConditions: DEFAULT_GENERAL_CONDITIONS
};

const STORAGE_KEY = 'servcam_pricing_calculator_config';
const SETTING_DB_KEY = 'pricing_calculator_config';

let inMemoryConfigCache: PricingCalculatorConfig = DEFAULT_PRICING_CONFIG;
let isCacheLoaded = false;

export const PricingConfigService = {
  /**
   * Obtém a configuração atual sincronizada (Memória -> LocalStorage -> Backend -> Padrão)
   */
  getConfigSync(): PricingCalculatorConfig {
    if (isCacheLoaded) return inMemoryConfigCache;

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const enrichedCameras = enrichCameraImages(parsed.cameraRentalModels || DEFAULT_CAMERA_RENTAL_MODELS);
          inMemoryConfigCache = {
            ...DEFAULT_PRICING_CONFIG,
            ...parsed,
            cameraRentalModels: enrichedCameras,
            generalConditions: {
              ...DEFAULT_GENERAL_CONDITIONS,
              ...(parsed.generalConditions || {})
            }
          };
          isCacheLoaded = true;
          return inMemoryConfigCache;
        }
      } catch (e) {
        console.warn("[PricingConfigService] Erro ao ler localStorage:", e);
      }
    }

    return inMemoryConfigCache;
  },

  /**
   * Carrega a configuração do servidor / Supabase de forma assíncrona
   */
  async loadConfig(forceRefresh = false): Promise<PricingCalculatorConfig> {
    if (!forceRefresh && isCacheLoaded) {
      return inMemoryConfigCache;
    }

    // 1. Tentar ler do backend local /api/pricing-config
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch('/api/pricing-config', {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.retentionOptions && Array.isArray(data.retentionOptions)) {
          const enrichedCameras = enrichCameraImages(data.cameraRentalModels || DEFAULT_CAMERA_RENTAL_MODELS);
          inMemoryConfigCache = {
            ...DEFAULT_PRICING_CONFIG,
            ...data,
            cameraRentalModels: enrichedCameras,
            generalConditions: {
              ...DEFAULT_GENERAL_CONDITIONS,
              ...(data.generalConditions || {})
            }
          };
          isCacheLoaded = true;
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(inMemoryConfigCache));
          }
          return inMemoryConfigCache;
        }
      }
    } catch (apiErr) {
      // Ignora erro e tenta próximo fallback
    }

    // 2. Tentar ler do Supabase system_settings
    try {
      const settings = await MockService.getSettings(forceRefresh);
      if (settings && settings[SETTING_DB_KEY]) {
        const parsed = JSON.parse(settings[SETTING_DB_KEY]);
        const enrichedCameras = enrichCameraImages(parsed.cameraRentalModels || DEFAULT_CAMERA_RENTAL_MODELS);
        inMemoryConfigCache = {
          ...DEFAULT_PRICING_CONFIG,
          ...parsed,
          cameraRentalModels: enrichedCameras,
          generalConditions: {
            ...DEFAULT_GENERAL_CONDITIONS,
            ...(parsed.generalConditions || {})
          }
        };
        isCacheLoaded = true;
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(inMemoryConfigCache));
        }
        return inMemoryConfigCache;
      }
    } catch (dbErr) {
      console.warn("[PricingConfigService] Info: Banco offline ou sem tabela configurada:", dbErr);
    }

    // 3. Fallback no localStorage ou Default
    return this.getConfigSync();
  },

  /**
   * Salva a nova configuração (Memória + LocalStorage + Backend + Supabase)
   */
  async saveConfig(newConfig: Partial<PricingCalculatorConfig>, userEmail?: string): Promise<PricingCalculatorConfig> {
    const updated: PricingCalculatorConfig = {
      ...this.getConfigSync(),
      ...newConfig,
      lastUpdated: new Date().toISOString(),
      updatedBy: userEmail || 'Admin Master'
    };

    inMemoryConfigCache = updated;

    // 1. Gravar em LocalStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        // Notificar ouvintes na página
        window.dispatchEvent(new CustomEvent('servcam:pricing_config_changed', { detail: updated }));
      } catch (err) {
        console.warn("[PricingConfigService] Aviso ao salvar no localStorage:", err);
      }
    }

    // 2. Gravar no backend local /api/pricing-config
    try {
      fetch('/api/pricing-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      }).catch(() => {});
    } catch (e) {}

    // 3. Gravar no Supabase system_settings
    try {
      await MockService.updateSetting(SETTING_DB_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("[PricingConfigService] Aviso ao persistir no Supabase:", e);
    }

    return updated;
  },

  /**
   * Restaura as condições padrão originais de fábrica
   */
  async resetToDefaults(userEmail?: string): Promise<PricingCalculatorConfig> {
    return this.saveConfig({
      ...DEFAULT_PRICING_CONFIG,
      lastUpdated: new Date().toISOString(),
      updatedBy: `${userEmail || 'Admin Master'} (Padrões Restaurados)`
    }, userEmail);
  },

  /**
   * Calcula desconto de volume de acordo com os tiers configurados
   */
  calculateVolumeDiscount(cameras: number, config?: PricingCalculatorConfig): number {
    const activeConfig = config || this.getConfigSync();
    const tiers = [...(activeConfig.volumeDiscounts || DEFAULT_VOLUME_DISCOUNTS)]
      .sort((a, b) => b.minCameras - a.minCameras);

    for (const tier of tiers) {
      if (cameras >= tier.minCameras) {
        return tier.discountPercent / 100;
      }
    }
    return 0;
  }
};
