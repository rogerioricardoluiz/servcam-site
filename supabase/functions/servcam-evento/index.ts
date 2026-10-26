import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { servcam_id, camera, evento_id, tipo, objeto, confidence, foto_url } = body;

    if (!servcam_id || !camera || !objeto) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios ausentes (servcam_id, camera, objeto)." }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 1. Localiza a câmera e o cliente associado
    const { data: cameraData } = await supabase
      .from("cameras")
      .select("id, cliente_id, cooldown_segundos, limite_alertas_hora")
      .eq("servcam_id", servcam_id)
      .eq("nome", camera)
      .maybeSingle();

    const cameraId = cameraData?.id || null;
    const clienteId = cameraData?.cliente_id || null;
    const cooldownSec = cameraData?.cooldown_segundos || 90;

    // 2. Verifica se houve evento recente da mesma câmera e objeto para controle de repetição
    const cutoffTime = new Date(Date.now() - (cooldownSec * 1000)).toISOString();
    const { data: recentEvents } = await supabase
      .from("eventos_alerta")
      .select("id, created_at, status_envio")
      .eq("servcam_id", servcam_id)
      .eq("camera_nome", camera)
      .eq("objeto", objeto)
      .eq("status_envio", "enviado")
      .gte("created_at", cutoffTime)
      .limit(1);

    if (recentEvents && recentEvents.length > 0) {
      // Suprime por cooldown
      await supabase.from("eventos_alerta").insert({
        evento_id: evento_id || `evt_${Date.now()}`,
        servcam_id,
        camera_nome: camera,
        camera_id: cameraId,
        cliente_id: clienteId,
        tipo: tipo || "object_detected",
        objeto,
        confidence: confidence || 0,
        foto_url,
        status_envio: "suprimido_cooldown",
        motivo_supressao: `Cooldown ativo (${cooldownSec}s)`
      });

      return new Response(JSON.stringify({ 
        status: "suppressed", 
        reason: "cooldown_active" 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. Consulta Regras de Alerta ativas
    let ruleAllowed = true;
    if (clienteId) {
      const { data: rules } = await supabase
        .from("regras_alerta")
        .select("*")
        .eq("cliente_id", clienteId)
        .eq("ativo", true);

      if (rules && rules.length > 0) {
        ruleAllowed = rules.some((r: any) => {
          if (r.camera_id && r.camera_id !== cameraId) return false;
          if (r.objeto !== "qualquer" && r.objeto.toLowerCase() !== objeto.toLowerCase()) return false;
          const confVal = confidence > 1 ? confidence : confidence * 100;
          if (confVal < (r.confianca_minima || 70)) return false;
          return true;
        });
      }
    }

    if (!ruleAllowed) {
      await supabase.from("eventos_alerta").insert({
        evento_id: evento_id || `evt_${Date.now()}`,
        servcam_id,
        camera_nome: camera,
        camera_id: cameraId,
        cliente_id: clienteId,
        tipo: tipo || "object_detected",
        objeto,
        confidence: confidence || 0,
        foto_url,
        status_envio: "suprimido_regra",
        motivo_supressao: "Objeto ou confiança fora das regras configuradas"
      });

      return new Response(JSON.stringify({ 
        status: "suppressed", 
        reason: "rule_not_matched" 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 4. Consulta destinatários do cliente com WhatsApp ativo
    let targets: string[] = [];
    if (clienteId) {
      const { data: users } = await supabase
        .from("usuarios")
        .select("telefone_whatsapp")
        .eq("cliente_id", clienteId)
        .eq("status", "ativo")
        .eq("receber_alertas_whatsapp", true);

      if (users && users.length > 0) {
        targets = users.map((u: any) => u.telefone_whatsapp).filter(Boolean);
      }
    }

    // 5. Formata a mensagem padrão
    const hora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
    const confInt = Math.round(confidence > 1 ? confidence : confidence * 100);
    const objTraduzido = objeto.charAt(0).toUpperCase() + objeto.slice(1);

    const mensagemAlerta = 
      `🚨 *ALERTA SERVCAM*\n\n` +
      `📹 *Câmera:* ${camera}\n` +
      `🎯 *Detectado:* ${objTraduzido}\n` +
      `📊 *Confiança:* ${confInt}%\n` +
      `⏰ *Horário:* ${hora}\n\n` +
      `📸 *Imagem:*\n${foto_url || 'Registro disponível no gravador'}`;

    // 6. Registra o evento como pendente/processado
    const { data: insertedEvent } = await supabase
      .from("eventos_alerta")
      .insert({
        evento_id: evento_id || `evt_${Date.now()}`,
        servcam_id,
        camera_nome: camera,
        camera_id: cameraId,
        cliente_id: clienteId,
        tipo: tipo || "object_detected",
        objeto,
        confidence: confInt,
        foto_url,
        mensagem_alerta: mensagemAlerta,
        destinatarios: targets,
        status_envio: targets.length > 0 ? "enviado" : "pendente"
      })
      .select()
      .single();

    return new Response(JSON.stringify({
      success: true,
      event_id: insertedEvent?.id,
      destinatarios_notificados: targets.length,
      mensagem: mensagemAlerta
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
