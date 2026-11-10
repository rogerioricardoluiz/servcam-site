
import { supabase, isRealSupabase, supabaseUrl, supabaseAnonKey } from '../lib/supabaseClient';
import { Neighborhood, Alert, ChatMessage, UserRole, User, UserPlan, Notification, ServiceRequest, Camera, SupportTicket, Coupon, RecordingRequest, WhatsAppAutomation, WhatsAppDispatchLog } from '../types';

const generateUUID = () => {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
        return window.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const sanitizeUUID = (id?: string): string | null => {
    if (!id || id === 'unknown' || id === 'undefined' || id.trim() === '') return null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isRealSupabase && !isUuid) return null;
    return id;
};

export const ALIEN_INTEGRATOR_UUID = 'a11e9920-6765-4f81-b454-e6778b77ee66';
export const ALIEN_INTEGRATOR_SLUG = 'alienmonitoramento-integrator-id';


const DEMO_CAMERAS: Camera[] = [
  {
    id: 'cam-demo-1',
    neighborhoodId: 'hood-demo-1',
    name: 'Câmera Entrada Norte',
    iframeCode: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    lat: -27.5910,
    lng: -48.5420,
    locationPhotoUrl: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=500&auto=format&fit=crop&q=60'
  },
  {
    id: 'cam-demo-2',
    neighborhoodId: 'hood-demo-1',
    name: 'Câmera Avenida Central',
    iframeCode: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    lat: -27.5969,
    lng: -48.5495,
    locationPhotoUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500&auto=format&fit=crop&q=60'
  },
  {
    id: 'cam-demo-3',
    neighborhoodId: 'hood-demo-1',
    name: 'Câmera Rotatória Leste',
    iframeCode: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    lat: -27.6015,
    lng: -48.5550,
    locationPhotoUrl: 'https://images.unsplash.com/photo-1590674899484-13da0d1b58f5?w=500&auto=format&fit=crop&q=60'
  },
  {
    id: 'cam-demo-4',
    neighborhoodId: 'hood-demo-1',
    name: 'Câmera Saída Sul',
    iframeCode: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    lat: -27.6050,
    lng: -48.5600,
    locationPhotoUrl: 'https://images.unsplash.com/photo-1574943320219-555e21f5791a?w=500&auto=format&fit=crop&q=60'
  }
];

const getLocalCameras = (): Camera[] => {
  if (typeof window === 'undefined') return [];
  try {
    const cached = localStorage.getItem('atalaia_local_cameras');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        return [];
      }
    }
  } catch (err) {
    console.warn("localStorage is not accessible");
  }
  return [];
};

const saveLocalCameras = (cameras: Camera[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('atalaia_local_cameras', JSON.stringify(cameras));
  } catch (err) {
    console.warn("localStorage is not accessible");
  }
};

export const DEFAULT_WHATSAPP_AUTOMATIONS: Record<string, WhatsAppAutomation> = {
  notify_login_user: {
    key: 'notify_login_user',
    name: 'Aviso de Segurança de Login (Ao Usuário)',
    description: 'Envia mensagem no WhatsApp do usuário confirmando o acesso à sua conta na plataforma e informando o integrador responsável.',
    enabled: true,
    targetRole: 'ALL',
    notifyTarget: 'USER',
    template: '🔒 *Aviso de Segurança - {{integrator}}*\n\nOlá, *{{name}}*! Detectamos um novo acesso à sua conta.\n\n🏢 *Integrador Vinculado:* {{integrator}}\n📱 *Sistema:* {{system}}\n🕒 *Horário:* {{time}} de {{date}}\n🛡️ *Perfil:* {{role}}\n\n_Se você realizou este acesso, desconsidere este aviso. Caso contrário, altere sua senha imediatamente na plataforma._'
  },
  notify_login_admin: {
    key: 'notify_login_admin',
    name: 'Alerta de Acesso ao Sistema (Para Central / Admin)',
    description: 'Avisa a central de monitoramento ou administrador sempre que qualquer usuário (Integrador, SCR, Cliente ou Admin) efetua login.',
    enabled: true,
    targetRole: 'ALL',
    notifyTarget: 'ADMIN',
    template: '🔔 *{{integrator}} - Alerta de Acesso ao Sistema*\n\n👤 *Usuário:* {{name}} ({{role}})\n🏢 *Integrador:* {{integrator}}\n💻 *Sistema:* {{system}}\n📧 *E-mail:* {{email}}\n📞 *Telefone:* {{phone}}\n🏘️ *Bairro:* {{neighborhood}}\n🕒 *Horário:* {{time}} de {{date}}'
  },
  notify_register_user: {
    key: 'notify_register_user',
    name: 'Boas-vindas em Novo Cadastro (Ao Usuário)',
    description: 'Envia mensagem de boas-vindas com orientações de uso para o novo usuário recém-cadastrado e integrador vinculado.',
    enabled: true,
    targetRole: 'ALL',
    notifyTarget: 'USER',
    template: '👋 *Bem-vindo à {{integrator}}!*\n\nOlá *{{name}}*, recebemos o seu cadastro com sucesso!\n\n🏢 *Empresa Integradora:* {{integrator}}\n📋 *Perfil:* {{role}}\n🏘️ *Bairro:* {{neighborhood}}\n\nNossa equipe e o seu integrador credenciado estão validando seu acesso e você receberá uma confirmação assim que sua conta for ativada!'
  },
  notify_register_admin: {
    key: 'notify_register_admin',
    name: 'Alerta de Novo Cadastro Pendente (Para o Admin)',
    description: 'Notifica o administrador central e o integrador quando um novo cliente ou parceiro se cadastra na plataforma.',
    enabled: true,
    targetRole: 'ALL',
    notifyTarget: 'ADMIN',
    template: '🆕 *Novo Cadastro Realizado*\n\nUm novo usuário solicitou acesso à plataforma de monitoramento da *{{integrator}}*:\n\n👤 *Nome:* {{name}}\n🏢 *Integrador:* {{integrator}}\n📧 *E-mail:* {{email}}\n📞 *WhatsApp:* {{phone}}\n🏷️ *Perfil:* {{role}}\n🏘️ *Bairro:* {{neighborhood}}\n🕒 *Data:* {{date}} às {{time}}\n\nAcesse o Painel para aprovar ou revisar o cadastro.'
  },
  notify_user_approved: {
    key: 'notify_user_approved',
    name: 'Notificação de Cadastro Aprovado (Ao Usuário)',
    description: 'Envia mensagem parabenizando o usuário e fornecendo instruções e link de acesso após ter seu cadastro aprovado pelo integrador.',
    enabled: true,
    targetRole: 'ALL',
    notifyTarget: 'USER',
    template: '🎉 *Cadastro Aprovado - {{integrator}}!*\n\nOlá *{{name}}*, ótimas notícias! O seu cadastro como *{{role}}* foi aprovado com sucesso.\n\n🏢 *Integrador Responsável:* {{integrator}}\n🔑 Seu acesso já está liberado! Entre com seu e-mail cadastrado ({{email}}) para acessar as câmeras e o monitoramento em tempo real.\n\n🌐 *Acesse agora:* {{link}}'
  },
  notify_sos_alert: {
    key: 'notify_sos_alert',
    name: 'Disparo Automático de Botão de Pânico / Alerta SOS',
    description: 'Dispara alerta de emergência imediato com localização, dados do cliente e integrador para a central e vizinhos cadastrados.',
    enabled: true,
    targetRole: 'ALL',
    notifyTarget: 'BOTH',
    template: '🚨 *ALERTA DE EMERGÊNCIA - {{integrator}}* 🚨\n\n⚠️ *Botão de Pânico / SOS Acionado!*\n👤 *Cliente:* {{name}}\n🏢 *Operador Local:* {{integrator}}\n🏘️ *Bairro:* {{neighborhood}}\n🕒 *Horário:* {{time}} de {{date}}\n📝 *Ocorrência:* {{details}}\n\n_Atenção: Equipe de segurança e vizinhos, verifiquem o perímetro com cautela!_'
  },
  notify_support_ticket: {
    key: 'notify_support_ticket',
    name: 'Aviso de Chamado Técnico / Suporte',
    description: 'Envia notificação à equipe de suporte técnico e integrador quando um chamado é registrado pelo cliente.',
    enabled: true,
    targetRole: 'ALL',
    notifyTarget: 'ADMIN',
    template: '🎫 *Novo Chamado de Suporte Aberto*\n\n👤 *Solicitante:* {{name}}\n🏢 *Integrador Responsável:* {{integrator}}\n📞 *WhatsApp:* {{phone}}\n🏘️ *Bairro:* {{neighborhood}}\n💬 *Mensagem:* {{details}}\n🕒 *Data/Hora:* {{date}} às {{time}}'
  },
  notify_contract_signed: {
    key: 'notify_contract_signed',
    name: 'Confirmação de Assinatura de Contrato',
    description: 'Envia confirmação imediata e orientações de validação após o cliente assinar o contrato na plataforma vinculado ao seu integrador.',
    enabled: true,
    targetRole: 'ALL',
    notifyTarget: 'USER',
    template: '📜 *Contrato Digital Assinado com Sucesso!*\n\nOlá *{{name}}*! Confirmamos a assinatura digital do seu contrato de prestação de serviços com o integrador *{{integrator}}*.\n\n📅 *Data da Assinatura:* {{date}} às {{time}}\n🏢 *Operador Credenciado:* {{integrator}}\n🛡️ *Validade Jurídica:* Registrado com carimbo de tempo, IP e assinatura eletrônica.\n\nVocê pode visualizar ou baixar a cópia integral em PDF a qualquer momento em seu painel.'
  }
};

export const MockService = {
  // --- SISTEMA ---
  getSettings: async (forceRefresh = false): Promise<Record<string, string>> => {
      if (!isRealSupabase) return { 'template_broadcast_prefix': '[DEMO]' };
      try {
          const { data, error } = await supabase.from('system_settings').select('key, value');
          if (error) {
              // Log warning instead of error to avoid triggering system error alerts
              console.warn("[MockService] Info: Could not fetch system_settings (normal if Supabase offline):", error.message);
              return { 'template_broadcast_prefix': '[SERVCAM]' };
          }
          const settings: Record<string, string> = {};
          (data || []).forEach(s => settings[s.key] = s.value);
          return settings;
      } catch (e) { 
          // Log warning instead of error to avoid triggering system error alerts
          console.warn("[MockService] Info: Fetch failed (normal if Supabase offline):", e instanceof Error ? e.message : String(e));
          return { 'template_broadcast_prefix': '[SERVCAM]' }; 
      }
  },

  updateSetting: async (key: string, value: string): Promise<void> => {
      if (!isRealSupabase) return;
      const { error } = await supabase.from('system_settings').upsert({ 
          key: key.trim(), 
          value: value.trim(), 
          updated_at: new Date().toISOString() 
      }, { onConflict: 'key' });
      if (error) {
          console.warn("[MockService] Notice updating setting:", error);
          throw error;
      }
  },

  deleteSetting: async (key: string): Promise<void> => {
      if (!isRealSupabase) return;
      const { error } = await supabase.from('system_settings').delete().eq('key', key);
      if (error) {
          console.warn("[MockService] Notice deleting setting:", error);
          throw error;
      }
  },

  // --- BAIRROS / SISTEMAS ---
  getIntegrators: async (): Promise<User[]> => {
    const map = new Map<string, User>();

    const enrichIntegrator = (u: any): User => {
      let companyName = u.companyName || u.company_name;
      let companyLogo = u.companyLogo || u.company_logo;
      let razaoSocial = u.razaoSocial || u.razao_social;
      let cnpj = u.cnpj;
      let phone = u.phone;
      let customRgb = u.customRgb;
      let singlePlanPrice = u.singlePlanPrice;
      let hasCameraRental = u.hasCameraRental;
      let cameraRentalDetails = u.cameraRentalDetails;
      let recordingDays = u.recordingDays;
      let customClause = u.customClause;
      if (u.address && typeof u.address === 'string' && u.address.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(u.address);
          companyName = companyName || parsed.companyName || parsed.razaoSocial;
          companyLogo = companyLogo || parsed.companyLogo;
          razaoSocial = razaoSocial || parsed.razaoSocial;
          cnpj = cnpj || parsed.cnpj;
          phone = phone || parsed.phone || parsed.whatsapp || parsed.brandPhone || parsed.telefone || parsed.celular;
          customRgb = customRgb || parsed.customRgb;
          if (parsed.singlePlanPrice !== undefined) singlePlanPrice = parsed.singlePlanPrice;
          if (parsed.hasCameraRental !== undefined) hasCameraRental = parsed.hasCameraRental;
          if (parsed.cameraRentalDetails !== undefined) cameraRentalDetails = parsed.cameraRentalDetails;
          if (parsed.recordingDays !== undefined) recordingDays = parsed.recordingDays;
          if (parsed.customClause !== undefined) customClause = parsed.customClause;
        } catch (_) {}
      }
      if (typeof window !== 'undefined' && u.id) {
        if (!phone) {
          try {
            const phoneDirect = localStorage.getItem(`atalaia_integrator_phone_${u.id}`);
            if (phoneDirect) {
              phone = phoneDirect;
            } else {
              const phonesMap = JSON.parse(localStorage.getItem('atalaia_integrator_phones') || '{}');
              if (phonesMap[u.id]) phone = phonesMap[u.id];
            }
          } catch (_) {}
        }
        try {
          const planCache = localStorage.getItem(`atalaia_integrator_plan_${u.id}`);
          if (planCache) {
            const p = JSON.parse(planCache);
            if (p.singlePlanPrice !== undefined) singlePlanPrice = p.singlePlanPrice;
            if (p.hasCameraRental !== undefined) hasCameraRental = p.hasCameraRental;
            if (p.cameraRentalDetails !== undefined) cameraRentalDetails = p.cameraRentalDetails;
            if (p.recordingDays !== undefined) recordingDays = p.recordingDays;
            if (p.customClause !== undefined) customClause = p.customClause;
          }
        } catch (_) {}
      }

      // Default fallback for Alien or empty phone
      const isAlien = (u.id && String(u.id).toLowerCase().includes('alien')) || 
                      (companyName && String(companyName).toLowerCase().includes('alien')) ||
                      (u.email && String(u.email).toLowerCase().includes('alien'));
      if (!phone && isAlien) {
        phone = '(48) 99206-7665';
      }

      return {
        ...u,
        role: UserRole.INTEGRATOR,
        phone,
        companyName: companyName || razaoSocial || u.name || 'Empresa Integradora',
        companyLogo,
        razaoSocial,
        cnpj,
        customRgb,
        singlePlanPrice,
        hasCameraRental,
        cameraRentalDetails,
        recordingDays,
        customClause
      };
    };

    try {
      const allUsers = await MockService.getUsers();
      allUsers
        .filter(u => u.role === UserRole.INTEGRATOR)
        .forEach(u => map.set(u.id, enrichIntegrator(u)));
    } catch (_) {}

    if (typeof window !== 'undefined') {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('atalaia_local_profile_')) {
            try {
              const raw = localStorage.getItem(key);
              if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && parsed.id && parsed.role === UserRole.INTEGRATOR) {
                  const prev = map.get(parsed.id) || {};
                  map.set(parsed.id, enrichIntegrator({ ...prev, ...parsed }));
                }
              }
            } catch (_) {}
          }
        }
      } catch (_) {}
    }

    if (!map.has(ALIEN_INTEGRATOR_UUID) && !map.has(ALIEN_INTEGRATOR_SLUG)) {
      const alienInt: User = {
        id: ALIEN_INTEGRATOR_UUID,
        name: 'Alien Monitoramento Eletrônico',
        companyName: 'Alien Monitoramento Eletrônico Ltda.',
        razaoSocial: 'Alien Monitoramento Eletrônico Ltda.',
        email: 'alienmonitoramentoeletronico@gmail.com',
        role: UserRole.INTEGRATOR,
        plan: 'PREMIUM',
        approved: true,
        customRgb: '0, 255, 102',
        cnpj: '00.000.000/0001-00',
        phone: '(48) 99206-7665',
        customSlug: ALIEN_INTEGRATOR_SLUG
      };
      map.set(ALIEN_INTEGRATOR_UUID, enrichIntegrator(alienInt));
    }

    if (map.size === 0) {
      const demoInt: User = {
        id: 'demo-integrator-id',
        name: 'Gestor Anderson',
        companyName: 'Gestor Anderson',
        email: 'integrador@atalaia.com',
        role: UserRole.INTEGRATOR,
        plan: 'PREMIUM',
        approved: true,
        neighborhoodId: 'hood-demo-1',
        primaryNeighborhoodId: 'hood-demo-1',
        phone: '(48) 99206-7665'
      };
      map.set(demoInt.id, demoInt);
    }

    return Array.from(map.values());
  },

  saveIntegratorPhone: async (integratorId: string, phone: string): Promise<void> => {
    if (!integratorId) return;
    const cleanPhone = phone ? phone.trim() : '';
    const targetIds = [integratorId];
    if (integratorId === ALIEN_INTEGRATOR_SLUG || integratorId === ALIEN_INTEGRATOR_UUID) {
      if (!targetIds.includes(ALIEN_INTEGRATOR_SLUG)) targetIds.push(ALIEN_INTEGRATOR_SLUG);
      if (!targetIds.includes(ALIEN_INTEGRATOR_UUID)) targetIds.push(ALIEN_INTEGRATOR_UUID);
    }

    if (typeof window !== 'undefined') {
      try {
        const phonesMap = JSON.parse(localStorage.getItem('atalaia_integrator_phones') || '{}');
        for (const tId of targetIds) {
          localStorage.setItem(`atalaia_integrator_phone_${tId}`, cleanPhone);
          if (cleanPhone) {
            phonesMap[tId] = cleanPhone;
          } else {
            delete phonesMap[tId];
          }
          const localKey = `atalaia_local_profile_${tId}`;
          const rawProfile = localStorage.getItem(localKey);
          if (rawProfile) {
            const parsed = JSON.parse(rawProfile);
            parsed.phone = cleanPhone;
            localStorage.setItem(localKey, JSON.stringify(parsed));
          }
          window.dispatchEvent(new CustomEvent('atalaia:integrator_updated', { detail: { id: tId, phone: cleanPhone } }));
        }
        localStorage.setItem('atalaia_integrator_phones', JSON.stringify(phonesMap));
      } catch (_) {}
    }

    if (isRealSupabase) {
      try {
        const safeId = sanitizeUUID(integratorId);
        if (safeId) {
          await supabase.from('profiles').update({ phone: cleanPhone }).eq('id', safeId);
        }
      } catch (_) {}
    }
  },

  linkNeighborhoodIntegrator: async (neighborhoodId: string, integratorId: string | null, integratorName?: string): Promise<void> => {
    if (!neighborhoodId) return;
    let resolvedName = integratorName || '';

    if (integratorId && !resolvedName) {
      try {
        const integrators = await MockService.getIntegrators();
        const found = integrators.find(i => i.id === integratorId);
        if (found) {
          resolvedName = found.companyName || found.razaoSocial || found.name;
        }
      } catch (_) {}
    }

    // 1. Save in local neighborhood_integrators map
    let linksMap: Record<string, { integratorId: string; integratorName: string }> = {};
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('atalaia_neighborhood_integrators');
        if (raw) linksMap = JSON.parse(raw);
      } catch (_) {}

      if (integratorId) {
        linksMap[neighborhoodId] = { integratorId, integratorName: resolvedName };
      } else {
        delete linksMap[neighborhoodId];
      }

      try {
        localStorage.setItem('atalaia_neighborhood_integrators', JSON.stringify(linksMap));
      } catch (_) {}

      // Update cached neighborhoods list
      try {
        const rawHoods = localStorage.getItem('atalaia_local_neighborhoods');
        if (rawHoods) {
          const parsedHoods: Neighborhood[] = JSON.parse(rawHoods);
          const updatedHoods = parsedHoods.map(h =>
            h.id === neighborhoodId
              ? { ...h, integratorId: integratorId || undefined, integratorName: integratorId ? resolvedName : undefined }
              : h
          );
          localStorage.setItem('atalaia_local_neighborhoods', JSON.stringify(updatedHoods));
        }
      } catch (_) {}
    }

    // 2. Sync to backend /api/neighborhoods
    try {
      const rawHoods = typeof window !== 'undefined' ? localStorage.getItem('atalaia_local_neighborhoods') : null;
      const parsedHoods: Neighborhood[] = rawHoods ? JSON.parse(rawHoods) : [];
      const targetHood = parsedHoods.find(h => h.id === neighborhoodId);
      if (targetHood) {
        await fetch('/api/neighborhoods', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: targetHood.id,
            name: targetHood.name,
            description: targetHood.description || '',
            iframe_url: targetHood.iframeUrl || '',
            lat: targetHood.lat ?? -27.5969,
            lng: targetHood.lng ?? -48.5495,
            integrator_id: integratorId || null,
            integrator_name: integratorId ? resolvedName : null
          })
        }).catch(() => {});
      }
    } catch (_) {}

    // 3. Sync to Supabase system_settings and neighborhoods/profiles
    if (isRealSupabase) {
      try {
        await MockService.updateSetting('neighborhood_integrators_map', JSON.stringify(linksMap));
      } catch (_) {}

      const safeHoodId = sanitizeUUID(neighborhoodId);
      if (safeHoodId) {
        try {
          await supabase
            .from('neighborhoods')
            .update({ integrator_id: integratorId, integrator_name: integratorId ? resolvedName : null })
            .eq('id', safeHoodId);
        } catch (_) {}
      }
    }

    // 4. Update the Integrator's profile so the system is linked to them
    if (integratorId) {
      try {
        if (typeof window !== 'undefined') {
          const targetKey = `atalaia_local_profile_${integratorId}`;
          const currentStr = localStorage.getItem(targetKey);
          const profileObj = currentStr ? JSON.parse(currentStr) : { id: integratorId, role: UserRole.INTEGRATOR };
          if (!profileObj.neighborhoodId) {
            profileObj.neighborhoodId = neighborhoodId;
            profileObj.primaryNeighborhoodId = neighborhoodId;
          } else if (profileObj.neighborhoodId !== neighborhoodId && !profileObj.secondaryNeighborhoodId) {
            profileObj.secondaryNeighborhoodId = neighborhoodId;
          }
          const linkedList: string[] = Array.isArray(profileObj.linkedNeighborhoodIds) ? profileObj.linkedNeighborhoodIds : [];
          if (!linkedList.includes(neighborhoodId)) {
            linkedList.push(neighborhoodId);
          }
          profileObj.linkedNeighborhoodIds = linkedList;
          localStorage.setItem(targetKey, JSON.stringify(profileObj));
        }

        const safeIntId = sanitizeUUID(integratorId);
        const safeHoodId = sanitizeUUID(neighborhoodId);
        if (isRealSupabase && safeIntId && safeHoodId) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('neighborhood_id, primary_neighborhood_id, secondary_neighborhood_id')
            .eq('id', safeIntId)
            .maybeSingle();

          if (prof) {
            if (!prof.neighborhood_id) {
              await supabase
                .from('profiles')
                .update({ neighborhood_id: safeHoodId, primary_neighborhood_id: safeHoodId })
                .eq('id', safeIntId);
            } else if (prof.neighborhood_id !== safeHoodId && !prof.secondary_neighborhood_id) {
              await supabase
                .from('profiles')
                .update({ secondary_neighborhood_id: safeHoodId })
                .eq('id', safeIntId);
            }
          }
        }
      } catch (_) {}
    }
  },

  getNeighborhoods: async (forceRefresh = false): Promise<Neighborhood[]> => {
    const getDeletedIds = (): string[] => {
      try {
        const raw = localStorage.getItem('atalaia_deleted_neighborhoods');
        return raw ? JSON.parse(raw) : [];
      } catch (_) {
        return [];
      }
    };

    const getLocalAdded = (): Neighborhood[] => {
      try {
        const raw = localStorage.getItem('atalaia_local_neighborhoods');
        return raw ? JSON.parse(raw) : [];
      } catch (_) {
        return [];
      }
    };

    const getIntegratorLinks = (): Record<string, { integratorId: string; integratorName: string }> => {
      try {
        const raw = localStorage.getItem('atalaia_neighborhood_integrators');
        return raw ? JSON.parse(raw) : {};
      } catch (_) {
        return {};
      }
    };

    if (isRealSupabase && forceRefresh) {
      try {
        const { data: settingRow } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'neighborhood_integrators_map')
          .maybeSingle();
        if (settingRow?.value) {
          const remoteLinks = JSON.parse(settingRow.value);
          const mergedLinks = { ...remoteLinks, ...getIntegratorLinks() };
          localStorage.setItem('atalaia_neighborhood_integrators', JSON.stringify(mergedLinks));
        }
      } catch (_) {}
    }

    const mergeAndFilter = (remoteList: Neighborhood[]): Neighborhood[] => {
      const deletedSet = new Set(getDeletedIds());
      const localList = getLocalAdded();
      const links = getIntegratorLinks();
      const map = new Map<string, Neighborhood>();

      const enrichHood = (item: Neighborhood, fallback?: Neighborhood): Neighborhood => {
        const link = links[item.id];
        const integratorId = item.integratorId || fallback?.integratorId || link?.integratorId || (item.id === 'hood-demo-1' ? 'demo-integrator-id' : undefined);
        const integratorName = item.integratorName || fallback?.integratorName || link?.integratorName || (item.id === 'hood-demo-1' && integratorId === 'demo-integrator-id' ? 'Gestor Anderson' : undefined);
        return {
          ...item,
          integratorId,
          integratorName
        };
      };

      remoteList.forEach(item => {
        if (!deletedSet.has(item.id)) {
          const localMatch = localList.find(l => l.id === item.id);
          map.set(item.id, enrichHood(item, localMatch));
        }
      });

      localList.forEach(item => {
        if (!deletedSet.has(item.id) && !map.has(item.id)) {
          map.set(item.id, enrichHood(item));
        }
      });

      const finalArr = Array.from(map.values());
      
      try {
        localStorage.setItem('atalaia_local_neighborhoods', JSON.stringify(finalArr));
      } catch (_) {}
      return finalArr;
    };

    const demoHoods: Neighborhood[] = [
      {
        id: 'hood-demo-1',
        name: 'Centro',
        description: 'Bairro central sob monitoramento integrado ServCam.',
        iframeUrl: 'about:blank',
        lat: -27.5969,
        lng: -48.5495,
        integratorId: 'demo-integrator-id',
        integratorName: 'Gestor Anderson'
      },
      {
        id: 'hood-demo-2',
        name: 'Jardim Alvorada',
        description: 'Bairro monitorado com câmeras de alta definição e ronda ativa.',
        iframeUrl: 'about:blank',
        lat: -27.6012,
        lng: -48.5410
      },
      {
        id: 'hood-demo-3',
        name: 'Porto Seguro',
        description: 'Bairro litorâneo com monitoramento patrimonial ativo.',
        iframeUrl: 'about:blank',
        lat: -27.5850,
        lng: -48.5600
      }
    ];

    // 1. Try local server endpoint first (fast, same-origin, no CORS or browser tracking restrictions)
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 3500) : null;
      const res = await fetch('/api/neighborhoods', { 
        signal: controller ? controller.signal : undefined 
      });
      if (timeoutId) clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const mapped: Neighborhood[] = data.map((n: any) => ({
            id: n.id,
            name: n.name,
            iframeUrl: n.iframe_url || n.iframeUrl || n.camera_url || '',
            description: n.description || '',
            lat: n.lat ?? -27.5969,
            lng: n.lng ?? -48.5495,
            integratorId: n.integrator_id || n.integratorId || undefined,
            integratorName: n.integrator_name || n.integratorName || undefined
          }));
          return mergeAndFilter(mapped);
        }
      }
    } catch (_) {
      // Backend /api/neighborhoods fallback, proceeding to Supabase direct or cached
    }

    // 2. Direct Supabase query if enabled
    if (isRealSupabase) {
      try {
        const { data, error } = await supabase.from('neighborhoods').select('*').order('name');
        if (!error && data && data.length > 0) {
          const mapped: Neighborhood[] = data.map((n: any) => ({ 
            id: n.id, 
            name: n.name, 
            iframeUrl: n.iframe_url || n.camera_url || '', 
            description: n.description, 
            lat: n.lat ?? -27.5969, 
            lng: n.lng ?? -48.5495,
            integratorId: n.integrator_id || undefined,
            integratorName: n.integrator_name || undefined
          }));
          return mergeAndFilter(mapped);
        } else if (error) {
          console.warn("[MockService] Supabase neighborhoods query notice, using local cache:", error.message || error);
        }
      } catch (e: any) { 
        console.warn("[MockService] Supabase fetch notice in getNeighborhoods, using local fallback:", e instanceof Error ? e.message : JSON.stringify(e));
      }
    }

    // 3. Fallback to localStorage cached neighborhoods
    try {
      const cached = localStorage.getItem('atalaia_local_neighborhoods');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return mergeAndFilter(parsed);
        }
      }
    } catch (_) {}

    return mergeAndFilter(demoHoods);
  },

  getNeighborhoodById: async (id: string): Promise<Neighborhood | undefined> => {
    const list = await MockService.getNeighborhoods();
    const foundLocal = list.find(h => h.id === id);
    if (foundLocal) return foundLocal;

    const safeId = sanitizeUUID(id);
    if (!isRealSupabase || !safeId) {
        return undefined;
    }
    try {
        const { data, error } = await supabase.from('neighborhoods').select('*').eq('id', safeId).maybeSingle();
        if (error) throw error;
        return data ? { 
            id: data.id, 
            name: data.name, 
            iframeUrl: data.iframe_url || data.camera_url || '', 
            description: data.description, 
            lat: data.lat, 
            lng: data.lng,
            integratorId: data.integrator_id || undefined,
            integratorName: data.integrator_name || undefined
        } : undefined;
    } catch (err) {
        console.warn("[MockService] Error in getNeighborhoodById, falling back:", err);
        return undefined;
    }
  },

  createNeighborhood: async (
    name: string,
    description: string,
    iframeUrl: string,
    integratorId?: string,
    integratorName?: string
  ): Promise<Neighborhood> => {
    let finalId = `hood-${Date.now()}`;
    let resolvedIntegratorName = integratorName || '';

    if (integratorId && !resolvedIntegratorName) {
      try {
        const integrators = await MockService.getIntegrators();
        const found = integrators.find(i => i.id === integratorId);
        if (found) {
          resolvedIntegratorName = found.companyName || found.razaoSocial || found.name;
        }
      } catch (_) {}
    }

    if (isRealSupabase) {
      try {
        const insertPayload: any = { name, description, iframe_url: iframeUrl };
        if (integratorId) {
          insertPayload.integrator_id = integratorId;
          insertPayload.integrator_name = resolvedIntegratorName;
        }
        let { data, error } = await supabase.from('neighborhoods').insert([insertPayload]).select('*');
        if (error && integratorId) {
          // Fallback if integrator_id / integrator_name columns do not exist in Supabase table
          const retry = await supabase.from('neighborhoods').insert([{ name, description, iframe_url: iframeUrl }]).select('*');
          data = retry.data;
          error = retry.error;
        }
        if (!error && data && data.length > 0 && data[0].id) {
          finalId = data[0].id;
        } else if (error) {
          console.warn("[MockService] Supabase insert neighborhood notice:", error.message || error);
        }
      } catch (err) {
        console.warn("[MockService] Bypass Supabase write during createNeighborhood due to network/quota error.");
      }
    }

    const newHood: Neighborhood = {
      id: finalId,
      name,
      description,
      iframeUrl,
      lat: -27.5969,
      lng: -48.5495,
      integratorId: integratorId || undefined,
      integratorName: integratorId ? resolvedIntegratorName : undefined
    };

    try {
      const list = await MockService.getNeighborhoods();
      const updated = [...list.filter(h => h.id !== finalId), newHood];
      localStorage.setItem('atalaia_local_neighborhoods', JSON.stringify(updated));
      await fetch('/api/neighborhoods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: finalId,
          name,
          description,
          iframe_url: iframeUrl,
          lat: newHood.lat,
          lng: newHood.lng,
          integrator_id: integratorId || null,
          integrator_name: integratorId ? resolvedIntegratorName : null
        })
      }).catch(() => {});
    } catch (_) {}

    if (integratorId) {
      await MockService.linkNeighborhoodIntegrator(finalId, integratorId, resolvedIntegratorName);
    }

    return newHood;
  },

  updateNeighborhood: async (id: string, name: string, description: string, iframeUrl: string, integratorId?: string, integratorName?: string): Promise<void> => {
    try {
        const list = await MockService.getNeighborhoods();
        const updated = list.map(h => h.id === id ? {
            ...h,
            name,
            description,
            iframeUrl,
            ...(integratorId !== undefined ? { integratorId: integratorId || undefined, integratorName: integratorId ? integratorName : undefined } : {})
        } : h);
        localStorage.setItem('atalaia_local_neighborhoods', JSON.stringify(updated));
        await fetch('/api/neighborhoods', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id,
                name,
                description,
                iframe_url: iframeUrl,
                ...(integratorId !== undefined ? { integrator_id: integratorId || null, integrator_name: integratorId ? integratorName : null } : {})
            })
        }).catch(() => {});
    } catch (err) {}

    if (integratorId !== undefined) {
        await MockService.linkNeighborhoodIntegrator(id, integratorId || null, integratorName);
    }

    if (!isRealSupabase) return;

    try {
        const { error } = await supabase.from('neighborhoods').update({ name, description, iframe_url: iframeUrl }).eq('id', id);
        if (error) {
            console.warn("[MockService] Supabase update neighborhood notice:", error.message || error);
        }
    } catch (err) {
        console.warn("[MockService] Bypass Supabase write during updateNeighborhood due to network/quota error.");
    }
  },

  deleteNeighborhood: async (id: string): Promise<void> => {
    if (!id) return;
    try {
        // Track deleted ID so it doesn't resurrect from demo/remote cache
        const rawDeleted = localStorage.getItem('atalaia_deleted_neighborhoods');
        const deletedIds: string[] = rawDeleted ? JSON.parse(rawDeleted) : [];
        if (!deletedIds.includes(id)) {
            deletedIds.push(id);
            localStorage.setItem('atalaia_deleted_neighborhoods', JSON.stringify(deletedIds));
        }

        const rawLocal = localStorage.getItem('atalaia_local_neighborhoods');
        const list: Neighborhood[] = rawLocal ? JSON.parse(rawLocal) : [];
        const updated = list.filter(h => h.id !== id);
        localStorage.setItem('atalaia_local_neighborhoods', JSON.stringify(updated));

        // Remove local cameras belonging to this system
        const localCams = getLocalCameras().filter(c => c.neighborhoodId !== id);
        saveLocalCameras(localCams);

        await fetch(`/api/neighborhoods/${encodeURIComponent(id)}`, {
            method: 'DELETE'
        }).catch(() => {});
    } catch (err) {}

    if (!isRealSupabase) return;

    try {
        const safeId = sanitizeUUID(id);
        if (safeId) {
            await supabase.from('cameras').delete().eq('neighborhood_id', safeId);
            const { error } = await supabase.from('neighborhoods').delete().eq('id', safeId);
            if (error) {
                console.warn("[MockService] Supabase delete neighborhood notice:", error.message || error);
            }
        }
    } catch (err) {
        console.warn("[MockService] Bypass Supabase write during deleteNeighborhood due to network/quota error.");
    }
  },

  // --- CÂMERAS ---
  getAdditionalCameras: async (neighborhoodId: string): Promise<Camera[]> => {
    const safeId = sanitizeUUID(neighborhoodId);
    let dbCameras: Camera[] = [];
    try {
        if (safeId) {
            const { data, error } = await supabase.from('cameras').select('*').eq('neighborhood_id', safeId);
            if (!error && data) {
                dbCameras = data.map(c => ({ 
                    id: c.id, 
                    neighborhoodId: c.neighborhood_id, 
                    name: c.name, 
                    iframeCode: c.iframe_code, 
                    lat: c.lat, 
                    lng: c.lng,
                    locationPhotoUrl: c.location_photo_url,
                    maintenancePhotoUrl: c.maintenance_photo_url
                }));
            } else if (error) {
                console.warn("[MockService] Erro de permissão ou banco ao buscar câmeras do Supabase:", error.message);
            }
        }
    } catch (e) {
        console.warn("[MockService] Falha em getAdditionalCameras do Supabase:", e);
    }

    if (dbCameras.length === 0 && safeId) {
      try {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeoutId = controller ? setTimeout(() => controller.abort(), 3500) : null;
        const res = await fetch(`/api/cameras?neighborhoodId=${encodeURIComponent(safeId)}`, { signal: controller ? controller.signal : undefined });
        if (timeoutId) clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            dbCameras = data.map((c: any) => ({
              id: c.id,
              neighborhoodId: c.neighborhood_id || c.neighborhoodId || '',
              name: c.name,
              iframeCode: c.url || c.iframe_code || '',
              lat: c.coordinates ? parseFloat(c.coordinates.split(',')[0]) : (c.lat || -27.5969),
              lng: c.coordinates ? parseFloat(c.coordinates.split(',')[1]) : (c.lng || -48.5495),
              locationPhotoUrl: c.location_photo_url || '',
              maintenancePhotoUrl: c.maintenance_photo_url || null
            }));
          }
        }
      } catch (_) {}
    }

    const localCameras = getLocalCameras().filter(c => c.neighborhoodId === neighborhoodId);
    const mergedMap = new Map<string, Camera>();

    if (dbCameras.length === 0 && localCameras.length === 0) {
        DEMO_CAMERAS.filter(c => c.neighborhoodId === neighborhoodId || c.neighborhoodId === 'hood-demo-1').forEach(c => mergedMap.set(c.id, c));
    } else {
        dbCameras.forEach(c => mergedMap.set(c.id, c));
        localCameras.forEach(c => mergedMap.set(c.id, c));
    }

    return Array.from(mergedMap.values());
  },

  getAllSystemCameras: async (): Promise<Camera[]> => {
    let dbCameras: Camera[] = [];
    try {
        const { data, error } = await supabase.from('cameras').select('*');
        if (!error && data) {
            dbCameras = data.map(c => ({ 
                id: c.id, 
                neighborhoodId: c.neighborhood_id, 
                name: c.name, 
                iframeCode: c.iframe_code, 
                lat: c.lat, 
                lng: c.lng,
                locationPhotoUrl: c.location_photo_url,
                maintenancePhotoUrl: c.maintenance_photo_url
            }));
        } else if (error) {
            console.warn("[MockService] Supabase cameras query returned error, using local fallback.", error);
        }
    } catch (e) {
        console.warn("[MockService] Error in getAllSystemCameras from Supabase, using local fallback:", e);
    }

    if (dbCameras.length === 0) {
      try {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeoutId = controller ? setTimeout(() => controller.abort(), 3500) : null;
        const res = await fetch('/api/cameras', { signal: controller ? controller.signal : undefined });
        if (timeoutId) clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            dbCameras = data.map((c: any) => ({
              id: c.id,
              neighborhoodId: c.neighborhood_id || c.neighborhoodId || '',
              name: c.name,
              iframeCode: c.url || c.iframe_code || '',
              lat: c.coordinates ? parseFloat(c.coordinates.split(',')[0]) : (c.lat || -27.5969),
              lng: c.coordinates ? parseFloat(c.coordinates.split(',')[1]) : (c.lng || -48.5495),
              locationPhotoUrl: c.location_photo_url || '',
              maintenancePhotoUrl: c.maintenance_photo_url || null
            }));
          }
        }
      } catch (_) {}
    }

    const localCameras = getLocalCameras();
    const mergedMap = new Map<string, Camera>();
    
    if (dbCameras.length === 0 && localCameras.length === 0) {
        DEMO_CAMERAS.forEach(c => mergedMap.set(c.id, c));
    } else {
        dbCameras.forEach(c => mergedMap.set(c.id, c));
        localCameras.forEach(c => mergedMap.set(c.id, c));
    }
    
    return Array.from(mergedMap.values());
  },

  getCameraById: async (cameraId: string): Promise<Camera | null> => {
    if (!cameraId) return null;
    const cleanId = cameraId.trim();
    try {
      const safeId = sanitizeUUID(cleanId);
      if (safeId) {
        const { data, error } = await supabase.from('cameras').select('*').eq('id', safeId).maybeSingle();
        if (!error && data) {
          return {
            id: data.id,
            neighborhoodId: data.neighborhood_id,
            name: data.name,
            iframeCode: data.iframe_code,
            lat: data.lat,
            lng: data.lng,
            locationPhotoUrl: data.location_photo_url,
            maintenancePhotoUrl: data.maintenance_photo_url
          };
        }
      }
    } catch (e) {
      console.warn("[MockService] Erro ao buscar câmera por ID no Supabase:", e);
    }

    const all = await MockService.getAllSystemCameras();
    const found = all.find(c => c.id === cleanId);
    if (found) return found;

    return DEMO_CAMERAS.find(c => c.id === cleanId) || null;
  },

  addCamera: async (neighborhoodId: string, name: string, iframeCode: string, lat?: number, lng?: number, locationPhotoUrl?: string, maintenancePhotoUrl?: string): Promise<void> => {
    const id = generateUUID();
    
    const local = getLocalCameras();
    const newCam: Camera = {
        id,
        neighborhoodId,
        name,
        iframeCode,
        lat,
        lng,
        locationPhotoUrl,
        maintenancePhotoUrl
    };
    local.push(newCam);
    saveLocalCameras(local);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('atalaia_cameras_updated'));
    }

    try {
        const payload: any = {
            id,
            neighborhood_id: sanitizeUUID(neighborhoodId), 
            name, 
            iframe_code: iframeCode,
            lat,
            lng,
            location_photo_url: locationPhotoUrl
        };
        let error;
        if (maintenancePhotoUrl) {
            payload.maintenance_photo_url = maintenancePhotoUrl;
            const res = await supabase.from('cameras').insert([payload]);
            error = res.error;
            if (error && error.message && error.message.includes("maintenance_photo_url")) {
                console.warn("[MockService] Coluna maintenance_photo_url ausente, tentando sem ela...");
                delete payload.maintenance_photo_url;
                const res2 = await supabase.from('cameras').insert([payload]);
                error = res2.error;
            }
        } else {
            const res = await supabase.from('cameras').insert([payload]);
            error = res.error;
        }
        if (error) {
            console.warn("[MockService] Failed to write camera to Supabase, saved locally:", error);
        }
    } catch (e) {
        console.warn("[MockService] Error adding camera to Supabase, saved locally:", e);
    }
  },

  updateCamera: async (cameraId: string, name: string, iframeCode: string, lat?: number, lng?: number, locationPhotoUrl?: string, maintenancePhotoUrl?: string, neighborhoodId?: string): Promise<void> => {
    const local = getLocalCameras();
    const index = local.findIndex(c => c.id === cameraId);
    if (index !== -1) {
        local[index] = {
            ...local[index],
            neighborhoodId: neighborhoodId || local[index].neighborhoodId,
            name,
            iframeCode,
            lat,
            lng,
            locationPhotoUrl,
            maintenancePhotoUrl
        };
    } else if (neighborhoodId) {
        local.push({
            id: cameraId,
            neighborhoodId: neighborhoodId,
            name,
            iframeCode,
            lat,
            lng,
            locationPhotoUrl,
            maintenancePhotoUrl
        });
    }
    saveLocalCameras(local);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('atalaia_cameras_updated'));
    }

    try {
        const payload: any = { 
                name, 
                iframe_code: iframeCode,
                lat,
                lng,
                location_photo_url: locationPhotoUrl
            };
            let error;
            if (maintenancePhotoUrl) {
                payload.maintenance_photo_url = maintenancePhotoUrl;
                const res = await supabase.from('cameras').update(payload).eq('id', cameraId);
                error = res.error;
                if (error && error.message && error.message.includes("maintenance_photo_url")) {
                    console.warn("[MockService] Coluna maintenance_photo_url ausente no update, tentando sem ela...");
                    delete payload.maintenance_photo_url;
                    const res2 = await supabase.from('cameras').update(payload).eq('id', cameraId);
                    error = res2.error;
                }
            } else {
                const res = await supabase.from('cameras').update(payload).eq('id', cameraId);
                error = res.error;
            }
        if (error) {
            console.warn("[MockService] Failed to update camera on Supabase, updated locally:", error);
        }
    } catch (e) {
        console.warn("[MockService] Error updating camera on Supabase, updated locally:", e);
    }
  },

  deleteCamera: async (id: string): Promise<void> => {
    const local = getLocalCameras();
    const filtered = local.filter(c => c.id !== id);
    saveLocalCameras(filtered);

    try {
        const { error } = await supabase.from('cameras').delete().eq('id', id);
        if (error) {
            console.warn("[MockService] Failed to delete camera from Supabase, deleted locally:", error);
        }
    } catch (e) {
        console.warn("[MockService] Error deleting camera from Supabase, deleted locally:", e);
    }
  },

  // --- USUÁRIOS (Sincronização Total & Vínculo com Empresas Integradoras) ---
  linkUserIntegrator: async (userId: string, integratorId: string | null, integratorName?: string): Promise<void> => {
    if (!userId) return;
    let resolvedName = integratorName || '';

    if (integratorId && !resolvedName) {
      try {
        const integrators = await MockService.getIntegrators();
        const found = integrators.find(i => i.id === integratorId);
        if (found) {
          resolvedName = found.companyName || found.razaoSocial || found.name;
        }
      } catch (_) {}
    }

    let userLinks: Record<string, { integratorId: string; integratorName: string }> = {};
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('atalaia_user_integrators');
        if (raw) userLinks = JSON.parse(raw);
      } catch (_) {}

      if (integratorId) {
        userLinks[userId] = { integratorId, integratorName: resolvedName };
      } else {
        delete userLinks[userId];
      }

      try {
        localStorage.setItem('atalaia_user_integrators', JSON.stringify(userLinks));
      } catch (_) {}

      try {
        const targetKey = `atalaia_local_profile_${userId}`;
        const currentStr = localStorage.getItem(targetKey);
        if (currentStr) {
          const parsed = JSON.parse(currentStr);
          parsed.integratorId = integratorId || undefined;
          parsed.integratorName = integratorId ? resolvedName : undefined;
          localStorage.setItem(targetKey, JSON.stringify(parsed));
        }
      } catch (_) {}
    }

    if (isRealSupabase) {
      try {
        const { data: existingRow } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'user_integrators_map')
          .maybeSingle();
        let remoteLinks: Record<string, { integratorId: string; integratorName: string }> = {};
        if (existingRow?.value) {
          try {
            remoteLinks = JSON.parse(existingRow.value);
          } catch (_) {}
        }
        const merged = { ...remoteLinks, ...userLinks };
        if (!integratorId) {
          delete merged[userId];
        }
        await MockService.updateSetting('user_integrators_map', JSON.stringify(merged));
      } catch (_) {}
    }
  },

  linkUserIntegratorByEmail: async (email: string, integratorId: string | null, integratorName?: string): Promise<void> => {
    if (!email) return;
    const cleanEmail = email.trim().toLowerCase();
    try {
      const allUsers = await MockService.getUsers();
      const matched = allUsers.find(u => u.email?.trim().toLowerCase() === cleanEmail);
      if (matched) {
        await MockService.linkUserIntegrator(matched.id, integratorId, integratorName);
        return;
      }
      if (isRealSupabase) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('id')
          .ilike('email', cleanEmail)
          .maybeSingle();
        if (prof?.id) {
          await MockService.linkUserIntegrator(prof.id, integratorId, integratorName);
        }
      }
    } catch (_) {}
  },

  createClientUser: async (payload: {
    name: string;
    email: string;
    password?: string;
    phone?: string;
    address?: string;
    plan?: UserPlan;
    role?: UserRole;
    neighborhoodId?: string;
    secondaryNeighborhoodId?: string;
    additionalNeighborhoodIds?: string[];
    integratorId?: string;
    integratorName?: string;
    approved?: boolean;
    canRead?: boolean;
    canEdit?: boolean;
    isTeam?: boolean;
    teamRoleTitle?: string;
    singlePlanPrice?: number | string;
    hasCameraRental?: boolean;
    cameraRentalDetails?: string;
    recordingDays?: number;
    billingAuthorizationService?: string;
    billing_authorization_service?: string;
  }): Promise<User> => {
    const cleanEmail = payload.email.trim().toLowerCase();
    const password = payload.password && payload.password.trim().length >= 6 ? payload.password.trim() : '123456';
    const role = payload.role || UserRole.RESIDENT;
    const isTeam = payload.isTeam !== undefined ? payload.isTeam : (role !== UserRole.RESIDENT && role !== UserRole.INTEGRATOR);
    const teamRoleTitle = payload.teamRoleTitle;
    const plan: UserPlan = payload.plan || 'PREMIUM';
    const isApproved = payload.approved !== false;
    const canRead = payload.canRead ?? true;
    const canEdit = payload.canEdit ?? false;
    const safeNeighborhoodId = sanitizeUUID(payload.neighborhoodId) || payload.neighborhoodId || undefined;
    const safeSecondaryId = sanitizeUUID(payload.secondaryNeighborhoodId) || payload.secondaryNeighborhoodId || undefined;

    let resolvedIntegratorName = payload.integratorName || '';
    if (payload.integratorId && !resolvedIntegratorName) {
      try {
        const integrators = await MockService.getIntegrators();
        const found = integrators.find(i => i.id === payload.integratorId);
        if (found) {
          resolvedIntegratorName = found.companyName || found.razaoSocial || found.name;
        }
      } catch (_) {}
    }

    let finalUserId = generateUUID();

    if (isRealSupabase) {
      try {
        // 1. Check if profile already exists in public.profiles
        const { data: existingProf } = await supabase
          .from('profiles')
          .select('id')
          .ilike('email', cleanEmail)
          .maybeSingle();

        if (existingProf?.id) {
          finalUserId = existingProf.id;
        } else {
          // 2. Stateless signup via Supabase Auth REST API so the current Integrator/Admin session is NOT overwritten
          const signupRes = await fetch(`${supabaseUrl}/auth/v1/signup`, {
            method: 'POST',
            headers: {
              apikey: supabaseAnonKey,
              Authorization: `Bearer ${supabaseAnonKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email: cleanEmail,
              password,
              data: {
                name: payload.name.trim(),
                role,
                phone: payload.phone || '',
                neighborhood_id: sanitizeUUID(payload.neighborhoodId),
                approved: isApproved,
                plan
              }
            })
          });

          if (signupRes.ok) {
            const signupData = await signupRes.json();
            const createdAuthId = signupData?.user?.id || signupData?.id;
            if (createdAuthId) {
              finalUserId = createdAuthId;
            }
          }
        }

        // 3. Upsert into public.profiles if finalUserId exists in auth.users
        const dbPayload: any = {
          id: finalUserId,
          name: payload.name.trim(),
          email: cleanEmail,
          phone: payload.phone || '',
          address: payload.address || '',
          role,
          plan,
          neighborhood_id: sanitizeUUID(payload.neighborhoodId),
          primary_neighborhood_id: sanitizeUUID(payload.neighborhoodId),
          secondary_neighborhood_id: safeSecondaryId,
          additional_neighborhood_ids: payload.additionalNeighborhoodIds || [],
          approved: isApproved,
          can_read: canRead,
          can_edit: canEdit,
          billing_authorization_service: payload.billingAuthorizationService || payload.billing_authorization_service || ''
        };

        const { error: upsertErr } = await supabase.from('profiles').upsert(dbPayload, { onConflict: 'id' });
        if (upsertErr) {
          console.warn('[createClientUser] Falha no upsert inicial, tentando fallback sem colunas estendidas:', upsertErr);
          const fallbackPayload = { ...dbPayload };
          delete fallbackPayload.billing_authorization_service;
          delete fallbackPayload.additional_neighborhood_ids;
          delete fallbackPayload.secondary_neighborhood_id;
          delete fallbackPayload.primary_neighborhood_id;
          await supabase.from('profiles').upsert(fallbackPayload, { onConflict: 'id' });
        }
      } catch (err) {
        console.warn('[createClientUser] Fallback para registro complementar em system_settings:', err);
      }
    }

    const createdUser: User & { password?: string } = {
      id: finalUserId,
      name: payload.name.trim(),
      email: cleanEmail,
      phone: payload.phone || '',
      address: payload.address || '',
      role,
      plan,
      neighborhoodId: safeNeighborhoodId,
      primaryNeighborhoodId: safeNeighborhoodId,
      secondaryNeighborhoodId: safeSecondaryId,
      integratorId: payload.integratorId || undefined,
      integratorName: payload.integratorId ? resolvedIntegratorName : undefined,
      approved: isApproved,
      canRead,
      canEdit,
      isTeam,
      teamRoleTitle,
      password,
      singlePlanPrice: payload.singlePlanPrice,
      hasCameraRental: payload.hasCameraRental,
      cameraRentalDetails: payload.cameraRentalDetails,
      recordingDays: payload.recordingDays,
      billingAuthorizationService: payload.billingAuthorizationService || payload.billing_authorization_service
    };

    // Save in local profile cache & custom clients registry
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`atalaia_local_profile_${finalUserId}`, JSON.stringify(createdUser));
        const rawReg = localStorage.getItem('atalaia_custom_clients_registry');
        const regMap: Record<string, any> = rawReg ? JSON.parse(rawReg) : {};
        regMap[finalUserId] = createdUser;
        localStorage.setItem('atalaia_custom_clients_registry', JSON.stringify(regMap));
      } catch (_) {}
    }

    if (isRealSupabase) {
      try {
        const { data: row } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'custom_clients_registry')
          .maybeSingle();
        let remoteReg: Record<string, any> = {};
        if (row?.value) {
          try {
            remoteReg = JSON.parse(row.value);
          } catch (_) {}
        }
        remoteReg[finalUserId] = createdUser;
        await MockService.updateSetting('custom_clients_registry', JSON.stringify(remoteReg));
      } catch (_) {}
    }

    if (payload.integratorId) {
      await MockService.linkUserIntegrator(finalUserId, payload.integratorId, resolvedIntegratorName);
    }

    return createdUser;
  },

  getUsers: async (neighborhoodId?: string): Promise<User[]> => {
    const getUserIntegratorLinks = (): Record<string, { integratorId: string; integratorName: string }> => {
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('atalaia_user_integrators') : null;
        return raw ? JSON.parse(raw) : {};
      } catch (_) {
        return {};
      }
    };

    const getHoodIntegratorLinks = (): Record<string, { integratorId: string; integratorName: string }> => {
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('atalaia_neighborhood_integrators') : null;
        return raw ? JSON.parse(raw) : {};
      } catch (_) {
        return {};
      }
    };

    const getCustomClientsRegistry = (): Record<string, any> => {
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('atalaia_custom_clients_registry') : null;
        return raw ? JSON.parse(raw) : {};
      } catch (_) {
        return {};
      }
    };

    if (isRealSupabase) {
      try {
        const { data: settingsRows } = await supabase
          .from('system_settings')
          .select('key, value')
          .in('key', ['user_integrators_map', 'custom_clients_registry', 'neighborhood_integrators_map']);

        if (settingsRows && typeof window !== 'undefined') {
          for (const row of settingsRows) {
            if (row.key === 'user_integrators_map' && row.value) {
              try {
                const merged = { ...JSON.parse(row.value), ...getUserIntegratorLinks() };
                localStorage.setItem('atalaia_user_integrators', JSON.stringify(merged));
              } catch (_) {}
            } else if (row.key === 'custom_clients_registry' && row.value) {
              try {
                const merged = { ...JSON.parse(row.value), ...getCustomClientsRegistry() };
                localStorage.setItem('atalaia_custom_clients_registry', JSON.stringify(merged));
              } catch (_) {}
            } else if (row.key === 'neighborhood_integrators_map' && row.value) {
              try {
                const merged = { ...JSON.parse(row.value), ...getHoodIntegratorLinks() };
                localStorage.setItem('atalaia_neighborhood_integrators', JSON.stringify(merged));
              } catch (_) {}
            }
          }
        }
      } catch (_) {}
    }

    const userLinks = getUserIntegratorLinks();
    const hoodLinks = getHoodIntegratorLinks();
    const customRegistry = getCustomClientsRegistry();

    const resolveIntegratorForUser = (uId: string, hoodId?: string, localData?: any) => {
      const direct = userLinks[uId];
      if (direct?.integratorId) return direct;
      if (localData?.integratorId) {
        return { integratorId: localData.integratorId, integratorName: localData.integratorName || '' };
      }
      if (hoodId && hoodLinks[hoodId]?.integratorId) {
        return hoodLinks[hoodId];
      }
      if (hoodId === 'hood-demo-1') {
        return { integratorId: 'demo-integrator-id', integratorName: 'Gestor Anderson' };
      }
      return undefined;
    };

    if (!isRealSupabase) {
        const localUsers: User[] = [];
        if (typeof window !== 'undefined') {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('atalaia_local_profile_')) {
                    try {
                        const u = JSON.parse(localStorage.getItem(key) || '');
                        if (u && (!neighborhoodId || u.neighborhoodId === neighborhoodId || u.secondaryNeighborhoodId === neighborhoodId)) {
                            const intInfo = resolveIntegratorForUser(u.id, u.neighborhoodId, u);
                            localUsers.push({
                              ...u,
                              integratorId: intInfo?.integratorId,
                              integratorName: intInfo?.integratorName
                            });
                        }
                    } catch {}
                }
            }
            if (localUsers.length === 0) {
                const demoUsers = [
                    { id: 'demo-user-id', name: 'Mariana Costa', email: 'morador@atalaia.com', role: UserRole.RESIDENT, plan: 'PREMIUM', approved: true, neighborhoodId: 'hood-demo-1', primaryNeighborhoodId: 'hood-demo-1', integratorId: 'demo-integrator-id', integratorName: 'Gestor Anderson' },
                    { id: 'demo-scr-id', name: 'Vigia Roberto', email: 'scr@atalaia.com', role: UserRole.SCR, plan: 'PREMIUM', approved: true, neighborhoodId: 'hood-demo-1', primaryNeighborhoodId: 'hood-demo-1', integratorId: 'demo-integrator-id', integratorName: 'Gestor Anderson' },
                    { id: 'demo-integrator-id', name: 'Gestor Anderson', email: 'integrador@atalaia.com', role: UserRole.INTEGRATOR, plan: 'PREMIUM', approved: true, neighborhoodId: 'hood-demo-1', primaryNeighborhoodId: 'hood-demo-1' }
                ];
                demoUsers.forEach(du => {
                    localStorage.setItem(`atalaia_local_profile_${du.id}`, JSON.stringify(du));
                    localUsers.push(du as any);
                });
            }
        }
        return localUsers;
    }

    try {
        let query = supabase.from('profiles').select('*').order('name');
        const safeId = sanitizeUUID(neighborhoodId);
        
        let data: any[] | null = null;
        let error: any = null;

        if (safeId) {
            const res = await supabase.from('profiles').select('*').or(`neighborhood_id.eq.${safeId},secondary_neighborhood_id.eq.${safeId}`).order('name');
            data = res.data;
            error = res.error;
            
            if (error) {
                console.warn("[getUsers] Falha ao filtrar por secondary_neighborhood_id no Supabase, usando fallback de neighborhood_id padrão:", error);
                const resFallback = await supabase.from('profiles').select('*').eq('neighborhood_id', safeId).order('name');
                data = resFallback.data;
                error = resFallback.error;
            }
        } else {
            const res = await query;
            data = res.data;
            error = res.error;
        }

        if (error || !data) throw error || new Error("No data returned");

        const resultMap = new Map<string, User>();

        data.forEach(p => {
            let localData: any = customRegistry[p.id] || {};
            if (typeof window !== 'undefined') {
                try {
                    const cached = localStorage.getItem(`atalaia_local_profile_${p.id}`);
                    if (cached) {
                        localData = { ...localData, ...JSON.parse(cached) };
                    }
                } catch {}
            }

            const hoodId = p.neighborhood_id || localData.neighborhoodId;
            const intInfo = resolveIntegratorForUser(p.id, hoodId, localData);

            resultMap.set(p.id, {
                id: p.id,
                name: p.name || localData.name || 'Sem Nome',
                email: p.email || localData.email || '',
                role: (p.role || localData.role || UserRole.RESIDENT) as UserRole,
                plan: p.plan || localData.plan || 'PREMIUM',
                neighborhoodId: hoodId,
                primaryNeighborhoodId: p.primary_neighborhood_id || hoodId || localData.primaryNeighborhoodId,
                secondaryNeighborhoodId: p.secondary_neighborhood_id || localData.secondaryNeighborhoodId,
                additionalNeighborhoodIds: p.additional_neighborhood_ids || localData.additionalNeighborhoodIds || [],
                integratorId: intInfo?.integratorId,
                integratorName: intInfo?.integratorName,
                phone: p.phone || localData.phone,
                address: p.address || localData.address,
                approved: p.approved !== undefined ? p.approved === true : (localData.approved !== false),
                lat: p.lat,
                lng: p.lng,
                promoActive: p.promo_active === true,
                promoStart: p.promo_start,
                promoEnd: p.promo_end,
                promoCoupon: p.promo_coupon,
                canRead: p.can_read !== undefined ? p.can_read : (localData.canRead !== undefined ? localData.canRead : true),
                canEdit: p.can_edit !== undefined ? p.can_edit : (localData.canEdit !== undefined ? localData.canEdit : false),
                isTeam: localData.isTeam !== undefined ? localData.isTeam : (p.role !== UserRole.RESIDENT && p.role !== UserRole.INTEGRATOR),
                teamRoleTitle: localData.teamRoleTitle,
                singlePlanPrice: localData.singlePlanPrice,
                hasCameraRental: localData.hasCameraRental,
                cameraRentalDetails: localData.cameraRentalDetails,
                recordingDays: localData.recordingDays,
                billingAuthorizationService: p.billing_authorization_service || localData.billingAuthorizationService || localData.billing_authorization_service || ''
            });
        });

        // Merge custom clients created by Integrators/Admins that may not be in public.profiles yet
        Object.values(customRegistry).forEach((c: any) => {
            if (!c || !c.id) return;
            const existingInMap = resultMap.get(c.id);
            if (existingInMap) {
              if (!existingInMap.integratorId && c.integratorId) {
                existingInMap.integratorId = c.integratorId;
                existingInMap.integratorName = c.integratorName;
              }
              if (c.billingAuthorizationService || c.billing_authorization_service) {
                existingInMap.billingAuthorizationService = c.billingAuthorizationService || c.billing_authorization_service;
              }
              return;
            }
            // Avoid duplicating by email if already in resultMap
            const existingByEmail = Array.from(resultMap.values()).find(
              u => u.email && c.email && u.email.toLowerCase() === c.email.toLowerCase()
            );
            if (existingByEmail) {
              if (!existingByEmail.integratorId && c.integratorId) {
                existingByEmail.integratorId = c.integratorId;
                existingByEmail.integratorName = c.integratorName;
              }
              if (c.billingAuthorizationService || c.billing_authorization_service) {
                existingByEmail.billingAuthorizationService = c.billingAuthorizationService || c.billing_authorization_service;
              }
              return;
            }
            if (neighborhoodId && c.neighborhoodId !== neighborhoodId && c.secondaryNeighborhoodId !== neighborhoodId) {
              return;
            }
            const intInfo = resolveIntegratorForUser(c.id, c.neighborhoodId, c);
            resultMap.set(c.id, {
              id: c.id,
              name: c.name || 'Sem Nome',
              email: c.email || '',
              role: (c.role || UserRole.RESIDENT) as UserRole,
              plan: c.plan || 'PREMIUM',
              neighborhoodId: c.neighborhoodId,
              primaryNeighborhoodId: c.primaryNeighborhoodId || c.neighborhoodId,
              secondaryNeighborhoodId: c.secondaryNeighborhoodId,
              additionalNeighborhoodIds: c.additionalNeighborhoodIds || [],
              integratorId: intInfo?.integratorId || c.integratorId,
              integratorName: intInfo?.integratorName || c.integratorName,
              phone: c.phone,
              address: c.address,
              approved: c.approved !== false,
              canRead: c.canRead !== undefined ? c.canRead : true,
              canEdit: c.canEdit !== undefined ? c.canEdit : false,
              isTeam: c.isTeam !== undefined ? c.isTeam : (c.role !== UserRole.RESIDENT && c.role !== UserRole.INTEGRATOR),
              teamRoleTitle: c.teamRoleTitle,
              singlePlanPrice: c.singlePlanPrice,
              hasCameraRental: c.hasCameraRental,
              cameraRentalDetails: c.cameraRentalDetails,
              recordingDays: c.recordingDays,
              billingAuthorizationService: c.billingAuthorizationService || c.billing_authorization_service || ''
            });
        });

        return Array.from(resultMap.values());
    } catch (err) {
        console.warn("[getUsers] Erro ao buscar usuários no Supabase, recorrendo ao cache local:", err);
        const localUsers: User[] = [];
        if (typeof window !== 'undefined') {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('atalaia_local_profile_')) {
                    try {
                        const u = JSON.parse(localStorage.getItem(key) || '');
                        if (u && (!neighborhoodId || u.neighborhoodId === neighborhoodId || u.secondaryNeighborhoodId === neighborhoodId)) {
                            const intInfo = resolveIntegratorForUser(u.id, u.neighborhoodId, u);
                            localUsers.push({
                              ...u,
                              billingAuthorizationService: u.billingAuthorizationService || u.billing_authorization_service || '',
                              integratorId: intInfo?.integratorId,
                              integratorName: intInfo?.integratorName
                            });
                        }
                    } catch {}
                }
            }
            if (localUsers.length === 0) {
                const demoUsers = [
                    { id: 'demo-user-id', name: 'Mariana Costa', email: 'morador@atalaia.com', role: UserRole.RESIDENT, plan: 'PREMIUM', approved: true, neighborhoodId: 'hood-demo-1', primaryNeighborhoodId: 'hood-demo-1', integratorId: 'demo-integrator-id', integratorName: 'Gestor Anderson' },
                    { id: 'demo-scr-id', name: 'Vigia Roberto', email: 'scr@atalaia.com', role: UserRole.SCR, plan: 'PREMIUM', approved: true, neighborhoodId: 'hood-demo-1', primaryNeighborhoodId: 'hood-demo-1', integratorId: 'demo-integrator-id', integratorName: 'Gestor Anderson' },
                    { id: 'demo-integrator-id', name: 'Gestor Anderson', email: 'integrador@atalaia.com', role: UserRole.INTEGRATOR, plan: 'PREMIUM', approved: true, neighborhoodId: 'hood-demo-1', primaryNeighborhoodId: 'hood-demo-1' }
                ];
                demoUsers.forEach(du => {
                    localStorage.setItem(`atalaia_local_profile_${du.id}`, JSON.stringify(du));
                    localUsers.push(du as any);
                });
            }
        }
        return localUsers;
    }
  },

  adminUpdateUser: async (userId: string, data: any): Promise<void> => {
      const safeId = sanitizeUUID(userId);
      
      // Sempre atualiza o cache local e registro complementar (essencial para persistência robusta)
      if (typeof window !== 'undefined') {
          const targetKey = `atalaia_local_profile_${userId}`;
          const currentStr = localStorage.getItem(targetKey);
          let profileObj = currentStr ? JSON.parse(currentStr) : { id: userId };
          
          const billingAuth = data.billing_authorization_service !== undefined 
              ? data.billing_authorization_service 
              : (data.billingAuthorizationService !== undefined 
                  ? data.billingAuthorizationService 
                  : (profileObj.billingAuthorizationService || profileObj.billing_authorization_service || ''));

          profileObj = {
              ...profileObj,
              name: data.name !== undefined ? data.name : profileObj.name,
              email: data.email !== undefined ? data.email : profileObj.email,
              phone: data.phone !== undefined ? data.phone : profileObj.phone,
              address: data.address !== undefined ? data.address : profileObj.address,
              neighborhoodId: data.neighborhood_id !== undefined ? (data.neighborhood_id || undefined) : profileObj.neighborhoodId,
              primaryNeighborhoodId: data.primary_neighborhood_id !== undefined ? (data.primary_neighborhood_id || undefined) : profileObj.primaryNeighborhoodId,
              secondaryNeighborhoodId: data.secondary_neighborhood_id !== undefined ? (data.secondary_neighborhood_id || undefined) : profileObj.secondaryNeighborhoodId,
              additionalNeighborhoodIds: data.additional_neighborhood_ids !== undefined ? data.additional_neighborhood_ids : (data.additionalNeighborhoodIds !== undefined ? data.additionalNeighborhoodIds : (profileObj.additionalNeighborhoodIds || [])),
              integratorId: data.integrator_id !== undefined ? (data.integrator_id || undefined) : profileObj.integratorId,
              integratorName: data.integrator_name !== undefined ? (data.integrator_name || undefined) : profileObj.integratorName,
              plan: data.plan !== undefined ? data.plan : profileObj.plan,
              role: data.role !== undefined ? data.role : profileObj.role,
              approved: data.approved !== undefined ? data.approved : profileObj.approved,
              canRead: data.can_read !== undefined ? data.can_read : (data.canRead !== undefined ? data.canRead : profileObj.canRead),
              canEdit: data.can_edit !== undefined ? data.can_edit : (data.canEdit !== undefined ? data.canEdit : profileObj.canEdit),
              isTeam: data.isTeam !== undefined ? data.isTeam : profileObj.isTeam,
              teamRoleTitle: data.teamRoleTitle !== undefined ? data.teamRoleTitle : profileObj.teamRoleTitle,
              singlePlanPrice: data.singlePlanPrice !== undefined ? data.singlePlanPrice : (data.single_plan_price !== undefined ? data.single_plan_price : profileObj.singlePlanPrice),
              hasCameraRental: data.hasCameraRental !== undefined ? data.hasCameraRental : (data.has_camera_rental !== undefined ? data.has_camera_rental : profileObj.hasCameraRental),
              cameraRentalDetails: data.cameraRentalDetails !== undefined ? data.cameraRentalDetails : (data.camera_rental_details !== undefined ? data.camera_rental_details : profileObj.cameraRentalDetails),
              recordingDays: data.recordingDays !== undefined ? data.recordingDays : (data.recording_days !== undefined ? data.recording_days : profileObj.recordingDays),
              billingAuthorizationService: billingAuth,
              billing_authorization_service: billingAuth
          };
          localStorage.setItem(targetKey, JSON.stringify(profileObj));

          try {
              const rawReg = localStorage.getItem('atalaia_custom_clients_registry');
              const regMap: Record<string, any> = rawReg ? JSON.parse(rawReg) : {};
              regMap[userId] = { ...(regMap[userId] || {}), ...profileObj };
              localStorage.setItem('atalaia_custom_clients_registry', JSON.stringify(regMap));
              if (isRealSupabase) {
                  MockService.updateSetting('custom_clients_registry', JSON.stringify(regMap)).catch(() => {});
              }
          } catch (_) {}
      }

      if (data.integrator_id !== undefined) {
          await MockService.linkUserIntegrator(userId, data.integrator_id || null, data.integrator_name);
      }

      if (!isRealSupabase || !safeId) return;

      const dbPayload: any = { ...data };
      delete dbPayload.integrator_id;
      delete dbPayload.integrator_name;
      delete dbPayload.singlePlanPrice;
      delete dbPayload.hasCameraRental;
      delete dbPayload.cameraRentalDetails;
      delete dbPayload.recordingDays;
      delete dbPayload.billingAuthorizationService;
      delete dbPayload.additionalNeighborhoodIds;

      try {
          const { error } = await supabase.from('profiles').update(dbPayload).eq('id', safeId);
          if (error) {
              console.warn("[adminUpdateUser] Falha ao atualizar Supabase, tentando sem os campos estendidos:", error);
              const fallbackData = { ...dbPayload };
              delete fallbackData.primary_neighborhood_id;
              delete fallbackData.secondary_neighborhood_id;
              delete fallbackData.additional_neighborhood_ids;
              delete fallbackData.billing_authorization_service;
              const { error: fallbackError } = await supabase.from('profiles').update(fallbackData).eq('id', safeId);
              if (fallbackError) {
                  console.warn("[adminUpdateUser] Aviso secundário no update do Supabase:", fallbackError);
              }
          }
      } catch (err) {
          console.warn("[adminUpdateUser] Aviso ao atualizar perfil no Supabase:", err);
      }
  },

  updateUserPlan: async (userId: string, plan: string): Promise<void> => {
      const safeId = sanitizeUUID(userId);
      if (!isRealSupabase || !safeId) return;
      await supabase.from('profiles').update({ plan }).eq('id', safeId);
  },

  updateUserApproval: async (userId: string, approved: boolean): Promise<void> => {
    let resolvedProfile: any = null;
    if (typeof window !== 'undefined') {
        const localKey = `atalaia_local_profile_${userId}`;
        const rawProfile = localStorage.getItem(localKey);
        if (rawProfile) {
            const parsed = JSON.parse(rawProfile);
            parsed.approved = approved;
            localStorage.setItem(localKey, JSON.stringify(parsed));
            resolvedProfile = parsed;
        }
    }
    if (isRealSupabase) {
        try {
            const safeId = sanitizeUUID(userId);
            if (safeId) await supabase.from('profiles').update({ approved }).eq('id', safeId);
        } catch (_) {}
    }
    if (approved && resolvedProfile) {
        MockService.notifyUserApproved(resolvedProfile).catch(() => {});
    }
  },

  approveUser: async (userId: string): Promise<void> => {
      let resolvedProfile: any = null;
      if (typeof window !== 'undefined') {
          const targetKey = `atalaia_local_profile_${userId}`;
          const currentStr = localStorage.getItem(targetKey);
          if (currentStr) {
              try {
                  const profileObj = JSON.parse(currentStr);
                  profileObj.approved = true;
                  localStorage.setItem(targetKey, JSON.stringify(profileObj));
                  resolvedProfile = profileObj;
              } catch (_) {}
          }
      }
      const safeId = sanitizeUUID(userId);
      if (isRealSupabase && safeId) {
          await supabase.from('profiles').update({ approved: true }).eq('id', safeId);
          if (!resolvedProfile) {
              try {
                  const { data } = await supabase.from('profiles').select('*').eq('id', safeId).maybeSingle();
                  if (data) resolvedProfile = data;
              } catch (_) {}
          }
      }
      if (resolvedProfile) {
          MockService.notifyUserApproved(resolvedProfile).catch(() => {});
      }
  },

  deleteUser: async (id: string): Promise<void> => {
      if (typeof window !== 'undefined') {
          try {
              localStorage.removeItem(`atalaia_local_profile_${id}`);
              const rawReg = localStorage.getItem('atalaia_custom_clients_registry');
              if (rawReg) {
                  const regMap = JSON.parse(rawReg);
                  if (regMap[id]) {
                      delete regMap[id];
                      localStorage.setItem('atalaia_custom_clients_registry', JSON.stringify(regMap));
                      if (isRealSupabase) {
                          MockService.updateSetting('custom_clients_registry', JSON.stringify(regMap)).catch(() => {});
                      }
                  }
              }
          } catch (_) {}
      }
      await MockService.linkUserIntegrator(id, null);
      const safeId = sanitizeUUID(id);
      if (!isRealSupabase || !safeId) return;
      await supabase.from('profiles').delete().eq('id', safeId);
  },

  maintenanceFixOrphans: async (): Promise<number> => {
      if (!isRealSupabase) return 0;
      const { data: hoods } = await supabase.from('neighborhoods').select('id');
      const hoodIds = (hoods || []).map(h => h.id);
      const { data: users } = await supabase.from('profiles').select('id, neighborhood_id');
      let fixedCount = 0;
      if (users) {
          for (const u of users) {
              if (u.neighborhood_id && !hoodIds.includes(u.neighborhood_id)) {
                  await supabase.from('profiles').update({ neighborhood_id: null }).eq('id', u.id);
                  fixedCount++;
              }
          }
      }
      return fixedCount;
  },

  // --- ALERTAS E CHAT ---
  getAlerts: async (neighborhoodId?: string): Promise<Alert[]> => {
    if (!isRealSupabase) {
        return [{
            id: 'alert-1',
            type: 'OK' as any,
            userId: 'demo-user',
            userName: 'Cliente ServCam',
            neighborhoodId: 'hood-demo-1',
            timestamp: new Date(),
            message: 'Ronda preventiva de segurança ativa.'
        }];
    }
    try {
        const safeId = sanitizeUUID(neighborhoodId);
        let query = supabase.from('alerts').select('*').order('timestamp', { ascending: false });
        if (safeId) query = query.eq('neighborhood_id', safeId);
        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map(a => ({ id: a.id, type: a.type as any, userId: a.user_id, userName: a.user_name, neighborhoodId: a.neighborhood_id, timestamp: new Date(a.timestamp), message: a.message, image: a.image }));
    } catch (e) {
        console.warn("[MockService] Notice in getAlerts:", e);
        return [];
    }
  },

  createAlert: async (alertData: any) => {
    if (!isRealSupabase) { console.log("[DEMO] Alerta criado:", alertData); return; }
    try {
        const safeHoodId = sanitizeUUID(alertData.neighborhoodId);
        const safeUserId = sanitizeUUID(alertData.userId);
        const { error: alertErr } = await supabase.from('alerts').insert([{ 
            type: alertData.type, 
            user_id: safeUserId, 
            user_name: alertData.userName, 
            neighborhood_id: safeHoodId, 
            message: alertData.message, 
            image: alertData.image 
        }]);
        if (alertErr) throw alertErr;
        
        const { error: chatErr } = await supabase.from('chat_messages').insert([{ 
            neighborhood_id: safeHoodId, 
            user_id: safeUserId, 
            user_name: alertData.userName, 
            user_role: alertData.userRole, 
            text: alertData.message || (alertData.type === 'PANIC' ? '🚨 PÂNICO ACIONADO!' : alertData.type), 
            is_system_alert: true, 
            alert_type: alertData.type, 
            image: alertData.image 
        }]);
        if (chatErr) throw chatErr;

        // --- WHATSAPP BROADCAST ---
        if (safeHoodId) {
            const settings = await MockService.getSettings();
            const hood = await MockService.getNeighborhoodById(safeHoodId);
            const hoodName = hood?.name || 'Bairro';
            const integratorInfo = await MockService.resolveIntegratorForUser({
                neighborhoodId: safeHoodId,
                id: safeUserId,
                name: alertData.userName
            });
            
            const typeLabels: Record<string, string> = {
                'PANIC': '🚨 PÂNICO',
                'DANGER': '⚠️ PERIGO',
                'SUSPICIOUS': '👁️ SUSPEITA',
                'OK': '✅ ESTOU BEM'
            };

            const prefix = settings['template_broadcast_prefix'] || '[SERVCAM]';
            const message = `${prefix} ${typeLabels[alertData.type] || alertData.type}\n\nCliente: ${alertData.userName}\nBairro: ${hoodName}\n🛡️ Integrador: ${integratorInfo.displayName}${alertData.message ? `\nMensagem: ${alertData.message}` : ''}\n\nVerifique o app para mais detalhes.`;

            // Trigger centralized SOS automation trigger
            MockService.notifySecurityAlert({
                title: typeLabels[alertData.type] || alertData.type,
                message: alertData.message || 'Alerta de segurança emitido no setor',
                type: alertData.type,
                neighborhoodId: safeHoodId,
                userName: alertData.userName
            }).catch(err => console.warn("[WhatsApp SOS Auto] Notice:", err));

            // Fetch all phone numbers in the neighborhood
            const { data: profiles, error: profileErr } = await supabase
                .from('profiles')
                .select('phone')
                .eq('neighborhood_id', safeHoodId)
                .not('phone', 'is', null);

            if (!profileErr && profiles && profiles.length > 0) {
                const numbers = profiles.map(p => p.phone).filter(Boolean) as string[];
                if (integratorInfo.phone && !numbers.includes(integratorInfo.phone)) {
                    numbers.push(integratorInfo.phone);
                }
                if (numbers.length > 0) {
                    // Dispara em background para não travar a resposta do app
                    MockService.sendWhatsAppMessage(message, numbers, undefined, undefined, 'Alerta de Segurança (Broadcast)').catch(err => console.warn("[WhatsApp Broadcast] Notice:", err));
                }
            }
        }
    } catch (e) {
        console.warn("[MockService] Notice in createAlert:", e);
        throw e;
    }
  },

  getMessages: async (neighborhoodId: string): Promise<ChatMessage[]> => {
    if (!isRealSupabase) {
        return [{
            id: 'msg-1',
            neighborhoodId: 'hood-demo-1',
            userId: 'demo-admin-id',
            userName: 'Suporte ServCam',
            userRole: UserRole.ADMIN,
            text: 'Bem-vindo ao canal integrado de segurança comunitária!',
            timestamp: new Date(),
        }];
    }
    try {
        const safeId = sanitizeUUID(neighborhoodId);
        let query = supabase.from('chat_messages').select('*').order('timestamp', { ascending: true });
        if (safeId) query = query.eq('neighborhood_id', safeId);
        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map(m => ({ id: m.id, neighborhoodId: m.neighborhood_id, userId: m.user_id, userName: m.user_name, userRole: m.user_role as UserRole, text: m.text, timestamp: new Date(m.timestamp), isSystemAlert: m.is_system_alert, alertType: m.alert_type, image: m.image }));
    } catch (e) {
        console.warn("[MockService] Notice in getMessages:", e);
        return [];
    }
  },

  sendMessage: async (msgData: any) => {
    const { error } = await supabase.from('chat_messages').insert([{ neighborhood_id: sanitizeUUID(msgData.neighborhoodId), user_id: sanitizeUUID(msgData.userId), user_name: msgData.userName, user_role: msgData.userRole, text: msgData.text, image: msgData.image }]);
    if (error) {
        console.warn("[MockService] Notice in sendMessage:", error);
        throw error;
    }
  },

  getDirectMessages: async (clientId: string, integratorId?: string): Promise<ChatMessage[]> => {
    const specificLocalKey = integratorId ? `atalaia_dm_messages_${clientId}_${integratorId}` : null;
    const generalLocalKey = `atalaia_dm_messages_${clientId}`;
    let localList: ChatMessage[] = [];

    try {
      if (specificLocalKey) {
        const storedSpecific = localStorage.getItem(specificLocalKey);
        if (storedSpecific) {
          localList = JSON.parse(storedSpecific).map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }));
        }
      }
      if (localList.length === 0) {
        const storedGeneral = localStorage.getItem(generalLocalKey);
        if (storedGeneral) {
          const parsed = JSON.parse(storedGeneral).map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }));
          // Filter by integratorId strictly if specified
          localList = parsed.filter((m: any) => integratorId ? m.integratorId === integratorId : !m.integratorId);
        }
      }
    } catch (_) {}

    if (!isRealSupabase) {
      if (localList.length === 0) {
        return [{
          id: 'welcome-dm-1',
          neighborhoodId: 'dm',
          userId: integratorId || 'integrator-id',
          userName: 'Empresa Integradora',
          userRole: UserRole.INTEGRATOR,
          text: 'Olá! Bem-vindo ao canal exclusivo de atendimento com seu integrador. Como podemos te ajudar hoje?',
          timestamp: new Date(),
          clientId,
          integratorId
        }];
      }
      return localList;
    }

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const remoteList: ChatMessage[] = [];
      (data || []).forEach(m => {
        let textContent = m.text;
        let cId = m.user_id;
        let iId: string | undefined = undefined;

        if (textContent && typeof textContent === 'string' && textContent.startsWith('{"__dm":true')) {
          try {
            const parsed = JSON.parse(textContent);
            textContent = parsed.text;
            cId = parsed.clientId || cId;
            iId = parsed.integratorId;
          } catch (_) {}
        }

        // Must match this specific client conversation
        const isClientMatch = (cId === clientId || m.user_id === clientId);
        if (!isClientMatch) return;

        // CRITICAL CHECK: if integratorId is specified, ensure it strictly matches this integrator!
        if (integratorId && iId && iId !== integratorId) {
          return; // Message belongs to a different integrator conversation! Ignore!
        }

        remoteList.push({
          id: m.id,
          neighborhoodId: m.neighborhood_id || 'dm',
          userId: m.user_id,
          userName: m.user_name,
          userRole: m.user_role as UserRole,
          text: textContent,
          timestamp: new Date(m.created_at || m.timestamp || Date.now()),
          isSystemAlert: m.is_system_alert,
          alertType: m.alert_type,
          image: m.image,
          clientId: cId,
          integratorId: iId
        });
      });

      const combined = [...remoteList];
      localList.forEach(loc => {
        if (!combined.some(c => c.id === loc.id)) {
          combined.push(loc);
        }
      });
      combined.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      return combined;
    } catch (e) {
      console.warn("[MockService] Notice in getDirectMessages:", e);
      return localList;
    }
  },

  sendDirectMessage: async (msgData: {
    clientId: string;
    integratorId?: string;
    userId: string;
    userName: string;
    userRole: UserRole;
    text: string;
    neighborhoodId?: string;
  }): Promise<ChatMessage> => {
    const newMsg: ChatMessage = {
      id: crypto.randomUUID(),
      neighborhoodId: msgData.neighborhoodId || 'dm',
      userId: msgData.userId,
      userName: msgData.userName,
      userRole: msgData.userRole,
      text: msgData.text,
      timestamp: new Date(),
      clientId: msgData.clientId,
      integratorId: msgData.integratorId
    };

    // 1. Save to specific client-integrator storage key
    if (msgData.integratorId) {
      const specificKey = `atalaia_dm_messages_${msgData.clientId}_${msgData.integratorId}`;
      try {
        const stored = localStorage.getItem(specificKey);
        const list = stored ? JSON.parse(stored) : [];
        list.push(newMsg);
        localStorage.setItem(specificKey, JSON.stringify(list));
      } catch (_) {}
    }

    // 2. Save to general client key for backward compatibility
    const localKey = `atalaia_dm_messages_${msgData.clientId}`;
    try {
      const stored = localStorage.getItem(localKey);
      const list = stored ? JSON.parse(stored) : [];
      list.push(newMsg);
      localStorage.setItem(localKey, JSON.stringify(list));
      window.dispatchEvent(new Event('atalaia_dm_update'));
    } catch (_) {}

    if (isRealSupabase) {
      try {
        const payloadText = JSON.stringify({
          __dm: true,
          clientId: msgData.clientId,
          integratorId: msgData.integratorId,
          text: msgData.text,
          userName: msgData.userName,
          userRole: msgData.userRole
        });

        await supabase.from('chat_messages').insert([{
          id: newMsg.id,
          neighborhood_id: sanitizeUUID(msgData.neighborhoodId),
          user_id: sanitizeUUID(msgData.userId),
          user_name: msgData.userName,
          user_role: msgData.userRole,
          text: payloadText
        }]);
      } catch (err) {
        console.warn("[MockService] Direct message remote sync notice:", err);
      }
    }

    return newMsg;
  },

  getWhatsAppConfig: async (): Promise<{ url: string; token: string; sessionId?: string }> => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'whatsapp_config')
        .maybeSingle();
      
      if (!error && data && data.value) {
        const parsed = JSON.parse(data.value);
        if (parsed && parsed.url) return parsed;
      }
    } catch (_) {}
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('atalaia_whatsapp_config');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.url) return parsed;
        }
      } catch (_) {}
    }
    return {
      url: "https://whatsapp.alienmonitoramento.com.br:443/backend/api/messages/send",
      token: "HSYumH8GyDXc90Bb1ZcBoVMBjatynktt",
      sessionId: "Default"
    };
  },

  saveWhatsAppConfig: async (config: { url: string; token: string; sessionId?: string }) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('atalaia_whatsapp_config', JSON.stringify(config));
      } catch (_) {}
    }
    try {
      const res = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (_) {}
    return { success: true, config };
  },

  getWhatsAppAutomations: async (): Promise<Record<string, WhatsAppAutomation>> => {
    try {
      const res = await fetch('/api/whatsapp/automations');
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
          return { ...DEFAULT_WHATSAPP_AUTOMATIONS, ...data };
        }
      }
    } catch (_) {}

    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('atalaia_whatsapp_automations');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === 'object') {
            return { ...DEFAULT_WHATSAPP_AUTOMATIONS, ...parsed };
          }
        }
      } catch (_) {}
    }

    return { ...DEFAULT_WHATSAPP_AUTOMATIONS };
  },

  saveWhatsAppAutomations: async (automations: Record<string, WhatsAppAutomation>): Promise<void> => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('atalaia_whatsapp_automations', JSON.stringify(automations));
    }
    try {
      await fetch('/api/whatsapp/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(automations)
      });
    } catch (e) {
      console.warn("[MockService] Erro ao sincronizar automações no backend:", e);
    }
  },

  getWhatsAppLogs: async (): Promise<WhatsAppDispatchLog[]> => {
    try {
      const res = await fetch('/api/whatsapp/logs');
      if (res.ok) {
        return await res.json();
      }
    } catch (_) {}
    return [];
  },

  clearWhatsAppLogs: async (): Promise<void> => {
    try {
      await fetch('/api/whatsapp/logs', { method: 'DELETE' });
    } catch (_) {}
  },

  resolveIntegratorForUser: async (userOrData?: any): Promise<{
    id?: string;
    name: string;
    companyName: string;
    phone: string;
    email: string;
    displayName: string;
  }> => {
    let integratorId = userOrData?.integratorId || userOrData?.integrator_id;
    let integratorName = userOrData?.integratorName || userOrData?.integrator_name;
    let neighborhoodId = userOrData?.neighborhoodId || userOrData?.neighborhood_id || userOrData?.primaryNeighborhoodId || userOrData?.primary_neighborhood_id;

    // 1. If neighborhoodId is available but no integrator, check the neighborhood
    if ((!integratorId || !integratorName) && neighborhoodId) {
      try {
        const hood = await MockService.getNeighborhoodById(neighborhoodId);
        if (hood) {
          if (!integratorId && hood.integratorId) integratorId = hood.integratorId;
          if (!integratorName && hood.integratorName) integratorName = hood.integratorName;
        }
      } catch (_) {}
    }

    // 2. If user id or email is provided, check user profile
    if ((!integratorId || !integratorName) && (userOrData?.id || userOrData?.email)) {
      try {
        const users = await MockService.getUsers();
        const found = users.find(u => (userOrData.id && u.id === userOrData.id) || (userOrData.email && u.email?.toLowerCase() === userOrData.email.toLowerCase()));
        if (found) {
          if (!integratorId && found.integratorId) integratorId = found.integratorId;
          if (!integratorName && found.integratorName) integratorName = found.integratorName;
          if (!neighborhoodId && found.neighborhoodId) {
            neighborhoodId = found.neighborhoodId;
            const hood = await MockService.getNeighborhoodById(found.neighborhoodId);
            if (!integratorId && hood?.integratorId) integratorId = hood.integratorId;
            if (!integratorName && hood?.integratorName) integratorName = hood.integratorName;
          }
        }
      } catch (_) {}
    }

    // 3. Check browser stored last client integrator
    if (!integratorId && typeof window !== 'undefined') {
      const storedLastIntId = localStorage.getItem('atalaia_last_client_integrator_id') || localStorage.getItem('servcam_last_client_integrator_id');
      if (storedLastIntId) integratorId = storedLastIntId;
    }

    // 4. Look up full Integrator profile from getIntegrators()
    let intUser: User | null = null;
    try {
      const integrators = await MockService.getIntegrators();
      if (integratorId) {
        intUser = integrators.find(i => i.id === integratorId) || null;
      }
      if (!intUser && integratorName) {
        intUser = integrators.find(i => i.name?.toLowerCase() === integratorName?.toLowerCase() || i.companyName?.toLowerCase() === integratorName?.toLowerCase()) || null;
      }
      // 5. Fallback: if user is not linked to any specific integrator yet, pick the primary active integrator or first available
      if (!intUser && integrators && integrators.length > 0) {
        intUser = integrators[0];
      }
    } catch (_) {}

    const finalName = intUser?.name || integratorName || 'Alien Sistemas (Rogerio Integrador)';
    const finalCompany = intUser?.companyName || intUser?.razaoSocial || intUser?.name || 'Alien Sistemas de Segurança Eletrônica';
    let finalPhone = intUser?.phone || '';
    if (!finalPhone && intUser?.id && typeof window !== 'undefined') {
      finalPhone = localStorage.getItem(`atalaia_integrator_phone_${intUser.id}`) || '';
    }
    if (!finalPhone && typeof window !== 'undefined') {
      finalPhone = localStorage.getItem('user_last_phone') || '';
    }
    const finalEmail = intUser?.email || 'contato@aliensistemas.com.br';

    let displayName = finalCompany;
    if (intUser?.name && intUser.name !== finalCompany && !finalCompany.toLowerCase().includes(intUser.name.toLowerCase())) {
      displayName = `${finalCompany} (${intUser.name})`;
    } else if (!displayName || displayName === 'ServCam Segurança Eletrônica') {
      displayName = finalName;
    }

    return {
      id: intUser?.id || integratorId,
      name: finalName,
      companyName: finalCompany,
      phone: finalPhone,
      email: finalEmail,
      displayName
    };
  },

  formatAutomationTemplate: (template: string, vars: Record<string, string | undefined>): string => {
    let result = template;
    for (const [key, val] of Object.entries(vars)) {
      const reg = new RegExp(`{{${key}}}`, 'gi');
      result = result.replace(reg, val !== undefined && val !== null ? String(val) : '');
    }
    // Also support single braces {key}
    for (const [key, val] of Object.entries(vars)) {
      const reg = new RegExp(`(?<!{){${key}}(?!})`, 'gi');
      result = result.replace(reg, val !== undefined && val !== null ? String(val) : '');
    }
    return result;
  },

  sendWhatsAppMessage: async (message: string, numbers: string[], customToken?: string, customUrl?: string, trigger?: string) => {
    if (!numbers || numbers.length === 0) {
      throw new Error("Nenhum número de telefone fornecido para envio.");
    }

    const config = await MockService.getWhatsAppConfig();
    const targetUrl = (customUrl || config.url || "https://whatsapp.alienmonitoramento.com.br:443/backend/api/messages/send").trim();
    const targetToken = (customToken || config.token || "HSYumH8GyDXc90Bb1ZcBoVMBjatynktt").trim();

    // 1. Try calling the PHP proxy script first (for cPanel static hosting with PHP support)
    try {
      const phpProxyRes = await fetch('/whatsapp_proxy.php', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: numbers[0],
          body: message,
          url: targetUrl,
          token: targetToken
        })
      });
      if (phpProxyRes.ok) {
        const phpData = await phpProxyRes.json();
        if (phpData.success) {
          return { success: true, results: numbers.map(n => ({ target: n, success: true })) };
        }
      }
    } catch (_) {}

    // 2. Try calling the backend Node.js proxy first (if running full-stack)
    try {
      const proxyRes = await fetch('/api/whatsapp/send', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          numbers,
          url: targetUrl,
          token: targetToken,
          trigger: trigger || "Disparo WhatsApp"
        })
      });
      if (proxyRes.ok) {
        const proxyData = await proxyRes.json();
        if (proxyData.success) {
          return proxyData;
        }
      }
    } catch (_) {
      // Backend proxy not available, proceed to direct fetch
    }

    // 2. Direct client-side fetch to Whaticket API
    const results = [];
    const errors = [];
    for (const target of numbers) {
      let clean = String(target || "").replace(/\D/g, "");
      if (clean.length === 10 || clean.length === 11) clean = "55" + clean;
      if (clean.length < 8) continue;

      let success = false;
      let lastError = "";

      const payloads = [
        { number: clean, body: message },
        { number: clean, message: message },
        { phone: clean, message: message },
        { number: clean, text: message }
      ];

      for (const payload of payloads) {
        try {
          const response = await fetch(targetUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${targetToken}`,
              "apikey": targetToken
            },
            body: JSON.stringify(payload)
          });

          if (response.ok) {
            success = true;
            break;
          } else {
            const errText = await response.text();
            lastError = `HTTP ${response.status}: ${errText || response.statusText}`;
            if (response.status === 401) {
              lastError = "Erro 401: Token do Whaticket inválido ou não autorizado.";
              break;
            }
          }
        } catch (fetchErr: any) {
          lastError = fetchErr?.message || "Erro de rede / CORS ao conectar com Whaticket.";
        }
      }

      if (success) {
        results.push({ target: clean, success: true });
      } else {
        errors.push(`Número ${clean}: ${lastError}`);
        results.push({ target: clean, success: false, error: lastError });
      }
    }

    if (errors.length > 0 && results.every(r => !r.success)) {
      throw new Error(`Falha no envio WhatsApp: ${errors.join(' | ')}. (Dica: Se o erro for de CORS em produção estática no cPanel, configure um proxy PHP ou certifique-se de que o servidor Whaticket permite requisições cross-origin do seu domínio).`);
    }

    return { success: true, results };
  },

  sendChatMessageToWhatsApp: async (userName: string, text: string, phoneNumber?: string) => {
    if (!phoneNumber) return;
    try {
        const settings = await MockService.getSettings();
        const template = settings['chat_mirror_template'] || "*CHAT SERVCAM*\nDe: {user}\n{text}";
        const message = template.replace('{user}', userName).replace('{text}', text);

        MockService.sendWhatsAppMessage(message, [phoneNumber], undefined, undefined, 'Espelhamento de Chat').catch(e => console.warn("[WhatsApp Chat Mirror] Failed:", e));
    } catch (e) {
        console.warn("[WhatsApp Chat Mirror] Notice:", e);
    }
  },

  notifyUserLogin: async (user: User, systemName?: string) => {
    try {
        const automations = await MockService.getWhatsAppAutomations();
        const settings = await MockService.getSettings();
        const adminPhone = settings['admin_whatsapp'] || '5548998456070';
        const integratorInfo = await MockService.resolveIntegratorForUser(user);

        const roleLabels: Record<string, string> = {
            [UserRole.ADMIN]: 'Administrador Master',
            [UserRole.INTEGRATOR]: 'Empresa Integradora / Parceiro',
            [UserRole.SCR]: 'Central SCR / Motovigia',
            [UserRole.RESIDENT]: 'Cliente'
        };

        const resolvedRole = roleLabels[user.role] || user.role;
        const resolvedSystem = systemName || (
            user.role === UserRole.ADMIN ? 'Painel Master Administrativo' :
            user.role === UserRole.INTEGRATOR ? 'Gestão do Integrador / Parceiro' :
            user.role === UserRole.SCR ? 'Central SCR - Motovigia & Ronda' :
            'Portal do Cliente ServCam'
        );

        let neighborhoodName = 'Geral / Matriz';
        if (user.neighborhoodId) {
            try {
                const hood = await MockService.getNeighborhoodById(user.neighborhoodId);
                if (hood?.name) neighborhoodName = hood.name;
            } catch (_) {}
        }

        const now = new Date();
        const vars = {
            name: user.name || 'Usuário',
            role: resolvedRole,
            system: resolvedSystem,
            email: user.email || 'Não informado',
            phone: user.phone || 'Não informado',
            neighborhood: neighborhoodName,
            time: now.toLocaleTimeString('pt-BR'),
            date: now.toLocaleDateString('pt-BR'),
            link: typeof window !== 'undefined' ? window.location.origin : 'https://whatsapp.alienmonitoramento.com.br',
            integrator: integratorInfo.displayName,
            integrador: integratorInfo.displayName,
            integrator_name: integratorInfo.name,
            integrator_company: integratorInfo.companyName,
            integrator_phone: integratorInfo.phone || 'Não informado',
            integrador_telefone: integratorInfo.phone || 'Não informado',
            integrator_email: integratorInfo.email || 'Não informado'
        };

        // 1. Notificação de segurança ao próprio usuário
        const userAuto = automations['notify_login_user'];
        if (userAuto?.enabled && user.phone) {
            const body = MockService.formatAutomationTemplate(userAuto.template, vars);
            MockService.sendWhatsAppMessage(body, [user.phone], undefined, undefined, `Aviso de Segurança (Login ${resolvedRole})`).catch(err => {
                console.warn("[WhatsApp Login] Notice sending user warning:", err?.message || err);
            });
        }

        // 2. Alerta de acesso ao Administrador Geral / Central ou Integrador vinculado
        const adminAuto = automations['notify_login_admin'];
        if (adminAuto?.enabled) {
            if (!adminAuto.targetRole || adminAuto.targetRole === 'ALL' || adminAuto.targetRole === user.role) {
                const body = MockService.formatAutomationTemplate(adminAuto.template, vars);
                const targets: string[] = [];
                if (adminPhone) targets.push(adminPhone);
                if (user.role === UserRole.RESIDENT && integratorInfo.phone && !targets.includes(integratorInfo.phone)) {
                    targets.push(integratorInfo.phone);
                }
                if (targets.length > 0) {
                    MockService.sendWhatsAppMessage(body, targets, undefined, undefined, `Alerta de Acesso ao Sistema (${resolvedRole})`).catch(err => {
                        console.warn("[WhatsApp Login] Notice sending admin alert:", err?.message || err);
                    });
                }
            }
        }
    } catch (e) {
        console.warn("[MockService] Erro em notifyUserLogin:", e);
    }
  },

  notifyNewUserRegistration: async (userData: { name: string; email: string; phone?: string; role?: string; neighborhoodId?: string; integratorId?: string; integratorName?: string }) => {
    try {
        const automations = await MockService.getWhatsAppAutomations();
        const settings = await MockService.getSettings();
        const adminPhone = settings['admin_whatsapp'] || '5548998456070';
        const integratorInfo = await MockService.resolveIntegratorForUser(userData);

        const roleLabels: Record<string, string> = {
            [UserRole.ADMIN]: 'Administrador Master',
            [UserRole.INTEGRATOR]: 'Empresa Integradora',
            [UserRole.SCR]: 'Central SCR / Motovigia',
            [UserRole.RESIDENT]: 'Cliente'
        };

        const resolvedRole = (userData.role && roleLabels[userData.role]) ? roleLabels[userData.role] : (userData.role || 'Cliente');
        let neighborhoodName = 'Bairro Pendente';
        if (userData.neighborhoodId) {
            try {
                const hood = await MockService.getNeighborhoodById(userData.neighborhoodId);
                if (hood?.name) neighborhoodName = hood.name;
            } catch (_) {}
        }

        const now = new Date();
        const vars = {
            name: userData.name || 'Novo Usuário',
            role: resolvedRole,
            email: userData.email || 'Não informado',
            phone: userData.phone || 'Não informado',
            neighborhood: neighborhoodName,
            time: now.toLocaleTimeString('pt-BR'),
            date: now.toLocaleDateString('pt-BR'),
            link: typeof window !== 'undefined' ? `${window.location.origin}/login` : 'https://whatsapp.alienmonitoramento.com.br',
            integrator: integratorInfo.displayName,
            integrador: integratorInfo.displayName,
            integrator_name: integratorInfo.name,
            integrator_company: integratorInfo.companyName,
            integrator_phone: integratorInfo.phone || 'Não informado',
            integrador_telefone: integratorInfo.phone || 'Não informado',
            integrator_email: integratorInfo.email || 'Não informado'
        };

        // 1. Boas-vindas para o usuário recém-cadastrado
        const userAuto = automations['notify_register_user'];
        if (userAuto?.enabled && userData.phone) {
            const body = MockService.formatAutomationTemplate(userAuto.template, vars);
            MockService.sendWhatsAppMessage(body, [userData.phone], undefined, undefined, 'Boas-Vindas Novo Cadastro').catch(err => {
                console.warn("[WhatsApp Register] Falha envio boas-vindas:", err);
            });
        }

        // 2. Alerta para o Administrador e para o Integrador Vinculado sobre nova solicitação de cadastro
        const adminAuto = automations['notify_register_admin'];
        if (adminAuto?.enabled) {
            const body = MockService.formatAutomationTemplate(adminAuto.template, vars);
            const targets: string[] = [];
            if (adminPhone) targets.push(adminPhone);
            if (integratorInfo.phone && !targets.includes(integratorInfo.phone)) {
                targets.push(integratorInfo.phone);
            }
            if (targets.length > 0) {
                MockService.sendWhatsAppMessage(body, targets, undefined, undefined, 'Alerta Novo Cadastro Pendente').catch(err => {
                    console.warn("[WhatsApp Register] Falha aviso admin/integrador:", err);
                });
            }
        }
    } catch (e) {
        console.warn("[MockService] Erro em notifyNewUserRegistration:", e);
    }
  },

  notifyUserApproved: async (user: User) => {
    try {
        const automations = await MockService.getWhatsAppAutomations();
        const userAuto = automations['notify_user_approved'];
        if (!userAuto?.enabled || !user.phone) return;

        const integratorInfo = await MockService.resolveIntegratorForUser(user);

        const roleLabels: Record<string, string> = {
            [UserRole.ADMIN]: 'Administrador',
            [UserRole.INTEGRATOR]: 'Empresa Integradora / Parceiro',
            [UserRole.SCR]: 'Central SCR / Motovigia',
            [UserRole.RESIDENT]: 'Cliente'
        };

        const resolvedRole = roleLabels[user.role] || user.role;
        let neighborhoodName = 'Bairro Cadastrado';
        if (user.neighborhoodId) {
            try {
                const hood = await MockService.getNeighborhoodById(user.neighborhoodId);
                if (hood?.name) neighborhoodName = hood.name;
            } catch (_) {}
        }

        const now = new Date();
        const vars = {
            name: user.name || 'Usuário',
            role: resolvedRole,
            email: user.email || '',
            phone: user.phone,
            neighborhood: neighborhoodName,
            time: now.toLocaleTimeString('pt-BR'),
            date: now.toLocaleDateString('pt-BR'),
            link: typeof window !== 'undefined' ? `${window.location.origin}/login` : 'https://whatsapp.alienmonitoramento.com.br',
            integrator: integratorInfo.displayName,
            integrador: integratorInfo.displayName,
            integrator_name: integratorInfo.name,
            integrator_company: integratorInfo.companyName,
            integrator_phone: integratorInfo.phone || 'Não informado',
            integrador_telefone: integratorInfo.phone || 'Não informado',
            integrator_email: integratorInfo.email || 'Não informado'
        };

        const body = MockService.formatAutomationTemplate(userAuto.template, vars);
        await MockService.sendWhatsAppMessage(body, [user.phone], undefined, undefined, 'Notificação de Cadastro Aprovado');
    } catch (e) {
        console.warn("[MockService] Erro em notifyUserApproved:", e);
    }
  },

  notifySecurityAlert: async (alertData: { title: string; message: string; type?: string; neighborhoodId?: string; userName?: string; userPhone?: string }) => {
    try {
        const automations = await MockService.getWhatsAppAutomations();
        const auto = automations['notify_sos_alert'];
        if (!auto?.enabled) return;

        const settings = await MockService.getSettings();
        const adminPhone = settings['admin_whatsapp'] || '5548998456070';
        const integratorInfo = await MockService.resolveIntegratorForUser({
            neighborhoodId: alertData.neighborhoodId,
            name: alertData.userName,
            phone: alertData.userPhone
        });

        let neighborhoodName = 'Bairro Integrado';
        let targetPhones: string[] = [];

        if (alertData.neighborhoodId) {
            try {
                const hood = await MockService.getNeighborhoodById(alertData.neighborhoodId);
                if (hood?.name) neighborhoodName = hood.name;
            } catch (_) {}

            try {
                const users = await MockService.getUsers();
                targetPhones = users
                    .filter(u => u.neighborhoodId === alertData.neighborhoodId && u.phone)
                    .map(u => u.phone!)
                    .filter(Boolean);
            } catch (_) {}
        }

        if (adminPhone && !targetPhones.includes(adminPhone)) {
            targetPhones.push(adminPhone);
        }
        if (integratorInfo.phone && !targetPhones.includes(integratorInfo.phone)) {
            targetPhones.push(integratorInfo.phone);
        }

        if (targetPhones.length === 0) return;

        const now = new Date();
        const vars = {
            name: alertData.userName || 'Cliente em Alerta',
            details: `${alertData.title}: ${alertData.message}`,
            neighborhood: neighborhoodName,
            time: now.toLocaleTimeString('pt-BR'),
            date: now.toLocaleDateString('pt-BR'),
            integrator: integratorInfo.displayName,
            integrador: integratorInfo.displayName,
            integrator_name: integratorInfo.name,
            integrator_company: integratorInfo.companyName,
            integrator_phone: integratorInfo.phone || 'Não informado',
            integrador_telefone: integratorInfo.phone || 'Não informado',
            integrator_email: integratorInfo.email || 'Não informado'
        };

        const body = MockService.formatAutomationTemplate(auto.template, vars);
        MockService.sendWhatsAppMessage(body, targetPhones, undefined, undefined, 'Alerta SOS / Pânico de Emergência').catch(err => {
            console.warn("[WhatsApp SOS] Falha no disparo:", err);
        });
    } catch (e) {
        console.warn("[MockService] Erro em notifySecurityAlert:", e);
    }
  },

  notifySupportTicket: async (userName: string, userPhone: string | undefined, messageText: string, neighborhoodName?: string, neighborhoodId?: string) => {
    try {
        const automations = await MockService.getWhatsAppAutomations();
        const auto = automations['notify_support_ticket'];
        if (!auto?.enabled) return;

        const settings = await MockService.getSettings();
        const adminPhone = settings['admin_whatsapp'] || '5548998456070';
        const integratorInfo = await MockService.resolveIntegratorForUser({
            neighborhoodId,
            name: userName,
            phone: userPhone
        });

        const targets: string[] = [];
        if (adminPhone) targets.push(adminPhone);
        if (integratorInfo.phone && !targets.includes(integratorInfo.phone)) {
            targets.push(integratorInfo.phone);
        }

        if (targets.length === 0) return;

        const now = new Date();
        const vars = {
            name: userName,
            phone: userPhone || 'Não informado',
            details: messageText,
            neighborhood: neighborhoodName || 'Central',
            time: now.toLocaleTimeString('pt-BR'),
            date: now.toLocaleDateString('pt-BR'),
            integrator: integratorInfo.displayName,
            integrador: integratorInfo.displayName,
            integrator_name: integratorInfo.name,
            integrator_company: integratorInfo.companyName,
            integrator_phone: integratorInfo.phone || 'Não informado',
            integrador_telefone: integratorInfo.phone || 'Não informado',
            integrator_email: integratorInfo.email || 'Não informado'
        };

        const body = MockService.formatAutomationTemplate(auto.template, vars);
        MockService.sendWhatsAppMessage(body, targets, undefined, undefined, 'Chamado de Suporte Técnico').catch(err => {
            console.warn("[WhatsApp Support] Falha envio:", err);
        });
    } catch (e) {
        console.warn("[MockService] Erro em notifySupportTicket:", e);
    }
  },

  notifyContractSigned: async (user: User, contractData: any) => {
    try {
        const automations = await MockService.getWhatsAppAutomations();
        const auto = automations['notify_contract_signed'];
        if (!auto?.enabled) return;

        const settings = await MockService.getSettings();
        const adminPhone = settings['admin_whatsapp'] || '5548998456070';
        const integratorInfo = await MockService.resolveIntegratorForUser(user);

        const now = new Date();
        const vars = {
            name: user.name || contractData?.name || 'Cliente',
            email: user.email || 'Não informado',
            phone: user.phone || contractData?.phone || 'Não informado',
            time: now.toLocaleTimeString('pt-BR'),
            date: now.toLocaleDateString('pt-BR'),
            role: user.role === UserRole.INTEGRATOR ? 'Empresa Integradora' : 'Cliente',
            link: typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : 'https://whatsapp.alienmonitoramento.com.br',
            integrator: integratorInfo.displayName,
            integrador: integratorInfo.displayName,
            integrator_name: integratorInfo.name,
            integrator_company: integratorInfo.companyName,
            integrator_phone: integratorInfo.phone || 'Não informado',
            integrador_telefone: integratorInfo.phone || 'Não informado',
            integrator_email: integratorInfo.email || 'Não informado'
        };

        const body = MockService.formatAutomationTemplate(auto.template, vars);
        const targets: string[] = [];
        if (user.phone) targets.push(user.phone);
        if (contractData?.phone && !targets.includes(contractData.phone)) targets.push(contractData.phone);
        if (adminPhone && !targets.includes(adminPhone)) targets.push(adminPhone);
        if (integratorInfo.phone && !targets.includes(integratorInfo.phone)) targets.push(integratorInfo.phone);

        if (targets.length > 0) {
            MockService.sendWhatsAppMessage(body, targets, undefined, undefined, 'Assinatura de Contrato').catch(err => {
                console.warn("[WhatsApp Contract Signed] Falha envio:", err);
            });
        }
    } catch (e) {
        console.warn("[MockService] Erro em notifyContractSigned:", e);
    }
  },

  testWhatsAppAutomation: async (triggerKey: string, customPhone: string): Promise<any> => {
    const automations = await MockService.getWhatsAppAutomations();
    const auto = automations[triggerKey] || DEFAULT_WHATSAPP_AUTOMATIONS[triggerKey];
    if (!auto) {
        throw new Error(`Gatilho de automação '${triggerKey}' não encontrado.`);
    }

    const now = new Date();
    const mockVars = {
        name: 'Carlos Oliveira (Teste)',
        role: 'Cliente / Residencial',
        system: 'Portal do Cliente ServCam',
        email: 'carlos.teste@servcam.com',
        phone: customPhone,
        neighborhood: 'Jardim Alvorada',
        time: now.toLocaleTimeString('pt-BR'),
        date: now.toLocaleDateString('pt-BR'),
        details: 'Simulação de evento acionado pelo Painel Administrativo.',
        link: typeof window !== 'undefined' ? window.location.origin : 'https://whatsapp.alienmonitoramento.com.br',
        integrator: 'Alien Sistemas (Rogerio Integrador)',
        integrador: 'Alien Sistemas (Rogerio Integrador)',
        integrator_name: 'Rogerio Integrador',
        integrator_company: 'Alien Sistemas de Segurança Eletrônica',
        integrator_phone: '(48) 99845-6070',
        integrador_telefone: '(48) 99845-6070',
        integrator_email: 'contato@aliensistemas.com.br'
    };

    const formattedBody = MockService.formatAutomationTemplate(auto.template, mockVars);
    const triggerLabel = `Teste: ${auto.name}`;

    return await MockService.sendWhatsAppMessage(formattedBody, [customPhone], undefined, undefined, triggerLabel);
  },

  sendCustomBroadcast: async (message: string, targetType: string, neighborhoodId?: string) => {
      try {
          let query = supabase.from('profiles').select('phone').not('phone', 'is', null);
          
          if (targetType === 'HOOD' && neighborhoodId) {
              query = query.eq('neighborhood_id', neighborhoodId);
          } else if (targetType === 'ADMINS') {
              query = query.eq('role', 'ADMIN');
          } else if (targetType === 'INDIVIDUAL') {
              // No caso individual, o broadcast é feito para números manuais
          }
          
          const { data, error } = await query;
          if (error) throw error;
          
          const numbers = (data || []).map(u => u.phone).filter(Boolean) as string[];
          
          if (numbers.length > 0) { 
              return await MockService.sendWhatsAppMessage(message, numbers);
          } else {
              throw new Error("Nenhum número de telefone encontrado para o alvo selecionado.");
          }
      } catch (e) {
          console.warn("[MockService] Notice in sendCustomBroadcast:", e);
          throw e;
      }
  },

  getServiceRequests: async (neighborhoodId: string): Promise<ServiceRequest[]> => {
    try {
        const safeId = sanitizeUUID(neighborhoodId);
        const { data, error } = await supabase.from('service_requests').select('*').eq('neighborhood_id', safeId).order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []).map(r => ({ id: r.id, userId: r.user_id, userName: r.user_name, neighborhoodId: r.neighborhood_id, requestType: r.request_type as any, status: r.status as any, createdAt: new Date(r.created_at) }));
    } catch (e) {
        console.warn("[MockService] Notice in getServiceRequests:", e);
        return [];
    }
  },

  createServiceRequest: async (userId: string, userName: string, neighborhoodId: string, requestType: string) => {
    const { error } = await supabase.from('service_requests').insert([{ user_id: sanitizeUUID(userId), user_name: userName, neighborhood_id: sanitizeUUID(neighborhoodId), request_type: requestType, status: 'PENDING' }]);
    
    if (true) {
        if (error) console.warn("[MockService] Ignorando aviso no supabase para continuar o alerta:", error);
        const integrator = await MockService.resolveIntegratorForUser({ neighborhoodId, id: userId, name: userName });
        if (integrator?.phone) {
            const settings = await MockService.getSettings();
            const template = settings['service_request_template'] || "*SOLICITAÇÃO*\nTipo: {type}\nCliente: {user}\nIntegrador Responsável: {integrator}";
            const label = requestType === 'ESCORT' ? 'ESCOLTA' : requestType === 'EXTRA_ROUND' ? 'RONDA EXTRA' : 'AVISO DE VIAGEM';
            
            const message = template
                .replace(/{type}/g, label)
                .replace(/{user}/g, userName)
                .replace(/{integrator}/g, integrator.displayName)
                .replace(/{integrador}/g, integrator.displayName);

            await MockService.sendWhatsAppMessage(message, [integrator.phone], undefined, undefined, 'Solicitação de Serviço');
        }
    }

    if (error) {
        console.warn("[MockService] Notice in createServiceRequest (fallback used):", error);
    }
  },

  registerPatrol: async (userId: string, neighborhoodId: string, note: string, lat?: number, lng?: number, targetUserId?: string) => {
    // 1. Insert into patrol_logs
    const { error } = await supabase.from('patrol_logs').insert([{ 
        user_id: sanitizeUUID(userId), 
        neighborhood_id: sanitizeUUID(neighborhoodId), 
        note, 
        lat, 
        lng, 
        target_user_id: sanitizeUUID(targetUserId) || undefined 
    }]);
    
    if (error) {
        console.warn("[MockService] Notice in registerPatrol (using fallback):", error);
        // Do not throw, continue to send notifications
    }

    // 2. Send Whatsapp and Resident Notifications if a user was linked
    if (targetUserId) {
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', sanitizeUUID(targetUserId))
                .maybeSingle();

            if (profile) {
                // Determine clean time string
                const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const integratorInfo = await MockService.resolveIntegratorForUser({
                    id: profile.id,
                    name: profile.name,
                    phone: profile.phone,
                    neighborhoodId: profile.neighborhood_id || neighborhoodId
                });

                // Send WhatsApp if they have a phone number
                if (profile.phone) {
                    const settings = await MockService.getSettings();
                    const template = settings['patrol_notification_template'] || 
                        "*INFORME DO MOTOVIGIA* 🏍️💨\n\nOlá *{name}*!\n\nInformamos que o Motovigia em ronda pelo seu setor registrou uma ocorrência em sua residência:\n\n📌 Ocorrência: *{note}*\n🏠 Local: {address}\n⏰ Horário: *{time}*\n🛡️ Integrador Responsável: *{integrator}*\n\n_Bairro Seguro e monitorado via ServCam. Se precisar, conte conosco!_";

                    const customMessage = template
                        .replace(/{name}/g, profile.name || 'Cliente')
                        .replace(/{note}/g, note.replace(/OCORRÊNCIA:\s*/g, '')) // clean any occurrence prefix
                        .replace(/{address}/g, profile.address || 'Seu lote cadastrado')
                        .replace(/{time}/g, timeStr)
                        .replace(/{integrator}/g, integratorInfo.displayName)
                        .replace(/{integrador}/g, integratorInfo.displayName)
                        .replace(/{integrator_phone}/g, integratorInfo.phone || '')
                        .replace(/{integrador_telefone}/g, integratorInfo.phone || '');

                    try {
                        await MockService.sendWhatsAppMessage(customMessage, [profile.phone], undefined, undefined, 'Informe do Motovigia');
                    } catch (err) {
                        console.warn("[MockService/WhatsApp] Notice dispatching patrol WhatsApp alert:", err);
                    }
                }

                // Create an in-app notification record so they see it in the user app dashboard
                try {
                    await supabase.from('notifications').insert([{
                        user_id: sanitizeUUID(targetUserId),
                        type: 'SYSTEM',
                        title: 'Ronda do Motovigia',
                        message: `O Motovigia registrou a seguinte ocorrência: ${note.replace(/OCORRÊNCIA:\s*/g, '')}`,
                        from_user_name: 'Motovigia',
                        read: false
                    }]);
                } catch (err) {
                    console.warn("[MockService/InApp] Notice inserting in-app notification:", err);
                }
            }
        } catch (e) {
            console.warn("[MockService] Notice during registerPatrol notification side-effects:", e);
        }
    }
  },

  getNotifications: async (userId?: string): Promise<Notification[]> => {
    try {
        let query = supabase.from('notifications').select('*').order('timestamp', { ascending: false });
        if (userId) {
            const safeUserId = sanitizeUUID(userId);
            if (!safeUserId) {
                // If ID is not a valid UUID on real Supabase, return empty array to prevent PostgreSQL error
                return [];
            }
            query = query.eq('user_id', safeUserId);
        }
        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map(n => ({ id: n.id, userId: n.user_id, type: n.type as any, title: n.title, message: n.message, data: n.data, fromUserName: n.from_user_name, timestamp: new Date(n.timestamp), read: n.read }));
    } catch (e) {
        console.warn("[MockService] Notice in getNotifications:", e);
        return [];
    }
  },

  deleteNotification: async (id: string) => {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) {
        console.warn("[MockService] Notice in deleteNotification:", error);
        throw error;
    }
  },

  getNeighborhoodIntegrator: async (neighborhoodId: string): Promise<User | null> => {
      try {
          if (!neighborhoodId) return null;

          const integrators = await MockService.getIntegrators();

          // 1. Verifica vínculo no sistema (Neighborhood -> integratorId)
          const hoods = await MockService.getNeighborhoods();
          const targetHood = hoods.find(h => h.id === neighborhoodId);
          if (targetHood?.integratorId) {
              const linkedInt = integrators.find(i => i.id === targetHood.integratorId);
              if (linkedInt) {
                  return linkedInt;
              }
          }

          // 2. Fallback somente para o sistema de demonstração padrão
          if (neighborhoodId === 'hood-demo-1') {
              const demoInt = integrators.find(i => i.id === 'demo-integrator-id');
              if (demoInt) return demoInt;
          }

          return null;
      } catch (e) {
          return null;
      }
  },

  // --- SUPORTE TÉCNICO ---
  getSupportTickets: async (): Promise<SupportTicket[]> => {
    try {
        const { data, error } = await supabase
            .from('support_tickets')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        return (data || []).map(t => ({
            id: t.id,
            userId: t.user_id,
            userName: t.user_name,
            neighborhoodId: t.neighborhood_id,
            message: t.message,
            status: t.status as any,
            createdAt: new Date(t.created_at)
        }));
    } catch (e) {
        console.warn("[MockService] Notice in getSupportTickets:", e);
        return [];
    }
  },

  createSupportTicket: async (userId: string, userName: string, message: string, neighborhoodId?: string) => {
    const { error } = await supabase
        .from('support_tickets')
        .insert([{ 
            user_id: sanitizeUUID(userId), 
            user_name: userName, 
            message, 
            neighborhood_id: sanitizeUUID(neighborhoodId),
            status: 'OPEN'
        }]);
    
    if (!error) {
        try {
            let userPhone: string | undefined;
            let hoodName: string | undefined;
            if (userId) {
                const { data: prof } = await supabase.from('profiles').select('phone').eq('id', sanitizeUUID(userId)).maybeSingle();
                if (prof?.phone) userPhone = prof.phone;
            }
            if (neighborhoodId) {
                const hood = await MockService.getNeighborhoodById(neighborhoodId);
                if (hood?.name) hoodName = hood.name;
            }
            await MockService.notifySupportTicket(userName, userPhone, message, hoodName, neighborhoodId);
        } catch (ticketNotifyErr) {
            console.warn("[createSupportTicket] Notice notifying via WhatsApp:", ticketNotifyErr);
        }
    }

    if (error) {
        console.warn("[MockService] Notice in createSupportTicket:", error);
        throw error;
    }
  },

  updateSupportTicketStatus: async (ticketId: string, status: string) => {
    const { error } = await supabase
        .from('support_tickets')
        .update({ status })
        .eq('id', ticketId);
    
    if (error) {
        console.warn("[MockService] Notice in updateSupportTicketStatus:", error);
        throw error;
    }
  },

  // --- FINANCEIRO / PAGAMENTOS ---
  getPayments: async (): Promise<any[]> => {
    if (!isRealSupabase) {
        let localPayments: any[] = [];
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem('atalaia_local_payments');
            if (cached) {
                try {
                    localPayments = JSON.parse(cached);
                } catch {}
            }
            if (localPayments.length === 0) {
                localPayments = [
                    {
                        id: 'pay-demo-1',
                        user_id: 'demo-user-id',
                        amount: 49.90,
                        due_date: new Date(Date.now() + 5*24*60*60*1000).toISOString().split('T')[0],
                        status: 'PENDING',
                        reference_month: '08/2026',
                        profiles: { name: 'Mariana Costa', neighborhood_id: 'hood-demo-1', plan: 'PREMIUM' }
                    },
                    {
                        id: 'pay-demo-2',
                        user_id: 'demo-scr-id',
                        amount: 49.90,
                        due_date: new Date(Date.now() - 2*24*60*60*1000).toISOString().split('T')[0],
                        status: 'PAID',
                        reference_month: '07/2026',
                        profiles: { name: 'Vigia Roberto', neighborhood_id: 'hood-demo-1', plan: 'PREMIUM' }
                    }
                ];
                localStorage.setItem('atalaia_local_payments', JSON.stringify(localPayments));
            }
            
            // Enrich with current mock profiles to ensure updates in users (name, neighborhood, plan) are reflected
            const users = await MockService.getUsers();
            const userMap = new Map(users.map(u => [u.id, u]));
            localPayments = localPayments.map(p => {
                const u = userMap.get(p.user_id);
                const localReceipt = localStorage.getItem(`receipt_data_${p.id}`);
                const localReceiptName = localStorage.getItem(`receipt_name_${p.id}`);
                return {
                    ...p,
                    profiles: u ? { name: u.name, neighborhood_id: u.neighborhoodId, plan: u.plan } : p.profiles,
                    receipt_base64: p.receipt_base64 || localReceipt || null,
                    receipt_name: p.receipt_name || localReceiptName || null
                };
            });
        }
        return localPayments;
    }

    try {
        let data: any[] | null = null;
        let error: any = null;

        // Try direct relational join first
        try {
            const res = await supabase
                .from('payments')
                .select('*, profiles(name, neighborhood_id, plan)')
                .order('due_date', { ascending: false });
            data = res.data;
            error = res.error;
        } catch (joinErr) {
            console.warn("[getPayments] Falha de join na primeira tentativa:", joinErr);
            error = joinErr;
        }

        if (error) {
            console.warn("[getPayments] Falha ao fazer join direto, buscando pagamentos e perfis separadamente...", error);
            const { data: payData, error: payError } = await supabase
                .from('payments')
                .select('*')
                .order('due_date', { ascending: false });
            
            if (payError) throw payError;
            
            const { data: profData } = await supabase
                .from('profiles')
                .select('id, name, neighborhood_id, plan');
            
            const profMap = new Map((profData || []).map(p => [p.id, p]));
            
            data = (payData || []).map(p => ({
                ...p,
                profiles: profMap.get(p.user_id) || null
            }));
        }
        
        // Enriquecer pagamentos com os dados de comprovante anexados localmente ou no banco
        const enriched = (data || []).map((p: any) => {
          const localReceipt = localStorage.getItem(`receipt_data_${p.id}`);
          const localReceiptName = localStorage.getItem(`receipt_name_${p.id}`);
          return {
            ...p,
            receipt_base64: p.receipt_base64 || localReceipt || null,
            receipt_name: p.receipt_name || localReceiptName || null
          };
        });
        return enriched;
    } catch (e) {
        console.warn("[MockService] Notice in getPayments, falling back to local storage:", e);
        let localPayments: any[] = [];
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem('atalaia_local_payments');
            if (cached) {
                try {
                    localPayments = JSON.parse(cached);
                } catch {}
            }
            if (localPayments.length === 0) {
                localPayments = [
                    {
                        id: 'pay-demo-1',
                        user_id: 'demo-user-id',
                        amount: 49.90,
                        due_date: new Date(Date.now() + 5*24*60*60*1000).toISOString().split('T')[0],
                        status: 'PENDING',
                        reference_month: '08/2026',
                        profiles: { name: 'Mariana Costa', neighborhood_id: 'hood-demo-1', plan: 'PREMIUM' }
                    },
                    {
                        id: 'pay-demo-2',
                        user_id: 'demo-scr-id',
                        amount: 49.90,
                        due_date: new Date(Date.now() - 2*24*60*60*1000).toISOString().split('T')[0],
                        status: 'PAID',
                        reference_month: '07/2026',
                        profiles: { name: 'Vigia Roberto', neighborhood_id: 'hood-demo-1', plan: 'PREMIUM' }
                    }
                ];
                localStorage.setItem('atalaia_local_payments', JSON.stringify(localPayments));
            }
            
            // Enrich with current mock profiles to ensure updates in users (name, neighborhood, plan) are reflected
            try {
                const users = await MockService.getUsers();
                const userMap = new Map(users.map(u => [u.id, u]));
                localPayments = localPayments.map(p => {
                    const u = userMap.get(p.user_id);
                    const localReceipt = localStorage.getItem(`receipt_data_${p.id}`);
                    const localReceiptName = localStorage.getItem(`receipt_name_${p.id}`);
                    return {
                        ...p,
                        profiles: u ? { name: u.name, neighborhood_id: u.neighborhoodId, plan: u.plan } : p.profiles,
                        receipt_base64: p.receipt_base64 || localReceipt || null,
                        receipt_name: p.receipt_name || localReceiptName || null
                    };
                });
            } catch (userErr) {
                console.warn("[getPayments Fallback] Could not enrich with mock profiles:", userErr);
            }
        }
        return localPayments;
    }
  },

  createPayment: async (userId: string, amount: number, dueDate: string, referenceMonth: string) => {
    if (!isRealSupabase) {
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem('atalaia_local_payments');
            let localPayments: any[] = [];
            if (cached) {
                try { localPayments = JSON.parse(cached); } catch {}
            }
            const newPayment = {
                id: `pay-local-${Date.now()}`,
                user_id: userId,
                amount: Number(amount),
                due_date: dueDate,
                status: 'PENDING',
                reference_month: referenceMonth,
                created_at: new Date().toISOString()
            };
            localPayments.unshift(newPayment);
            localStorage.setItem('atalaia_local_payments', JSON.stringify(localPayments));
        }
        return;
    }

    const { error } = await supabase
        .from('payments')
        .insert([{ 
            user_id: sanitizeUUID(userId), 
            amount, 
            due_date: dueDate,
            reference_month: referenceMonth,
            status: 'PENDING'
        }]);
    
    if (error) {
        console.warn("[MockService] Notice in createPayment:", error);
        throw error;
    }
  },

  updatePaymentStatus: async (paymentId: string, status: 'PAID' | 'PENDING' | 'OVERDUE', paymentDate?: string) => {
    if (!isRealSupabase) {
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem('atalaia_local_payments');
            let localPayments: any[] = [];
            if (cached) {
                try { localPayments = JSON.parse(cached); } catch {}
            }
            localPayments = localPayments.map(p => {
                if (p.id === paymentId) {
                    return {
                        ...p,
                        status,
                        payment_date: status === 'PAID' ? (paymentDate || new Date().toISOString()) : null
                    };
                }
                return p;
            });
            localStorage.setItem('atalaia_local_payments', JSON.stringify(localPayments));
        }
        return;
    }

    const updateData: any = { status };
    if (status === 'PAID') {
        updateData.payment_date = paymentDate || new Date().toISOString();
    } else {
        updateData.payment_date = null;
    }

    const { error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', paymentId);
    
    if (error) {
        console.warn("[MockService] Notice in updatePaymentStatus:", error);
        throw error;
    }
  },

  // --- COUPONS AND TRIAL PROMOTIONS SYSTEM ---
  getCoupons: async (): Promise<Coupon[]> => {
    let localCoupons: Coupon[] = [];
    const cached = localStorage.getItem('atalaia_coupons');
    if (cached) {
      try { localCoupons = JSON.parse(cached); } catch (e) {}
    }

    // Garantir que TESTE7DIAS5REAIS sempre exista na lista local contra caches velhos
    const hasDefaultLocal = localCoupons.some(c => c.code.toUpperCase() === 'TESTE7DIAS5REAIS');
    if (!hasDefaultLocal) {
      localCoupons.push({
        id: "teste-7dias-5reais-id",
        code: "TESTE7DIAS5REAIS",
        active: true,
        promotionalPrice: 5.00,
        trialDays: 7,
        maxUses: 1000,
        usedCount: 0,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('atalaia_coupons', JSON.stringify(localCoupons));
    }

    if (isRealSupabase) {
      try {
        const { data, error } = await supabase.from('coupons').select('*');
        if (!error && data) {
          const dbCoupons = data.map((c: any) => ({
            id: c.id,
            code: c.code,
            active: c.active,
            promotionalPrice: Number(c.promotional_price),
            trialDays: c.trial_days,
            maxUses: c.max_uses,
            usedCount: c.used_count,
            createdAt: c.created_at
          }));
          
          // Se o TESTE7DIAS5REAIS não estiver no banco, vamos inseri-lo ou mesclá-lo para que sempre exista
          const hasDefault = dbCoupons.some(c => c.code.toUpperCase() === 'TESTE7DIAS5REAIS');
          if (!hasDefault) {
             const defaultCoupon = {
                id: "teste-7dias-5reais-id",
                code: "TESTE7DIAS5REAIS",
                active: true,
                promotionalPrice: 5.00,
                trialDays: 7,
                maxUses: 1000,
                usedCount: 0,
                createdAt: new Date().toISOString()
             };
             try {
                // Tenta inserir no banco. Se falhar, pelo menos retorna em dbCoupons
                await supabase.from('coupons').insert({
                   code: defaultCoupon.code,
                   active: defaultCoupon.active,
                   promotional_price: defaultCoupon.promotionalPrice,
                   trial_days: defaultCoupon.trialDays,
                   max_uses: defaultCoupon.maxUses,
                   used_count: defaultCoupon.usedCount
                });
             } catch (insertErr) {
                console.warn("[MockService] Erro ao auto-inserir cupom padrão no banco:", insertErr);
             }
             dbCoupons.push(defaultCoupon);
          }
          return dbCoupons;
        }
      } catch (e) {
        console.warn("[MockService] Erro ao carregar cupons do Supabase. Usando local:", e);
      }
    }

    return localCoupons;
  },

  saveCoupon: async (coupon: Coupon): Promise<void> => {
    let localCoupons: Coupon[] = [];
    const cached = localStorage.getItem('atalaia_coupons');
    if (cached) {
      try { localCoupons = JSON.parse(cached); } catch (e) {}
    }
    const idx = localCoupons.findIndex(c => c.id === coupon.id || c.code === coupon.code);
    if (idx >= 0) {
      localCoupons[idx] = { ...localCoupons[idx], ...coupon };
    } else {
      localCoupons.push(coupon);
    }
    localStorage.setItem('atalaia_coupons', JSON.stringify(localCoupons));

    if (isRealSupabase) {
      try {
        const dbPayload: any = {
          code: coupon.code.toUpperCase().trim(),
          active: coupon.active,
          promotional_price: coupon.promotionalPrice,
          trial_days: coupon.trialDays,
          max_uses: coupon.maxUses,
          used_count: coupon.usedCount
        };
        
        // Só envia id se for um UUID válido.
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(coupon.id);
        if (isUuid) {
          dbPayload.id = coupon.id;
        }

        const { data, error } = await supabase
          .from('coupons')
          .upsert(dbPayload, { onConflict: 'code' })
          .select();

        if (error) throw error;
        
        if (data && data.length > 0) {
          const dbCoupon = data[0];
          const updatedLocalIdx = localCoupons.findIndex(c => c.code.toUpperCase() === dbCoupon.code.toUpperCase());
          if (updatedLocalIdx >= 0) {
            localCoupons[updatedLocalIdx].id = dbCoupon.id;
            localStorage.setItem('atalaia_coupons', JSON.stringify(localCoupons));
          }
        }
      } catch (e) {
        console.warn("[MockService] Notice ao salvar cupom no Supabase:", e);
      }
    }
  },

  deleteCoupon: async (id: string): Promise<void> => {
    let localCoupons: Coupon[] = [];
    const cached = localStorage.getItem('atalaia_coupons');
    if (cached) {
      try { localCoupons = JSON.parse(cached); } catch (e) {}
    }
    
    const couponToDelete = localCoupons.find(c => c.id === id);
    const code = couponToDelete?.code;

    localCoupons = localCoupons.filter(c => c.id !== id);
    localStorage.setItem('atalaia_coupons', JSON.stringify(localCoupons));

    if (isRealSupabase) {
      try {
        let query = supabase.from('coupons').delete();
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
        if (isUuid) {
          query = query.eq('id', id);
        } else if (code) {
          query = query.eq('code', code.toUpperCase().trim());
        } else {
          query = query.eq('id', id);
        }
        const { error } = await query;
        if (error) throw error;
      } catch (e) {
        console.warn("[MockService] Notice ao deletar cupom no Supabase:", e);
      }
    }
  },

  validateCoupon: async (code: string, userId: string): Promise<{ success: boolean; message: string; coupon?: Coupon }> => {
    const coupons = await MockService.getCoupons();
    const coupon = coupons.find(c => c.code.trim().toUpperCase() === code.trim().toUpperCase());

    if (!coupon) {
      return { success: false, message: "Cupom inválido ou não encontrado." };
    }

    if (!coupon.active) {
      return { success: false, message: "Este cupom promocional não está mais ativo." };
    }

    if (coupon.usedCount >= coupon.maxUses) {
      return { success: false, message: "Limite de utilizações deste cupom esgotado." };
    }

    let alreadyUsed = false;
    const cachedProfileStr = localStorage.getItem(`atalaia_local_profile_${userId}`);
    if (cachedProfileStr) {
      try {
        const u = JSON.parse(cachedProfileStr);
        if (u.promoCoupon?.trim().toUpperCase() === code.trim().toUpperCase()) {
          alreadyUsed = true;
        }
      } catch (e) {}
    }

    if (isRealSupabase && userId) {
      try {
        const { data, error } = await supabase.from('profiles').select('promo_coupon').eq('id', userId).maybeSingle();
        if (!error && data && data.promo_coupon?.trim().toUpperCase() === code.trim().toUpperCase()) {
          alreadyUsed = true;
        }
      } catch (e) {
        console.warn("[MockService] Erro ao verificar reuso de cupom no Supabase:", e);
      }
    }

    if (alreadyUsed) {
      return { success: false, message: "Este cupom já foi utilizado nesta conta." };
    }

    return { success: true, message: "Cupom aplicado com sucesso!", coupon };
  },

  incrementCouponUses: async (code: string): Promise<void> => {
    let coupons = await MockService.getCoupons();
    const coupon = coupons.find(c => c.code.toUpperCase() === code.toUpperCase());
    if (coupon) {
      coupon.usedCount += 1;
      await MockService.saveCoupon(coupon);
    }
  },

  checkAllUsersPromoExpiration: async (): Promise<number> => {
    console.log("[MockService] Iniciando varredura diária de expiração de testes de 7 dias...");
    let degradedCount = 0;
    const nowISO = new Date().toISOString();

    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith('atalaia_local_profile_')) {
        try {
          const cachedUser = JSON.parse(localStorage.getItem(key) || '');
          if (cachedUser && cachedUser.promoActive && cachedUser.promoEnd && new Date(cachedUser.promoEnd) < new Date()) {
            console.log(`[MockService Local] Expirando promoção de: ${cachedUser.email}. Novo plano: FREE`);
            cachedUser.plan = 'FREE';
            cachedUser.promoActive = false;
            cachedUser.promoStart = undefined;
            cachedUser.promoEnd = undefined;
            localStorage.setItem(key, JSON.stringify(cachedUser));
            degradedCount++;
          }
        } catch (e) {}
      }
    }

    if (isRealSupabase) {
      try {
        const { data: expiredProfiles, error } = await supabase
          .from('profiles')
          .select('id, email, name')
          .eq('promo_active', true)
          .lt('promo_end', nowISO);

        if (!error && expiredProfiles && expiredProfiles.length > 0) {
          for (const profile of expiredProfiles) {
            const { error: updateError } = await supabase
              .from('profiles')
              .update({
                plan: 'PREMIUM',
                promo_active: false,
                promo_start: null,
                promo_end: null
              })
              .eq('id', profile.id);

            if (!updateError) {
              console.log(`[MockService Cloud] Cupom expirado com sucesso para ${profile.email}`);
              const cachedStr = localStorage.getItem(`atalaia_local_profile_${profile.id}`);
              if (cachedStr) {
                try {
                  const parsed = JSON.parse(cachedStr);
                  parsed.plan = 'FREE';
                  parsed.promoActive = false;
                  parsed.promoStart = undefined;
                  parsed.promoEnd = undefined;
                  localStorage.setItem(`atalaia_local_profile_${profile.id}`, JSON.stringify(parsed));
                } catch (e) {}
              }
              degradedCount++;
            }
          }
        }
      } catch (e) {
        console.warn("[MockService] Falha ao processar expirações automáticas no banco:", e);
      }
    }

    return degradedCount;
  },

  // --- REAL-TIME HELPER ---
  manualConfirmPromoTrialPayment: async (userId: string, receiptName?: string, receiptBase64?: string): Promise<{ success: boolean; message: string }> => {
    try {
      const safeId = sanitizeUUID(userId);
      if (!safeId) return { success: false, message: "ID do usuário inválido para operação." };
      
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + 7);
      const refMonth = `${(startDate.getMonth() + 1).toString().padStart(2, '0')}/${startDate.getFullYear()}`;

      // 1. Atualizar banco Supabase
      if (isRealSupabase) {
        const { error: profileErr } = await supabase.from('profiles').update({
          plan: 'FAMILY',
          promo_active: true,
          promo_start: startDate.toISOString(),
          promo_end: endDate.toISOString(),
          promo_coupon: 'TESTE7DIAS5REAIS'
        }).eq('id', safeId);
        
        if (profileErr) throw profileErr;

        // Inserir registro de pagamento para não acusar inadimplência e aparecer em relatórios
        const paymentPayload = {
          user_id: safeId,
          amount: 5.00,
          due_date: startDate.toISOString().split('T')[0],
          payment_date: startDate.toISOString(),
          status: 'PAID',
          reference_month: receiptName ? `${refMonth} (Anexo: ${receiptName})` : refMonth
        };

        try {
          const { data, error } = await supabase.from('payments').insert([{
            ...paymentPayload,
            receipt_name: receiptName || null,
            receipt_base64: receiptBase64 || null
          }]).select();

          let insertedId = "";
          if (!error && data && data[0]) {
            insertedId = data[0].id;
          } else {
            const { data: fallbackData } = await supabase.from('payments').insert([paymentPayload]).select();
            if (fallbackData && fallbackData[0]) {
              insertedId = fallbackData[0].id;
            }
          }

          if (insertedId) {
            if (receiptBase64) {
              localStorage.setItem(`receipt_data_${insertedId}`, receiptBase64);
              await supabase.from('system_settings').upsert([{ key: `receipt_data_${insertedId}`, value: receiptBase64 }]);
            }
            if (receiptName) {
              localStorage.setItem(`receipt_name_${insertedId}`, receiptName);
              await supabase.from('system_settings').upsert([{ key: `receipt_name_${insertedId}`, value: receiptName }]);
            }
            await supabase.from('system_settings').upsert([{ key: `user_receipt_id_${safeId}`, value: insertedId }]);
          }
        } catch (err) {
          const { data: fallbackData } = await supabase.from('payments').insert([paymentPayload]).select();
          if (fallbackData && fallbackData[0]) {
            const insertedId = fallbackData[0].id;
            if (receiptBase64) {
              localStorage.setItem(`receipt_data_${insertedId}`, receiptBase64);
              await supabase.from('system_settings').upsert([{ key: `receipt_data_${insertedId}`, value: receiptBase64 }]);
            }
            if (receiptName) {
              localStorage.setItem(`receipt_name_${insertedId}`, receiptName);
              await supabase.from('system_settings').upsert([{ key: `receipt_name_${insertedId}`, value: receiptName }]);
            }
            await supabase.from('system_settings').upsert([{ key: `user_receipt_id_${safeId}`, value: insertedId }]);
          }
        }
      } else {
        // Modo local mock
        const mockPaymentId = `pay_${Date.now()}`;
        if (receiptBase64) localStorage.setItem(`receipt_data_${mockPaymentId}`, receiptBase64);
        if (receiptName) localStorage.setItem(`receipt_name_${mockPaymentId}`, receiptName);

        const localPaymentsStr = localStorage.getItem('atalaia_local_payments') || '[]';
        try {
          const localPayments = JSON.parse(localPaymentsStr);
          localPayments.push({
            id: mockPaymentId,
            user_id: safeId,
            amount: 5.00,
            due_date: startDate.toISOString().split('T')[0],
            payment_date: startDate.toISOString(),
            status: 'PAID',
            reference_month: receiptName ? `${refMonth} (Anexo: ${receiptName})` : refMonth
          });
          localStorage.setItem('atalaia_local_payments', JSON.stringify(localPayments));
        } catch(e) {}
      }

      // 2. Atualizar cache local do perfil
      let parsed: any = {};
      const cachedStr = localStorage.getItem(`atalaia_local_profile_${safeId}`);
      if (cachedStr) {
        try {
          parsed = JSON.parse(cachedStr);
        } catch (e) {}
      }
      parsed.plan = 'FAMILY';
      parsed.promoActive = true;
      parsed.promoStart = startDate.toISOString();
      parsed.promoEnd = endDate.toISOString();
      parsed.promoCoupon = 'TESTE7DIAS5REAIS';
      localStorage.setItem(`atalaia_local_profile_${safeId}`, JSON.stringify(parsed));

      // Desmarcar possível flag anterior de trial expirado
      localStorage.removeItem(`atalaia_trial_expired_${userId}`);

      // 3. Incrementar o Contador do Cupom
      await MockService.incrementCouponUses('TESTE7DIAS5REAIS');

      return { success: true, message: "Parabéns! O pagamento de R$ 5,00 foi confirmado e seu Plano Família de teste está ativo!" };
    } catch (e: any) {
      console.warn("[MockService] Notice ao ativar promoção manualmente:", e);
      return { success: false, message: e.message || "Erro técnico ao liberar plano." };
    }
  },

  // --- GRAVAÇÕES / PEDIDOS DE GRAVAÇÃO ---
  getRecordingRequests: async (userId?: string): Promise<RecordingRequest[]> => {
    if (typeof window === 'undefined') return [];
    try {
      const cached = localStorage.getItem('atalaia_recording_requests');
      let requests: RecordingRequest[] = cached ? JSON.parse(cached) : [];
      if (userId) {
        requests = requests.filter(r => r.userId === userId);
      }
      return requests;
    } catch (e) {
      console.warn("localStorage recording requests failed:", e);
      return [];
    }
  },

  createRecordingRequest: async (request: Omit<RecordingRequest, 'id' | 'createdAt' | 'status'>): Promise<RecordingRequest> => {
    if (typeof window === 'undefined') throw new Error("Window is undefined");
    const newRequest: RecordingRequest = {
      ...request,
      id: 'req-' + generateUUID(),
      createdAt: new Date().toISOString(),
      status: 'PENDING'
    };
    try {
      const cached = localStorage.getItem('atalaia_recording_requests');
      const requests: RecordingRequest[] = cached ? JSON.parse(cached) : [];
      requests.push(newRequest);
      localStorage.setItem('atalaia_recording_requests', JSON.stringify(requests));
      return newRequest;
    } catch (e) {
      console.warn("localStorage recording request create failed:", e);
      return newRequest;
    }
  },

  updateRecordingRequestStatus: async (requestId: string, status: RecordingRequest['status'], recordingUrl?: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    try {
      const cached = localStorage.getItem('atalaia_recording_requests');
      if (cached) {
        const requests: RecordingRequest[] = JSON.parse(cached);
        const index = requests.findIndex(r => r.id === requestId);
        if (index !== -1) {
          requests[index].status = status;
          if (recordingUrl) {
            requests[index].recordingUrl = recordingUrl;
          }
          localStorage.setItem('atalaia_recording_requests', JSON.stringify(requests));
          
          // Envia notificação simulada de WhatsApp se aplicável
          if (requests[index].notifyWhatsApp && requests[index].phone) {
            console.log(`[WhatsApp API] Notificação enviada para ${requests[index].phone}: Olá ${requests[index].userName}, o status do seu pedido de gravação da câmera ${requests[index].cameraName} mudou para ${status}!`);
          }
        }
      }
    } catch (e) {
      console.warn("localStorage recording request update failed:", e);
    }
  },

  uploadBOFile: async (requestId: string, fileName: string, fileUrl: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    try {
      const cached = localStorage.getItem('atalaia_recording_requests');
      if (cached) {
        const requests: RecordingRequest[] = JSON.parse(cached);
        const index = requests.findIndex(r => r.id === requestId);
        if (index !== -1) {
          requests[index].boFileName = fileName;
          requests[index].boFileUrl = fileUrl;
          requests[index].status = 'ANALYZING'; // Entra em análise após envio do BO
          localStorage.setItem('atalaia_recording_requests', JSON.stringify(requests));
        }
      }
    } catch (e) {
      console.warn("localStorage recording request BO upload failed:", e);
    }
  },

  subscribeToTable: (table: string, callback: () => void) => {
    return supabase
      .channel(`public:${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        callback();
      })
      .subscribe();
  }
};
