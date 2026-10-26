
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '@/auth/context';
import { Card, Input, Button } from '../components/UI';
import { MockService } from '../services/mockService';
import { Save, User as UserIcon, Camera, Home, MapPin, CheckCircle, Loader2, AlertCircle, Smartphone, Laptop, Monitor, Trash2, LogOut, Sparkles, Upload, Building, Sliders, Check, FileText, Copy, DollarSign } from 'lucide-react';
import { SessionService } from '../services/sessionService';
import { UserRole } from '@/types';
import { supabase } from '@/lib/supabaseClient';

const Profile: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [neighborhoodName, setNeighborhoodName] = useState('Carregando...');
  const [showSuccess, setShowSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);

  const handleDownloadReceipt = async () => {
    if (!user?.id) return;
    setDownloadingReceipt(true);
    try {
      // 1. Procurar no banco de dados por um pagamento desse usuário que possua comprovante
      const { data: userPayments, error: dbError } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .order('payment_date', { ascending: false });

      if (dbError) throw dbError;

      const paymentWithReceipt = userPayments?.find(p => p.receipt_base64 || p.receipt_name);

      if (!paymentWithReceipt) {
        throw new Error("Comprovante de pagamento não encontrado no histórico.");
      }

      const receiptName = paymentWithReceipt.receipt_name || "comprovante.png";
      let receiptBase64 = paymentWithReceipt.receipt_base64;

      // Se não tiver o base64 direto, tenta ler do localStorage como fallback de cache
      if (!receiptBase64) {
        receiptBase64 = localStorage.getItem(`receipt_data_${paymentWithReceipt.id}`) || null;
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

  // Active user sessions states
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionActionLoading, setSessionActionLoading] = useState<string | null>(null);

  const loadSessions = async () => {
    if (!user?.id) return;
    setLoadingSessions(true);
    try {
      const activeSessions = await SessionService.getSessions(user.id);
      setSessions(activeSessions);
    } catch (e) {
      console.error("Erro ao carregar sessões:", e);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [user?.id]);



  const handleTerminateSession = async (id: string) => {
    setSessionActionLoading(id);
    try {
      await SessionService.terminateSession(id);
      await loadSessions();
    } catch (e) {
      console.error("Erro ao encerrar sessão:", e);
    } finally {
      setSessionActionLoading(null);
    }
  };

  const handleTerminateOthers = async () => {
    if (!user?.id) return;
    setSessionActionLoading('others');
    try {
      await SessionService.terminateAllOtherSessions(user.id);
      await loadSessions();
    } catch (e) {
      console.error("Erro ao encerrar outras sessões:", e);
    } finally {
      setSessionActionLoading(null);
    }
  };
  
  // BRANDING & RGB STATES FOR INTEGRATOR
  const [brandName, setBrandName] = useState('');
  const [brandLogo, setBrandLogo] = useState('');
  const [mpPubKey, setMpPubKey] = useState('');
  const [mpAccToken, setMpAccToken] = useState('');
  const [splitPct, setSplitPct] = useState(70);
  const [savingBranding, setSavingBranding] = useState(false);
  const [brandingStatusMsg, setBrandingStatusMsg] = useState('');

  const [brandCnpj, setBrandCnpj] = useState('');
  const [brandRazaoSocial, setBrandRazaoSocial] = useState('');
  const [brandPhone, setBrandPhone] = useState('');
  const [brandBanco, setBrandBanco] = useState('');
  const [brandPix, setBrandPix] = useState('');
  const [brandCpf, setBrandCpf] = useState('');
  const [brandEmail, setBrandEmail] = useState('');
  const [brandCustomRgb, setBrandCustomRgb] = useState('0, 255, 102');

  // SINGLE PLAN & CAMERA RENTAL & RECORDING DAYS STATES (PULLED INTO CONTRACT)
  const [singlePlanPrice, setSinglePlanPrice] = useState('49,90');
  const [hasCameraRental, setHasCameraRental] = useState(false);
  const [cameraRentalDetails, setCameraRentalDetails] = useState('');
  const [recordingDays, setRecordingDays] = useState<number>(7);
  const [customClause, setCustomClause] = useState('');

  const isIntegrator = 
    user?.role === UserRole.INTEGRATOR || 
    user?.role === UserRole.ADMIN ||
    Boolean(user?.email && (user.email.toLowerCase().includes('integrador') || user.email.toLowerCase().includes('alien'))) ||
    user?.email?.toLowerCase() === 'rogerioricardoluiz@gmail.com' ||
    user?.email?.toLowerCase() === 'servcam@alienmonitoramento.com.br';

  const isAlien = 
    user?.email?.toLowerCase() === 'rogerioricardoluiz@gmail.com' ||
    user?.email?.toLowerCase() === 'servcam@alienmonitoramento.com.br' ||
    user?.email?.toLowerCase() === 'alienmonitoramentoeletronico@gmail.com' ||
    user?.email?.toLowerCase() === 'rogerioricardoluizintegrador@gmail.com' ||
    Boolean(user?.email && user.email.toLowerCase().includes('alien')) ||
    Boolean(user?.companyName && user.companyName.toLowerCase().includes('alien')) ||
    Boolean(brandName && brandName.toLowerCase().includes('alien')) ||
    user?.role === UserRole.ADMIN ||
    !user?.id ||
    user?.id === 'alienmonitoramento-integrator-id' ||
    user?.id === 'a11e9920-6765-4f81-b454-e6778b77ee66';

  const effectiveIntegratorId = isAlien
    ? 'alienmonitoramento-integrator-id'
    : (user?.id || 'alienmonitoramento-integrator-id');

  const effectiveSystemUuid = isAlien
    ? 'a11e9920-6765-4f81-b454-e6778b77ee66'
    : (user?.id || 'alienmonitoramento-integrator-id');

  const parseRgbTriple = (val: string): [number, number, number] => {
    if (!val) return [0, 255, 102];
    const s = val.trim().replace(/^rgb\(|\)$/gi, '').trim();
    if (s.startsWith('#')) {
      const hex = s.substring(1);
      if (hex.length === 3) {
        return [
          parseInt(hex[0] + hex[0], 16) || 0,
          parseInt(hex[1] + hex[1], 16) || 0,
          parseInt(hex[2] + hex[2], 16) || 0
        ];
      } else if (hex.length >= 6) {
        return [
          parseInt(hex.substring(0, 2), 16) || 0,
          parseInt(hex.substring(2, 4), 16) || 0,
          parseInt(hex.substring(4, 6), 16) || 0
        ];
      }
    }
    const parts = s.split(',').map(p => parseInt(p.trim(), 10));
    if (parts.length === 3 && parts.every(n => !isNaN(n) && n >= 0 && n <= 255)) {
      return [parts[0], parts[1], parts[2]];
    }
    return [0, 255, 102];
  };

  const rgbToHexStr = (r: number, g: number, b: number): string => {
    const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
    return `#${clamp(r)}${clamp(g)}${clamp(b)}`;
  };

  const [appliedLiveMsg, setAppliedLiveMsg] = useState(false);

  const handleApplyImmediately = () => {
    const cleanRgb = brandCustomRgb.trim().replace(/^rgb\(|\)$/gi, '').trim();
    const targetId = user?.id || effectiveIntegratorId;
    if (targetId) {
      try {
        localStorage.setItem(`atalaia_integrator_custom_rgb_${targetId}`, cleanRgb);
        const colorsMap = JSON.parse(localStorage.getItem('atalaia_integrator_colors') || '{}');
        colorsMap[targetId] = cleanRgb;
        localStorage.setItem('atalaia_integrator_colors', JSON.stringify(colorsMap));
      } catch (_) {}
    }
    window.dispatchEvent(new CustomEvent('atalaia:theme_changed', { detail: cleanRgb }));
    setAppliedLiveMsg(true);
    setTimeout(() => setAppliedLiveMsg(false), 2500);
  };

  const activeBaseOrigin = typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost')
    ? window.location.origin
    : 'https://ais-dev-6poc3il3qcyznrtjn4rips-44114112762.us-west2.run.app';

  const clientLoginFullUrl = `${activeBaseOrigin}/#/logincliente?integrator=${effectiveIntegratorId}`;

  const [copiedClientLink, setCopiedClientLink] = useState(false);
  const handleCopyClientLink = () => {
    navigator.clipboard.writeText(clientLoginFullUrl);
    setCopiedClientLink(true);
    setTimeout(() => setCopiedClientLink(false), 2500);
  };

  useEffect(() => {
    if (user && !savingBranding) {
      setBrandName(user.companyName || '');
      setBrandLogo(user.companyLogo || '');
      setMpPubKey(user.mpPublicKey || '');
      setMpAccToken(user.mpAccessToken || '');
      setSplitPct(user.splitPercentage || 70);
      setBrandCnpj(user.cnpj || '');
      setBrandRazaoSocial(user.razaoSocial || '');
      setBrandPhone(user.phone || '');
      setBrandBanco(user.banco || '');
      setBrandPix(user.pix || '');
      setBrandCpf(user.cpf || '');
      setBrandEmail(user.email || '');
      setBrandCustomRgb(user.customRgb || '0, 255, 102');

      let initPrice = user.singlePlanPrice !== undefined ? String(user.singlePlanPrice) : '';
      let initRental = user.hasCameraRental !== undefined ? Boolean(user.hasCameraRental) : false;
      let initDetails = user.cameraRentalDetails || '';
      let initRecordingDays = user.recordingDays !== undefined ? Number(user.recordingDays) : 7;
      let initCustomClause = user.customClause || '';

      if (user.id && typeof window !== 'undefined') {
        try {
          const cachedPlan = localStorage.getItem(`atalaia_integrator_plan_${user.id}`);
          if (cachedPlan) {
            const p = JSON.parse(cachedPlan);
            if (!initPrice && p.singlePlanPrice !== undefined) initPrice = String(p.singlePlanPrice);
            if (user.hasCameraRental === undefined && p.hasCameraRental !== undefined) initRental = Boolean(p.hasCameraRental);
            if (!initDetails && p.cameraRentalDetails) initDetails = p.cameraRentalDetails;
            if (user.recordingDays === undefined && p.recordingDays !== undefined) initRecordingDays = Number(p.recordingDays);
            if (!initCustomClause && p.customClause !== undefined) initCustomClause = p.customClause;
          }
        } catch (_) {}
      }

      setSinglePlanPrice(initPrice || '49,90');
      setHasCameraRental(initRental);
      setCameraRentalDetails(initDetails || 'Locação de 1 câmera Full HD com suporte e manutenção inclusa');
      setRecordingDays(initRecordingDays);
      setCustomClause(initCustomClause || '');
    }
  }, [user, savingBranding]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              if (typeof reader.result === 'string') {
                  setBrandLogo(reader.result);
              }
          };
          reader.readAsDataURL(file);
      }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
      e.preventDefault();
      setSavingBranding(true);
      setBrandingStatusMsg('');
      try {
          // Serialize branding details inside standard 'address' column as JSON string to maintain schema consistency
          const serializedAddress = JSON.stringify({
              companyName: brandName,
              companyLogo: brandLogo,
              splitPercentage: Number(splitPct),
              cnpj: brandCnpj,
              razaoSocial: brandRazaoSocial,
              banco: brandBanco,
              pix: brandPix,
              cpf: brandCpf,
              phone: brandPhone,
              customRgb: brandCustomRgb,
              singlePlanPrice: singlePlanPrice.trim() || '49,90',
              hasCameraRental: Boolean(hasCameraRental),
              cameraRentalDetails: cameraRentalDetails.trim(),
              recordingDays: Number(recordingDays),
              customClause: customClause.trim()
          });

          await updateProfile({
              address: serializedAddress,
              mpPublicKey: mpPubKey,
              mpAccessToken: mpAccToken,
              companyName: brandName,
              companyLogo: brandLogo,
              splitPercentage: Number(splitPct),
              cnpj: brandCnpj,
              razaoSocial: brandRazaoSocial,
              phone: brandPhone,
              banco: brandBanco,
              pix: brandPix,
              cpf: brandCpf,
              email: brandEmail,
              customRgb: brandCustomRgb,
              singlePlanPrice: singlePlanPrice.trim() || '49,90',
              hasCameraRental: Boolean(hasCameraRental),
              cameraRentalDetails: cameraRentalDetails.trim(),
              recordingDays: Number(recordingDays),
              customClause: customClause.trim()
          } as any);

          if (user?.id) {
              try {
                  localStorage.setItem(`atalaia_integrator_plan_${user.id}`, JSON.stringify({
                    singlePlanPrice: singlePlanPrice.trim() || '49,90',
                    hasCameraRental: Boolean(hasCameraRental),
                    cameraRentalDetails: cameraRentalDetails.trim(),
                    recordingDays: Number(recordingDays),
                    customClause: customClause.trim()
                  }));
                  window.dispatchEvent(new CustomEvent('atalaia:plan_config_changed'));
              } catch (_) {}
          }

          setFormData(prev => ({ ...prev, phone: brandPhone }));

          if (user?.id) {
              try {
                  localStorage.setItem(`atalaia_integrator_phone_${user.id}`, brandPhone.trim());
                  const phonesMap = JSON.parse(localStorage.getItem('atalaia_integrator_phones') || '{}');
                  if (brandPhone.trim()) {
                    phonesMap[user.id] = brandPhone.trim();
                  } else {
                    delete phonesMap[user.id];
                  }
                  localStorage.setItem('atalaia_integrator_phones', JSON.stringify(phonesMap));

                  localStorage.setItem(`atalaia_integrator_custom_rgb_${user.id}`, brandCustomRgb);
                  const colorsMap = JSON.parse(localStorage.getItem('atalaia_integrator_colors') || '{}');
                  colorsMap[user.id] = brandCustomRgb;
                  localStorage.setItem('atalaia_integrator_colors', JSON.stringify(colorsMap));
                  window.dispatchEvent(new CustomEvent('atalaia:theme_changed', { detail: brandCustomRgb }));

                  const planData = {
                      singlePlanPrice: singlePlanPrice.trim() || '49,90',
                      hasCameraRental: Boolean(hasCameraRental),
                      cameraRentalDetails: cameraRentalDetails.trim(),
                      recordingDays: Number(recordingDays),
                      customClause: customClause.trim()
                  };
                  localStorage.setItem(`atalaia_integrator_plan_${user.id}`, JSON.stringify(planData));
                  localStorage.setItem('atalaia_integrator_plan_default', JSON.stringify(planData));
                  window.dispatchEvent(new CustomEvent('atalaia:plan_config_changed', { detail: planData }));
                  window.dispatchEvent(new CustomEvent('atalaia:integrator_updated', { detail: { id: user.id, phone: brandPhone.trim() } }));
              } catch (_) {}
          }

          setBrandingStatusMsg('Configurações de Parceria, Cores, Plano Único e Dados Corporativos salvas com sucesso!');
          setTimeout(() => {
              setBrandingStatusMsg('');
          }, 3500);
      } catch (err: any) {
          setBrandingStatusMsg('Erro ao salvar configurações: ' + (err.message || err));
      } finally {
          setSavingBranding(false);
      }
  };

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    lat: '',
    lng: '',
    address: '',
    city: '',
    state: '',
    phone: '',
    photoUrl: ''
  });

  const roleNames: Record<string, string> = {
    ADMIN: 'Administrador',
    INTEGRATOR: 'Integrador',
    SCR: 'Motovigia',
    RESIDENT: 'Cliente'
  };

  const [copiedIndexHtml, setCopiedIndexHtml] = useState(false);
  const [copiedIframeOnly, setCopiedIframeOnly] = useState(false);
  const [activeEmbedTab, setActiveEmbedTab] = useState<'full' | 'iframe'>('full');

  const indexHtmlCode = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${brandName || user?.companyName || 'Alien Monitoramento'} - Câmeras</title>
    <style>
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #000; }
        iframe { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; border: none; margin: 0; padding: 0; overflow: hidden; }
    </style>
</head>
<body>
    <iframe 
        src="${clientLoginFullUrl}" 
        title="Portal de Monitoramento" 
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" 
        allowfullscreen>
    </iframe>
</body>
</html>`;

  const iframeOnlyCode = `<iframe src="${clientLoginFullUrl}" style="width: 100%; height: 100vh; border: none;" title="Portal de Monitoramento" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;

  // Carrega dados iniciais do usuário
  useEffect(() => {
    if (user && !saving) { // Não sincroniza se estiver salvando para evitar pulos no input
        setFormData({
            name: user.name || '',
            email: user.email || '',
            lat: user.lat?.toString() || '',
            lng: user.lng?.toString() || '',
            address: user.address || '',
            city: user.city || '',
            state: user.state || '',
            phone: user.phone || '',
            photoUrl: user.photoUrl || ''
        });
    }
  }, [user, saving]);

  useEffect(() => {
    const loadNeighborhood = async () => {
        if (user?.neighborhoodId) {
            const hood = await MockService.getNeighborhoodById(user.neighborhoodId);
            setNeighborhoodName(hood?.name || 'Bairro Desconhecido');
        } else if (user?.role === 'ADMIN') {
            setNeighborhoodName('Administrador Global');
        } else {
            setNeighborhoodName('Não vinculado');
        }
    };
    loadNeighborhood();
  }, [user?.neighborhoodId, user?.role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    
    // Limpeza e conversão de coordenadas
    const rawLat = formData.lat.replace(',', '.').trim();
    const rawLng = formData.lng.replace(',', '.').trim();
    
    const parsedLat = rawLat === '' ? undefined : parseFloat(rawLat);
    const parsedLng = rawLng === '' ? undefined : parseFloat(rawLng);

    // Validação básica de números
    if ((rawLat !== '' && isNaN(parsedLat as number)) || (rawLng !== '' && isNaN(parsedLng as number))) {
        setErrorMsg("Latitude ou Longitude inválidas. Use apenas números e ponto.");
        setSaving(false);
        return;
    }

    try {
        const cleanPhone = formData.phone.trim() || undefined;
        let finalAddress = formData.address.trim() || undefined;

        if (isIntegrator && (brandName || brandLogo || (user?.address && user.address.trim().startsWith('{')) || brandCustomRgb || singlePlanPrice)) {
            finalAddress = JSON.stringify({
                companyName: brandName || user?.companyName,
                companyLogo: brandLogo || user?.companyLogo,
                splitPercentage: Number(splitPct),
                cnpj: brandCnpj,
                razaoSocial: brandRazaoSocial,
                banco: brandBanco,
                pix: brandPix,
                cpf: brandCpf,
                phone: cleanPhone || brandPhone,
                customRgb: brandCustomRgb,
                singlePlanPrice: singlePlanPrice.trim() || '49,90',
                hasCameraRental: Boolean(hasCameraRental),
                cameraRentalDetails: cameraRentalDetails.trim(),
                streetAddress: !formData.address.trim().startsWith('{') ? formData.address.trim() : undefined
            });
        }

        await updateProfile({
            name: formData.name.trim(),
            phone: cleanPhone,
            address: finalAddress,
            city: formData.city.trim() || undefined,
            state: formData.state.trim() || undefined,
            photoUrl: formData.photoUrl || undefined,
            lat: parsedLat,
            lng: parsedLng,
            customRgb: isIntegrator ? brandCustomRgb : undefined,
            singlePlanPrice: isIntegrator ? (singlePlanPrice.trim() || '49,90') : undefined,
            hasCameraRental: isIntegrator ? Boolean(hasCameraRental) : undefined,
            cameraRentalDetails: isIntegrator ? cameraRentalDetails.trim() : undefined
        });

        if (cleanPhone) {
            setBrandPhone(cleanPhone);
        }
        
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 4000);
    } catch (error: any) {
        console.error("Erro ao salvar perfil:", error);
        setErrorMsg(error.message || 'Erro inesperado ao salvar os dados.');
    } finally {
        setSaving(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
          alert("A imagem deve ter no máximo 2MB");
          return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Meu Perfil</h1>
                <p className="text-gray-400">Gerencie suas informações pessoais, de localização e configurações da empresa.</p>
            </div>
            {isIntegrator && (
                <div className="flex items-center gap-2.5 px-3 py-2 bg-black/70 border border-atalaia-neon/30 rounded-xl shadow-[0_0_15px_rgba(0,255,102,0.1)]">
                    <span 
                        className="w-3.5 h-3.5 rounded-full border border-white/30 shrink-0 transition-all" 
                        style={{ backgroundColor: `rgb(${brandCustomRgb || '0, 255, 102'})`, boxShadow: `0 0 10px rgba(${brandCustomRgb || '0, 255, 102'}, 0.5)` }} 
                    />
                    <div className="text-left">
                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Cores RGB do Sistema</span>
                        <code className="text-xs font-mono font-bold text-atalaia-neon">rgb({brandCustomRgb || '0, 255, 102'})</code>
                    </div>
                </div>
            )}
        </div>

        {errorMsg && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={20} />
                <span className="text-sm font-medium">{errorMsg}</span>
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
            {/* Left Col: Photo & Basic Info */}
            <div className="lg:col-span-1 space-y-6">
                <Card className="p-6 text-center">
                    <div className="relative inline-block mb-6 group">
                        <div className="w-32 h-32 rounded-full border-2 border-atalaia-neon p-1 mx-auto bg-black overflow-hidden relative">
                             {formData.photoUrl ? (
                                 <img src={formData.photoUrl} alt="Profile" className="w-full h-full rounded-full object-cover" />
                             ) : (
                                 <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center text-4xl text-gray-600 font-bold">
                                     {formData.name ? formData.name.charAt(0) : '?'}
                                 </div>
                             )}
                             
                             <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full"
                             >
                                 <Camera className="text-white" size={24} />
                             </div>
                        </div>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleImageUpload} 
                            accept="image/*" 
                            className="hidden" 
                        />
                        <p className="text-xs text-gray-500 mt-2">Clique para alterar foto</p>
                    </div>

                    <h2 className="text-xl font-bold text-white truncate px-2">{user?.name}</h2>
                    <p className="text-atalaia-neon text-sm font-medium mb-4">
                        {user?.role ? roleNames[user.role] : ''}
                    </p>

                    <div className="text-left space-y-4 pt-4 border-t border-white/5">
                        <div>
                            <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Acesso de Cliente</label>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-atalaia-neon">
                                    Ativo
                                </span>
                            </div>
                            {user?.role === 'RESIDENT' && (user?.plan === 'FAMILY' || user?.promoActive) && (
                                <div className="mt-2.5">
                                    <button
                                        type="button"
                                        onClick={handleDownloadReceipt}
                                        disabled={downloadingReceipt}
                                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500 text-yellow-500 hover:text-black rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                                    >
                                        {downloadingReceipt ? (
                                            <>
                                                <Loader2 size={13} className="animate-spin" />
                                                Buscando...
                                            </>
                                        ) : (
                                            <>
                                                <FileText size={13} />
                                                Baixar Comprovante
                                            </>
                                        )}
                                    </button>
                                    <p className="text-[9px] text-zinc-500 mt-1 italic text-center">Buscado seguro no bucket ou banco Supabase</p>
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest">E-mail de Acesso</label>
                            <p className="text-sm text-gray-300 truncate" title={user?.email}>{user?.email}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Right Col: Forms */}
            <div className="lg:col-span-2 space-y-6">
                <form onSubmit={handleSubmit}>
                    <Card className="p-6 md:p-8">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <UserIcon className="text-atalaia-neon" size={20} />
                        Dados Pessoais
                    </h3>
                    
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                        <Input 
                            label="Nome Completo"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            required
                        />
                         <Input 
                            label="WhatsApp / Telefone"
                            placeholder="+55 48 99999-9999"
                            value={formData.phone}
                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        />
                    </div>

                    <div className="pt-6 border-t border-white/10">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <Home className="text-atalaia-neon" size={20} />
                            Endereço e Bairro
                        </h3>

                        <div className="mb-6">
                            <Input 
                                label="Sistema Vinculado"
                                value={neighborhoodName}
                                disabled
                                className="opacity-80 cursor-not-allowed bg-atalaia-neon/5 border-atalaia-neon/30 text-atalaia-neon font-bold"
                            />
                        </div>

                        <div className="mb-6">
                            <Input 
                                label="Endereço (Rua, Número, Apto)"
                                placeholder="Ex: Rua das Flores, 123"
                                value={formData.address}
                                onChange={(e) => setFormData({...formData, address: e.target.value})}
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-6 mb-6">
                             <Input 
                                label="Cidade"
                                value={formData.city}
                                onChange={(e) => setFormData({...formData, city: e.target.value})}
                            />
                             <Input 
                                label="Estado (UF)"
                                placeholder="SC"
                                value={formData.state}
                                maxLength={2}
                                onChange={(e) => setFormData({...formData, state: e.target.value.toUpperCase()})}
                            />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-white/10">
                        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                            <MapPin className="text-atalaia-neon" size={20} />
                            Geolocalização (Mapa)
                        </h3>
                        <p className="text-xs text-gray-500 mb-6">
                            Estes dados permitem que você apareça no Mapa de Câmeras para seus vizinhos.
                        </p>

                        <div className="grid grid-cols-2 gap-6">
                            <Input 
                                label="Latitude"
                                placeholder="Ex: -27.5969"
                                value={formData.lat}
                                onChange={(e) => setFormData({...formData, lat: e.target.value})}
                            />
                            <Input 
                                label="Longitude"
                                placeholder="Ex: -48.5495"
                                value={formData.lng}
                                onChange={(e) => setFormData({...formData, lng: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="pt-8 flex items-center justify-end gap-4">
                        {showSuccess && (
                            <div className="flex items-center gap-2 text-green-500 animate-in fade-in slide-in-from-right-2">
                                <CheckCircle size={18} />
                                <span className="font-bold text-sm">Atualizado com sucesso!</span>
                            </div>
                        )}
                        <Button 
                            type="submit" 
                            disabled={saving}
                            className={`px-8 py-3 min-w-[180px] transition-all duration-300 ${showSuccess ? 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/20' : ''}`}
                        >
                            {saving ? (
                                <><Loader2 className="animate-spin mr-2" size={18} /> Salvando...</>
                            ) : showSuccess ? (
                                <><CheckCircle size={18} className="mr-2" /> Salvo!</>
                            ) : (
                                <><Save size={18} className="mr-2" /> Salvar Alterações</>
                            )}
                        </Button>
                    </div>
                </Card>
                </form>

                {/* INTEGRATOR CO-BRANDING & RGB THEME SECTOR */}
                {isIntegrator && (
                    <Card className="p-6 md:p-8 border border-atalaia-neon/20 bg-gradient-to-b from-[#03140a]/40 to-black relative overflow-hidden">
                        {/* Glowing backdrop decorative bubble */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-atalaia-neon/5 rounded-full blur-3xl pointer-events-none" />
                        
                        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-white/5">
                            <div className="p-2.5 bg-atalaia-neon/15 rounded-xl text-atalaia-neon border border-atalaia-neon/20 shadow-[0_0_15px_rgba(0,255,102,0.1)]">
                                <Sparkles size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white tracking-wide">Configurar Cores RGB</h3>
                                <p className="text-[11px] text-gray-400">Personalização de Cores do Painel da Integradora e Clientes Vinculados</p>
                            </div>
                        </div>

                        {/* ALERT INFO */}
                        <div className="p-4 bg-[#05110a] border border-atalaia-neon/20 rounded-xl flex items-start gap-3 mb-6">
                            <AlertCircle className="text-atalaia-neon shrink-0 mt-0.5 animate-pulse" size={18} />
                            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                                Como nossa <strong className="text-atalaia-neon">Empresa Integradora Parceira</strong>, você tem permissão exclusiva para definir o código de cores RGB do seu próprio painel e de todos os clientes vinculados à sua base (da página de login em diante).
                            </p>
                        </div>

                        <form onSubmit={handleSaveBranding} className="space-y-6">
                            {/* SECTION 1: IDENTITY */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 border-b border-zinc-800/60 pb-2">
                                    <Building size={14} className="text-atalaia-neon" /> Identidade Visual da sua Empresa
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Input 
                                        label="Nome da Empresa" 
                                        placeholder="Ex: Delta Monitoramento Ltda" 
                                        value={brandName} 
                                        onChange={e => setBrandName(e.target.value)} 
                                    />
                                    <div>
                                        <label className="text-[10px] text-gray-400 uppercase font-black tracking-wider block mb-2 font-mono">Logomarca (URL ou Upload)</label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                placeholder="Link da imagem da sua marca..." 
                                                value={brandLogo} 
                                                onChange={e => setBrandLogo(e.target.value)} 
                                                className="flex-1 h-12 bg-black border border-white/10 rounded-xl px-4 text-xs text-white placeholder-gray-600 focus:border-atalaia-neon outline-none transition-all"
                                            />
                                            <label className="h-12 w-12 bg-zinc-900 border border-white/10 hover:border-atalaia-neon/50 rounded-xl flex items-center justify-center cursor-pointer text-gray-400 hover:text-white transition-all shadow-md shrink-0">
                                                <Upload size={18} />
                                                <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    onChange={handleLogoUpload} 
                                                    className="hidden" 
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* SECTION: RGB CUSTOM COLOR SUITE */}
                                {(() => {
                                    const [r, g, b] = parseRgbTriple(brandCustomRgb);
                                    const hex = rgbToHexStr(r, g, b);

                                    const presets = [
                                        { label: 'Verde Neon ServCam', rgb: '0, 255, 102' },
                                        { label: 'Azul Segurança', rgb: '0, 140, 255' },
                                        { label: 'Ciano Cyber', rgb: '0, 220, 240' },
                                        { label: 'Âmbar Dourado', rgb: '255, 180, 0' },
                                        { label: 'Roxo Tecnológico', rgb: '168, 85, 247' },
                                        { label: 'Vermelho Emergência', rgb: '239, 68, 68' },
                                        { label: 'Laranja Monitorado', rgb: '249, 115, 22' },
                                        { label: 'Esmeralda Puro', rgb: '16, 185, 129' },
                                    ];

                                    return (
                                        <div className="p-5 bg-black/70 border border-white/10 rounded-2xl space-y-5">
                                            <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-white/5">
                                                <div className="flex items-center gap-2.5">
                                                    <div 
                                                        className="w-7 h-7 rounded-lg border border-white/30 shadow-md transition-all flex items-center justify-center shrink-0"
                                                        style={{ backgroundColor: `rgb(${r}, ${g}, ${b})`, boxShadow: `0 0 15px rgba(${r}, ${g}, ${b}, 0.5)` }}
                                                    >
                                                        <Sliders size={14} className="text-black drop-shadow-sm" />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-white uppercase tracking-wider block">
                                                            Personalização de Cores do Sistema (Código RGB)
                                                        </label>
                                                        <span className="text-[10px] text-zinc-400">
                                                            Define as cores do seu painel e do painel dos seus clientes vinculados
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={handleApplyImmediately}
                                                        className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 hover:border-white/30 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 transition-all cursor-pointer shadow"
                                                        title="Testa a cor RGB imediatamente na aba aberta"
                                                    >
                                                        <Sparkles size={13} style={{ color: `rgb(${r}, ${g}, ${b})` }} />
                                                        {appliedLiveMsg ? 'Cor Aplicada!' : 'Testar na Tela'}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* INPUTS: TEXT RGB + COLOR PICKER */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                                <div className="md:col-span-2">
                                                    <label className="text-[10px] text-gray-400 uppercase font-black tracking-wider block mb-1.5 font-mono">
                                                        Código RGB Principal (Formato: R, G, B)
                                                    </label>
                                                    <div className="flex items-center gap-2">
                                                        <input 
                                                            type="text"
                                                            placeholder="0, 255, 102"
                                                            value={brandCustomRgb}
                                                            onChange={e => setBrandCustomRgb(e.target.value)}
                                                            className="flex-1 h-11 bg-black border border-white/15 rounded-xl px-4 text-xs font-mono text-white placeholder-gray-600 focus:border-white/50 outline-none transition-all"
                                                        />
                                                        <div className="flex items-center gap-1.5 px-3 h-11 bg-zinc-900 border border-white/10 rounded-xl">
                                                            <input 
                                                                type="color"
                                                                value={hex}
                                                                onChange={e => {
                                                                    const [nr, ng, nb] = parseRgbTriple(e.target.value);
                                                                    setBrandCustomRgb(`${nr}, ${ng}, ${nb}`);
                                                                }}
                                                                className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 outline-none p-0"
                                                                title="Abrir Seletor Visual de Cores"
                                                            />
                                                            <span className="text-[10px] font-mono text-zinc-400 uppercase">{hex}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="p-3 bg-zinc-950/80 rounded-xl border border-white/5 text-[11px] text-zinc-400 flex flex-col justify-center">
                                                    <span className="text-zinc-300 font-semibold mb-1 flex items-center gap-1.5">
                                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: `rgb(${r}, ${g}, ${b})` }} />
                                                        Código Ativo: <code className="text-white font-mono font-bold">rgb({r}, {g}, {b})</code>
                                                    </span>
                                                    <span className="text-[10px] text-zinc-500">
                                                        Valores aceitos de 0 a 255 para cada canal (Red, Green, Blue).
                                                    </span>
                                                </div>
                                            </div>

                                            {/* R, G, B NUMERIC SLIDERS */}
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                                                {/* RED */}
                                                <div className="p-3 bg-zinc-950 rounded-xl border border-red-500/20 space-y-2">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="font-bold text-red-400 font-mono">R (Vermelho)</span>
                                                        <input 
                                                            type="number"
                                                            min="0"
                                                            max="255"
                                                            value={r}
                                                            onChange={e => {
                                                                const val = Math.max(0, Math.min(255, parseInt(e.target.value) || 0));
                                                                setBrandCustomRgb(`${val}, ${g}, ${b}`);
                                                            }}
                                                            className="w-14 h-7 bg-black border border-red-500/30 rounded text-center text-xs font-mono text-white outline-none"
                                                        />
                                                    </div>
                                                    <input 
                                                        type="range"
                                                        min="0"
                                                        max="255"
                                                        value={r}
                                                        onChange={e => setBrandCustomRgb(`${e.target.value}, ${g}, ${b}`)}
                                                        className="w-full accent-red-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                                                    />
                                                </div>

                                                {/* GREEN */}
                                                <div className="p-3 bg-zinc-950 rounded-xl border border-green-500/20 space-y-2">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="font-bold text-green-400 font-mono">G (Verde)</span>
                                                        <input 
                                                            type="number"
                                                            min="0"
                                                            max="255"
                                                            value={g}
                                                            onChange={e => {
                                                                const val = Math.max(0, Math.min(255, parseInt(e.target.value) || 0));
                                                                setBrandCustomRgb(`${r}, ${val}, ${b}`);
                                                            }}
                                                            className="w-14 h-7 bg-black border border-green-500/30 rounded text-center text-xs font-mono text-white outline-none"
                                                        />
                                                    </div>
                                                    <input 
                                                        type="range"
                                                        min="0"
                                                        max="255"
                                                        value={g}
                                                        onChange={e => setBrandCustomRgb(`${r}, ${e.target.value}, ${b}`)}
                                                        className="w-full accent-green-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                                                    />
                                                </div>

                                                {/* BLUE */}
                                                <div className="p-3 bg-zinc-950 rounded-xl border border-blue-500/20 space-y-2">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="font-bold text-blue-400 font-mono">B (Azul)</span>
                                                        <input 
                                                            type="number"
                                                            min="0"
                                                            max="255"
                                                            value={b}
                                                            onChange={e => {
                                                                const val = Math.max(0, Math.min(255, parseInt(e.target.value) || 0));
                                                                setBrandCustomRgb(`${r}, ${g}, ${val}`);
                                                            }}
                                                            className="w-14 h-7 bg-black border border-blue-500/30 rounded text-center text-xs font-mono text-white outline-none"
                                                        />
                                                    </div>
                                                    <input 
                                                        type="range"
                                                        min="0"
                                                        max="255"
                                                        value={b}
                                                        onChange={e => setBrandCustomRgb(`${r}, ${g}, ${e.target.value}`)}
                                                        className="w-full accent-blue-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                                                    />
                                                </div>
                                            </div>

                                            {/* PRESETS PALETTE */}
                                            <div className="space-y-2">
                                                <span className="text-[10px] text-zinc-400 uppercase font-black tracking-wider block font-mono">
                                                    Paleta Rápida Sugerida:
                                                </span>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                    {presets.map(p => {
                                                        const [pr, pg, pb] = parseRgbTriple(p.rgb);
                                                        const isSelected = brandCustomRgb.trim() === p.rgb;
                                                        return (
                                                            <button
                                                                key={p.rgb}
                                                                type="button"
                                                                onClick={() => setBrandCustomRgb(p.rgb)}
                                                                className={`p-2 rounded-xl border flex items-center gap-2 text-left transition-all cursor-pointer ${
                                                                    isSelected 
                                                                        ? 'bg-zinc-800 border-white text-white shadow-md' 
                                                                        : 'bg-zinc-950/70 border-white/10 hover:border-white/30 text-zinc-300'
                                                                }`}
                                                            >
                                                                <span 
                                                                    className="w-4 h-4 rounded-full border border-white/20 shrink-0" 
                                                                    style={{ backgroundColor: `rgb(${pr}, ${pg}, ${pb})` }} 
                                                                />
                                                                <span className="text-[11px] font-semibold truncate">{p.label}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* LIVE SIMULATION CARD FOR BOTH PANELS */}
                                            <div className="p-4 bg-zinc-950 border border-white/10 rounded-xl space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] text-zinc-400 uppercase font-black block font-mono">
                                                        Simulação em Tempo Real dos Painéis:
                                                    </span>
                                                    <span className="text-[9px] px-2 py-0.5 rounded font-black uppercase text-zinc-400 bg-zinc-900 border border-white/5">
                                                        RGB: {r}, {g}, {b}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {/* Painel do Integrador */}
                                                    <div 
                                                        className="p-3.5 rounded-xl border bg-black transition-all flex flex-col justify-between space-y-3"
                                                        style={{ borderColor: `rgba(${r}, ${g}, ${b}, 0.35)`, boxShadow: `0 0 15px rgba(${r}, ${g}, ${b}, 0.1)` }}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                                                                <Building size={13} style={{ color: `rgb(${r}, ${g}, ${b})` }} />
                                                                Seu Painel de Integrador
                                                            </span>
                                                            <span 
                                                                className="text-[9px] px-2 py-0.5 rounded font-black uppercase"
                                                                style={{ backgroundColor: `rgba(${r}, ${g}, ${b}, 0.15)`, color: `rgb(${r}, ${g}, ${b})` }}
                                                            >
                                                                Ativo
                                                            </span>
                                                        </div>
                                                        <p className="text-[10px] text-zinc-400">
                                                            Menu, botões de ação rápida, gráficos e destaques utilizam a cor RGB configurada.
                                                        </p>
                                                        <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                                                            <button
                                                                type="button"
                                                                className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-black uppercase transition-all"
                                                                style={{ backgroundColor: `rgb(${r}, ${g}, ${b})` }}
                                                            >
                                                                Ação Primária
                                                            </button>
                                                            <span className="text-[10px] font-mono" style={{ color: `rgb(${r}, ${g}, ${b})` }}>
                                                                {brandName || 'Sua Empresa'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Painel do Cliente Vinculado */}
                                                    <div 
                                                        className="p-3.5 rounded-xl border bg-black transition-all flex flex-col justify-between space-y-3"
                                                        style={{ borderColor: `rgba(${r}, ${g}, ${b}, 0.35)`, boxShadow: `0 0 15px rgba(${r}, ${g}, ${b}, 0.1)` }}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                                                                <Sparkles size={13} style={{ color: `rgb(${r}, ${g}, ${b})` }} />
                                                                Painel do Cliente Vinculado
                                                            </span>
                                                            <span 
                                                                className="text-[9px] px-2 py-0.5 rounded font-black uppercase"
                                                                style={{ backgroundColor: `rgba(${r}, ${g}, ${b}, 0.15)`, color: `rgb(${r}, ${g}, ${b})` }}
                                                            >
                                                                Cliente Vinculado
                                                            </span>
                                                        </div>
                                                        <p className="text-[10px] text-zinc-400">
                                                            Seus clientes e moradores vinculados visualizam automaticamente este padrão de cores ao acessar o painel.
                                                        </p>
                                                        <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                                                            <span className="text-[10px] font-bold text-zinc-300">
                                                                Câmera ao Vivo
                                                            </span>
                                                            <span 
                                                                className="text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1"
                                                                style={{ color: `rgb(${r}, ${g}, ${b})` }}
                                                            >
                                                                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: `rgb(${r}, ${g}, ${b})` }} />
                                                                Gravando
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* SCOPE & PERMISSIONS NOTICE */}
                                            <div className="p-3.5 bg-zinc-950/90 rounded-xl border border-white/5 space-y-2 text-[11px] text-zinc-400">
                                                <span className="text-white font-bold flex items-center gap-1.5 text-xs">
                                                    🛡️ Regras de Escopo & Proteção de Sistema:
                                                </span>
                                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                                    <li className="flex items-center gap-2 text-zinc-300">
                                                        <span className="text-green-400 font-bold">✔</span>
                                                        <span><strong>Seu Painel:</strong> Customização RGB habilitada.</span>
                                                    </li>
                                                    <li className="flex items-center gap-2 text-zinc-300">
                                                        <span className="text-green-400 font-bold">✔</span>
                                                        <span><strong>Clientes Vinculados:</strong> Customização RGB habilitada.</span>
                                                    </li>
                                                    <li className="flex items-center gap-2 text-zinc-400">
                                                        <span className="text-red-400 font-bold">✖</span>
                                                        <span><strong>Painel Admin Geral:</strong> Não pode ser alterado (protegido).</span>
                                                    </li>
                                                    <li className="flex items-center gap-2 text-zinc-400">
                                                        <span className="text-red-400 font-bold">✖</span>
                                                        <span><strong>Site Principal (Landing):</strong> Não pode ser alterado (protegido).</span>
                                                    </li>
                                                </ul>
                                                <p className="text-[10px] text-zinc-500 pt-1 border-t border-white/5 font-mono">
                                                    Escopo de aplicação: A partir da tela de login para frente para a empresa integradora e clientes vinculados.
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* CO-BRANDING LIVE PREVIEW */}
                                <div className="p-4 bg-zinc-950 border border-white/5 rounded-xl space-y-2.5 shadow-inner">
                                    <span className="text-[9px] text-zinc-500 uppercase font-black block font-mono">Pré-visualização da Parceria Comercial</span>
                                    <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-zinc-900 to-black rounded-lg border border-white/10">
                                        <div className="flex items-center gap-2.5">
                                            <h5 className="text-xs font-black text-white tracking-widest uppercase">{brandName || 'Sua Empresa'}</h5>
                                            <span className="text-[10px] text-zinc-500 font-bold">🤝</span>
                                            {brandLogo ? (
                                                <div className="flex items-center gap-2 filter drop-shadow-[0_0_5px_rgba(255,255,255,0.15)] animate-in fade-in-30">
                                                    <img referrerPolicy="no-referrer" src={brandLogo} alt="Logo" className="w-5 h-5 rounded-md object-cover bg-zinc-800" />
                                                    <span className="text-xs font-semibold text-atalaia-neon">{brandName || 'Sua Empresa'}</span>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-900/50 px-2 py-1 rounded">Logomarca Pendente</span>
                                            )}
                                        </div>
                                        <span className="text-[9px] bg-atalaia-neon/15 text-atalaia-neon px-2 py-0.5 rounded font-black uppercase">Homologado</span>
                                    </div>
                                </div>

                                {/* EXCLUSIVE CLIENT LOGIN LINK BANNER */}
                                <div className="p-4 bg-black/60 border border-atalaia-neon/20 rounded-xl space-y-2.5">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <span className="text-xs font-bold text-white flex items-center gap-2">
                                            <Sparkles size={14} className="text-atalaia-neon" /> Página de Login Exclusiva dos seus Clientes (/logincliente)
                                        </span>
                                        <span className="text-[9px] bg-atalaia-neon/15 text-atalaia-neon px-2 py-0.5 rounded font-black uppercase">
                                            Cores Personalizadas Ativas
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-zinc-400">
                                        Envie este link direto para os seus clientes e moradores. A página já abre personalizada com a marca da sua empresa e com o código de cor RGB escolhido.
                                    </p>
                                    <div className="flex items-center gap-2 pt-1 flex-wrap sm:flex-nowrap">
                                        <input 
                                            type="text" 
                                            readOnly 
                                            value={clientLoginFullUrl}
                                            className="flex-1 min-w-[200px] h-9 bg-zinc-950 border border-white/10 rounded-lg px-3 text-xs font-mono text-zinc-300 select-all outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleCopyClientLink}
                                            className="px-3 h-9 bg-zinc-900 hover:bg-zinc-800 border border-white/15 rounded-lg text-xs font-bold text-white transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                                        >
                                            {copiedClientLink ? <><Check size={13} className="text-atalaia-neon" /> Copiado!</> : 'Copiar Link'}
                                        </button>
                                        <Link
                                            to={`/logincliente?integrator=${effectiveIntegratorId}`}
                                            target="_blank"
                                            className="px-3 h-9 bg-atalaia-neon hover:bg-atalaia-neon/90 text-black border border-atalaia-neon rounded-lg text-xs font-black uppercase transition-all flex items-center gap-1 shrink-0"
                                        >
                                            Visualizar
                                        </Link>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 flex-wrap gap-2 border-t border-white/5 mt-1">
                                        <span>Código UUID do Sistema: <code className="text-zinc-200 font-mono bg-zinc-950 px-1.5 py-0.5 rounded border border-white/10 select-all">{effectiveSystemUuid}</code></span>
                                        <span>Identificador Amigável: <code className="text-amber-300 font-mono bg-zinc-950 px-1.5 py-0.5 rounded border border-amber-500/20 select-all">{effectiveIntegratorId}</code></span>
                                    </div>
                                </div>

                                {/* GENERATOR FOR INDEX.HTML & IFRAME */}
                                <div className="p-4 sm:p-5 bg-black/60 border border-white/10 rounded-2xl space-y-3.5 mt-4">
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <span className="text-xs font-bold text-white flex items-center gap-2">
                                            <Building size={15} className="text-atalaia-neon" /> Gerador de Código para Seu Site (Domínio Fixo)
                                        </span>
                                        <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-lg border border-white/10 text-[10px]">
                                            <button
                                                type="button"
                                                onClick={() => setActiveEmbedTab('full')}
                                                className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${activeEmbedTab === 'full' ? 'bg-atalaia-neon text-black shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                                            >
                                                index.html Completo
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setActiveEmbedTab('iframe')}
                                                className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${activeEmbedTab === 'iframe' ? 'bg-atalaia-neon text-black shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                                            >
                                                Apenas &lt;iframe&gt;
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                                        {activeEmbedTab === 'full' ? (
                                            <>
                                                Copie este código, salve como <code>index.html</code> e envie para uma pasta no seu servidor/hospedagem (ex: <code>seusite.com.br/cameras/</code>). O cliente navegará mantendo o seu próprio <strong>domínio fixo</strong> na barra de endereços!
                                            </>
                                        ) : (
                                            <>
                                                Copie apenas a tag <code>&lt;iframe&gt;</code> para colar diretamente no HTML ou construtor do seu site já existente (WordPress, Wix, Webflow, etc.).
                                            </>
                                        )}
                                    </p>
                                    <textarea
                                        readOnly
                                        className="w-full h-28 bg-zinc-950 border border-white/10 rounded-xl p-3 text-[11px] font-mono text-zinc-300 select-all outline-none resize-none leading-relaxed"
                                        value={activeEmbedTab === 'full' ? indexHtmlCode : iframeOnlyCode}
                                    />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard.writeText(indexHtmlCode);
                                                setCopiedIndexHtml(true);
                                                setTimeout(() => setCopiedIndexHtml(false), 2500);
                                            }}
                                            className="px-3 h-10 bg-zinc-900 hover:bg-zinc-800 border border-white/15 rounded-xl text-xs font-bold text-white transition-all cursor-pointer flex items-center justify-center gap-2"
                                        >
                                            <Copy size={14} className={copiedIndexHtml ? "text-atalaia-neon" : "text-zinc-400"} />
                                            {copiedIndexHtml ? 'index.html Copiado! ✅' : 'Copiar index.html (Domínio Fixo)'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard.writeText(iframeOnlyCode);
                                                setCopiedIframeOnly(true);
                                                setTimeout(() => setCopiedIframeOnly(false), 2500);
                                            }}
                                            className="px-3 h-10 bg-zinc-900 hover:bg-zinc-800 border border-white/15 rounded-xl text-xs font-bold text-white transition-all cursor-pointer flex items-center justify-center gap-2"
                                        >
                                            <Copy size={14} className={copiedIframeOnly ? "text-atalaia-neon" : "text-zinc-400"} />
                                            {copiedIframeOnly ? 'Tag <iframe> Copiada! ✅' : 'Copiar Apenas a Tag <iframe>'}
                                        </button>
                                    </div>
                                </div>
                            </div>



                            {/* SECTION 2: CORPORATE REGISTRATION & BILLING */}
                            <div className="space-y-4 pt-4 border-t border-white/5">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 border-b border-zinc-800/60 pb-2">
                                    <Building size={14} className="text-atalaia-neon" /> Cadastro Corporativo & Faturamento Bancário
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Input 
                                        label="Razão Social" 
                                        placeholder="Ex: Delta Serviços Gerais de Monitoramento Eireli" 
                                        value={brandRazaoSocial} 
                                        onChange={e => setBrandRazaoSocial(e.target.value)} 
                                    />
                                    <Input 
                                        label="CNPJ" 
                                        placeholder="Ex: 00.000.000/0001-00" 
                                        value={brandCnpj} 
                                        onChange={e => setBrandCnpj(e.target.value)} 
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <Input 
                                        label="CPF do Responsável" 
                                        placeholder="Ex: 000.000.000-00" 
                                        value={brandCpf} 
                                        onChange={e => setBrandCpf(e.target.value)} 
                                    />
                                    <Input 
                                        label="WhatsApp da Integradora (Atendimento)" 
                                        placeholder="Ex: (48) 99999-9999" 
                                        value={brandPhone} 
                                        onChange={e => setBrandPhone(e.target.value)} 
                                    />
                                    <Input 
                                        label="E-mail Corporativo" 
                                        type="email"
                                        placeholder="Ex: contato@suaempresa.com" 
                                        value={brandEmail} 
                                        onChange={e => setBrandEmail(e.target.value)} 
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Input 
                                        label="Banco" 
                                        placeholder="Ex: Itaú Unibanco (341) ou Nubank (260)" 
                                        value={brandBanco} 
                                        onChange={e => setBrandBanco(e.target.value)} 
                                    />
                                    <Input 
                                        label="Chave PIX do Sacado" 
                                        placeholder="Ex: Celular, E-mail, CNPJ ou Chave Aleatória" 
                                        value={brandPix} 
                                        onChange={e => setBrandPix(e.target.value)} 
                                    />
                                </div>

                                {/* CUSTOM CONTRACT CLAUSE FOR INTEGRATOR */}
                                <div className="p-4 bg-black/60 border border-atalaia-neon/20 rounded-xl space-y-3 mt-4">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <label className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                                            <FileText size={16} className="text-atalaia-neon" />
                                            Cláusula Particular / Condições Especiais do Integrador (Opcional)
                                        </label>
                                        <span className="text-[10px] bg-atalaia-neon/15 text-atalaia-neon px-2.5 py-0.5 rounded font-black uppercase">
                                            Adicionada como Cláusula 16 no Contrato dos Clientes
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                                        Escreva aqui observações, termos locais ou garantias específicas da sua empresa. Este texto será inserido automaticamente como a <strong>Cláusula 16</strong> no contrato de adesão assinado por todos os seus clientes e moradores vinculados.
                                    </p>
                                    <textarea
                                        rows={3}
                                        placeholder="Ex: Suporte presencial em até 24h úteis. Em caso de manutenção nas câmeras locadas, a substituição por equipamento reserva ocorrerá sem custo adicional ao contratante."
                                        value={customClause}
                                        onChange={e => setCustomClause(e.target.value)}
                                        className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:border-atalaia-neon outline-none font-sans leading-relaxed resize-y"
                                    />
                                </div>
                            </div>


                            {brandingStatusMsg && (
                                <div className={`p-4 rounded-xl text-center text-xs font-bold leading-relaxed border animate-in fade-in slide-in-from-bottom-2 ${
                                    brandingStatusMsg.includes('Erro') 
                                    ? 'bg-red-950/20 border-red-500/20 text-red-500' 
                                    : 'bg-[#0f2415] border-atalaia-neon/20 text-atalaia-neon'
                                }`}>
                                    {brandingStatusMsg}
                                </div>
                            )}

                            <div className="flex items-center justify-end pt-2">
                                <Button
                                    type="submit"
                                    disabled={savingBranding}
                                    className="px-8 h-12 bg-atalaia-neon hover:bg-atalaia-neon/90 text-black font-black uppercase text-xs tracking-wider rounded-xl transition-all shadow-[0_4px_15px_rgba(0,255,102,0.25)] flex items-center justify-center gap-2 w-full md:w-auto"
                                >
                                    {savingBranding ? (
                                        <Loader2 className="animate-spin mr-2" size={18} />
                                    ) : (
                                        <><Check size={18} className="mr-2" /> Gravar Configurações de Parceria</>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </Card>
                )}
            </div>
        </div>

        {/* CONTROLE DE SESSÕES ATIVAS - ANTI-COMPARTILHAMENTO */}
        <div className="pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="p-6 md:p-8 border border-white/5 bg-[#0a0a0a]/90 backdrop-blur-md relative overflow-hidden">
                {/* Visual accent top line */}
                <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-atalaia-neon/30 to-transparent" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/5">
                    <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                            <Monitor className="text-atalaia-neon" size={18} />
                            Dispositivos Conectados
                        </h3>
                        <p className="text-[11px] text-zinc-500 mt-1">
                            Monitore e encerre as sessões táticas ativas no Atalaia. Uso compartilhado é bloqueado automaticamente para auditar a integridade das câmeras.
                        </p>
                    </div>
                    {sessions.length > 1 && (
                        <button
                            onClick={handleTerminateOthers}
                            disabled={sessionActionLoading !== null}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/30 text-[10px] font-bold uppercase py-2 px-4 rounded-xl transition-all flex items-center gap-2 self-start sm:self-center"
                        >
                            {sessionActionLoading === 'others' ? (
                                <><Loader2 className="animate-spin" size={12} /> Desconectando Outros...</>
                            ) : (
                                <><LogOut size={12} /> Desconectar Outros Dispositivos</>
                            )}
                        </button>
                    )}
                </div>

                {loadingSessions ? (
                    <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                        <Loader2 className="text-atalaia-neon animate-spin mb-3" size={24} />
                        <span className="text-[11px] font-mono tracking-wider text-zinc-500">Sincronizando sessões ativas com o servidor...</span>
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="text-center py-10 text-zinc-500 text-xs">
                         Nenhuma sessão tática localizada.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                         {sessions.map((sess) => {
                             const isMobile = sess.os === 'Android' || sess.os === 'iOS';
                             
                             return (
                                 <div 
                                     key={sess.id}
                                     className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                                         sess.isCurrent 
                                             ? 'bg-[#0f1c19] border-[#0ffa9c]/20' 
                                             : 'bg-[#121212] border-white/5 hover:border-white/10'
                                     }`}
                                 >
                                     <div className="flex items-start gap-4">
                                         <div className={`p-3 rounded-xl flex items-center justify-center ${
                                             sess.isCurrent ? 'bg-[#0ffa9c]/10 text-[#0ffa9c]' : 'bg-white/5 text-zinc-500'
                                         }`}>
                                             {isMobile ? <Smartphone size={18} /> : sess.os === 'Windows' || sess.os === 'macOS' || sess.os === 'Linux' ? <Laptop size={18} /> : <Monitor size={18} />}
                                         </div>
                                         <div>
                                             <div className="flex flex-wrap items-center gap-2">
                                                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                                      {sess.os} <span className="w-1 h-1 bg-zinc-650 rounded-full" /> {sess.browser}
                                                  </span>
                                                  {sess.isCurrent && (
                                                      <span className="px-2 py-0.5 bg-[#0ffa9c]/10 border border-[#0ffa9c]/20 text-[8px] font-bold text-[#0ffa9c] tracking-widest rounded-md uppercase font-mono">
                                                          Conexão Atual
                                                      </span>
                                                  )}
                                             </div>
                                             <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 font-mono text-[9px] text-zinc-500">
                                                  <span><strong className="text-zinc-650 font-normal">IP:</strong> {sess.ipAddress}</span>
                                                  <span><strong className="text-zinc-650 font-normal">Acesso em:</strong> {sess.createdAt.toLocaleString('pt-BR')}</span>
                                             </div>
                                         </div>
                                     </div>

                                     {!sess.isCurrent && (
                                         <button
                                             onClick={() => handleTerminateSession(sess.id)}
                                             disabled={sessionActionLoading !== null}
                                             className="flex items-center gap-1.5 px-3.5 py-2 bg-red-500/5 hover:bg-red-500/15 border border-red-500/10 hover:border-red-500/20 rounded-xl text-[10px] font-bold tracking-wider text-red-500/80 hover:text-red-500 transition-all self-end md:self-center uppercase"
                                         >
                                             {sessionActionLoading === sess.id ? (
                                                 <Loader2 className="animate-spin" size={12} />
                                             ) : (
                                                 <Trash2 size={12} />
                                             )}
                                             <span>Desconectar Sessão</span>
                                         </button>
                                     )}
                                 </div>
                             );
                         })}
                    </div>
                )}
            </Card>
        </div>
      </div>

    </Layout>
  );
};

export default Profile;
