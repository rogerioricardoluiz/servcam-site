"""
==============================================================================
EXEMPLO DE INTEGRAÇÃO NO /opt/servcam-recorder/ai/monitor.py
==============================================================================
Mostra como plugar a função enviar_alerta_whatsapp(evento) mantendo
100% de compatibilidade com o enviar_evento_saas(evento) existente.
"""

import sys
import os

# Adiciona o diretório ao PATH caso o monitor.py esteja no mesmo nível
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Importa o motor de alertas WhatsApp ServCam
try:
    from whatsapp_alerts import enviar_alerta_whatsapp
except ImportError:
    # Fallback se executado de outro diretório
    from servcam_recorder.ai.whatsapp_alerts import enviar_alerta_whatsapp

import requests
import logging

logger = logging.getLogger("ServCamMonitor")

def enviar_evento_saas(evento: dict):
    """
    Função original existente no seu monitor.py
    Envia o evento para a Edge Function do Supabase.
    """
    url = os.environ.get("SUPABASE_EDGE_FUNCTION_URL", "https://seu-projeto.supabase.co/functions/v1/servcam-evento")
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {os.environ.get('SUPABASE_ANON_KEY', '')}"
    }
    try:
        res = requests.post(url, json=evento, headers=headers, timeout=5)
        logger.info(f"Evento SaaS enviado com status: {res.status_code}")
    except Exception as e:
        logger.error(f"Erro ao enviar evento para o SaaS Supabase: {e}")

def processar_deteccao_codeproject_ai(nome_camera: str, id_evento: str, objeto_detectado: str, confianca: float, foto: str):
    """
    Simulação do ponto do código onde o CodeProject.AI Server 2.9.5 com YOLOv5
    identifica um objeto e cria o evento.
    """
    # 1. Estrutura do evento idêntica à do seu monitor.py
    evento = {
        "servcam_id": os.environ.get("SERVCAM_ID", "SERVCAM-001"),
        "camera": nome_camera,
        "evento_id": id_evento,
        "tipo": "object_detected",
        "objeto": objeto_detectado,
        "confidence": confianca,
        "foto_url": foto
    }

    # 2. Envia para o SaaS Supabase (mantém fluxo atual)
    enviar_evento_saas(evento)

    # 3. NOVO: Dispara a camada inteligente de Alertas WhatsApp com fila e cooldown
    # Filtra os objetos de interesse solicitados:
    objetos_alerta = ["pessoa", "person", "carro", "car", "moto", "motorcycle", "animal", "dog", "cat", "movimento", "motion"]
    
    if objeto_detectado.lower() in objetos_alerta or "suspeito" in objeto_detectado.lower():
        enviar_alerta_whatsapp(evento)


# --- TESTE LOCAL / DEMONSTRAÇÃO ---
if __name__ == "__main__":
    print("Iniciando teste de envio de alerta...")
    
    evento_teste = {
        "servcam_id": "SERVCAM-001",
        "camera": "Entrada Principal",
        "evento_id": "evt_test_12345",
        "tipo": "object_detected",
        "objeto": "pessoa",
        "confidence": 92.5,
        "foto_url": "https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=600&auto=format&fit=crop"
    }

    # Chamada direta:
    enviar_alerta_whatsapp(evento_teste)
    
    # Aguarda 3 segundos para observar o processamento assíncrono do worker
    import time
    time.sleep(3)
    print("Teste finalizado!")
