import React, { useState, useEffect, useCallback, useRef } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '@/auth/context';
import { UserRole, Neighborhood, WhatsAppAutomation, WhatsAppDispatchLog } from '../types';
import { MockService, DEFAULT_WHATSAPP_AUTOMATIONS } from '../services/mockService';
import { supabase } from '../lib/supabaseClient';
import { Card, Button, Input, Badge } from '../components/UI';
import { 
    MessageSquare, Send, Users, Wifi, Loader2, Save, 
    Plus, XCircle, Search, Trash2, Smartphone,
    Shield, MapPin, CheckCircle, Sparkles, HelpCircle, Info, RefreshCw, AlertTriangle, 
    Database, Edit2, Eye, EyeOff, Key, Globe, Zap, History, Lock, Bell, UserPlus, 
    CheckCircle2, Siren, Headphones, FileCheck, Play, RotateCcw, Copy, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type TabType = 'broadcast' | 'automations' | 'logs' | 'templates' | 'config';

const WhatsAppAdmin: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('automations');
    const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    
    // API Configuration State
    const [endpointUrl, setEndpointUrl] = useState('https://whatsapp.alienmonitoramento.com.br:443/backend/api/messages/send');
    const [apiToken, setApiToken] = useState('');
    const [sessionId, setSessionId] = useState('Default');
    const [showToken, setShowToken] = useState(false);
    const [savingConfig, setSavingConfig] = useState(false);
    const [configStatus, setConfigStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

    // Diagnostics / Test sending
    const [testPhone, setTestPhone] = useState('5548998456070');
    const [testingConnection, setTestingConnection] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);

    // Automations State
    const [automations, setAutomations] = useState<Record<string, WhatsAppAutomation>>(DEFAULT_WHATSAPP_AUTOMATIONS);
    const [savingAutomationKey, setSavingAutomationKey] = useState<string | null>(null);
    const [testAutomationLoading, setTestAutomationLoading] = useState<Record<string, boolean>>({});
    const [testAutomationResult, setTestAutomationResult] = useState<Record<string, { success: boolean; msg: string }>>({});
    const [copiedTagKey, setCopiedTagKey] = useState<string | null>(null);
    const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

    // Logs State
    const [logs, setLogs] = useState<WhatsAppDispatchLog[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [logFilter, setLogFilter] = useState<'ALL' | 'SENT' | 'FAILED'>('ALL');
    const [logSearch, setLogSearch] = useState('');

    // Legacy Templates State
    const [templates, setTemplates] = useState<Record<string, string>>({});
    const [lastSavedValues, setLastSavedValues] = useState<Record<string, string>>({});
    const [templateSearch, setTemplateSearch] = useState('');
    const [newTemplateKey, setNewTemplateKey] = useState('');
    const [newTemplateValue, setNewTemplateValue] = useState('');
    const [isAddingTemplate, setIsAddingTemplate] = useState(false);
    const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [settingToDelete, setSettingToDelete] = useState<string | null>(null);

    // Broadcast State
    const [message, setMessage] = useState('');
    const [targetType, setTargetType] = useState<'ALL' | 'ADMINS' | 'HOOD' | 'INDIVIDUAL'>('ADMINS');
    const [selectedHoodId, setSelectedHoodId] = useState('');
    const [sending, setSending] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const [hoods, settings, waConfig, autoConfig, recentLogs] = await Promise.all([
                MockService.getNeighborhoods(true),
                MockService.getSettings(true),
                MockService.getWhatsAppConfig(),
                MockService.getWhatsAppAutomations(),
                MockService.getWhatsAppLogs()
            ]);
            
            setNeighborhoods(hoods);
            setTemplates(settings);
            setLastSavedValues(settings);
            setAutomations(autoConfig || DEFAULT_WHATSAPP_AUTOMATIONS);
            setLogs(recentLogs || []);

            if (waConfig) {
                if (waConfig.url) setEndpointUrl(waConfig.url);
                if (waConfig.token) setApiToken(waConfig.token);
                if (waConfig.sessionId) setSessionId(waConfig.sessionId);
            }
            if (hoods.length > 0 && !selectedHoodId) setSelectedHoodId(hoods[0].id);
        } catch (e: any) {
            setLoadError("Erro ao sincronizar com o banco: " + e.message);
        } finally {
            setLoading(false);
        }
    }, [selectedHoodId]);

    const refreshLogs = async () => {
        setLoadingLogs(true);
        try {
            const recent = await MockService.getWhatsAppLogs();
            setLogs(recent);
        } catch (_) {}
        finally {
            setLoadingLogs(false);
        }
    };

    const handleClearLogs = async () => {
        if (!confirm("Deseja realmente limpar todos os logs de auditoria de disparos?")) return;
        try {
            await MockService.clearWhatsAppLogs();
            setLogs([]);
        } catch (_) {}
    };

    const handleSaveConfig = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setSavingConfig(true);
        setConfigStatus(null);
        try {
            await MockService.saveWhatsAppConfig({
                url: endpointUrl.trim(),
                token: apiToken.trim(),
                sessionId: sessionId.trim()
            });
            setConfigStatus({ type: 'success', msg: 'Configurações da API salvas com sucesso!' });
            setTimeout(() => setConfigStatus(null), 4000);
        } catch (err: any) {
            setConfigStatus({ type: 'error', msg: err?.message || 'Erro ao salvar configurações' });
        } finally {
            setSavingConfig(false);
        }
    };

    const handleTestConnection = async () => {
        if (!testPhone.trim()) {
            setTestResult({ success: false, msg: 'Informe um número de telefone com DDD para testar o envio.' });
            return;
        }
        setTestingConnection(true);
        setTestResult(null);
        try {
            const clean = testPhone.replace(/\D/g, '');
            const testMsg = `🧪 *Teste de Conexão ServCam - Whaticket*\n\nData/Hora: ${new Date().toLocaleString('pt-BR')}\nServidor: ${endpointUrl}\nStatus: Operacional ✅`;
            
            await MockService.sendWhatsAppMessage(
                testMsg, 
                [clean], 
                apiToken.trim(), 
                endpointUrl.trim(),
                'Teste de Conexão API'
            );

            setTestResult({ 
                success: true, 
                msg: `✅ Mensagem de teste enviada com sucesso para ${clean}! Verifique o seu WhatsApp.` 
            });
            refreshLogs();
        } catch (err: any) {
            let msg = err?.message || 'Falha ao enviar mensagem de teste.';
            if (msg.includes('401') || msg.includes('ERR_UNAUTHORIZED') || msg.includes('não autorizado')) {
                msg = '❌ Erro 401: Token não autorizado pelo servidor Whaticket em whatsapp.alienmonitoramento.com.br. Acesse seu painel Whaticket > Conexões, copie o token da conexão ativa e cole no campo "Token da API".';
            }
            setTestResult({ success: false, msg });
        } finally {
            setTestingConnection(false);
        }
    };

    const handleToggleAutomation = async (key: string) => {
        const current = automations[key];
        if (!current) return;
        const updated = {
            ...automations,
            [key]: {
                ...current,
                enabled: !current.enabled
            }
        };
        setAutomations(updated);
        await MockService.saveWhatsAppAutomations(updated);
    };

    const handleUpdateAutomationField = (key: string, field: keyof WhatsAppAutomation, value: any) => {
        const current = automations[key];
        if (!current) return;
        setAutomations(prev => ({
            ...prev,
            [key]: {
                ...current,
                [field]: value
            }
        }));
    };

    const handleSaveSingleAutomation = async (key: string) => {
        setSavingAutomationKey(key);
        try {
            await MockService.saveWhatsAppAutomations(automations);
            setTimeout(() => setSavingAutomationKey(null), 1500);
        } catch (err) {
            alert("Erro ao salvar automação: " + err);
            setSavingAutomationKey(null);
        }
    };

    const handleResetAutomationTemplate = async (key: string) => {
        const def = DEFAULT_WHATSAPP_AUTOMATIONS[key];
        if (!def) return;
        if (!confirm(`Deseja restaurar o texto padrão para a automação "${def.name}"?`)) return;

        const updated = {
            ...automations,
            [key]: {
                ...automations[key],
                template: def.template
            }
        };
        setAutomations(updated);
        await MockService.saveWhatsAppAutomations(updated);
    };

    const handleInsertTag = (autoKey: string, tag: string) => {
        const textarea = textareaRefs.current[autoKey];
        const currentTemplate = automations[autoKey]?.template || '';
        
        if (textarea) {
            const start = textarea.selectionStart ?? currentTemplate.length;
            const end = textarea.selectionEnd ?? currentTemplate.length;
            const newText = currentTemplate.substring(0, start) + tag + currentTemplate.substring(end);
            handleUpdateAutomationField(autoKey, 'template', newText);
            
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + tag.length, start + tag.length);
            }, 50);
        } else {
            handleUpdateAutomationField(autoKey, 'template', currentTemplate + ' ' + tag);
        }

        setCopiedTagKey(`${autoKey}-${tag}`);
        setTimeout(() => setCopiedTagKey(null), 2000);
    };

    const handleTestSingleAutomation = async (autoKey: string) => {
        if (!testPhone.trim()) {
            setTestAutomationResult(prev => ({
                ...prev,
                [autoKey]: { success: false, msg: 'Informe o Telefone de Testes no topo da página.' }
            }));
            return;
        }

        setTestAutomationLoading(prev => ({ ...prev, [autoKey]: true }));
        setTestAutomationResult(prev => ({ ...prev, [autoKey]: { success: false, msg: '' } }));

        try {
            const clean = testPhone.replace(/\D/g, '');
            await MockService.testWhatsAppAutomation(autoKey, clean);
            setTestAutomationResult(prev => ({
                ...prev,
                [autoKey]: { 
                    success: true, 
                    msg: `✅ Mensagem enviada com sucesso para ${clean}! Verifique no WhatsApp.` 
                }
            }));
            refreshLogs();
        } catch (err: any) {
            setTestAutomationResult(prev => ({
                ...prev,
                [autoKey]: { 
                    success: false, 
                    msg: `❌ Falha: ${err?.message || 'Erro ao disparar mensagem.'}` 
                }
            }));
        } finally {
            setTestAutomationLoading(prev => ({ ...prev, [autoKey]: false }));
        }
    };

    useEffect(() => { 
        if (user?.role === UserRole.ADMIN) loadData(); 
        
        const subSettings = MockService.subscribeToTable('system_settings', loadData);
        const subHoods = MockService.subscribeToTable('neighborhoods', loadData);

        return () => {
            supabase.removeChannel(subSettings);
            supabase.removeChannel(subHoods);
        };
    }, [user?.role, loadData]);

    const handleSaveTemplate = async (key: string, value: string) => {
        setSavingKeys(prev => new Set(prev).add(key));
        try {
            await MockService.updateSetting(key, value.trim());
            setLastSavedValues(prev => ({ ...prev, [key]: value.trim() }));
            setEditingKey(null);
        } catch (e: any) { 
            alert("Erro ao gravar no banco: " + e.message); 
        } finally {
            setSavingKeys(prev => {
                const next = new Set(prev);
                next.delete(key);
                return next;
            });
        }
    };

    const handleCreateTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTemplateKey.trim()) return;
        setSending(true);
        try {
            await MockService.updateSetting(newTemplateKey.trim(), newTemplateValue.trim());
            setTemplates(prev => ({ ...prev, [newTemplateKey.trim()]: newTemplateValue.trim() }));
            setLastSavedValues(prev => ({ ...prev, [newTemplateKey.trim()]: newTemplateValue.trim() }));
            setNewTemplateKey('');
            setNewTemplateValue('');
            setIsAddingTemplate(false);
        } catch (e: any) {
            alert("Erro ao criar: " + e.message);
        } finally {
            setSending(false);
        }
    };

    const getAutomationIcon = (key: string) => {
        switch (key) {
            case 'notify_login_user':
                return <Lock size={20} className="text-emerald-400" />;
            case 'notify_login_admin':
                return <Bell size={20} className="text-blue-400" />;
            case 'notify_register_user':
                return <UserPlus size={20} className="text-indigo-400" />;
            case 'notify_register_admin':
                return <Shield size={20} className="text-amber-400" />;
            case 'notify_user_approved':
                return <CheckCircle2 size={20} className="text-green-400" />;
            case 'notify_sos_alert':
                return <Siren size={20} className="text-red-400" />;
            case 'notify_support_ticket':
                return <Headphones size={20} className="text-purple-400" />;
            case 'notify_contract_signed':
                return <FileCheck size={20} className="text-cyan-400" />;
            default:
                return <Zap size={20} className="text-atalaia-neon" />;
        }
    };

    const getTargetBadge = (target: string) => {
        switch (target) {
            case 'USER':
                return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">👤 Destinatário: Usuário</span>;
            case 'ADMIN':
                return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">🛡️ Destinatário: Central / Admin</span>;
            case 'BOTH':
                return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">🚨 Destinatário: Bairro & Central</span>;
            default:
                return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-500/10 text-gray-400 border border-gray-500/30">Destinatário: Múltiplo</span>;
        }
    };

    const availableTags = [
        { tag: '{{name}}', label: 'Nome do Usuário' },
        { tag: '{{system}}', label: 'Sistema Acessado' },
        { tag: '{{role}}', label: 'Perfil (Cliente, SCR, etc)' },
        { tag: '{{time}}', label: 'Hora (00:00:00)' },
        { tag: '{{date}}', label: 'Data (DD/MM/AAAA)' },
        { tag: '{{neighborhood}}', label: 'Bairro / Condomínio' },
        { tag: '{{integrator}}', label: 'Integrador Vinculado' },
        { tag: '{{integrator_phone}}', label: 'WhatsApp do Integrador' },
        { tag: '{{integrator_company}}', label: 'Empresa do Integrador' },
        { tag: '{{email}}', label: 'E-mail' },
        { tag: '{{phone}}', label: 'Telefone' },
        { tag: '{{details}}', label: 'Detalhes / Ocorrência' },
        { tag: '{{link}}', label: 'Link de Acesso' }
    ];

    const activeAutomationsCount = Object.values(automations).filter(a => a?.enabled).length;

    const filteredLogs = logs.filter(log => {
        if (logFilter === 'SENT' && log.status !== 'SENT') return false;
        if (logFilter === 'FAILED' && log.status !== 'FAILED') return false;
        if (logSearch.trim()) {
            const q = logSearch.toLowerCase();
            return (
                log.recipient.toLowerCase().includes(q) ||
                log.trigger.toLowerCase().includes(q) ||
                log.messageSnippet.toLowerCase().includes(q)
            );
        }
        return true;
    });

    return (
        <Layout>
            <div className="max-w-7xl mx-auto space-y-8 pb-16">
                {/* Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-atalaia-border">
                    <div>
                        <h1 className="text-3xl font-black text-white mb-2 flex items-center gap-3 tracking-tight">
                            <MessageSquare className="text-green-500" size={32} /> 
                            Central de Notificações WhatsApp
                        </h1>
                        <p className="text-gray-400 text-sm flex items-center gap-2">
                            <span>Servidor:</span>
                            <span className="text-atalaia-neon font-mono text-xs px-2 py-0.5 rounded bg-white/5 border border-white/10">
                                {endpointUrl.replace('https://', '').split('/')[0]}
                            </span>
                            <span className="text-gray-600">•</span>
                            <span className="text-green-400 flex items-center gap-1 text-xs">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                Online via Whaticket
                            </span>
                        </p>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex flex-wrap bg-[#111] p-1.5 rounded-xl border border-atalaia-border shadow-inner gap-1">
                        <button 
                            onClick={() => setActiveTab('automations')} 
                            className={`px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                                activeTab === 'automations' 
                                    ? 'bg-atalaia-neon text-black shadow-lg shadow-atalaia-neon/20' 
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Zap size={14} /> Automações de Acesso
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-black ${activeTab === 'automations' ? 'bg-black text-atalaia-neon' : 'bg-green-500/20 text-green-400'}`}>
                                {activeAutomationsCount}
                            </span>
                        </button>
                        <button 
                            onClick={() => { setActiveTab('logs'); refreshLogs(); }} 
                            className={`px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                                activeTab === 'logs' 
                                    ? 'bg-atalaia-neon text-black shadow-lg shadow-atalaia-neon/20' 
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <History size={14} /> Histórico & Logs
                        </button>
                        <button 
                            onClick={() => setActiveTab('broadcast')} 
                            className={`px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                                activeTab === 'broadcast' 
                                    ? 'bg-atalaia-neon text-black shadow-lg shadow-atalaia-neon/20' 
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Send size={14} /> Disparos Manuais
                        </button>
                        <button 
                            onClick={() => setActiveTab('templates')} 
                            className={`px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                                activeTab === 'templates' 
                                    ? 'bg-atalaia-neon text-black shadow-lg shadow-atalaia-neon/20' 
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Database size={14} /> Templates
                        </button>
                        <button 
                            onClick={() => setActiveTab('config')} 
                            className={`px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                                activeTab === 'config' 
                                    ? 'bg-atalaia-neon text-black shadow-lg shadow-atalaia-neon/20' 
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Wifi size={14} /> Conexão API
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32">
                        <Loader2 className="text-atalaia-neon animate-spin mb-4" size={48} />
                        <p className="text-gray-500 font-black uppercase tracking-[0.2em] text-xs">Sincronizando Sistema WhatsApp...</p>
                    </div>
                ) : loadError ? (
                    <div className="py-20 text-center bg-red-900/10 border border-red-500/20 rounded-3xl p-8">
                        <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
                        <h3 className="text-white font-bold text-lg mb-2">{loadError}</h3>
                        <Button onClick={loadData} className="mt-4"><RefreshCw size={18} className="mr-2"/> Tentar Novamente</Button>
                    </div>
                ) : activeTab === 'automations' ? (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        {/* Summary Bar */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Card className="p-5 border-white/10 bg-black/40 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-atalaia-neon/10 border border-atalaia-neon/30 flex items-center justify-center text-atalaia-neon">
                                    <Zap size={22} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Gatilhos Ativos</p>
                                    <p className="text-2xl font-black text-white">{activeAutomationsCount} / {Object.keys(automations).length}</p>
                                </div>
                            </Card>

                            <Card className="p-5 border-white/10 bg-black/40 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                    <Lock size={22} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Aviso de Login</p>
                                    <p className="text-sm font-bold text-emerald-400">
                                        {automations['notify_login_user']?.enabled ? 'Ativo (Usuário)' : 'Inativo'} • {automations['notify_login_admin']?.enabled ? 'Ativo (Admin)' : 'Inativo'}
                                    </p>
                                </div>
                            </Card>

                            <Card className="p-5 border-white/10 bg-black/40 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                                    <Siren size={22} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Alerta Pânico SOS</p>
                                    <p className="text-sm font-bold text-red-400">
                                        {automations['notify_sos_alert']?.enabled ? 'Disparo Instantâneo' : 'Desativado'}
                                    </p>
                                </div>
                            </Card>

                            <Card className="p-5 border-white/10 bg-black/40 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                                    <Smartphone size={22} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Número de Testes</p>
                                    <input 
                                        type="text" 
                                        value={testPhone} 
                                        onChange={e => setTestPhone(e.target.value)}
                                        placeholder="5548998456070" 
                                        className="w-full bg-black/80 border border-white/15 rounded-lg px-2.5 py-1 text-white text-xs font-mono focus:border-atalaia-neon outline-none mt-1"
                                    />
                                </div>
                            </Card>
                        </div>

                        {/* Banner de instrução */}
                        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <Sparkles size={20} className="text-atalaia-neon shrink-0" />
                                <div>
                                    <h4 className="text-white text-xs font-bold uppercase tracking-wider">Avisos Automáticos Multi-Sistema & Multi-Usuário</h4>
                                    <p className="text-gray-400 text-xs mt-0.5">
                                        O sistema detecta automaticamente o módulo de acesso (Portal do Cliente, Gestão do Integrador, Central SCR ou Super Admin) e dispara notificações personalizadas em tempo real.
                                    </p>
                                </div>
                            </div>
                            <Button onClick={() => setActiveTab('config')} className="text-xs h-9 px-4 shrink-0">
                                <Wifi size={14} className="mr-1.5" /> Verificar Conexão API
                            </Button>
                        </div>

                        {/* Cards de cada Automação */}
                        <div className="grid grid-cols-1 gap-6">
                            {Object.entries(automations).map(([key, auto]) => {
                                if (!auto) return null;
                                const isSaving = savingAutomationKey === key;
                                const isTesting = testAutomationLoading[key] || false;
                                const testOutcome = testAutomationResult[key];

                                return (
                                    <Card 
                                        key={key} 
                                        className={`p-6 transition-all duration-300 border ${
                                            auto.enabled 
                                                ? 'border-white/20 bg-gradient-to-br from-[#121212] to-[#0c0c0c]' 
                                                : 'border-white/5 bg-[#0a0a0a]/60 opacity-75'
                                        }`}
                                    >
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
                                            <div className="flex items-start sm:items-center gap-3">
                                                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 shrink-0">
                                                    {getAutomationIcon(key)}
                                                </div>
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                                        <h3 className="text-white font-bold text-base tracking-tight">{auto.name}</h3>
                                                        {getTargetBadge(auto.notifyTarget)}
                                                    </div>
                                                    <p className="text-gray-400 text-xs">{auto.description}</p>
                                                </div>
                                            </div>

                                            {/* Switches & Targets */}
                                            <div className="flex items-center gap-4">
                                                {/* Role Target Filter Selector */}
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] uppercase font-bold text-gray-500">Perfil:</span>
                                                    <select
                                                        value={auto.targetRole || 'ALL'}
                                                        onChange={e => handleUpdateAutomationField(key, 'targetRole', e.target.value)}
                                                        className="bg-black border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-atalaia-neon outline-none cursor-pointer"
                                                    >
                                                        <option value="ALL">Todos os Perfis</option>
                                                        <option value="RESIDENT">Somente Clientes</option>
                                                        <option value="INTEGRATOR">Somente Integradores</option>
                                                        <option value="SCR">Somente SCR / Motovigia</option>
                                                        <option value="ADMIN">Somente Administradores</option>
                                                    </select>
                                                </div>

                                                {/* Enable / Disable Toggle Switch */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleAutomation(key)}
                                                    className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none ${
                                                        auto.enabled 
                                                            ? 'bg-atalaia-neon border-atalaia-neon shadow-lg shadow-atalaia-neon/20' 
                                                            : 'bg-zinc-800 border-zinc-700'
                                                    }`}
                                                >
                                                    <span
                                                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-black shadow-lg ring-0 transition duration-200 ease-in-out ${
                                                            auto.enabled ? 'translate-x-7' : 'translate-x-0'
                                                        }`}
                                                    />
                                                </button>
                                                <span className={`text-xs font-black uppercase tracking-wider ${auto.enabled ? 'text-atalaia-neon' : 'text-gray-500'}`}>
                                                    {auto.enabled ? 'Ativo' : 'Inativo'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Editor and Preview Grid */}
                                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
                                            {/* Textarea Editor */}
                                            <div className="lg:col-span-7 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                                        <Edit2 size={12} className="text-atalaia-neon" /> Mensagem do Template
                                                    </label>
                                                    <span className="text-[10px] text-gray-500 font-mono">
                                                        {(auto.template || '').length} caracteres
                                                    </span>
                                                </div>

                                                {/* Variable Tags insertion chips */}
                                                <div className="flex flex-wrap gap-1.5 p-2 bg-black/60 rounded-xl border border-white/5">
                                                    <span className="text-[10px] text-gray-500 font-bold uppercase self-center px-1">Inserir:</span>
                                                    {availableTags.map(item => (
                                                        <button
                                                            key={item.tag}
                                                            type="button"
                                                            onClick={() => handleInsertTag(key, item.tag)}
                                                            className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 hover:border-atalaia-neon/40 border border-white/10 text-white font-mono text-[10px] transition-colors flex items-center gap-1 group"
                                                            title={`Inserir ${item.label}`}
                                                        >
                                                            <span>{item.tag}</span>
                                                            {copiedTagKey === `${key}-${item.tag}` ? (
                                                                <Check size={10} className="text-green-400" />
                                                            ) : (
                                                                <Plus size={10} className="text-gray-500 group-hover:text-atalaia-neon" />
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>

                                                <textarea
                                                    ref={el => textareaRefs.current[key] = el}
                                                    value={auto.template}
                                                    onChange={e => handleUpdateAutomationField(key, 'template', e.target.value)}
                                                    rows={6}
                                                    className="w-full bg-black border border-white/10 rounded-xl p-4 text-white text-xs font-sans leading-relaxed focus:border-atalaia-neon outline-none resize-y"
                                                    placeholder="Digite o texto da mensagem com as tags dinâmicas..."
                                                />

                                                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleResetAutomationTemplate(key)}
                                                        className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
                                                    >
                                                        <RotateCcw size={12} /> Restaurar Padrão
                                                    </button>

                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            onClick={() => handleSaveSingleAutomation(key)}
                                                            disabled={isSaving}
                                                            className="text-xs h-9 px-4"
                                                        >
                                                            {isSaving ? (
                                                                <><CheckCircle size={14} className="mr-1.5 text-green-400" /> Salvo!</>
                                                            ) : (
                                                                <><Save size={14} className="mr-1.5" /> Salvar Mensagem</>
                                                            )}
                                                        </Button>

                                                        <button
                                                            type="button"
                                                            onClick={() => handleTestSingleAutomation(key)}
                                                            disabled={isTesting}
                                                            className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                                        >
                                                            {isTesting ? (
                                                                <Loader2 size={14} className="animate-spin" />
                                                            ) : (
                                                                <Play size={14} />
                                                            )}
                                                            <span>Testar Disparo</span>
                                                        </button>
                                                    </div>
                                                </div>

                                                {testOutcome && testOutcome.msg && (
                                                    <div className={`p-3 rounded-xl border text-xs font-semibold animate-in fade-in duration-300 ${
                                                        testOutcome.success 
                                                            ? 'bg-green-950/30 border-green-500/40 text-green-300' 
                                                            : 'bg-red-950/30 border-red-500/40 text-red-300'
                                                    }`}>
                                                        {testOutcome.msg}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Live WhatsApp Preview Box */}
                                            <div className="lg:col-span-5 flex flex-col">
                                                <span className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1.5">
                                                    <Smartphone size={13} className="text-green-500" /> Prévia Visual no WhatsApp
                                                </span>
                                                <div className="flex-1 bg-[#0b141a] rounded-2xl p-4 border border-white/10 flex flex-col justify-end shadow-inner min-h-[220px] relative overflow-hidden">
                                                    <div className="absolute top-2 left-4 text-[10px] text-gray-500 uppercase tracking-widest font-mono">
                                                        Simulação ao vivo
                                                    </div>

                                                    <div className="bg-[#005c4b] text-white p-4 rounded-2xl rounded-tr-none text-xs leading-relaxed max-w-[95%] ml-auto shadow-md space-y-1.5">
                                                        <div className="whitespace-pre-wrap font-sans">
                                                            {MockService.formatAutomationTemplate(auto.template, {
                                                                name: 'Carlos Oliveira',
                                                                system: 'Portal do Cliente ServCam',
                                                                role: 'Cliente',
                                                                time: new Date().toLocaleTimeString('pt-BR'),
                                                                date: new Date().toLocaleDateString('pt-BR'),
                                                                neighborhood: 'Centro',
                                                                email: 'carlos@exemplo.com.br',
                                                                phone: testPhone,
                                                                details: 'Acesso seguro validado',
                                                                link: 'https://whatsapp.alienmonitoramento.com.br',
                                                                integrator: 'Alien Sistemas (Rogerio Integrador)',
                                                                integrador: 'Alien Sistemas (Rogerio Integrador)',
                                                                integrator_name: 'Rogerio Integrador',
                                                                integrator_phone: '(48) 99845-6070',
                                                                integrador_telefone: '(48) 99845-6070',
                                                                integrator_company: 'Alien Sistemas de Segurança Eletrônica'
                                                            })}
                                                        </div>
                                                        <div className="flex justify-end items-center gap-1 text-[10px] text-gray-300 font-mono pt-1">
                                                            <span>{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                            <CheckCircle2 size={12} className="text-cyan-300" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                ) : activeTab === 'logs' ? (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        {/* Logs Controls */}
                        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setLogFilter('ALL')}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                        logFilter === 'ALL' ? 'bg-atalaia-neon text-black' : 'bg-white/5 text-gray-400 hover:text-white'
                                    }`}
                                >
                                    Todos ({logs.length})
                                </button>
                                <button
                                    onClick={() => setLogFilter('SENT')}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                        logFilter === 'SENT' ? 'bg-green-500 text-black' : 'bg-white/5 text-gray-400 hover:text-white'
                                    }`}
                                >
                                    Enviados ({logs.filter(l => l.status === 'SENT').length})
                                </button>
                                <button
                                    onClick={() => setLogFilter('FAILED')}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                        logFilter === 'FAILED' ? 'bg-red-500 text-white' : 'bg-white/5 text-gray-400 hover:text-white'
                                    }`}
                                >
                                    Falhas ({logs.filter(l => l.status === 'FAILED').length})
                                </button>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="relative flex-1 sm:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                    <input 
                                        type="text" 
                                        placeholder="Buscar por telefone ou evento..." 
                                        value={logSearch} 
                                        onChange={e => setLogSearch(e.target.value)}
                                        className="w-full h-10 bg-black border border-white/10 rounded-xl pl-9 pr-3 text-xs text-white focus:border-atalaia-neon outline-none"
                                    />
                                </div>
                                <button 
                                    onClick={refreshLogs} 
                                    disabled={loadingLogs}
                                    className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-atalaia-neon transition-colors"
                                    title="Atualizar Logs"
                                >
                                    <RefreshCw size={18} className={loadingLogs ? 'animate-spin' : ''} />
                                </button>
                                <button 
                                    onClick={handleClearLogs}
                                    className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 hover:bg-red-500/20 transition-colors"
                                    title="Limpar Histórico"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Logs Table */}
                        <Card className="p-0 border-white/10 overflow-hidden bg-black/40">
                            {filteredLogs.length === 0 ? (
                                <div className="p-16 text-center text-gray-500">
                                    <History size={36} className="mx-auto mb-3 opacity-40" />
                                    <p className="text-sm font-bold">Nenhum registro de disparo encontrado</p>
                                    <p className="text-xs text-gray-600 mt-1">Os disparos automáticos ou manuais serão registrados aqui em tempo real.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-white/5 border-b border-white/10 text-gray-400 font-mono uppercase text-[10px]">
                                            <tr>
                                                <th className="py-3 px-4">Data / Hora</th>
                                                <th className="py-3 px-4">Gatilho / Evento</th>
                                                <th className="py-3 px-4">Destinatário</th>
                                                <th className="py-3 px-4">Mensagem</th>
                                                <th className="py-3 px-4">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5 font-sans">
                                            {filteredLogs.map(log => (
                                                <tr key={log.id} className="hover:bg-white/5 transition-colors">
                                                    <td className="py-3 px-4 text-gray-400 whitespace-nowrap font-mono text-[11px]">
                                                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                                                    </td>
                                                    <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                                                        {log.trigger}
                                                    </td>
                                                    <td className="py-3 px-4 text-cyan-300 font-mono whitespace-nowrap">
                                                        {log.recipient}
                                                    </td>
                                                    <td className="py-3 px-4 text-gray-300 max-w-md truncate" title={log.messageSnippet}>
                                                        {log.messageSnippet}
                                                    </td>
                                                    <td className="py-3 px-4 whitespace-nowrap">
                                                        {log.status === 'SENT' ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/30">
                                                                <CheckCircle2 size={12} /> Enviado
                                                            </span>
                                                        ) : (
                                                            <span 
                                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/30"
                                                                title={log.error}
                                                            >
                                                                <AlertTriangle size={12} /> Falha
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Card>
                    </div>
                ) : activeTab === 'templates' ? (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="flex flex-col md:flex-row gap-4">
                            <Button onClick={() => setIsAddingTemplate(!isAddingTemplate)} className="h-12 px-6">
                                {isAddingTemplate ? <XCircle size={18} className="mr-2"/> : <Plus size={18} className="mr-2"/>} 
                                {isAddingTemplate ? 'Cancelar' : 'Nova Chave'}
                            </Button>
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="Filtrar chaves..." 
                                    className="w-full h-12 bg-black border border-white/10 rounded-xl pl-12 pr-4 text-sm text-white focus:border-atalaia-neon outline-none" 
                                    value={templateSearch} 
                                    onChange={e => setTemplateSearch(e.target.value)} 
                                />
                            </div>
                            <button onClick={loadData} className="p-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-atalaia-neon transition-colors">
                                <RefreshCw size={20} />
                            </button>
                        </div>

                        {isAddingTemplate && (
                            <Card className="p-8 border-atalaia-neon/40 bg-atalaia-neon/5 shadow-2xl animate-in slide-in-from-top-4">
                                <form onSubmit={handleCreateTemplate} className="space-y-6">
                                    <h3 className="text-white font-black uppercase text-sm tracking-widest flex items-center gap-2">
                                        <Sparkles className="text-atalaia-neon" size={18} /> Gravar Nova Configuração
                                    </h3>
                                    <div className="grid md:grid-cols-3 gap-6">
                                        <Input label="Identificador (Chave)" value={newTemplateKey} onChange={e => setNewTemplateKey(e.target.value)} required placeholder="Ex: alerta_manual" />
                                        <div className="md:col-span-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Mensagem WhatsApp</label>
                                            <textarea className="w-full h-32 bg-black border border-white/10 rounded-xl p-4 text-sm text-white focus:border-atalaia-neon outline-none resize-none" value={newTemplateValue} onChange={e => setNewTemplateValue(e.target.value)} required />
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <Button type="submit" disabled={sending}>Criar Template</Button>
                                    </div>
                                </form>
                            </Card>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                             {/* Configuração Extra: Admin WhatsApp */}
                             <div className="bg-white/5 p-5 rounded-2xl border border-white/10 flex flex-col justify-between hover:border-atalaia-neon/30 transition-all group">
                                <div>
                                    <h3 className="text-white font-bold mb-3 flex items-center gap-2 text-sm">
                                        <Smartphone size={16} className="text-blue-400" /> Admin Monitor
                                    </h3>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Monitor Geral do Sistema</label>
                                    <input 
                                        type="text"
                                        value={templates['admin_whatsapp'] || ''}
                                        onChange={(e) => setTemplates({...templates, admin_whatsapp: e.target.value})}
                                        placeholder="554899999999"
                                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs focus:border-atalaia-neon outline-none"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-2">Número que recebe alertas e avisos do sistema em geral.</p>
                                </div>
                                <div className="mt-4 pt-3 border-t border-white/5 flex justify-end">
                                    <button 
                                        onClick={() => handleSaveTemplate('admin_whatsapp', templates['admin_whatsapp'])}
                                        disabled={savingKeys.has('admin_whatsapp')}
                                        className="text-xs bg-atalaia-neon/10 hover:bg-atalaia-neon text-atalaia-neon hover:text-black font-bold px-3 py-1.5 rounded-lg border border-atalaia-neon/30 transition-all flex items-center gap-1.5"
                                    >
                                        {savingKeys.has('admin_whatsapp') ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                        Salvar
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Lista de templates do sistema */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.entries(templates)
                                .filter(([k]) => k.toLowerCase().includes(templateSearch.toLowerCase()))
                                .map(([key, val]) => (
                                    <Card key={key} className="p-5 border-white/10 bg-black/40 flex flex-col justify-between space-y-3">
                                        <div>
                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                <span className="font-mono text-xs font-bold text-atalaia-neon bg-atalaia-neon/10 px-2 py-0.5 rounded border border-atalaia-neon/20">{key}</span>
                                                <button onClick={() => setSettingToDelete(key)} className="text-gray-500 hover:text-red-400 p-1 transition-colors">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                            <textarea 
                                                value={val} 
                                                onChange={e => setTemplates({...templates, [key]: e.target.value})}
                                                rows={4}
                                                className="w-full bg-black/80 border border-white/10 rounded-xl p-3 text-xs text-gray-300 focus:border-atalaia-neon outline-none resize-y"
                                            />
                                        </div>
                                        <div className="flex justify-end pt-2">
                                            <Button 
                                                onClick={() => handleSaveTemplate(key, val)} 
                                                disabled={savingKeys.has(key)}
                                                className="h-8 px-4 text-xs"
                                            >
                                                {savingKeys.has(key) ? <Loader2 size={12} className="animate-spin mr-1"/> : <Save size={12} className="mr-1"/>}
                                                Salvar
                                            </Button>
                                        </div>
                                    </Card>
                                ))
                            }
                        </div>
                    </div>
                ) : activeTab === 'config' ? (
                    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
                        {/* Status de Conexão */}
                        <Card className="p-8 border-white/10 bg-gradient-to-br from-[#121212] to-[#0a0a0a] shadow-2xl relative overflow-hidden">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-white/10">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-400">
                                        <Wifi size={28} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                            Integração Whaticket API
                                        </h2>
                                        <p className="text-xs text-gray-400">whatsapp.alienmonitoramento.com.br</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-bold">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                    Servidor Alien Ativo
                                </div>
                            </div>

                            {/* Formulário de Configuração */}
                            <form onSubmit={handleSaveConfig} className="space-y-6 pt-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-2">
                                            <Globe size={14} className="text-atalaia-neon" /> URL do Endpoint Whaticket
                                        </label>
                                        <input
                                            type="text"
                                            value={endpointUrl}
                                            onChange={e => setEndpointUrl(e.target.value)}
                                            required
                                            placeholder="https://whatsapp.alienmonitoramento.com.br:443/backend/api/messages/send"
                                            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-mono focus:border-atalaia-neon outline-none"
                                        />
                                        <p className="text-[11px] text-gray-500 mt-1">
                                            Endpoint direto da API do Whaticket da Alien Monitoramento.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-2">
                                            <Key size={14} className="text-atalaia-neon" /> Token de Acesso da Conexão (Bearer Token)
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showToken ? 'text' : 'password'}
                                                value={apiToken}
                                                onChange={e => setApiToken(e.target.value)}
                                                placeholder="Insira o Token do Whaticket aqui..."
                                                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 pr-12 text-white text-xs font-mono focus:border-atalaia-neon outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowToken(!showToken)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                            >
                                                {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                        <p className="text-[11px] text-gray-500 mt-1">
                                            Encontrado no painel do Whaticket &gt; Conexões &gt; Ação da Conexão WhatsApp.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">
                                            Identificador da Sessão
                                        </label>
                                        <input
                                            type="text"
                                            value={sessionId}
                                            onChange={e => setSessionId(e.target.value)}
                                            placeholder="Default"
                                            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-xs focus:border-atalaia-neon outline-none"
                                        />
                                    </div>
                                </div>

                                {configStatus && (
                                    <div className={`p-4 rounded-xl border flex items-center gap-3 animate-in fade-in duration-300 ${configStatus.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                                        {configStatus.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                                        <span className="text-xs font-semibold">{configStatus.msg}</span>
                                    </div>
                                )}

                                <div className="flex justify-end gap-3 pt-2">
                                    <Button type="submit" disabled={savingConfig} className="h-11 px-6">
                                        {savingConfig ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save className="mr-2" size={16} />}
                                        Salvar Configurações da API
                                    </Button>
                                </div>
                            </form>
                        </Card>

                        {/* Testador de Disparo da API */}
                        <Card className="p-8 border-white/10 bg-black/40 shadow-2xl">
                            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                                <Send size={18} className="text-atalaia-neon" />
                                Testador de Conexão ao Vivo
                            </h3>
                            <p className="text-xs text-gray-400 mb-6">
                                Envie uma mensagem de teste para verificar se o seu servidor Whaticket e token estão prontos para entregas.
                            </p>

                            <div className="space-y-4 max-w-lg">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">
                                        Telefone de Destino (Com DDD)
                                    </label>
                                    <div className="flex gap-3">
                                        <input
                                            type="text"
                                            value={testPhone}
                                            onChange={e => setTestPhone(e.target.value)}
                                            placeholder="5548998456070"
                                            className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-mono focus:border-atalaia-neon outline-none"
                                        />
                                        <Button
                                            type="button"
                                            onClick={handleTestConnection}
                                            disabled={testingConnection || !testPhone.trim()}
                                            className="shrink-0 h-11 px-5"
                                        >
                                            {testingConnection ? <Loader2 className="animate-spin mr-1.5" size={16} /> : <Send size={16} className="mr-1.5" />}
                                            Disparar Teste
                                        </Button>
                                    </div>
                                </div>

                                {testResult && (
                                    <div className={`p-4 rounded-xl border animate-in fade-in duration-300 ${testResult.success ? 'bg-green-950/30 border-green-500/40 text-green-300' : 'bg-red-950/30 border-red-500/40 text-red-300'}`}>
                                        <div className="flex items-start gap-3">
                                            {testResult.success ? (
                                                <CheckCircle className="text-green-400 shrink-0 mt-0.5" size={18} />
                                            ) : (
                                                <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={18} />
                                            )}
                                            <div className="text-xs leading-relaxed">
                                                <p className="font-semibold">{testResult.msg}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                ) : (
                    <div className="animate-in fade-in duration-500">
                        <Card className="p-8 border-atalaia-neon/20 shadow-2xl max-w-4xl mx-auto">
                            {!apiToken.trim() && (
                                <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <AlertTriangle className="text-amber-400 shrink-0" size={24} />
                                        <div>
                                            <p className="text-white text-xs font-bold">Token da API Whaticket não configurado</p>
                                            <p className="text-gray-400 text-[11px]">Para realizar disparos com sucesso para whatsapp.alienmonitoramento.com.br, insira seu Token na aba Conexão API.</p>
                                        </div>
                                    </div>
                                    <Button onClick={() => setActiveTab('config')} className="text-xs shrink-0 h-9 px-4">
                                        Configurar Token
                                    </Button>
                                </div>
                            )}

                             <form onSubmit={async (e) => {
                                e.preventDefault();
                                setSending(true);
                                setStatus(null);
                                try {
                                    await MockService.sendCustomBroadcast(message, targetType, targetType === 'HOOD' ? selectedHoodId : undefined);
                                    setStatus({ type: 'success', msg: 'Mensagens enviadas com sucesso via WhatsApp!' });
                                    setMessage('');
                                    refreshLogs();
                                } catch (err: any) { 
                                    let errorMsg = err?.message || 'Falha no envio da mensagem.';
                                    if (errorMsg.includes('401') || errorMsg.includes('ERR_UNAUTHORIZED')) {
                                        errorMsg = 'Erro 401: Token do Whaticket inválido ou não autorizado em whatsapp.alienmonitoramento.com.br. Acesse a aba "Conexão API" e insira o token correto.';
                                    }
                                    setStatus({ type: 'error', msg: errorMsg }); 
                                }
                                finally { setSending(false); }
                            }} className="space-y-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {['ADMINS', 'HOOD', 'ALL', 'INDIVIDUAL'].map(t => (
                                        <button key={t} type="button" onClick={() => setTargetType(t as any)} className={`p-4 rounded-xl border text-[10px] font-black uppercase transition-all ${targetType === t ? 'border-atalaia-neon bg-atalaia-neon/10 text-atalaia-neon' : 'border-white/5 bg-black/40 text-gray-500'}`}>
                                            {t === 'HOOD' ? 'Bairro' : t === 'ADMINS' ? 'Admins' : t === 'ALL' ? 'Todos' : 'Manual'}
                                        </button>
                                    ))}
                                </div>
                                {targetType === 'HOOD' && (
                                    <select className="w-full bg-black border border-white/10 rounded-xl p-4 text-white outline-none" value={selectedHoodId} onChange={e => setSelectedHoodId(e.target.value)}>
                                        {neighborhoods.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                                    </select>
                                )}
                                <textarea className="w-full h-48 bg-black border border-white/10 rounded-2xl p-6 text-white text-sm focus:border-atalaia-neon outline-none resize-none" placeholder="Digite a mensagem para disparo..." value={message} onChange={e => setMessage(e.target.value)} />
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div className="flex flex-col">
                                        {status && (
                                            <div className={`text-xs font-bold p-3 rounded-xl border flex items-center gap-2 ${status.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                                                {status.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                                                <span>{status.msg}</span>
                                            </div>
                                        )}
                                    </div>
                                    <Button type="submit" disabled={sending || !message.trim()} className="h-12 px-8">
                                        {sending ? <Loader2 className="animate-spin mr-2" size={18} /> : <><Send size={18} className="mr-2"/> Disparar Agora</>}
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    </div>
                )}
            </div>
            <AnimatePresence>
                {settingToDelete && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden text-center"
                        >
                            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
                            <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle size={24} />
                            </div>
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-2 font-mono">
                                Remover Configuração
                            </h3>
                            <p className="text-xs text-zinc-400 mb-6 leading-relaxed font-sans">
                                Deseja realmente remover a configuração <span className="text-white font-bold">"{settingToDelete}"</span> do banco de dados?
                            </p>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setSettingToDelete(null)}
                                    className="flex-1 py-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-zinc-900 text-zinc-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer font-sans"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (settingToDelete) {
                                            await MockService.deleteSetting(settingToDelete);
                                            await loadData();
                                            setSettingToDelete(null);
                                        }
                                    }}
                                    className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-500/15 cursor-pointer font-sans"
                                >
                                    Excluir
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </Layout>
    );
};

export default WhatsAppAdmin;
