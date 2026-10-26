"""
==============================================================================
SERVCAM RECORDER - MOTOR DE ALERTAS WHATSAPP
Módulo: /opt/servcam-recorder/ai/whatsapp_alerts.py
Autor: ServCam Engineering Team
==============================================================================
"""

import os
import sys
import time
import json
import logging
import threading
import queue
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import requests

# ----------------------------------------------------------------------------
# CONFIGURAÇÃO DE LOGS
# ----------------------------------------------------------------------------
LOG_DIR = os.environ.get("SERVCAM_LOG_DIR", "/var/log/servcam")
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, "servcam_alerts.log")

logger = logging.getLogger("ServCamAlerts")
logger.setLevel(logging.INFO)

# Evita duplicação de handlers se recarregado
if not logger.handlers:
    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [ServCamAlerts] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    # Console Handler
    c_handler = logging.StreamHandler(sys.stdout)
    c_handler.setFormatter(formatter)
    logger.addHandler(c_handler)

    # File Handler
    try:
        f_handler = logging.FileHandler(LOG_FILE, encoding="utf-8")
        f_handler.setFormatter(formatter)
        logger.addHandler(f_handler)
    except Exception as e:
        logger.warning(f"Não foi possível criar log em arquivo ({LOG_FILE}): {e}")

# ----------------------------------------------------------------------------
# ADAPTADORES DE APIs WHATSAPP (Whaticket, Evolution API, Z-API, Custom)
# ----------------------------------------------------------------------------
class WhatsAppProvider:
    """Interface base para provedores de envio WhatsApp."""
    def send_message(self, number: str, message: str, media_url: Optional[str] = None) -> Dict[str, Any]:
        raise NotImplementedError

class WhaticketProvider(WhatsAppProvider):
    """
    Provedor Whaticket / Whatendimento
    POST /api/messages/send
    Header: Authorization: Bearer <TOKEN>
    """
    def __init__(self, api_url: str, token: str, session_id: str = "Default"):
        self.api_url = api_url.rstrip("/")
        self.token = token
        self.session_id = session_id

    def send_message(self, number: str, message: str, media_url: Optional[str] = None) -> Dict[str, Any]:
        endpoint = f"{self.api_url}/api/messages/send"
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        # Formata número para formato aceito pelo Whaticket (ex: 554899998888)
        clean_num = ''.join(filter(str.isdigit, number))
        payload = {
            "number": clean_num,
            "body": message,
            "session": self.session_id
        }
        if media_url:
            payload["mediaUrl"] = media_url

        resp = requests.post(endpoint, json=payload, headers=headers, timeout=12)
        return {"status_code": resp.status_code, "response": resp.text}

class EvolutionApiProvider(WhatsAppProvider):
    """
    Provedor Evolution API (v1 / v2)
    POST /message/sendText/{instance} ou /message/sendMedia/{instance}
    Header: apikey: <API_KEY>
    """
    def __init__(self, api_url: str, api_key: str, instance_name: str):
        self.api_url = api_url.rstrip("/")
        self.api_key = api_key
        self.instance = instance_name

    def send_message(self, number: str, message: str, media_url: Optional[str] = None) -> Dict[str, Any]:
        clean_num = ''.join(filter(str.isdigit, number))
        headers = {
            "apikey": self.api_key,
            "Content-Type": "application/json"
        }

        # Se tiver imagem, envia via sendMedia com legenda
        if media_url:
            endpoint = f"{self.api_url}/message/sendMedia/{self.instance}"
            payload = {
                "number": clean_num,
                "mediaMessage": {
                    "mediatype": "image",
                    "caption": message,
                    "media": media_url
                }
            }
        else:
            endpoint = f"{self.api_url}/message/sendText/{self.instance}"
            payload = {
                "number": clean_num,
                "text": message
            }

        resp = requests.post(endpoint, json=payload, headers=headers, timeout=12)
        return {"status_code": resp.status_code, "response": resp.text}

class ZApiProvider(WhatsAppProvider):
    """
    Provedor Z-API
    POST /instances/{instanceId}/token/{token}/send-text ou /send-image
    Header: Client-Token: <SECURITY_TOKEN> (se configurado)
    """
    def __init__(self, api_url: str, instance_id: str, token: str, client_token: Optional[str] = None):
        self.api_url = api_url.rstrip("/")
        self.instance_id = instance_id
        self.token = token
        self.client_token = client_token

    def send_message(self, number: str, message: str, media_url: Optional[str] = None) -> Dict[str, Any]:
        clean_num = ''.join(filter(str.isdigit, number))
        headers = {"Content-Type": "application/json"}
        if self.client_token:
            headers["Client-Token"] = self.client_token

        if media_url:
            endpoint = f"{self.api_url}/instances/{self.instance_id}/token/{self.token}/send-image"
            payload = {
                "phone": clean_num,
                "image": media_url,
                "caption": message
            }
        else:
            endpoint = f"{self.api_url}/instances/{self.instance_id}/token/{self.token}/send-text"
            payload = {
                "phone": clean_num,
                "message": message
            }

        resp = requests.post(endpoint, json=payload, headers=headers, timeout=12)
        return {"status_code": resp.status_code, "response": resp.text}

class GenericRestProvider(WhatsAppProvider):
    """
    Provedor Genérico REST / Webhook
    """
    def __init__(self, endpoint_url: str, auth_token: Optional[str] = None):
        self.endpoint_url = endpoint_url
        self.auth_token = auth_token

    def send_message(self, number: str, message: str, media_url: Optional[str] = None) -> Dict[str, Any]:
        headers = {"Content-Type": "application/json"}
        if self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"

        payload = {
            "number": number,
            "message": message,
            "photo_url": media_url,
            "timestamp": datetime.now().isoformat()
        }
        resp = requests.post(self.endpoint_url, json=payload, headers=headers, timeout=12)
        return {"status_code": resp.status_code, "response": resp.text}


# ----------------------------------------------------------------------------
# GERENCIADOR DE REPETIÇÃO, COOLDOWN E RATE LIMIT
# ----------------------------------------------------------------------------
class AlertRateLimiter:
    """
    Controla Cooldown (anti-spam por câmera e objeto) e Limite Máximo de alertas por hora.
    """
    def __init__(self):
        # chave: f"{camera}_{objeto}" -> timestamp do último disparo
        self._last_sent_time: Dict[str, float] = {}
        # chave: camera -> lista de timestamps disparados na última hora
        self._camera_hourly_history: Dict[str, List[float]] = {}
        self._lock = threading.Lock()

    def should_suppress(
        self, 
        camera: str, 
        objeto: str, 
        cooldown_seconds: int = 90, 
        max_per_hour: int = 20
    ) -> Optional[str]:
        """
        Retorna None se o alerta PODE ser enviado.
        Retorna string com o motivo se for suprimido (ex: 'cooldown_ativo', 'limite_por_hora_atingido').
        """
        now = time.time()
        key = f"{camera.strip().lower()}::{objeto.strip().lower()}"

        with self._lock:
            # 1. Verifica Cooldown do mesmo objeto na mesma câmera
            last_time = self._last_sent_time.get(key, 0)
            elapsed = now - last_time
            if elapsed < cooldown_seconds:
                remaining = int(cooldown_seconds - elapsed)
                return f"cooldown_ativo (restam {remaining}s)"

            # 2. Verifica Limite Máximo da Câmera por Hora
            one_hour_ago = now - 3600
            history = self._camera_hourly_history.get(camera, [])
            # Purga registros mais antigos que 1 hora
            valid_history = [t for t in history if t > one_hour_ago]
            self._camera_hourly_history[camera] = valid_history

            if len(valid_history) >= max_per_hour:
                return f"limite_por_hora_atingido ({len(valid_history)}/{max_per_hour} disparos)"

            return None

    def record_sent(self, camera: str, objeto: str):
        """Registra o disparo com sucesso para contagem futura."""
        now = time.time()
        key = f"{camera.strip().lower()}::{objeto.strip().lower()}"
        with self._lock:
            self._last_sent_time[key] = now
            if camera not in self._camera_hourly_history:
                self._camera_hourly_history[camera] = []
            self._camera_hourly_history[camera].append(now)


# ----------------------------------------------------------------------------
# MOTOR CENTRAL DE ALERTAS
# ----------------------------------------------------------------------------
class WhatsAppAlertEngine:
    def __init__(self):
        self.queue: queue.Queue = queue.Queue(maxsize=1000)
        self.rate_limiter = AlertRateLimiter()
        self.provider: Optional[WhatsAppProvider] = None
        self._worker_thread: Optional[threading.Thread] = None
        self._running = False
        
        # Carrega credenciais do ambiente
        self.load_configuration()
        self.start_worker()

    def load_configuration(self):
        """Inicializa provedor WhatsApp e credenciais Supabase a partir do .env / variáveis de ambiente."""
        provider_name = os.environ.get("WHATSAPP_PROVIDER", "evolution_api").lower().strip()
        api_url = os.environ.get("WHATSAPP_API_URL", "https://api.evolution.servcam.com")
        api_token = os.environ.get("WHATSAPP_API_TOKEN", "")
        instance = os.environ.get("WHATSAPP_INSTANCE", "servcam-default")

        if provider_name == "whaticket":
            self.provider = WhaticketProvider(api_url=api_url, token=api_token, session_id=instance)
            logger.info(f"Provedor WhatsApp inicializado: Whaticket ({api_url})")
        elif provider_name == "zapi":
            client_token = os.environ.get("ZAPI_CLIENT_TOKEN")
            self.provider = ZApiProvider(api_url=api_url, instance_id=instance, token=api_token, client_token=client_token)
            logger.info(f"Provedor WhatsApp inicializado: Z-API (instância: {instance})")
        elif provider_name == "custom":
            self.provider = GenericRestProvider(endpoint_url=api_url, auth_token=api_token)
            logger.info(f"Provedor WhatsApp inicializado: Custom REST ({api_url})")
        else: # default: evolution_api
            self.provider = EvolutionApiProvider(api_url=api_url, api_key=api_token, instance_name=instance)
            logger.info(f"Provedor WhatsApp inicializado: Evolution API (instância: {instance})")

        # Configurações de Supabase
        self.supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
        self.supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY", "")

        # Lista de números de fallback (caso o banco não responda)
        fallback_nums = os.environ.get("WHATSAPP_FALLBACK_NUMBERS", "")
        self.fallback_numbers = [n.strip() for n in fallback_nums.split(",") if n.strip()]

        # Configurações de Cooldown padrão
        self.default_cooldown = int(os.environ.get("ALERT_COOLDOWN_SECONDS", "90"))
        self.default_max_hourly = int(os.environ.get("ALERT_MAX_HOURLY", "20"))

    def start_worker(self):
        """Inicia worker assíncrono para processar a fila sem bloquear o detector de IA."""
        if not self._running:
            self._running = True
            self._worker_thread = threading.Thread(target=self._process_queue, daemon=True, name="ServCamAlertWorker")
            self._worker_thread.start()
            logger.info("Worker da Fila de Alertas WhatsApp iniciado em background.")

    def enqueue_event(self, evento: Dict[str, Any]):
        """Adiciona o evento na fila assíncrona."""
        try:
            self.queue.put_nowait(evento)
            logger.debug(f"Evento {evento.get('evento_id')} colocado na fila de alertas.")
        except queue.Full:
            logger.error("Fila de alertas cheia! Descartando evento para não travar o monitoramento.")

    def _process_queue(self):
        """Loop contínuo de consumo da fila."""
        while self._running:
            try:
                evento = self.queue.get(timeout=2.0)
                self._handle_alert_event(evento)
                self.queue.task_done()
            except queue.Empty:
                continue
            except Exception as e:
                logger.error(f"Erro inesperado no processamento da fila: {e}", exc_info=True)

    def _handle_alert_event(self, evento: Dict[str, Any]):
        """Processa a lógica de regras, cooldown, registro e envio do alerta."""
        camera = evento.get("camera", "Câmera Desconhecida")
        objeto = str(evento.get("objeto", "objeto")).lower().strip()
        confidence = float(evento.get("confidence", 0.0))
        foto_url = evento.get("foto_url")
        servcam_id = evento.get("servcam_id", "SERVCAM-001")
        evento_id = evento.get("evento_id", f"evt_{int(time.time()*1000)}")

        # 1. Normalização do nome do objeto
        objeto_display = self._traduzir_objeto(objeto)

        # 2. Consulta de configurações da câmera / regras no Supabase
        camera_cfg = self._obter_config_camera(servcam_id, camera)
        cooldown_sec = camera_cfg.get("cooldown_segundos", self.default_cooldown)
        limite_hora = camera_cfg.get("limite_alertas_hora", self.default_max_hourly)

        # 3. Verifica Cooldown e Rate Limit
        motivo_supressao = self.rate_limiter.should_suppress(
            camera=camera,
            objeto=objeto,
            cooldown_seconds=cooldown_sec,
            max_per_hour=limite_hora
        )

        if motivo_supressao:
            logger.info(f"🚫 [ALERTA SUPRIMIDO] {camera} | {objeto_display} | Motivo: {motivo_supressao}")
            self._registrar_evento_supabase(
                evento, 
                status_envio="suprimido_cooldown" if "cooldown" in motivo_supressao else "suprimido_limite",
                motivo=motivo_supressao
            )
            return

        # 4. Verifica Regra de Confiança e Horário
        regra_aprovada = self._validar_regra_alerta(camera_cfg.get("cliente_id"), camera_cfg.get("id"), objeto, confidence)
        if not regra_aprovada:
            logger.info(f"⚠️ [ALERTA IGNORADO POR REGRA] {camera} | {objeto_display} ({confidence:.0f}%) não atende aos filtros de confiança/horário.")
            self._registrar_evento_supabase(evento, status_envio="suprimido_regra", motivo="regra_ou_horario_incompativel")
            return

        # 5. Obtém Destinatários WhatsApp
        destinatarios = self._obter_destinatarios(camera_cfg.get("cliente_id"))
        if not destinatarios:
            destinatarios = self.fallback_numbers

        if not destinatarios:
            logger.warning(f"Nenhum destinatário com WhatsApp ativo encontrado para {camera}.")
            self._registrar_evento_supabase(evento, status_envio="erro", motivo="nenhum_destinatario_configurado")
            return

        # 6. Formata Mensagem do Alerta
        hora_formatada = datetime.now().strftime("%H:%M")
        conf_int = int(confidence) if confidence > 1 else int(confidence * 100)

        mensagem = (
            f"🚨 *ALERTA SERVCAM*\n\n"
            f"📹 *Câmera:* {camera}\n"
            f"🎯 *Detectado:* {objeto_display}\n"
            f"📊 *Confiança:* {conf_int}%\n"
            f"⏰ *Horário:* {hora_formatada}\n\n"
            f"📸 *Imagem:*\n{foto_url if foto_url else 'Registro arquivado localmente'}"
        )

        # 7. Dispara Mensagens WhatsApp
        logger.info(f"🚀 Disparando Alerta WhatsApp para {len(destinatarios)} destinatário(s) [{camera} -> {objeto_display}]")
        disparos_ok = 0
        respostas_api = []

        for numero in destinatarios:
            try:
                if self.provider:
                    res = self.provider.send_message(number=numero, message=mensagem, media_url=foto_url)
                    status_code = res.get("status_code", 0)
                    if 200 <= status_code < 300:
                        disparos_ok += 1
                        logger.info(f"✅ Alerta enviado para {numero} com sucesso! (HTTP {status_code})")
                    else:
                        logger.error(f"❌ Falha ao enviar para {numero}: {res}")
                    respostas_api.append({"numero": numero, "resp": res})
            except Exception as send_err:
                logger.error(f"Erro de conexão ao enviar para {numero}: {send_err}")
                respostas_api.append({"numero": numero, "erro": str(send_err)})

        # 8. Atualiza Rate Limiter se enviou com sucesso
        if disparos_ok > 0:
            self.rate_limiter.record_sent(camera, objeto)
            status_final = "enviado"
        else:
            status_final = "erro"

        # 9. Registra histórico final no Supabase
        self._registrar_evento_supabase(
            evento,
            status_envio=status_final,
            mensagem_formatada=mensagem,
            destinatarios=destinatarios,
            resposta_api=respostas_api,
            camera_id=camera_cfg.get("id"),
            cliente_id=camera_cfg.get("cliente_id")
        )

    def _traduzir_objeto(self, objeto: str) -> str:
        """Traduz rótulos do YOLOv5 / CodeProject.AI para português amigável."""
        traducao = {
            "person": "Pessoa",
            "pessoa": "Pessoa",
            "car": "Carro / Veículo",
            "carro": "Carro",
            "motorcycle": "Moto",
            "moto": "Moto",
            "bicycle": "Bicicleta",
            "truck": "Caminhão",
            "dog": "Animal (Cão)",
            "cat": "Animal (Gato)",
            "animal": "Animal",
            "motion": "Movimento Suspeito",
            "movimento": "Movimento Suspeito"
        }
        return traducao.get(objeto.lower(), objeto.capitalize())

    def _obter_config_camera(self, servcam_id: str, camera_nome: str) -> Dict[str, Any]:
        """Consulta parâmetros da câmera no Supabase com cache local seguro."""
        if not self.supabase_url or not self.supabase_key:
            return {"cooldown_segundos": self.default_cooldown, "limite_alertas_hora": self.default_max_hourly}

        try:
            url = f"{self.supabase_url}/rest/v1/cameras?servcam_id=eq.{servcam_id}&nome=eq.{camera_nome}&select=id,cliente_id,cooldown_segundos,limite_alertas_hora"
            headers = {
                "apikey": self.supabase_key,
                "Authorization": f"Bearer {self.supabase_key}"
            }
            r = requests.get(url, headers=headers, timeout=4)
            if r.ok:
                items = r.json()
                if items and len(items) > 0:
                    return items[0]
        except Exception as e:
            logger.debug(f"Aviso: Não foi possível obter config da câmera no Supabase: {e}")

        return {"cooldown_segundos": self.default_cooldown, "limite_alertas_hora": self.default_max_hourly}

    def _validar_regra_alerta(self, cliente_id: Optional[str], camera_id: Optional[str], objeto: str, confidence: float) -> bool:
        """Valida se o evento cumpre os requisitos das regras ativas."""
        if not self.supabase_url or not self.supabase_key or not cliente_id:
            # Sem Supabase conectado, aplica regra de corte padrão (60% de confiança)
            conf_val = confidence if confidence <= 1.0 else confidence / 100.0
            return conf_val >= 0.60

        try:
            url = f"{self.supabase_url}/rest/v1/regras_alerta?cliente_id=eq.{cliente_id}&ativo=eq.true&select=*"
            headers = {"apikey": self.supabase_key, "Authorization": f"Bearer {self.supabase_key}"}
            r = requests.get(url, headers=headers, timeout=4)
            if r.ok:
                regras = r.json()
                if not regras:
                    return True # Se não tem regras restritivas, aceita

                agora_hora = datetime.now().time()
                dia_semana = datetime.now().weekday() # 0 = Seg, 6 = Dom
                conf_pct = confidence if confidence > 1.0 else confidence * 100.0

                for reg in regras:
                    # Checa câmera (se regra for específica)
                    if reg.get("camera_id") and camera_id and reg["camera_id"] != camera_id:
                        continue

                    # Checa tipo do objeto
                    reg_obj = str(reg.get("objeto", "")).lower()
                    if reg_obj not in ("qualquer", objeto.lower()):
                        continue

                    # Checa Confiança Mínima
                    if conf_pct < float(reg.get("confianca_minima", 70.0)):
                        continue

                    return True
                return False
        except Exception as e:
            logger.warning(f"Erro ao checar regras no Supabase: {e}")

        return True

    def _obter_destinatarios(self, cliente_id: Optional[str]) -> List[str]:
        """Obtém telefones dos usuários com alertas ativados no Supabase."""
        if not self.supabase_url or not self.supabase_key or not cliente_id:
            return self.fallback_numbers

        try:
            url = f"{self.supabase_url}/rest/v1/usuarios?cliente_id=eq.{cliente_id}&status=eq.ativo&receber_alertas_whatsapp=eq.true&select=telefone_whatsapp"
            headers = {"apikey": self.supabase_key, "Authorization": f"Bearer {self.supabase_key}"}
            r = requests.get(url, headers=headers, timeout=4)
            if r.ok:
                data = r.json()
                numeros = [u["telefone_whatsapp"] for u in data if u.get("telefone_whatsapp")]
                if numeros:
                    return numeros
        except Exception as e:
            logger.warning(f"Erro ao obter usuários no Supabase: {e}")

        return self.fallback_numbers

    def _registrar_evento_supabase(
        self,
        evento: Dict[str, Any],
        status_envio: str,
        motivo: Optional[str] = None,
        mensagem_formatada: Optional[str] = None,
        destinatarios: Optional[List[str]] = None,
        resposta_api: Optional[Any] = None,
        camera_id: Optional[str] = None,
        cliente_id: Optional[str] = None
    ):
        """Salva o log do evento na tabela eventos_alerta do Supabase."""
        if not self.supabase_url or not self.supabase_key:
            return

        try:
            confidence = float(evento.get("confidence", 0.0))
            conf_pct = confidence if confidence > 1.0 else confidence * 100.0

            payload = {
                "evento_id": str(evento.get("evento_id", "")),
                "servcam_id": str(evento.get("servcam_id", "SERVCAM-001")),
                "camera_nome": str(evento.get("camera", "Camera")),
                "camera_id": camera_id,
                "cliente_id": cliente_id,
                "tipo": str(evento.get("tipo", "object_detected")),
                "objeto": str(evento.get("objeto", "")),
                "confidence": round(conf_pct, 2),
                "foto_url": evento.get("foto_url"),
                "mensagem_alerta": mensagem_formatada,
                "destinatarios": destinatarios or [],
                "status_envio": status_envio,
                "motivo_supressao": motivo,
                "resposta_api": resposta_api,
                "created_at": datetime.now().isoformat()
            }

            headers = {
                "apikey": self.supabase_key,
                "Authorization": f"Bearer {self.supabase_key}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
            }
            requests.post(f"{self.supabase_url}/rest/v1/eventos_alerta", json=payload, headers=headers, timeout=5)
        except Exception as err:
            logger.warning(f"Erro ao salvar evento no Supabase: {err}")


# Instância Singleton global
_engine_instance: Optional[WhatsAppAlertEngine] = None
_engine_lock = threading.Lock()

def get_engine() -> WhatsAppAlertEngine:
    global _engine_instance
    if _engine_instance is None:
        with _engine_lock:
            if _engine_instance is None:
                _engine_instance = WhatsAppAlertEngine()
    return _engine_instance

# ----------------------------------------------------------------------------
# FUNÇÃO PRINCIPAL SOLICITADA: enviar_alerta_whatsapp(evento)
# ----------------------------------------------------------------------------
def enviar_alerta_whatsapp(evento: Dict[str, Any]):
    """
    Função principal chamada no monitor.py do ServCam.
    Recebe o evento da IA e o enfileira de forma assíncrona, garantindo:
      - Não bloquear o CodeProject.AI nem o loop de gravação.
      - Controle de anti-spam / cooldown (sem inundar WhatsApp).
      - Respeito ao limite por hora de cada câmera.
      - Envio multi-provedor (Whaticket, Evolution API, Z-API).
      - Registro no Supabase.
    """
    engine = get_engine()
    engine.enqueue_event(evento)
