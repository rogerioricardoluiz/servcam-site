import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Button } from '../components/UI';
import { ShieldCheck, Lock, QrCode, CreditCard, FileText, CheckCircle, Loader2 } from 'lucide-react';

const PaymentCheckout: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const cameras = searchParams.get('cameras') ? Number(searchParams.get('cameras')) : 1;
  const rawAmount = searchParams.get('amount') ? Number(searchParams.get('amount')) : cameras * 24.90;
  const amount = isNaN(rawAmount) ? cameras * 24.90 : rawAmount;
  const plan = searchParams.get('plan') || 'CUSTOM';
  const coupon = searchParams.get('coupon') || '';

  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit' | 'boleto'>('pix');
  const [loading, setLoading] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate(`/payment-success?plan=${plan}&coupon=${coupon}`);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white flex flex-col items-center justify-center p-4">
      {/* Mercado Pago Header Bar */}
      <div className="w-full max-w-xl bg-[#1e293b] rounded-t-xl p-4 flex items-center justify-between border-b border-gray-700 shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="bg-[#009ee3] text-white font-black px-3 py-1 rounded text-sm tracking-wider">
            MERCADO PAGO
          </div>
          <span className="text-xs text-gray-300 flex items-center">
            <Lock size={12} className="mr-1 text-green-400" /> Checkout Pro Seguro
          </span>
        </div>
        <div className="text-xs text-green-400 font-semibold bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/20 flex items-center">
          <ShieldCheck size={14} className="mr-1" /> Ambiente Criptografado
        </div>
      </div>

      <Card className="w-full max-w-xl p-6 bg-[#111827] rounded-b-xl rounded-t-none border-t-0 border-gray-800 shadow-2xl">
        <div className="mb-6 border-b border-gray-800 pb-4">
          <h1 className="text-xl font-bold text-white mb-1">Resumo da Assinatura ServCam</h1>
          <p className="text-sm text-gray-400">
            {cameras} {cameras === 1 ? 'câmera ativa' : 'câmeras ativas'} • 3 dias de gravação em nuvem inclusos
          </p>
          <div className="mt-4 flex items-center justify-between bg-gray-900 p-3 rounded-lg border border-gray-800">
            <span className="text-sm text-gray-300">Total a pagar:</span>
            <span className="text-2xl font-black text-atalaia-neon">
              R$ {amount.toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center">
            <Loader2 size={48} className="text-atalaia-neon animate-spin mb-4" />
            <h3 className="text-lg font-bold">Processando Pagamento...</h3>
            <p className="text-sm text-gray-400 mt-1">Comunicando com o gateway do Mercado Pago</p>
          </div>
        ) : (
          <form onSubmit={handlePay} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                Escolha a forma de pagamento
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('pix')}
                  className={`p-3 rounded-lg border flex flex-col items-center justify-center transition-all ${
                    paymentMethod === 'pix'
                      ? 'bg-[#009ee3]/20 border-[#009ee3] text-white shadow-[0_0_15px_rgba(0,158,227,0.3)]'
                      : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  <QrCode size={22} className="mb-1 text-[#009ee3]" />
                  <span className="text-xs font-bold">PIX (Instantâneo)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('credit')}
                  className={`p-3 rounded-lg border flex flex-col items-center justify-center transition-all ${
                    paymentMethod === 'credit'
                      ? 'bg-[#009ee3]/20 border-[#009ee3] text-white shadow-[0_0_15px_rgba(0,158,227,0.3)]'
                      : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  <CreditCard size={22} className="mb-1 text-atalaia-neon" />
                  <span className="text-xs font-bold">Cartão de Crédito</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('boleto')}
                  className={`p-3 rounded-lg border flex flex-col items-center justify-center transition-all ${
                    paymentMethod === 'boleto'
                      ? 'bg-[#009ee3]/20 border-[#009ee3] text-white shadow-[0_0_15px_rgba(0,158,227,0.3)]'
                      : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  <FileText size={22} className="mb-1 text-amber-400" />
                  <span className="text-xs font-bold">Boleto Bancário</span>
                </button>
              </div>
            </div>

            {paymentMethod === 'pix' && (
              <div className="bg-gray-900/80 p-4 rounded-lg border border-gray-800 text-center space-y-3">
                <div className="w-36 h-36 bg-white mx-auto p-2 rounded flex items-center justify-center">
                  <div className="w-full h-full border-4 border-dashed border-gray-800 flex items-center text-xs text-black font-mono font-bold text-center p-2">
                    QR CODE PIX GERADO
                  </div>
                </div>
                <p className="text-xs text-gray-300">
                  Escaneie o QR Code com o aplicativo do seu banco ou utilize a chave Copia e Cola.
                </p>
                <div className="bg-black/50 p-2 rounded text-xs font-mono text-gray-400 truncate select-all">
                  00020126580014br.gov.bcb.pix...servcam_checkout_{cameras}cams
                </div>
              </div>
            )}

            {paymentMethod === 'credit' && (
              <div className="space-y-4 bg-gray-900/80 p-4 rounded-lg border border-gray-800">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Número do Cartão</label>
                  <input
                    type="text"
                    required
                    placeholder="4000 0000 0000 0000"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full bg-black/60 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#009ee3]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Nome impresso no cartão</label>
                  <input
                    type="text"
                    required
                    placeholder="NOME DO TITULAR"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className="w-full bg-black/60 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#009ee3]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Validade (MM/AA)</label>
                    <input
                      type="text"
                      required
                      placeholder="12/28"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="w-full bg-black/60 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#009ee3]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">CVV</label>
                    <input
                      type="text"
                      required
                      placeholder="123"
                      maxLength={4}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      className="w-full bg-black/60 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#009ee3]"
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === 'boleto' && (
              <div className="bg-gray-900/80 p-4 rounded-lg border border-gray-800 text-center space-y-3">
                <FileText size={36} className="text-amber-400 mx-auto" />
                <p className="text-sm text-gray-300">
                  O boleto bancário será gerado após a confirmação. O prazo de compensação é de até 1 dia útil.
                </p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full py-3 bg-[#009ee3] hover:bg-[#0082be] text-white font-bold rounded-lg shadow-lg flex items-center justify-center space-x-2"
            >
              <Lock size={16} />
              <span>Pagar R$ {amount.toFixed(2).replace('.', ',')} com Mercado Pago</span>
            </Button>
          </form>
        )}

        <div className="mt-6 text-center text-xs text-gray-500">
          Pagamento processado via ambiente seguro Mercado Pago Checkout Pro. Suas informações estão protegidas.
        </div>
      </Card>
    </div>
  );
};

export default PaymentCheckout;
