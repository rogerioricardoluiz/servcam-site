import React, { useState, useMemo } from 'react';
import { 
  Check, 
  Video, 
  ShieldCheck, 
  MessageSquare, 
  ArrowRight, 
  Sparkles, 
  Server,
  Calculator,
  Lock,
  HardDrive
} from 'lucide-react';
import { Button } from './UI';

export interface PricingTier {
  rangeLabel: string;
  minCameras: number;
  maxCameras: number | null; // null for 51+
  pricePerCamera: number;
  highlight?: boolean;
  popular?: boolean;
}

export const FIXED_PRICING_TIERS: PricingTier[] = [
  {
    rangeLabel: '0 a 10 câmeras',
    minCameras: 1,
    maxCameras: 10,
    pricePerCamera: 24.90,
  },
  {
    rangeLabel: '11 a 20 câmeras',
    minCameras: 11,
    maxCameras: 20,
    pricePerCamera: 22.90,
    popular: true,
  },
  {
    rangeLabel: '21 a 30 câmeras',
    minCameras: 21,
    maxCameras: 30,
    pricePerCamera: 20.90,
  },
  {
    rangeLabel: '31 a 50 câmeras',
    minCameras: 31,
    maxCameras: 50,
    pricePerCamera: 18.90,
  },
  {
    rangeLabel: '51+ câmeras',
    minCameras: 51,
    maxCameras: null,
    pricePerCamera: 15.90,
    highlight: true,
  },
];

export const formatBRL = (val: number): string => {
  return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const getPriceForCameraCount = (cameras: number): number => {
  if (cameras <= 10) return 24.90;
  if (cameras <= 20) return 22.90;
  if (cameras <= 30) return 20.90;
  if (cameras <= 50) return 18.90;
  return 15.90;
};

interface PricingCalculatorTableProps {
  onSelectPlan?: (planDetails: {
    cameras: number;
    retentionDays: number;
    rentalModelId: string;
    rentalModelName: string;
    selectedAiModuleIds: string[];
    billingCycle: 'monthly' | 'annual';
    total: number;
  }) => void;
}

export const PricingCalculatorTable: React.FC<PricingCalculatorTableProps> = ({ onSelectPlan }) => {
  const [selectedCameras, setSelectedCameras] = useState<number>(4);

  const activeTier = useMemo(() => {
    return FIXED_PRICING_TIERS.find(t => {
      if (t.maxCameras === null) return selectedCameras >= t.minCameras;
      return selectedCameras >= t.minCameras && selectedCameras <= t.maxCameras;
    }) || FIXED_PRICING_TIERS[0];
  }, [selectedCameras]);

  const unitPrice = getPriceForCameraCount(selectedCameras);
  const totalMonthly = selectedCameras * unitPrice;

  const handleSelectTier = (tier: PricingTier) => {
    setSelectedCameras(tier.minCameras);
  };

  const handleContract = (camsToContract: number = selectedCameras) => {
    const rate = getPriceForCameraCount(camsToContract);
    const total = camsToContract * rate;

    if (onSelectPlan) {
      onSelectPlan({
        cameras: camsToContract,
        retentionDays: 3,
        rentalModelId: 'none',
        rentalModelName: 'Câmeras Próprias',
        selectedAiModuleIds: ['nuvem_3dias'],
        billingCycle: 'monthly',
        total: Number(total.toFixed(2))
      });
    } else {
      window.location.href = `/#/login?mode=register&plan=CUSTOM&cameras=${camsToContract}&retention=3&total=${total.toFixed(2)}`;
    }
  };

  const generateWhatsAppLink = (cams: number = selectedCameras) => {
    const rate = getPriceForCameraCount(cams);
    const total = cams * rate;
    const text = encodeURIComponent(
      `Olá! Tenho interesse na contratação do ServCam (Alien Segurança Eletrônica):\n\n` +
      `• Quantidade de Câmeras: ${cams}\n` +
      `• Retenção: 3 Dias de Gravação em Nuvem Contínua (Inclusos)\n` +
      `• Faixa: ${cams <= 10 ? '0 a 10 câmeras' : cams <= 20 ? '11 a 20 câmeras' : cams <= 30 ? '21 a 30 câmeras' : cams <= 50 ? '31 a 50 câmeras' : '51+ câmeras'}\n` +
      `• Valor por câmera/mês: ${formatBRL(rate)}\n` +
      `• Valor Total Mensal Estimado: ${formatBRL(total)}/mês\n\n` +
      `Gostaria de agendar a ativação das minhas câmeras no sistema!`
    );
    return `https://wa.me/5548999999999?text=${text}`;
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 font-sans">
      {/* 1. Header Highlight Badge: 3 DIAS DE GRAVAÇÃO EM NUVEM INCLUSOS */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950/80 via-black to-[#07130b] border-2 border-atalaia-neon/40 p-6 sm:p-8 text-center shadow-[0_0_50px_rgba(0,255,102,0.15)]">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-72 h-72 bg-atalaia-neon/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-atalaia-neon text-black font-black text-xs sm:text-sm tracking-wider uppercase shadow-[0_0_20px_rgba(0,255,102,0.4)] mb-4">
          <Check size={18} strokeWidth={3} />
          <span>3 DIAS DE GRAVAÇÃO EM NUVEM INCLUSOS</span>
        </div>

        <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
          Tabela Fixa de Câmeras em Nuvem
        </h3>
        <p className="text-gray-300 text-xs sm:text-sm md:text-base max-w-2xl mx-auto mt-2 leading-relaxed">
          Preço transparente e regressivo por câmera ativa. Quanto mais câmeras você adiciona ao seu sistema, menor o custo unitário por câmera ao mês.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 mt-5 text-[11px] sm:text-xs text-gray-300">
          <div className="flex items-center gap-2">
            <Server size={15} className="text-atalaia-neon" />
            <span>Servidores Dedicados ServCam</span>
          </div>
          <div className="flex items-center gap-2">
            <HardDrive size={15} className="text-atalaia-neon" />
            <span>3 Dias de Histórico 24/7</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock size={15} className="text-atalaia-neon" />
            <span>Criptografia de Ponta a Ponta</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} className="text-atalaia-neon" />
            <span>Alien Sistemas de Segurança</span>
          </div>
        </div>
      </div>

      {/* 2. Main Fixed Pricing Table */}
      <div className="bg-[#060608] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                <th className="py-5 px-6 sm:px-8 text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-400">
                  Faixa de câmeras ativas
                </th>
                <th className="py-5 px-6 sm:px-8 text-xs sm:text-sm font-bold uppercase tracking-wider text-atalaia-neon text-right">
                  Valor por câmera/mês
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {FIXED_PRICING_TIERS.map((tier) => {
                const isCurrentRange = tier.rangeLabel === activeTier.rangeLabel;
                return (
                  <tr 
                    key={tier.rangeLabel}
                    onClick={() => handleSelectTier(tier)}
                    title="Clique para selecionar e simular esta faixa"
                    className={`transition-colors cursor-pointer group ${
                      isCurrentRange 
                        ? 'bg-atalaia-neon/10 border-l-4 border-l-atalaia-neon' 
                        : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    {/* Column 1: Faixa de câmeras ativas */}
                    <td className="py-4 sm:py-5 px-6 sm:px-8">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full shrink-0 transition-colors ${
                          isCurrentRange ? 'bg-atalaia-neon shadow-[0_0_10px_#00ff66]' : 'bg-gray-700 group-hover:bg-gray-500'
                        }`} />
                        <div>
                          <span className={`text-base sm:text-lg font-bold block ${
                            isCurrentRange ? 'text-white' : 'text-gray-200 group-hover:text-white'
                          }`}>
                            {tier.rangeLabel}
                          </span>
                          <span className="text-[11px] text-gray-400">
                            Gravação 3 dias contínuos em nuvem inclusa
                          </span>
                        </div>
                        {tier.popular && (
                          <span className="ml-2 hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/15 border border-blue-500/30 text-blue-400">
                            Mais Popular
                          </span>
                        )}
                        {tier.highlight && (
                          <span className="ml-2 hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-atalaia-neon/15 border border-atalaia-neon/30 text-atalaia-neon">
                            Melhor Tarifa
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Column 2: Valor por câmera/mês */}
                    <td className="py-4 sm:py-5 px-6 sm:px-8 text-right">
                      <div className="inline-flex items-baseline gap-1">
                        <span className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
                          isCurrentRange ? 'text-atalaia-neon' : 'text-white group-hover:text-atalaia-neon'
                        }`}>
                          {formatBRL(tier.pricePerCamera)}
                        </span>
                        <span className="text-xs text-gray-400 font-medium">/câmera/mês</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Interactive Camera Simulator Box */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#08080c] border border-white/10 shadow-xl relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: Camera Selector */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-atalaia-neon">
              <Calculator size={16} />
              <span>Simulador de Quantidade de Câmeras</span>
            </div>
            
            <h4 className="text-xl sm:text-2xl font-bold text-white">
              Quantas câmeras você deseja monitorar?
            </h4>

            <p className="text-xs sm:text-sm text-gray-400">
              Ajuste para ver a faixa exata e o valor total mensal correspondente.
            </p>

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {[1, 2, 4, 8, 10, 16, 20, 30, 48, 64].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setSelectedCameras(num)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedCameras === num
                      ? 'bg-atalaia-neon text-black shadow-[0_0_12px_rgba(0,255,102,0.4)]'
                      : 'bg-white/5 text-gray-300 hover:bg-white/15 hover:text-white border border-white/5'
                  }`}
                >
                  {num} {num === 1 ? 'câm' : 'câms'}
                </button>
              ))}
            </div>

            {/* Range Slider & Manual Input */}
            <div className="pt-3 space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-400 font-mono">
                <span>1 câmera</span>
                <span className="text-white font-bold">{selectedCameras} {selectedCameras === 1 ? 'câmera ativa' : 'câmeras ativas'}</span>
                <span>100+ câmeras</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={selectedCameras}
                onChange={(e) => setSelectedCameras(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#00ff66]"
              />
            </div>
          </div>

          {/* Right: Total Summary Card */}
          <div className="lg:col-span-5 bg-black/80 border border-atalaia-neon/30 rounded-2xl p-6 sm:p-7 space-y-4 shadow-[0_0_30px_rgba(0,255,102,0.08)]">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-gray-400 uppercase font-mono">
                <span>Faixa Aplicada:</span>
                <span className="text-white font-bold">{activeTier.rangeLabel}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400 uppercase font-mono">
                <span>Valor unitário:</span>
                <span className="text-atalaia-neon font-bold">{formatBRL(unitPrice)}/câmera</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400 uppercase font-mono">
                <span>Armazenamento:</span>
                <span className="text-emerald-400 font-bold">3 Dias Inclusos</span>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10">
              <span className="text-[11px] font-mono uppercase tracking-wider text-gray-400 block">Total Mensal</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                  {formatBRL(totalMonthly)}
                </span>
                <span className="text-xs text-gray-400 font-medium">/mês</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Sem custos ocultos ou cobrança de taxa de instalação surpresa.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <Button
                onClick={() => handleContract()}
                className="w-full py-3.5 bg-atalaia-neon text-black hover:bg-emerald-400 font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(0,255,102,0.3)] flex items-center justify-center gap-2"
              >
                <span>Contratar {selectedCameras} {selectedCameras === 1 ? 'Câmera' : 'Câmeras'}</span>
                <ArrowRight size={16} />
              </Button>

              <a
                href={generateWhatsAppLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/15 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <MessageSquare size={15} className="text-[#25D366]" />
                <span>Pedir Proposta no WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Assurance Points */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-300">
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-3">
          <Check size={18} className="text-atalaia-neon shrink-0 mt-0.5" />
          <div>
            <strong className="text-white block font-bold">Servidores Locais ServCam</strong>
            Transmissão de vídeo de altíssima velocidade, estabilidade e baixa latência operado pela Alien Segurança.
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-3">
          <Check size={18} className="text-atalaia-neon shrink-0 mt-0.5" />
          <div>
            <strong className="text-white block font-bold">Acesso Total 24h por Dia</strong>
            Visualize ao vivo pelo aplicativo no celular ou computador com linha do tempo para resgate fácil de vídeos.
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-3">
          <Check size={18} className="text-atalaia-neon shrink-0 mt-0.5" />
          <div>
            <strong className="text-white block font-bold">Compatível com seu Equipamento</strong>
            Funciona com DVRs Intelbras, Hikvision, Giga, Tecvoz e câmeras IP com protocolo RTSP/ONVIF.
          </div>
        </div>
      </div>
    </div>
  );
};
