import { supabase } from "@/lib/supabaseClient";

export interface PreferenceOptions {
  planId?: string;
  cameras?: number;
  retentionDays?: number;
  amount?: number;
  title?: string;
  description?: string;
  email: string;
  name: string;
  phone?: string;
  couponCode?: string;
  mpAccessToken?: string;
  metadata?: Record<string, any>;
}

export const PaymentService = {
  /**
   * Cria uma preferência de pagamento oficial no Mercado Pago Checkout Pro
   */
  createPreference: async (
    planOrOptions: string | PreferenceOptions,
    email?: string,
    name?: string,
    phone?: string,
    couponCode?: string,
    amount?: number,
    cameras?: number
  ): Promise<string> => {
    let opts: PreferenceOptions;
    if (typeof planOrOptions === 'object') {
      opts = planOrOptions;
    } else {
      opts = {
        planId: planOrOptions,
        email: email || '',
        name: name || '',
        phone: phone || '',
        couponCode,
        amount,
        cameras
      };
    }

    // Token salvo localmente no financeiro ou configurado
    const localMpToken = typeof window !== 'undefined' ? localStorage.getItem('atalaia_mp_token') : null;
    const effectiveToken = opts.mpAccessToken || localMpToken || undefined;

    try {
      // 1. Tentar chamada direta ao backend Express com a API oficial do Mercado Pago
      const res = await fetch('/api/mercadopago/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: opts.planId || 'CUSTOM',
          cameras: opts.cameras,
          retentionDays: opts.retentionDays || 3,
          amount: opts.amount,
          title: opts.title,
          description: opts.description,
          payer: {
            email: opts.email,
            name: opts.name,
            phone: opts.phone
          },
          couponCode: opts.couponCode,
          mpAccessToken: effectiveToken,
          metadata: opts.metadata
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json && json.init_point) {
          console.log("[PaymentService] Preferência Mercado Pago gerada com sucesso:", json.init_point);
          return json.init_point;
        }
      }
    } catch (apiErr) {
      console.warn("[PaymentService] Aviso rota backend /api/mercadopago, tentando fallback:", apiErr);
    }

    // 2. Chamada secundária via Supabase Edge Function se configurada
    try {
      const currentOrigin = window.location.origin + window.location.pathname;
      const cleanOrigin = currentOrigin.endsWith('/') ? currentOrigin.slice(0, -1) : currentOrigin;

      const { data, error } = await supabase.functions.invoke('create-preference', {
        body: {
          planId: opts.planId,
          cameras: opts.cameras,
          amount: opts.amount,
          payer: { email: opts.email, name: opts.name, phone: opts.phone },
          redirectUrl: cleanOrigin + (opts.couponCode ? `?coupon=${opts.couponCode}` : ''),
          couponCode: opts.couponCode
        }
      });

      if (!error && data?.init_point) {
        return data.init_point;
      }
    } catch (_) {}

    // 3. Fallback de redirecionamento para o Checkout Seguro do Atalaia / Sandbox do Mercado Pago
    const cleanOrigin = window.location.origin;
    const checkoutSandboxUrl = `${cleanOrigin}/#/payment-checkout?cameras=${opts.cameras || 1}&amount=${opts.amount || 24.90}&plan=${opts.planId || 'CUSTOM'}&coupon=${opts.couponCode || ''}`;
    console.warn("[PaymentService] Redirecionando para Checkout Sandbox Seguro:", checkoutSandboxUrl);
    return checkoutSandboxUrl;
  },

  /**
   * Cria uma preferência de doação customizada para o integrador do bairro via Mercado Pago
   */
  createDonationPreference: async (amount: number, email: string, name: string, mpAccessToken: string) => {
    try {
        const { data, error } = await supabase.functions.invoke('create-donation-preference', {
            body: { 
                amount, 
                payer: { email, name },
                mpAccessToken,
                metadata: {
                    source: 'donation-app',
                    timestamp: new Date().toISOString()
                }
            }
        });
        
        if (error) {
            console.error("[PaymentService] Error invoking donation function:", error);
            throw error;
        }

        if (data && data.init_point) {
            return data.init_point;
        }
        
        throw new Error("Resposta inválida do servidor de doações");
    } catch (error) {
        console.error("[PaymentService] Falha crítica ao criar preferência de doação:", error);
        
        // Fallback de desenvolvimento:
        const simulatedUrl = `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=simulated_donation_${amount}_${Date.now()}`;
        console.warn("[PaymentService] Redirecionando para doação simulada:", simulatedUrl);
        
        return simulatedUrl;
    }
  },

  /**
   * Verifica o status de um pagamento (opcional se usar webhooks)
   */
  checkPaymentStatus: async (paymentId: string) => {
      const { data, error } = await supabase
          .from('payments')
          .select('status')
          .eq('mercado_pago_id', paymentId)
          .maybeSingle();
      
      if (error) return 'error';
      return data?.status || 'not_found';
  }
};
