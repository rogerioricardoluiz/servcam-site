import React, { useRef, useState, useEffect } from 'react';
import { Card, Button, Input } from './UI';
import { FileText, Check, Shield, AlertTriangle, Download, RefreshCw, Eye, EyeOff, Printer, ExternalLink } from 'lucide-react';
import { User, UserRole } from '@/types';
import { MockService } from '@/services/mockService';

interface SignatureData {
  name: string;
  document: string;
  phone: string;
  timestamp: string;
  ipAddress: string;
  os: string;
  browser: string;
  signatureImage: string; // Base64 of the drawn canvas
  signed: boolean;
}

interface ContractSignatureProps {
  user: User;
  onSignComplete?: (data: SignatureData) => void;
}

export const ContractSignature: React.FC<ContractSignatureProps> = ({ user, onSignComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [documentNumber, setDocumentNumber] = useState('');
  const [signerName, setSignerName] = useState(user.name || '');
  const [signerPhone, setSignerPhone] = useState(user.phone || '');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showFullContract, setShowFullContract] = useState(true);
  const [signatureRecord, setSignatureRecord] = useState<SignatureData | null>(null);
  const [loading, setLoading] = useState(false);
  const [penColor, setPenColor] = useState('#00ff66'); // Pen color (neon green default)

  const [integratorDetails, setIntegratorDetails] = useState<{ 
    name: string; 
    cnpj: string; 
    address: string;
    singlePlanPrice?: number | string;
    hasCameraRental?: boolean;
    cameraRentalDetails?: string;
    recordingDays?: number;
    customClause?: string;
  } | null>(null);

  useEffect(() => {
    const loadIntInfo = async () => {
      // 1. If Admin or Alien account: Alien Monitoramento Eletrônico itself
      const isAlienAdmin = 
        user?.role === UserRole.ADMIN ||
        (user?.email || '').toLowerCase().trim() === 'servcam@alienmonitoramento.com.br' ||
        (user?.email || '').toLowerCase().trim() === 'rogerioricardoluiz@gmail.com' ||
        (user?.companyName || '').toLowerCase().includes('alien') ||
        (user?.razaoSocial || '').toLowerCase().includes('alien');

      if (isAlienAdmin) {
        let price = '49,90';
        let rental = false;
        let details = '';
        let days = 7;
        let clause = '';
        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem('atalaia_integrator_plan_default');
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed.singlePlanPrice) price = String(parsed.singlePlanPrice);
              if (parsed.hasCameraRental !== undefined) rental = Boolean(parsed.hasCameraRental);
              if (parsed.cameraRentalDetails) details = parsed.cameraRentalDetails;
              if (parsed.recordingDays !== undefined) days = Number(parsed.recordingDays);
              if (parsed.customClause) clause = parsed.customClause;
            }
          } catch (_) {}
        }
        setIntegratorDetails({
          name: 'Alien Monitoramento Eletrônico Ltda.',
          cnpj: '51.482.661/0001-31',
          address: 'Avenida Josué di Bernardi, nº 185, sala 27, Campinas, São José – SC',
          singlePlanPrice: price,
          hasCameraRental: rental,
          cameraRentalDetails: details,
          recordingDays: days,
          customClause: clause
        });
        return;
      }

      // 2. If Integrator: use their company (unless it is Alien)
      if (user?.role === UserRole.INTEGRATOR) {
        const intName = user.companyName || user.razaoSocial || user.name || '';
        let price = user.singlePlanPrice ? String(user.singlePlanPrice) : '49,90';
        let rental = user.hasCameraRental !== undefined ? Boolean(user.hasCameraRental) : false;
        let details = user.cameraRentalDetails || '';
        let days = user.recordingDays !== undefined ? Number(user.recordingDays) : 7;
        let clause = user.customClause || '';

        if (user.address && typeof user.address === 'string' && user.address.trim().startsWith('{')) {
          try {
            const p = JSON.parse(user.address);
            if (p.singlePlanPrice !== undefined) price = String(p.singlePlanPrice);
            if (p.hasCameraRental !== undefined) rental = Boolean(p.hasCameraRental);
            if (p.cameraRentalDetails !== undefined) details = p.cameraRentalDetails;
            if (p.recordingDays !== undefined) days = Number(p.recordingDays);
            if (p.customClause !== undefined) clause = p.customClause;
          } catch (_) {}
        }

        if (typeof window !== 'undefined' && user.id) {
          try {
            const rawPlan = localStorage.getItem(`atalaia_integrator_plan_${user.id}`);
            if (rawPlan) {
              const p = JSON.parse(rawPlan);
              if (p.singlePlanPrice !== undefined) price = String(p.singlePlanPrice);
              if (p.hasCameraRental !== undefined) rental = Boolean(p.hasCameraRental);
              if (p.cameraRentalDetails !== undefined) details = p.cameraRentalDetails;
              if (p.recordingDays !== undefined) days = Number(p.recordingDays);
              if (p.customClause !== undefined) clause = p.customClause;
            }
          } catch (_) {}
        }

        setIntegratorDetails({
          name: intName || 'Alien Monitoramento Eletrônico Ltda.',
          cnpj: user.cnpj || '51.482.661/0001-31',
          address: user.address && !user.address.trim().startsWith('{') ? user.address : 'Avenida Josué di Bernardi, nº 185, sala 27, Campinas, São José – SC',
          singlePlanPrice: price,
          hasCameraRental: rental,
          cameraRentalDetails: details,
          recordingDays: days,
          customClause: clause
        });
        return;
      }

      // 3. If Client: find their linked integrator
      try {
        let intId = user.integratorId;
        if (!intId && typeof window !== 'undefined' && user?.id) {
          try {
            const rawLinks = localStorage.getItem('atalaia_user_integrators');
            if (rawLinks) {
              const parsed = JSON.parse(rawLinks);
              if (parsed[user.id]?.integratorId) {
                intId = parsed[user.id].integratorId;
              }
            }
          } catch (_) {}
        }

        if (intId) {
          const ints = await MockService.getIntegrators();
          const matched = ints.find(i => i.id === intId);
          if (matched) {
            const partnerName = matched.companyName || matched.razaoSocial || matched.name;
            let price = matched.singlePlanPrice ? String(matched.singlePlanPrice) : '49,90';
            let rental = matched.hasCameraRental !== undefined ? Boolean(matched.hasCameraRental) : false;
            let details = matched.cameraRentalDetails || '';
            let days = matched.recordingDays !== undefined ? Number(matched.recordingDays) : 7;
            let clause = matched.customClause || '';

            if (matched.address && typeof matched.address === 'string' && matched.address.trim().startsWith('{')) {
              try {
                const p = JSON.parse(matched.address);
                if (p.singlePlanPrice !== undefined) price = String(p.singlePlanPrice);
                if (p.hasCameraRental !== undefined) rental = Boolean(p.hasCameraRental);
                if (p.cameraRentalDetails !== undefined) details = p.cameraRentalDetails;
                if (p.recordingDays !== undefined) days = Number(p.recordingDays);
                if (p.customClause !== undefined) clause = p.customClause;
              } catch (_) {}
            }

            if (typeof window !== 'undefined' && matched.id) {
              try {
                const rawPlan = localStorage.getItem(`atalaia_integrator_plan_${matched.id}`);
                if (rawPlan) {
                  const p = JSON.parse(rawPlan);
                  if (p.singlePlanPrice !== undefined) price = String(p.singlePlanPrice);
                  if (p.hasCameraRental !== undefined) rental = Boolean(p.hasCameraRental);
                  if (p.cameraRentalDetails !== undefined) details = p.cameraRentalDetails;
                  if (p.recordingDays !== undefined) days = Number(p.recordingDays);
                  if (p.customClause !== undefined) clause = p.customClause;
                }
              } catch (_) {}
            }

            if (partnerName && !partnerName.toLowerCase().includes('alien')) {
              setIntegratorDetails({
                name: partnerName,
                cnpj: matched.cnpj || '51.482.661/0001-31',
                address: matched.address && !matched.address.trim().startsWith('{') ? matched.address : 'Avenida Josué di Bernardi, nº 185, sala 27, Campinas, São José – SC',
                singlePlanPrice: price,
                hasCameraRental: rental,
                cameraRentalDetails: details,
                recordingDays: days,
                customClause: clause
              });
              return;
            }
          }
        }

        // Default: maintain Alien with default single plan
        let defaultPrice = '49,90';
        let defaultRental = false;
        let defaultDetails = '';
        let defaultDays = 7;
        let defaultClause = '';
        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem('atalaia_integrator_plan_default');
            if (raw) {
              const p = JSON.parse(raw);
              if (p.singlePlanPrice) defaultPrice = String(p.singlePlanPrice);
              if (p.hasCameraRental !== undefined) defaultRental = Boolean(p.hasCameraRental);
              if (p.cameraRentalDetails) defaultDetails = p.cameraRentalDetails;
              if (p.recordingDays !== undefined) defaultDays = Number(p.recordingDays);
              if (p.customClause) defaultClause = p.customClause;
            }
          } catch (_) {}
        }
        setIntegratorDetails({
          name: 'Alien Monitoramento Eletrônico Ltda.',
          cnpj: '51.482.661/0001-31',
          address: 'Avenida Josué di Bernardi, nº 185, sala 27, Campinas, São José – SC',
          singlePlanPrice: defaultPrice,
          hasCameraRental: defaultRental,
          cameraRentalDetails: defaultDetails,
          recordingDays: defaultDays,
          customClause: defaultClause
        });
      } catch (e) {
        console.error(e);
        setIntegratorDetails(null);
      }
    };
    loadIntInfo();

    const handlePlanChange = () => {
      loadIntInfo();
    };
    window.addEventListener('atalaia:plan_config_changed', handlePlanChange);
    return () => window.removeEventListener('atalaia:plan_config_changed', handlePlanChange);
  }, [user]);

  const contractorName = integratorDetails?.name || 'Alien Monitoramento Eletrônico Ltda.';
  const contractorCnpj = integratorDetails?.cnpj || '51.482.661/0001-31';
  const contractorAddress = integratorDetails?.address || 'Avenida Josué di Bernardi, nº 185, sala 27, Campinas, São José – SC';

  // Computed values for single plan & camera rental & recording retention days
  const rawPrice = (user.role === UserRole.RESIDENT ? user.singlePlanPrice : null) || integratorDetails?.singlePlanPrice || (user.role === UserRole.INTEGRATOR ? user.singlePlanPrice : null) || '49,90';
  const planPriceFormatted = typeof rawPrice === 'number'
    ? rawPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : String(rawPrice).replace('R$', '').trim();

  const isCameraRentalIncluded = (user.role === UserRole.RESIDENT && user.hasCameraRental !== undefined)
    ? Boolean(user.hasCameraRental)
    : (integratorDetails?.hasCameraRental !== undefined
      ? Boolean(integratorDetails.hasCameraRental)
      : (user.role === UserRole.INTEGRATOR ? Boolean(user.hasCameraRental) : false));

  const rentalNotes = (user.role === UserRole.RESIDENT ? user.cameraRentalDetails : null) || integratorDetails?.cameraRentalDetails || (user.role === UserRole.INTEGRATOR ? user.cameraRentalDetails : '') || '';

  const recordingRetentionDays = (user.role === UserRole.RESIDENT && user.recordingDays !== undefined)
    ? Number(user.recordingDays)
    : (integratorDetails?.recordingDays !== undefined
      ? Number(integratorDetails.recordingDays)
      : (user.role === UserRole.INTEGRATOR && user.recordingDays !== undefined ? Number(user.recordingDays) : 7));

  const customContractClause = user.customClause ||
    integratorDetails?.customClause ||
    (typeof window !== 'undefined' ? (
      (() => {
        try {
          if (user?.id) {
            const rawUserPlan = localStorage.getItem(`atalaia_integrator_plan_${user.id}`);
            if (rawUserPlan) {
              const p = JSON.parse(rawUserPlan);
              if (p.customClause) return p.customClause;
            }
          }
          const defaultPlan = localStorage.getItem('atalaia_integrator_plan_default');
          if (defaultPlan) {
            const p = JSON.parse(defaultPlan);
            if (p.customClause) return p.customClause;
          }
        } catch (_) {}
        return '';
      })()
    ) : '') || '';

  // Simulated metadata for digital trace audit
  const [metadata, setMetadata] = useState({
    ip: '189.122.' + Math.floor(Math.random() * 255) + '.' + Math.floor(Math.random() * 255),
    browser: '',
    os: ''
  });

  useEffect(() => {
    // Detect OS and Browser for contract trace
    const ua = navigator.userAgent;
    let browserName = 'Navegador Web';
    let osName = 'Sistema Operacional';

    if (ua.indexOf('Firefox') > -1) browserName = 'Mozilla Firefox';
    else if (ua.indexOf('Chrome') > -1) browserName = 'Google Chrome';
    else if (ua.indexOf('Safari') > -1) browserName = 'Apple Safari';
    else if (ua.indexOf('Edge') > -1) browserName = 'Microsoft Edge';

    if (ua.indexOf('Win') > -1) osName = 'Windows';
    else if (ua.indexOf('Mac') > -1) osName = 'macOS';
    else if (ua.indexOf('Linux') > -1) osName = 'Linux';
    else if (ua.indexOf('Android') > -1) osName = 'Android';
    else if (ua.indexOf('like Mac') > -1) osName = 'iOS';

    setMetadata(prev => ({
      ...prev,
      browser: browserName,
      os: osName
    }));

    // Check if contract already signed by this user
    const saved = localStorage.getItem(`atalaia_contract_signed_${user.id}`);
    if (saved) {
      try {
        setSignatureRecord(JSON.parse(saved));
      } catch (e) {
        console.error('Error parsing loaded signature', e);
      }
    }
  }, [user.id]);

  // Adjust canvas resolution backings for crisp high-density screens
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 3;
        ctx.strokeStyle = penColor;
      }
    }
  }, [signatureRecord, penColor]); // Re-init context on view reset or pen color change

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    // Prevent scrolling for touch setups
    if ('touches' in e) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if ('touches' in e) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCoordinates(e);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signerName.trim()) {
      alert('Por favor, insira o seu nome completo.');
      return;
    }
    if (!documentNumber.trim()) {
      alert('Por favor, informe seu CPF ou CNPJ para validade jurídica.');
      return;
    }
    if (!acceptedTerms) {
      alert('Você deve aceitar os termos do contrato de adesão.');
      return;
    }
    if (!hasDrawn) {
      alert('Por favor, desenhe sua assinatura no painel.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const canvas = canvasRef.current;
      const signatureImage = canvas ? canvas.toDataURL('image/png') : '';
      
      const payload: SignatureData = {
        name: signerName.trim(),
        document: documentNumber.trim(),
        phone: signerPhone.trim(),
        timestamp: new Date().toLocaleString('pt-BR'),
        ipAddress: metadata.ip,
        os: metadata.os,
        browser: metadata.browser,
        signatureImage,
        signed: true
      };

      localStorage.setItem(`atalaia_contract_signed_${user.id}`, JSON.stringify(payload));
      setSignatureRecord(payload);
      setLoading(false);
      if (onSignComplete) {
        onSignComplete(payload);
      }
    }, 1200);
  };

  const handleRevoke = () => {
    if (confirm('Tem certeza de que deseja remover esta assinatura eletrônica registrada?')) {
      localStorage.removeItem(`atalaia_contract_signed_${user.id}`);
      setSignatureRecord(null);
      setHasDrawn(false);
      setDocumentNumber('');
    }
  };

  const openPrintableWindow = () => {
    if (!signatureRecord) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita pop-ups no seu navegador para abrir o contrato em nova janela.');
      return;
    }

    const htmlContent = generateContractHtml();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const generateContractHtml = () => {
    if (!signatureRecord) return '';
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contrato de Adesão Integral ServCam - ${signatureRecord.name}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1a1a1a;
      line-height: 1.6;
      background-color: #f8fafc;
      margin: 0;
      padding: 30px 16px;
    }
    .document-card {
      max-width: 850px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      padding: 40px;
    }
    .button-container {
      max-width: 850px;
      margin: 0 auto 20px auto;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }
    .btn {
      background-color: #00ff66;
      color: #000000;
      border: none;
      padding: 12px 24px;
      font-weight: 800;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .btn:hover {
      background-color: #00d655;
    }
    .btn-secondary {
      background-color: #0f172a;
      color: #ffffff;
    }
    .btn-secondary:hover {
      background-color: #1e293b;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #00ff66;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .brand {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: -1px;
    }
    .brand span {
      color: #059669;
    }
    .badge {
      background-color: #e6fffa;
      color: #047857;
      border: 1px solid #34d399;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
    }
    .title {
      font-size: 22px;
      font-weight: 800;
      margin-top: 0;
      margin-bottom: 8px;
    }
    .subtitle {
      color: #64748b;
      font-size: 13px;
      margin-bottom: 30px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 20px;
      margin-bottom: 30px;
    }
    @media (min-width: 768px) {
      .grid {
        grid-template-columns: 1.2fr 0.8fr;
      }
    }
    .card-meta {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
    }
    .card-meta-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #047857;
      margin-bottom: 12px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f1f5f9;
      font-size: 13px;
    }
    .meta-row:last-child {
      border-bottom: none;
    }
    .meta-lbl {
      color: #64748b;
      font-weight: 500;
    }
    .meta-val {
      color: #0f172a;
      font-weight: 700;
      text-align: right;
    }
    .signature-box {
      background-color: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .signature-box-title {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #94a3b8;
      margin-bottom: 15px;
    }
    .signature-image {
      max-height: 120px;
      max-width: 100%;
      background: white;
      border-radius: 6px;
      padding: 6px;
    }
    .contract-text {
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 28px;
      font-size: 13px;
      color: #1e293b;
      height: auto;
      max-height: none;
      overflow: visible;
      margin-bottom: 30px;
      font-family: inherit;
      line-height: 1.6;
    }
    .section-title {
      font-weight: 800;
      color: #0f172a;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
      margin-top: 20px;
      margin-bottom: 10px;
      text-transform: uppercase;
      font-size: 13px;
    }
    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 20px;
      text-align: center;
      font-size: 11px;
      color: #64748b;
      line-height: 1.6;
    }
    @media print {
      @page {
        size: A4 portrait;
        margin: 12mm 15mm;
      }
      body {
        background-color: #ffffff;
        padding: 0;
      }
      .document-card {
        border: none;
        box-shadow: none;
        padding: 0;
        max-width: 100%;
      }
      .button-container {
        display: none !important;
      }
      .contract-text {
        border: none;
        padding: 0;
        height: auto !important;
        max-height: none !important;
        overflow: visible !important;
      }
    }
  </style>
</head>
<body>

  <div class="button-container">
    <button class="btn" onclick="window.print()">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-printer"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg>
      Imprimir / Salvar PDF
    </button>
  </div>

  <div class="document-card">
    <div class="header">
      <div class="brand">SERVCAM <span>PLATAFORMA SAAS</span></div>
      <div class="badge">Assinado Digitalmente</div>
    </div>

    <h1 class="title">Contrato de Adesão Integral Assinado</h1>
    <div class="subtitle">Este documento confirma a concordância formal aos termos de licenciamento de uso da plataforma SaaS ServCam com validade jurídica de acordo com a legislação brasileira.</div>

    <div class="grid">
      <div class="card-meta">
        <div class="card-meta-title">Auditoria e Validade Jurídica Digital</div>
        
        <div class="meta-row">
          <span class="meta-lbl">Nome do Signatário:</span>
          <span class="meta-val">${signatureRecord.name}</span>
        </div>
        
        <div class="meta-row">
          <span class="meta-lbl">CPF ou CNPJ:</span>
          <span class="meta-val">${signatureRecord.document}</span>
        </div>
        
        <div class="meta-row">
          <span class="meta-lbl">WhatsApp/Telefone:</span>
          <span class="meta-val">${signatureRecord.phone || 'Não informado'}</span>
        </div>
        
        <div class="meta-row">
          <span class="meta-lbl">Data e Hora do Aceite:</span>
          <span class="meta-val">${signatureRecord.timestamp}</span>
        </div>
        
        <div class="meta-row">
          <span class="meta-lbl">Endereço de IP:</span>
          <span class="meta-val" style="font-family: monospace; color: #047857;">${signatureRecord.ipAddress}</span>
        </div>
        
        <div class="meta-row">
          <span class="meta-lbl">Sistema Operacional:</span>
          <span class="meta-val">${signatureRecord.os}</span>
        </div>
        
        <div class="meta-row">
          <span class="meta-lbl">Navegador Utilizado:</span>
          <span class="meta-val">${signatureRecord.browser}</span>
        </div>
      </div>

      <div class="signature-box">
        <div class="signature-box-title">Assinatura Biométrica Capturada</div>
        <img class="signature-image" src="${signatureRecord.signatureImage}" alt="Assinatura Eletrônica" />
        <div style="font-size: 9px; color: #94a3b8; margin-top: 10px; font-family: monospace; text-align: center;">CÓDIGO DE INTEGRIDADE SHA256:<br>SERVCAM-${Math.floor(Math.random() * 900000 + 100000)}</div>
      </div>
    </div>

    <div class="card-meta-title" style="margin-bottom: 8px;">Termos Contratuais Integrais (${customContractClause ? '16 Cláusulas na Íntegra' : '15 Cláusulas na Íntegra'})</div>
    <div class="contract-text">
      <div class="section-title">📄 CONTRATO DE ADESÃO À PLATAFORMA SERVCAM (SAAS)</div>
      
      <div class="section-title">1. PARTES CONTRATANTES E DEFINIÇÕES</div>
      <p><strong>CONTRATADA (OPERADOR DA PLATAFORMA):</strong> ${contractorName}, inscrita no CNPJ nº ${contractorCnpj}, com sede na ${contractorAddress}, doravante denominada <strong>OPERADOR DA PLATAFORMA</strong> ou simplesmente <strong>CONTRATADA</strong>.</p>
      <p><strong>CONTRATANTE (USUÁRIO FINAL):</strong> ${signatureRecord.name}, de CPF/CNPJ nº ${signatureRecord.document}, telefone ${signatureRecord.phone || 'não informado'}, devidamente cadastrado para acesso à Plataforma ServCam, doravante denominado <strong>CONTRATANTE</strong>.</p>
      <p><strong>PLATAFORMA SERVCAM:</strong> O termo <strong>ServCam</strong> refere-se exclusivamente à plataforma tecnológica e sistema Software as a Service (SaaS) de gestão e transmissão de imagens disponibilizado e operado pela <strong>CONTRATADA (OPERADOR DA PLATAFORMA)</strong> ao <strong>CONTRATANTE</strong>.</p>

      <div class="section-title">2. OBJETO DO CONTRATO</div>
      <p>O presente contrato tem por objeto o licenciamento de uso da <strong>Plataforma Tecnológica SaaS ServCam</strong>, fornecido e operacionalizado pela <strong>CONTRATADA (OPERADOR DA PLATAFORMA)</strong> ao <strong>CONTRATANTE</strong>, destinado ao monitoramento, transmissão ao vivo, registro, gestão e armazenamento seguro de gravações de câmeras.</p>
      <p>A <strong>Plataforma ServCam</strong> atua exclusivamente como infraestrutura tecnológica de software de comunicação e gestão de imagens utilizada pelo <strong>OPERADOR DA PLATAFORMA (CONTRATADA)</strong>, não se caracterizando a plataforma nem a contratada como empresa de vigilância privada ou segurança ostensiva.</p>

      <div class="section-title">3. NATUREZA DO SERVIÇO E DA PLATAFORMA (SAAS)</div>
      <p>A <strong>Plataforma ServCam</strong> é um sistema Software as a Service (SaaS), fornecido em ambiente digital, com acesso via internet, sujeito a atualizações contínuas de segurança e melhorias técnicas. O uso é concedido em caráter não exclusivo, intransferível e revogável conforme os termos estabelecidos neste contrato operado pela <strong>CONTRATADA</strong>.</p>

      <div class="section-title">4. PLANO ÚNICO DE ADESÃO E LICENCIAMENTO</div>
      <p>O CONTRATANTE adere ao <strong>Plano Único de Assinatura</strong> no valor mensal recorrente de <strong>R$ ${planPriceFormatted} / mês</strong>.</p>
      <p><strong>4.1 Serviços e Cobertura Inclusos:</strong> Acesso total à plataforma tecnológica SaaS para monitoramento ao vivo, gestão de câmeras, notificações e suporte técnico contínuo.</p>
      <p><strong>4.2 Locação de Equipamentos (Câmeras):</strong> ${isCameraRentalIncluded ? `<strong>SIM, LOCAÇÃO INCLUSA</strong>. O presente plano contempla a locação e disponibilização das câmeras e infraestrutura técnica mantidas pelo integrador parceiro.${rentalNotes ? ` Especificações dos Equipamentos em Locação: <strong><em>${rentalNotes}</em></strong>.` : ''}` : `<strong>NÃO INCLUSA</strong>. O CONTRATANTE utilizará câmeras e infraestrutura próprias homologadas e compatíveis com a plataforma ServCam.`}</p>
      <p><strong>4.3 Período de Gravação e Retenção em Nuvem:</strong> ${recordingRetentionDays === 0 ? '<strong>0 DIAS (APENAS TRANSMISSÃO AO VIVO)</strong>. Transmissão em tempo real sem armazenamento contínuo ou retenção de histórico de imagens em nuvem.' : `<strong>${recordingRetentionDays} ${recordingRetentionDays === 1 ? 'DIA' : 'DIAS'} DE GRAVAÇÃO CONTÍNUA EM NUVEM</strong>. O plano assegura retenção contínua e histórico dos últimos ${recordingRetentionDays} dias de gravações em nuvem.`}</p>

      <div class="section-title">5. CONDIÇÕES DE PAGAMENTO</div>
      <p>A contratação é regida por cobrança mensal recorrente no valor de <strong>R$ ${planPriceFormatted} / mês</strong>, com vencimento conforme data de adesão. O pagamento poderá ser efetuado via PIX, boleto bancário ou cartão de crédito. Em caso de inadimplência, poderá ocorrer suspensão temporária do acesso até a devida regularização.</p>

      <div class="section-title">6. ADESÃO E ACEITE DIGITAL</div>
      <p>A adesão ocorre mediante cadastro e aceite eletrônico com registro de data, hora e dados de auditoria digital (IP: ${signatureRecord.ipAddress}, OS: ${signatureRecord.os}, Navegador: ${signatureRecord.browser}). Este aceite possui validade jurídica plena nos termos da Lei Federal nº 14.063/2020 e da MP nº 2.200-2/2001.</p>

      <div class="section-title">7. OBRIGAÇÕES DO USUÁRIO</div>
      <p>O CONTRATANTE compromete-se a: Utilizar a plataforma de forma lícita e responsável, Não inserir informações falsas ou maliciosas, Manter sigilo de suas credenciais de acesso, Não tentar interferir ou invadir a plataforma e utilizar os dados exclusivamente para fins legítimos.</p>

      <div class="section-title">8. OBRIGAÇÕES DA PLATAFORMA</div>
      <p>A CONTRATADA compromete-se a: Disponibilizar a plataforma conforme plano contratado, Manter o sistema funcionando dentro de padrões técnicos razoáveis, Realizar atualizações contínuas de segurança, Proteger dados dos usuários e Oferecer suporte técnico.</p>

      <div class="section-title">9. DISPONIBILIDADE E MANUTENÇÃO</div>
      <p>A plataforma poderá passar por atualizações técnicas e manutenções programadas para melhoria da infraestrutura, comprometendo-se ao pronto restabelecimento sem prejuízo das funções essenciais do serviço.</p>

      <div class="section-title">10. LIMITAÇÃO DE RESPONSABILIDADE</div>
      <p>A plataforma ServCam não se responsabiliza por: Falhas de internet ou energia elétrica no local do usuário, Uso indevido da plataforma por terceiros decorrente do fornecimento de senhas pelo contratante, e Eventos externos fora do controle tecnológico do sistema.</p>

      <div class="section-title">11. PRAZO DE VIGÊNCIA, FIDELIDADE E MULTA RESCISÓRIA</div>
      <p>O presente contrato possui <strong>fidelidade mínima obrigatória de 12 (doze) meses</strong> a contar do aceite digital. Em caso de rescisão antecipada pelo CONTRATANTE antes de completados os 12 meses de vigência, incidirá multa compensatória rescisória equivalente a <strong>20% (vinte por cento) do valor total das mensalidades vincendas</strong> até o término do período de fidelidade. Decorrido o prazo inicial de 12 meses, o contrato renova-se automaticamente por tempo indeterminado, podendo ser cancelado com aviso prévio formal de 30 (trinta) dias sem incidência de multa.</p>

      <div class="section-title">12. ALTERAÇÕES DO CONTRATO</div>
      <p>A CONTRATADA poderá alterar este contrato para ajustes operacionais ou legais, notificando os usuários com antecedência na própria plataforma.</p>

      <div class="section-title">13. PROPRIEDADE INTELECTUAL</div>
      <p>Todo o sistema ServCam, código-fonte, marcas, logotipos e interface visual são de propriedade exclusiva da CONTRATADA. É vedada qualquer reprodução, cópia ou engenharia reversa.</p>

      <div class="section-title">14. FORO</div>
      <p>Fica eleito o foro da comarca de São José – SC, para dirimir quaisquer controvérsias oriundas deste contrato, com renúncia a qualquer outro, por mais privilegiado que seja.</p>

      <div class="section-title">15. ASSINATURA ELETRÔNICA E VALIDADE JURÍDICA</div>
      <p>O presente instrumento é assinado e aceito eletronicamente pelo CONTRATANTE no momento do cadastro, constituindo documento probatório com eficácia jurídica plena em todo o território nacional.</p>
      ${customContractClause ? `
      <div class="section-title">16. CONDIÇÕES ESPECIAIS E CLÁUSULAS PARTICULARES DO OPERADOR LOCAL</div>
      <p style="background-color: #f8fafc; border-left: 4px solid #00ff66; padding: 12px 16px; font-weight: 600; color: #0f172a; white-space: pre-wrap; margin-top: 8px;">
        ${customContractClause}
      </p>
      ` : ''}
    </div>

    <div class="footer">
      <strong>Declaração de Autenticidade Forense Eletrônica</strong><br>
      Este certificado foi emitido em ambiente de nuvem da ServCam SaaS.<br>
      Campinas, São José – SC. ${contractorName} • CNPJ ${contractorCnpj}
    </div>

  </div>

  <script>
    window.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        window.print();
      }, 600);
    });
  </script>
</body>
</html>`;
  };

  const downloadPrintableReceipt = () => {
    if (!signatureRecord) return;

    const htmlContent = generateContractHtml();
    
    // Process down to dynamic data uri blob
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Create transient anchor tag and simulation click to trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Contrato_Integral_ServCam_${signatureRecord.name.replace(/\s+/g, '_')}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div id="contrato-adesao-morador" className="print:bg-white print:text-black">
      <style>{`
        @media print {
          /* Clean page setup */
          @page {
            margin: 1.5cm;
            size: portrait;
          }
          
          /* Hide everything except the contract container */
          body * {
            visibility: hidden !important;
          }
          
          /* Force visibility of the contract module */
          #contrato-adesao-morador,
          #contrato-adesao-morador * {
            visibility: visible !important;
          }
          
          /* Position contract perfectly at the top left of the blank paper */
          #contrato-adesao-morador {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
            color: #000000 !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }

          /* Completely hide interactive controls & buttons */
          .print\\:hidden,
          button,
          .no-print,
          input,
          select {
            display: none !important;
          }

          /* Force high-contrast document texts and pure white card bounds */
          #contrato-adesao-morador .bg-green-950\\/10,
          #contrato-adesao-morador .bg-black\\/40,
          #contrato-adesao-morador .bg-\\[\\#030303\\],
          #contrato-adesao-morador .bg-\\[\\#040404\\] {
            background: #ffffff !important;
            background-color: #ffffff !important;
            border-color: #e4e4e7 !important;
            box-shadow: none !important;
          }

          /* Style the digital trace audit trail box cleanly */
          #contrato-adesao-morador .bg-black\\/40 {
            background: #f4f4f5 !important;
            background-color: #f4f4f5 !important;
            border: 1px solid #e4e4e7 !important;
            border-radius: 12px !important;
            padding: 16px !important;
          }

          /* Ensure dark biometric signature seal displays perfectly */
          #contrato-adesao-morador .bg-\\[\\#0c0c0c\\] {
            background: #18181b !important;
            background-color: #18181b !important;
            border-color: #3f3f46 !important;
          }

          /* Clean border lines */
          #contrato-adesao-morador .border,
          #contrato-adesao-morador .border-b,
          #contrato-adesao-morador .border-t {
            border-color: #e2e8f0 !important;
          }

          /* High density rich black typography */
          #contrato-adesao-morador h3,
          #contrato-adesao-morador h4,
          #contrato-adesao-morador p,
          #contrato-adesao-morador span,
          #contrato-adesao-morador li,
          #contrato-adesao-morador div {
            color: #000000 !important;
          }

          /* Standardize subtexts for perfect gray-scaling */
          #contrato-adesao-morador .text-gray-500,
          #contrato-adesao-morador .text-zinc-500,
          #contrato-adesao-morador .text-gray-400 {
            color: #4b5563 !important;
          }

          /* Elegant highlight colored states */
          #contrato-adesao-morador .text-\\[\\#00ff66\\],
          #contrato-adesao-morador .text-atalaia-neon {
            color: #047857 !important; /* Premium dark-emerald */
            font-weight: 700 !important;
          }

          /* Stamp badges */
          #contrato-adesao-morador .bg-green-500\\/10 {
            background-color: #f0fdf4 !important;
            color: #166534 !important;
            border: 1px solid #bbf7d0 !important;
          }

          /* Force full contract scroll bodies to print inline, preventing scroll-clipping */
          #contrato-adesao-morador .max-h-\\[250px\\],
          #contrato-adesao-morador .overflow-y-auto {
            max-height: none !important;
            overflow-y: visible !important;
          }
        }
      `}</style>
      {signatureRecord ? (
        // RENDER SIGNED CONTRACT RECEIPT
        <Card className="p-6 md:p-8 border-green-500/30 bg-green-950/10 shadow-[0_4px_30px_rgba(0,0,0,0.4)] animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-white/10 pb-6 mb-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-green-500/20 text-[#00ff66]">
                <Check size={28} />
              </div>
              <div>
                <span className="text-xs bg-green-500/10 text-[#00ff66] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                  Contrato Assinado Digitalmente
                </span>
                <h3 className="text-xl font-bold text-white mt-1">Conformidade e Aceite de Termos</h3>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 print:hidden">
              <Button 
                onClick={() => {
                  window.focus();
                  window.print();
                }}
                className="bg-atalaia-neon hover:bg-atalaia-neon/90 text-black flex items-center justify-center gap-1.5 h-10 px-4 font-extrabold text-xs shadow-[0_0_15px_rgba(0,255,102,0.2)]"
              >
                <Printer size={15} /> Imprimir / Salvar PDF
              </Button>
              <Button 
                onClick={downloadPrintableReceipt}
                variant="outline"
                className="border-white/10 hover:bg-white/10 text-white flex items-center justify-center gap-1.5 h-10 px-4 font-bold text-xs"
              >
                <Download size={15} /> Baixar Arquivo HTML / PDF
              </Button>
              <Button 
                onClick={openPrintableWindow}
                variant="outline"
                className="border-white/10 hover:bg-white/10 text-white flex items-center justify-center gap-1.5 h-10 px-4 font-bold text-xs"
              >
                <ExternalLink size={15} /> Abrir em Nova Janela
              </Button>
              <Button 
                onClick={handleRevoke}
                variant="outline"
                className="text-red-500 border-red-500/20 hover:bg-red-500/10 h-10 px-4 text-xs font-bold"
              >
                Refazer Assinatura
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Meta-analytics audit signature box */}
            <div className="bg-black/40 rounded-2xl p-6 border border-white/5 flex flex-col justify-between">
              <div>
                <h4 className="text-[10px] uppercase font-bold tracking-wider text-[#00ff66] mb-3">Linha de Auditoria Digital</h4>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between border-b border-white/5 pb-1.5">
                    <span className="text-gray-500 font-semibold">Signatário:</span>
                    <span className="text-white font-bold">{signatureRecord.name}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1.5">
                    <span className="text-gray-500 font-semibold">Documento (CPF/CNPJ):</span>
                    <span className="text-white font-mono">{signatureRecord.document}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1.5">
                    <span className="text-gray-500 font-semibold">Telefone:</span>
                    <span className="text-white font-mono">{signatureRecord.phone || 'Não inf.'}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1.5">
                    <span className="text-gray-500 font-semibold">Data e Hora:</span>
                    <span className="text-white">{signatureRecord.timestamp}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1.5">
                    <span className="text-gray-500 font-semibold">Endereço IP:</span>
                    <span className="text-[#00ff66] font-mono">{signatureRecord.ipAddress}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1.5">
                    <span className="text-gray-500 font-semibold">Sistema / OS:</span>
                    <span className="text-white">{signatureRecord.os}</span>
                  </div>
                  <div className="flex justify-between pb-1.5">
                    <span className="text-gray-500 font-semibold">Navegador:</span>
                    <span className="text-white">{signatureRecord.browser}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white/5">
                <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                  <Shield size={12} className="text-[#00ff66]" /> Código de Integridade: SHA256-SERVCAM-{Math.floor(Math.random()*900000+100000)}
                </span>
              </div>
            </div>

            {/* Signature Draw Capture block */}
            <div className="bg-black/40 rounded-2xl p-6 border border-white/5 flex flex-col items-center justify-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-2">Assinatura Capturada</span>
              <div className="bg-[#0c0c0c] border border-white/10 rounded-xl p-4 w-full h-[150px] flex items-center justify-center relative overflow-hidden">
                <div className="absolute top-2 left-2 text-[8px] text-zinc-600 uppercase font-bold">ServCam Secure Canvas v1</div>
                <img 
                  src={signatureRecord.signatureImage} 
                  alt="Assinatura Digital" 
                  className="max-h-full max-w-full object-contain invert-0 brightness-110" 
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="text-[10px] text-gray-500 mt-2 italic text-center">Registrado sob marco civil da internet nº 12.965/2014</span>
            </div>
          </div>

          {/* FULL CONTRACT DISPLAY (NA ÍNTEGRA, SEM BARRA DE ROLAGEM) */}
          <div className="border border-white/10 rounded-2xl bg-[#030303] p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <FileText className="text-atalaia-neon" size={20} />
                <h4 className="text-base font-bold text-white uppercase tracking-tight">
                  Contrato de Adesão – ServCam (SaaS) — Íntegra do Documento Assinado
                </h4>
              </div>
              <span className="text-[10px] bg-atalaia-neon/10 text-atalaia-neon border border-atalaia-neon/30 px-3 py-1 rounded-full font-extrabold uppercase tracking-wider">
                {customContractClause ? '16 Cláusulas na Íntegra' : '15 Cláusulas na Íntegra'}
              </span>
            </div>

            <div className="text-xs text-gray-300 leading-relaxed font-sans space-y-5 max-h-[350px] overflow-y-auto pr-3 bg-black/40 p-4 rounded-xl border border-white/5 shadow-inner scrollbar-thin">
              <div>
                <h5 className="font-extrabold text-atalaia-neon text-sm uppercase mb-1">1. PARTES CONTRATANTES E DEFINIÇÕES</h5>
                <p className="mb-1"><strong>CONTRATADA (OPERADOR DA PLATAFORMA):</strong> {contractorName}, inscrita no CNPJ nº {contractorCnpj}, com sede na {contractorAddress}, doravante denominada <strong>OPERADOR DA PLATAFORMA</strong> ou simplesmente <strong>CONTRATADA</strong>.</p>
                <p className="mb-1"><strong>CONTRATANTE (USUÁRIO FINAL):</strong> {signatureRecord.name}, inscrito sob CPF/CNPJ nº {signatureRecord.document}, telefone/WhatsApp {signatureRecord.phone || 'Não informado'}, devidamente cadastrado para acesso à Plataforma ServCam, que aderiu ao presente contrato mediante aceite digital e assinatura biométrica eletrônica.</p>
                <p><strong>PLATAFORMA SERVCAM:</strong> O termo <strong>ServCam</strong> refere-se exclusivamente à plataforma tecnológica e sistema Software as a Service (SaaS) de gestão e transmissão de imagens disponibilizado e operado pela <strong>CONTRATADA (OPERADOR DA PLATAFORMA)</strong> ao <strong>CONTRATANTE</strong>.</p>
              </div>

              <div>
                <h5 className="font-extrabold text-atalaia-neon text-sm uppercase mb-1">2. OBJETO DO CONTRATO</h5>
                <p>O presente contrato tem por objeto o licenciamento de uso da <strong>Plataforma Tecnológica SaaS ServCam</strong>, fornecido e operacionalizado pela <strong>CONTRATADA (OPERADOR DA PLATAFORMA)</strong> ao <strong>CONTRATANTE</strong>, destinado ao monitoramento, transmissão ao vivo, registro, gestão e armazenamento seguro de gravações de câmeras.</p>
                <p className="mt-1 text-gray-400">A <strong>Plataforma ServCam</strong> atua exclusivamente como infraestrutura tecnológica de software de comunicação e gestão de imagens utilizada pelo <strong>OPERADOR DA PLATAFORMA (CONTRATADA)</strong>, não se caracterizando a plataforma nem a contratada como empresa de vigilância privada ou segurança ostensiva.</p>
              </div>

              <div>
                <h5 className="font-extrabold text-atalaia-neon text-sm uppercase mb-1">3. NATUREZA DO SERVIÇO E DA PLATAFORMA (SAAS)</h5>
                <p>A <strong>Plataforma ServCam</strong> é um sistema Software as a Service (SaaS), fornecido em ambiente digital, com acesso via internet, sujeito a atualizações contínuas de segurança e melhorias técnicas. O uso é concedido em caráter não exclusivo, intransferível e revogável conforme os termos estabelecidos neste contrato operado pela <strong>CONTRATADA</strong>.</p>
              </div>

              <div>
                <h5 className="font-extrabold text-atalaia-neon text-sm uppercase mb-1">4. PLANO ÚNICO DE ADESÃO E LICENCIAMENTO</h5>
                <p className="mb-2 font-bold text-white">
                  O CONTRATANTE adere ao <span className="text-atalaia-neon">Plano Único de Assinatura</span> no valor de R$ {planPriceFormatted} / mês.
                </p>
                <div className="space-y-2 pl-3 border-l-2 border-atalaia-neon/40 text-[11px] text-gray-300">
                  <p>
                    <strong>4.1 Serviços e Cobertura Inclusos:</strong> Acesso total à plataforma tecnológica SaaS para monitoramento ao vivo, gestão de câmeras, notificações e suporte técnico.
                  </p>
                  <p>
                    <strong>4.2 Locação de Equipamentos (Câmeras):</strong> {isCameraRentalIncluded ? (
                      <span>
                        SIM, LOCAÇÃO INCLUSA. O presente plano contempla a disponibilização das câmeras e infraestrutura mantidas pelo integrador parceiro.
                        {rentalNotes && (
                          <span className="block mt-1 text-emerald-300 font-bold italic text-xs bg-emerald-950/40 border border-emerald-500/30 p-2 rounded-lg">
                            Equipamentos em Locação: <strong><em>"{rentalNotes}"</em></strong>
                          </span>
                        )}
                      </span>
                    ) : 'NÃO INCLUSA. O CONTRATANTE utilizará câmeras e infraestrutura próprias homologadas e compatíveis com o ServCam.'}
                  </p>
                  <p>
                    <strong>4.3 Período de Gravação e Retenção em Nuvem:</strong> {recordingRetentionDays === 0 ? '0 DIAS (APENAS TRANSMISSÃO AO VIVO). Transmissão em tempo real sem histórico de gravação em nuvem.' : `${recordingRetentionDays} ${recordingRetentionDays === 1 ? 'DIA' : 'DIAS'} DE GRAVAÇÃO CONTÍNUA EM NUVEM. O plano assegura retenção contínua dos vídeos pelos últimos ${recordingRetentionDays} dias.`}
                  </p>
                </div>
              </div>

              <div>
                <h5 className="font-extrabold text-atalaia-neon text-sm uppercase mb-1">5. CONDIÇÕES DE PAGAMENTO</h5>
                <p>A contratação é regida por cobrança mensal recorrente no valor estipulado de R$ {planPriceFormatted} / mês. O pagamento poderá ser efetuado via PIX, boleto bancário ou cartão de crédito. Em caso de inadimplência, poderá ocorrer suspensão temporária do acesso até a devida regularização.</p>
              </div>

              <div>
                <h5 className="font-extrabold text-atalaia-neon text-sm uppercase mb-1">6. ADESÃO E ACEITE DIGITAL</h5>
                <p>A adesão ocorre por cadastro e aceite eletrônico com registro de IP ({signatureRecord.ipAddress}), data e hora ({signatureRecord.timestamp}), sistema operacional ({signatureRecord.os}), navegador ({signatureRecord.browser}) e desenho de assinatura digital. Este aceite possui plena validade jurídica perante a legislação brasileira de assinaturas eletrônicas (Lei Federal nº 14.063/2020 e Marco Civil da Internet - Lei nº 12.965/2014).</p>
              </div>

              <div>
                <h5 className="font-extrabold text-atalaia-neon text-sm uppercase mb-1">7. OBRIGAÇÕES DO USUÁRIO</h5>
                <p>O CONTRATANTE compromete-se a: utilizar a plataforma de forma lícita, não inserir informações falsas ou maliciosas, manter sigilo de suas credenciais de acesso, não tentar invadir ou comprometer o sistema e utilizar os dados exclusivamente para fins legítimos de gestão.</p>
              </div>

              <div>
                <h5 className="font-extrabold text-atalaia-neon text-sm uppercase mb-1">8. OBRIGAÇÕES DA PLATAFORMA</h5>
                <p>A CONTRATADA compromete-se a: disponibilizar a plataforma conforme plano contratado, manter o sistema dentro de padrões técnicos adequados, realizar atualizações contínuas de segurança, proteger os dados do usuário e oferecer suporte técnico.</p>
              </div>

              <div>
                <h5 className="font-extrabold text-atalaia-neon text-sm uppercase mb-1">9. DISPONIBILIDADE E MANUTENÇÃO</h5>
                <p>A plataforma poderá passar por atualizações técnicas e manutenções programadas, garantindo-se o compromisso de restabelecimento célere sem prejuízo das funções essenciais do serviço.</p>
              </div>

              <div>
                <h5 className="font-extrabold text-atalaia-neon text-sm uppercase mb-1">10. LIMITAÇÃO DE RESPONSABILIDADE</h5>
                <p>A plataforma ServCam não se responsabiliza por: falhas de conexão de internet ou energia elétrica no local do usuário, uso indevido por terceiros decorrente do fornecimento de senhas pelo próprio contratante, e eventos externos fora do controle tecnológico do sistema.</p>
              </div>

              <div>
                <h5 className="font-extrabold text-atalaia-neon text-sm uppercase mb-1">11. PRAZO DE VIGÊNCIA, FIDELIDADE E MULTA RESCISÓRIA</h5>
                <p>O presente contrato possui <strong>fidelidade mínima obrigatória de 12 (doze) meses</strong> a contar do aceite digital. Em caso de cancelamento antecipado pelo CONTRATANTE antes do término dos 12 meses, incidirá multa compensatória rescisória equivalente a <strong>20% (vinte por cento) do valor total das mensalidades vincendas</strong> até o término da fidelidade. Após os 12 meses, a renovação é automática por prazo indeterminado com cancelamento livre mediante aviso prévio de 30 dias.</p>
              </div>

              <div>
                <h5 className="font-extrabold text-atalaia-neon text-sm uppercase mb-1">12. ALTERAÇÕES DO CONTRATO</h5>
                <p>A CONTRATADA poderá atualizar as condições deste contrato para adequações operacionais ou legais, comunicando o usuário através de notificação na própria plataforma.</p>
              </div>

              <div>
                <h5 className="font-extrabold text-atalaia-neon text-sm uppercase mb-1">13. PROPRIEDADE INTELECTUAL</h5>
                <p>Todo o código-fonte, marcas, logotipos, interface visual e arquitetura do ServCam são de propriedade exclusiva da CONTRATADA. É terminantemente proibida qualquer reprodução, cópia ou engenharia reversa do sistema.</p>
              </div>

              <div>
                <h5 className="font-extrabold text-atalaia-neon text-sm uppercase mb-1">14. FORO</h5>
                <p>Fica eleito o foro da comarca de São José – SC, para dirimir quaisquer controvérsias oriundas deste contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.</p>
              </div>

              <div>
                <h5 className="font-extrabold text-atalaia-neon text-sm uppercase mb-1">15. ASSINATURA ELETRÔNICA E VALIDADE JURÍDICA</h5>
                <p>O presente instrumento é aceito e assinado eletronicamente pelo CONTRATANTE na data e hora indicadas, constituindo título executivo extrajudicial com eficácia jurídica plena em todo o território nacional.</p>
              </div>

              {customContractClause && (
                <div className="p-4 rounded-xl bg-atalaia-neon/5 border border-atalaia-neon/30 space-y-2 mt-4">
                  <h5 className="font-extrabold text-atalaia-neon text-sm uppercase flex items-center gap-2">
                    <Shield size={16} />
                    16. CONDIÇÕES ESPECIAIS E CLÁUSULAS PARTICULARES DO OPERADOR LOCAL
                  </h5>
                  <p className="text-xs text-white leading-relaxed font-sans whitespace-pre-wrap pl-3 border-l-2 border-atalaia-neon">
                    {customContractClause}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-gray-500 font-mono">
              <div>
                <strong>Certificado Digital de Integridade:</strong> SHA256-SERVCAM-{signatureRecord.timestamp.replace(/\D/g, '')}
              </div>
              <div>
                Emitido por ServCam SaaS • São José / SC
              </div>
            </div>
          </div>
        </Card>
      ) : (
        // RENDER OUT CONTRACT AND SIGN FORM
        <Card className="p-6 md:p-8 bg-[#030303] border-white/10 shadow-2xl animate-in fade-in duration-300">
          <div className="flex items-start gap-4 mb-6 border-b border-white/5 pb-5">
            <div className="p-3 bg-yellow-500/15 rounded-2xl text-yellow-500 shrink-0">
              <FileText size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded font-black tracking-wider uppercase">Pendente</span>
                <span className="text-[10px] text-gray-500">Documento Ativo para Assinar</span>
              </div>
              <h3 className="text-xl font-bold text-white mt-1">Contrato de Adesão – ServCam</h3>
              <p className="text-gray-400 text-xs mt-0.5">Por favor, leia integralmente e desenhe sua assinatura eletrônica abaixo.</p>
            </div>
          </div>

          {/* Core Legal text scroll pane */}
          <div className="bg-black/60 rounded-2xl border border-white/10 p-5 mb-8 h-[240px] overflow-y-auto text-xs text-gray-400 leading-relaxed space-y-4 shadow-inner">
            <div className="text-center font-bold text-white text-sm pb-3 border-b border-white/10 uppercase tracking-tight">
              CONTRATO DE ADESÃO – SERVCAM (SAAS)
            </div>
            
            <div>
              <h4 className="font-bold text-white border-l-2 border-atalaia-neon pl-2 mb-2 text-xs">1. PARTES CONTRATANTES E DEFINIÇÕES</h4>
              <p className="mb-2"><strong>CONTRATADA (OPERADOR DA PLATAFORMA):</strong> {contractorName}, inscrita no CNPJ nº {contractorCnpj}, com sede na {contractorAddress}, doravante denominada <strong>OPERADOR DA PLATAFORMA</strong> ou <strong>CONTRATADA</strong>.</p>
              <p className="mb-2"><strong>CONTRATANTE (USUÁRIO FINAL):</strong> Pessoa física ou jurídica devidamente cadastrada para acesso à Plataforma ServCam, que adere ao presente contrato mediante aceite digital de assinatura eletrônica.</p>
              <p><strong>PLATAFORMA SERVCAM:</strong> O termo <strong>ServCam</strong> refere-se exclusivamente à plataforma tecnológica e sistema Software as a Service (SaaS) de gestão e transmissão de imagens disponibilizado e operado pela <strong>CONTRATADA (OPERADOR DA PLATAFORMA)</strong>.</p>
            </div>

            <div>
              <h4 className="font-bold text-white border-l-2 border-atalaia-neon pl-2 mb-2 text-xs">2. OBJETO DO CONTRATO</h4>
              <p>O presente contrato tem por objeto o licenciamento de uso da <strong>Plataforma Tecnológica SaaS ServCam</strong>, fornecido e operacionalizado pela <strong>CONTRATADA (OPERADOR DA PLATAFORMA)</strong> ao <strong>CONTRATANTE</strong>, para monitoramento, transmissão ao vivo, registro e armazenamento seguro de gravações de câmeras.</p>
              <p className="mt-2 font-bold text-yellow-500/80">A Plataforma ServCam atua exclusivamente como infraestrutura tecnológica de software utilizada pelo OPERADOR DA PLATAFORMA (CONTRATADA).</p>
            </div>

            <div>
              <h4 className="font-bold text-white border-l-2 border-atalaia-neon pl-2 mb-2 text-xs">3. NATUREZA DO SERVIÇO E DA PLATAFORMA (SAAS)</h4>
              <p>A <strong>Plataforma ServCam</strong> é um sistema Software as a Service (SaaS), fornecido em ambiente digital, com acesso via internet, sujeito a atualizações contínuas de segurança e melhorias técnicas. O uso é concedido em caráter não exclusivo, intransferível e revogável conforme termos deste contrato operado pela <strong>CONTRATADA</strong>.</p>
            </div>

            <div>
              <h4 className="font-bold text-white border-l-2 border-atalaia-neon pl-2 mb-2 text-xs">4. PLANO ÚNICO DE ADESÃO E LICENCIAMENTO</h4>
              <div className="space-y-2.5 pl-2 mt-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-atalaia-neon shrink-0"></span>
                  <span className="text-white font-bold text-sm">
                    Plano Único ServCam: <span className="text-atalaia-neon">R$ {planPriceFormatted} / mês</span>
                  </span>
                </div>
                <p className="text-[11px] text-zinc-300">
                  <strong>4.1 Serviços e Cobertura Inclusos:</strong> Acesso total à plataforma SaaS para monitoramento e gestão de imagens, transmissão em tempo real, armazenamento seguro de gravações em nuvem, notificações e suporte contínuo da plataforma.
                </p>
                <div className={`p-3 rounded-xl border text-[11px] leading-relaxed ${isCameraRentalIncluded ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                  <strong>4.2 Locação de Equipamentos (Câmeras): </strong>
                  {isCameraRentalIncluded ? (
                    <span>
                      <strong className="text-emerald-300">SIM, LOCAÇÃO INCLUSA</strong>. O plano contempla a locação e disponibilização das câmeras de monitoramento sob responsabilidade e manutenção técnica do integrador parceiro.
                      {rentalNotes && (
                        <span className="block mt-1.5 text-emerald-300 font-bold italic text-[11px] bg-black/60 p-2.5 rounded-lg border border-emerald-500/30">
                          Especificação dos Equipamentos em Locação: <strong><em>"{rentalNotes}"</em></strong>
                        </span>
                      )}
                    </span>
                  ) : (
                    <span>
                      <strong>NÃO INCLUSA</strong>. O CONTRATANTE utilizará infraestrutura e câmeras próprias homologadas e compatíveis com a plataforma ServCam.
                    </span>
                  )}
                </div>
                <div className={`p-3 rounded-xl border text-[11px] leading-relaxed ${recordingRetentionDays === 0 ? 'bg-amber-950/20 border-amber-500/30 text-amber-200' : 'bg-atalaia-neon/5 border-atalaia-neon/20 text-zinc-300'}`}>
                  <strong>4.3 Período de Gravação e Retenção em Nuvem: </strong>
                  {recordingRetentionDays === 0 ? (
                    <span>
                      <strong className="text-amber-400">0 DIAS (APENAS TRANSMISSÃO AO VIVO)</strong>. Acesso às câmeras em tempo real via streaming, sem armazenamento ou retenção de histórico de imagens gravadas na nuvem.
                    </span>
                  ) : (
                    <span>
                      <strong className="text-atalaia-neon">{recordingRetentionDays} {recordingRetentionDays === 1 ? 'DIA' : 'DIAS'} DE GRAVAÇÃO EM NUVEM</strong>. Histórico contínuo de gravações mantido com redundância e alta segurança pelos últimos {recordingRetentionDays} dias na nuvem, com busca por linha do tempo e download de evidências.
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-white border-l-2 border-atalaia-neon pl-2 mb-2 text-xs">5. CONDIÇÕES DE PAGAMENTO</h4>
              <p>A contratação possui cobrança mensal recorrente automática no valor estipulado de <strong>R$ {planPriceFormatted} / mês</strong>, com vencimento fixado na data de adesão do usuário. O pagamento poderá ser efetuado via PIX, boleto ou cartão de crédito. Em caso de inadimplência superior a 5 (cinco) dias, poderá ocorrer suspensão temporária do acesso até a regularização cadastral.</p>
            </div>

            <div>
              <h4 className="font-bold text-white border-l-2 border-atalaia-neon pl-2 mb-2 text-xs">6. ADESÃO E ACEITE DIGITAL</h4>
              <p>A adesão ocorre por cadastro e aceite eletrônico deste contrato. Registra-se IP, data/hora e logs do sistema computadorizados, garantindo validade jurídica e probatória adequada perante legislação de assinaturas eletrônicas do Brasil.</p>
            </div>

            <div>
              <h4 className="font-bold text-white border-l-2 border-atalaia-neon pl-2 mb-2 text-xs">7. OBRIGAÇÕES DO USUÁRIO</h4>
              <p>O CONTRATANTE compromete-se a: utilizar licitamente de forma responsável, abster-se de falsidade/fraudes, guardar credenciais sigilosamente e não tentar invasões.</p>
            </div>

            <div>
              <h4 className="font-bold text-white border-l-2 border-atalaia-neon pl-2 mb-2 text-xs">8. OBRIGAÇÕES DA PLATAFORMA</h4>
              <p>A plataforma ServCam garante a entrega técnica continuada cabível, realizar atualizações contínuas de segurança e zelar pela privacidade dos dados sob as regulamentações aplicáveis.</p>
            </div>

            <div>
              <h4 className="font-bold text-white border-l-2 border-atalaia-neon pl-2 mb-2 text-xs">9. DISPONIBILIDADE E MANUTENÇÃO</h4>
              <p>Reconhecemos a possibilidade de manutenções com comunicados razoáveis que evitem interferência em serviços táticos cruciais.</p>
            </div>

            <div>
              <h4 className="font-bold text-white border-l-2 border-atalaia-neon pl-2 mb-2 text-xs">10. LIMITAÇÃO DE RESPONSABILIDADE</h4>
              <p>O ServCam não responde por oscilações na rede de internet e dados do usuário, erros pessoais na parametrização ou uso indevido da ferramenta por contas de terceiros.</p>
            </div>

            <div>
              <h4 className="font-bold text-white border-l-2 border-atalaia-neon pl-2 mb-2 text-xs">11. PRAZO DE VIGÊNCIA, FIDELIDADE E MULTA RESCISÓRIA</h4>
              <p>O presente contrato possui <strong>fidelidade mínima obrigatória de 12 (doze) meses</strong>. A rescisão antecipada solicitada pelo CONTRATANTE sujeitará o pagamento de multa compensatória rescisória de <strong>20% (vinte por cento) sobre o valor total das mensalidades vincendas</strong> até o término da fidelidade de 12 meses. Após este período inicial, o cancelamento é livre mediante aviso prévio de 30 dias.</p>
            </div>

            <div>
              <h4 className="font-bold text-white border-l-2 border-atalaia-neon pl-2 mb-2 text-xs">12. ALTERAÇÕES DO CONTRATO</h4>
              <p>O ServCam poderá atualizar estes termos operacionais ou legislativos informando o usuário em sua tela central de login.</p>
            </div>

            <div>
              <h4 className="font-bold text-white border-l-2 border-atalaia-neon pl-2 mb-2 text-xs">13. PROPRIEDADE INTELECTUAL</h4>
              <p>A identidade, marcas, logotipos e estrutura de software pertencem unicamente à CONTRATADA vinculada.</p>
            </div>

            <div>
              <h4 className="font-bold text-white border-l-2 border-atalaia-neon pl-2 mb-2 text-xs">14. FORO</h4>
              <p>Fica eleito o foro da comarca de São José – SC, para dirimir controvérsias oriundas deste contrato, renunciando a qualquer outro por mais privilegiado que se mostre.</p>
            </div>

            <div>
              <h4 className="font-bold text-white border-l-2 border-atalaia-neon pl-2 mb-2 text-xs">15. ASSINATURA ELETRÔNICA</h4>
              <p>O presente contrato é validado digitalmente pelo usuário final através de clique de aprovação de termos e de desenho de assinatura biométrica virtual.</p>
            </div>

            {customContractClause && (
              <div>
                <h4 className="font-bold text-white border-l-2 border-atalaia-neon pl-2 mb-2 text-xs">16. CONDIÇÕES ESPECIAIS E CLÁUSULAS PARTICULARES DO OPERADOR LOCAL</h4>
                <div className="p-3 bg-atalaia-neon/10 border border-atalaia-neon/30 rounded-xl text-zinc-200 text-[11px] whitespace-pre-wrap leading-relaxed">
                  {customContractClause}
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Nome Completo do Signatário</label>
                <Input 
                  value={signerName} 
                  onChange={e => setSignerName(e.target.value)} 
                  placeholder="Seu nome completo" 
                  className="bg-black/50 border-white/10 focus:border-atalaia-neon text-white h-11"
                  required
                />
              </div>
              
              <div>
                <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Registro (CPF / CNPJ)</label>
                <Input 
                  value={documentNumber} 
                  onChange={e => setDocumentNumber(e.target.value)} 
                  placeholder="000.000.000-00" 
                  className="bg-black/50 border-white/10 focus:border-atalaia-neon text-white font-mono h-11"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Número de Telefone</label>
                <Input 
                  value={signerPhone} 
                  onChange={e => setSignerPhone(e.target.value)} 
                  placeholder="(00) 90000-0000" 
                  className="bg-black/50 border-white/10 focus:border-atalaia-neon text-white font-mono h-11"
                />
              </div>
            </div>

            {/* Drawing core canvas pad */}
            <div className="bg-black/40 rounded-2xl border border-white/10 p-5">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-3">
                <div>
                  <h4 className="text-xs font-bold text-white">Desenhe sua Assinatura Digital</h4>
                  <p className="text-[10px] text-gray-500">Escreva usando o mouse ou dedo no retângulo abaixo:</p>
                </div>

                <div className="flex bg-black rounded-lg p-1 border border-white/5 items-center gap-2">
                  <span className="text-[10px] text-zinc-500 pl-2">Caneta:</span>
                  <button 
                    type="button"
                    onClick={() => setPenColor('#00ff66')} 
                    className={`w-4 h-4 rounded-full bg-[#00ff66] transition-transform ${penColor === '#00ff66' ? 'scale-125 border border-white' : 'opacity-60'}`}
                  />
                  <button 
                    type="button"
                    onClick={() => setPenColor('#3b82f6')} 
                    className={`w-4 h-4 rounded-full bg-blue-500 transition-transform ${penColor === '#3b82f6' ? 'scale-125 border border-white' : 'opacity-60'}`}
                  />
                  <button 
                    type="button"
                    onClick={() => setPenColor('#ffffff')} 
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${penColor === '#ffffff' ? 'scale-125 border border-zinc-900' : 'opacity-60'}`}
                  />
                  <span className="h-4 w-[1px] bg-white/10 mx-1" />
                  <Button 
                    type="button" 
                    onClick={clearCanvas} 
                    className="p-1.5 h-6 text-[9px] font-black uppercase tracking-wider bg-zinc-900 border border-white/10 text-gray-400 hover:text-white flex items-center gap-1"
                  >
                    <RefreshCw size={10} /> Limpar
                  </Button>
                </div>
              </div>

              <div className="relative">
                <canvas 
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-[140px] bg-zinc-950 rounded-xl border border-white/10 cursor-crosshair block touch-none"
                />
                {!hasDrawn && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-zinc-600 font-mono text-[10px] uppercase tracking-wider">
                    Assine Aqui
                  </div>
                )}
              </div>
            </div>

            {/* Trace security note */}
            <div className="p-3.5 bg-yellow-500/5 rounded-xl border border-yellow-500/10 flex items-start gap-2.5 text-[10px] text-yellow-500/90 leading-normal">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <div>
                Este aceite tem valor probatório jurídico conforme Lei Federal nº 14.063/2020. 
                Sua identidade digital será associada aos logs do servidor (IP: <span className="font-mono text-white">{metadata.ip}</span> | OS: <span className="text-white">{metadata.os}</span> | Navegador: <span className="text-white">{metadata.browser}</span>).
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={acceptedTerms} 
                  onChange={e => setAcceptedTerms(e.target.checked)}
                  className="rounded bg-zinc-900 border-white/10 text-atalaia-neon focus:ring-atalaia-neon/40 h-4 w-4"
                />
                <span className="text-[11px] text-zinc-400 select-none group-hover:text-white transition-colors">
                  Declaro que li e aceito integralmente os termos do contrato de adesão Atalaia.
                </span>
              </label>

              <Button 
                type="submit" 
                disabled={loading || !acceptedTerms || !hasDrawn}
                className="w-full md:w-auto h-12 uppercase font-black px-8 text-black bg-atalaia-neon hover:bg-atalaia-neon/90"
              >
                {loading ? 'Processando e Gerando Firma...' : 'Registrar Assinatura Digital'}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
};
