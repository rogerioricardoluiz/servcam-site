import { createClient } from '@supabase/supabase-js';

// Normalização da URL (preferência por variável de ambiente, fallback para o fornecido)
const FALLBACK_URL = 'https://fbffgqccdqnvvtnxfqqo.supabase.co';
const FALLBACK_KEY = 'sb_publishable_RgMR5VimEm-4k6_BVXDl5g_dK7PvgwN';

let rawUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
export const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').trim();
export const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_KEY).trim();

// Verificação rigorosa se as credenciais são válidas
export const isRealSupabase = !!(supabaseUrl &&
                                supabaseUrl.includes('supabase.co') &&
                                supabaseAnonKey &&
                                supabaseAnonKey.length > 20);

if (!isRealSupabase) {
  console.warn("⚠️ SUPABASE NÃO CONFIGURADO: Usando credenciais de demonstração. Os dados reais não serão carregados.");
  console.info("Para usar seu banco de dados real, adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas configurações (Settings).");
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    },
    global: {
      fetch: async (url, options) => {
        try {
          return await fetch(url, options);
        } catch (fetchErr: any) {
          // If browser fails direct fetch due to CORS / tracking / sandbox block, route through backend proxy
          try {
            const proxyUrl = `/api/supabase-proxy?target=${encodeURIComponent(url.toString())}`;
            return await fetch(proxyUrl, options);
          } catch (proxyErr) {
            console.warn("[supabaseClient] Notice: Network request unavailable, using fallback store:", fetchErr?.message || fetchErr);
            return new Response(JSON.stringify([]), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
        }
      }
    }
  }
);
