-- ==============================================================================
-- SERVCAM: MIGRATION - ESTRUTURA DE TABELAS PARA GESTÃO DE ALERTAS WHATSAPP
-- ==============================================================================

-- 1. TABELA DE CLIENTES (Condomínios, Empresas, Residências)
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    documento VARCHAR(30), -- CPF ou CNPJ
    telefone_contato VARCHAR(30),
    email VARCHAR(255),
    status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'suspenso')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABELA DE USUÁRIOS / DESTINATÁRIOS
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    cargo_funcao VARCHAR(100) DEFAULT 'Morador / Responsável',
    telefone_whatsapp VARCHAR(30) NOT NULL, -- Formato: 5548999998888
    receber_alertas_whatsapp BOOLEAN DEFAULT TRUE,
    horario_inicio_alertas TIME DEFAULT '00:00:00',
    horario_fim_alertas TIME DEFAULT '23:59:59',
    dias_semana_alerta INT[] DEFAULT '{0,1,2,3,4,5,6}', -- 0=Domingo, 1=Segunda, etc.
    status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABELA DE CÂMERAS
CREATE TABLE IF NOT EXISTS public.cameras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    servcam_id VARCHAR(50) NOT NULL, -- Ex: "SERVCAM-001" (identificador do gravador local)
    nome VARCHAR(255) NOT NULL, -- Ex: "Entrada Principal", "Portão Veículos", "Perímetro Leste"
    rtsp_url TEXT,
    localizacao VARCHAR(255),
    tipo_ambiente VARCHAR(20) DEFAULT 'externo' CHECK (tipo_ambiente IN ('externo', 'interno', 'perimetro')),
    limite_alertas_hora INT DEFAULT 15, -- Limite máximo de disparos por hora para evitar flooding
    cooldown_segundos INT DEFAULT 90,   -- Intervalo mínimo entre alertas sucessivos do mesmo objeto nesta câmera
    status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'manutencao')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_camera_servcam UNIQUE(servcam_id, nome)
);

-- 4. TABELA DE REGRAS DE ALERTA
CREATE TABLE IF NOT EXISTS public.regras_alerta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    camera_id UUID REFERENCES public.cameras(id) ON DELETE CASCADE, -- NULL se for regra geral para todas as câmeras do cliente
    objeto VARCHAR(50) NOT NULL, -- 'pessoa', 'carro', 'moto', 'animal', 'movimento', 'qualquer'
    confianca_minima NUMERIC(5, 2) DEFAULT 75.00, -- Ex: 75.00%
    horario_inicio TIME DEFAULT '00:00:00',
    horario_fim TIME DEFAULT '23:59:59',
    dias_semana INT[] DEFAULT '{0,1,2,3,4,5,6}',
    notificar_whatsapp BOOLEAN DEFAULT TRUE,
    template_mensagem TEXT, -- Mensagem customizada se desejar
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABELA DE CONFIGURAÇÃO DE WHATSAPP (Whaticket, Evolution API, Z-API, Custom REST)
CREATE TABLE IF NOT EXISTS public.whatsapp_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE, -- NULL para provedor global da plataforma
    nome_instancia VARCHAR(100) NOT NULL DEFAULT 'Instância Padrão',
    provedor VARCHAR(30) NOT NULL DEFAULT 'evolution_api' CHECK (provedor IN ('whaticket', 'evolution_api', 'zapi', 'custom_rest')),
    api_url TEXT NOT NULL, -- Ex: https://api.evolution.servcam.com ou https://api.z-api.io
    api_token TEXT NOT NULL, -- Token ou API Key
    instancia_id VARCHAR(100), -- Session ID no Whaticket ou instanceName na Evolution API
    enviar_imagem BOOLEAN DEFAULT TRUE,
    tempo_cooldown_global_segundos INT DEFAULT 60,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TABELA DE HISTÓRICO DE EVENTOS E ALERTAS
CREATE TABLE IF NOT EXISTS public.eventos_alerta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evento_id VARCHAR(100) NOT NULL, -- ID do evento gerado no monitor.py
    servcam_id VARCHAR(50) NOT NULL,
    camera_nome VARCHAR(255) NOT NULL,
    camera_id UUID REFERENCES public.cameras(id) ON DELETE SET NULL,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    tipo VARCHAR(50) NOT NULL DEFAULT 'object_detected',
    objeto VARCHAR(50) NOT NULL,
    confidence NUMERIC(5, 2) NOT NULL,
    foto_url TEXT,
    mensagem_alerta TEXT,
    destinatarios JSONB DEFAULT '[]'::jsonb, -- Lista com números notificados
    status_envio VARCHAR(30) NOT NULL DEFAULT 'pendente' 
        CHECK (status_envio IN ('pendente', 'enviado', 'suprimido_cooldown', 'suprimido_regra', 'suprimido_limite', 'erro')),
    motivo_supressao TEXT,
    provedor_usado VARCHAR(30),
    resposta_api JSONB,
    tentativas INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ÍNDICES PARA ALTA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_cameras_servcam_nome ON public.cameras(servcam_id, nome);
CREATE INDEX IF NOT EXISTS idx_regras_alerta_lookup ON public.regras_alerta(cliente_id, camera_id, objeto, ativo);
CREATE INDEX IF NOT EXISTS idx_usuarios_cliente ON public.usuarios(cliente_id, status, receber_alertas_whatsapp);
CREATE INDEX IF NOT EXISTS idx_eventos_created_at ON public.eventos_alerta(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_eventos_camera_objeto ON public.eventos_alerta(servcam_id, camera_nome, objeto, created_at DESC);

-- SEED DE DEMONSTRAÇÃO / PADRÃO
INSERT INTO public.clientes (id, nome, documento, status) 
VALUES ('c1111111-1111-1111-1111-111111111111', 'Condomínio Solar das Palmeiras', '12.345.678/0001-90', 'ativo')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.cameras (cliente_id, servcam_id, nome, localizacao, tipo_ambiente, limite_alertas_hora, cooldown_segundos)
VALUES 
    ('c1111111-1111-1111-1111-111111111111', 'SERVCAM-001', 'Entrada Principal', 'Portaria Social', 'externo', 20, 60),
    ('c1111111-1111-1111-1111-111111111111', 'SERVCAM-001', 'Portão de Garagem', 'Acesso Veicular', 'externo', 25, 45),
    ('c1111111-1111-1111-1111-111111111111', 'SERVCAM-001', 'Perímetro Fundos', 'Muro dos Fundos', 'perimetro', 10, 120)
ON CONFLICT DO NOTHING;

INSERT INTO public.usuarios (cliente_id, nome, cargo_funcao, telefone_whatsapp, receber_alertas_whatsapp)
VALUES
    ('c1111111-1111-1111-1111-111111111111', 'Central de Monitoramento', 'Operador 24h', '5548988776655', TRUE),
    ('c1111111-1111-1111-1111-111111111111', 'Síndico Roberto', 'Gestão', '5548999887766', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO public.regras_alerta (cliente_id, camera_id, objeto, confianca_minima, notificar_whatsapp, ativo)
VALUES
    ('c1111111-1111-1111-1111-111111111111', NULL, 'pessoa', 70.00, TRUE, TRUE),
    ('c1111111-1111-1111-1111-111111111111', NULL, 'carro', 75.00, TRUE, TRUE),
    ('c1111111-1111-1111-1111-111111111111', NULL, 'moto', 75.00, TRUE, TRUE),
    ('c1111111-1111-1111-1111-111111111111', NULL, 'animal', 80.00, TRUE, TRUE)
ON CONFLICT DO NOTHING;
