// src/app/(dashboard)/cobros/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';

interface CobroObra {
  id: string;
  codigo: string;
  estado: string;
  cliente: { nombre: string; apellidos: string; telefono: string | null };
  presupuestoTotal: number;
  totalCobrado: number;
  pendiente: number;
  porcentaje: number;
  diasSinCobro: number;
  efectivoPendiente: number;
  numPagos: number;
}

interface Alerta {
  tipo: string;
  icon: string;
  label: string;
  color: string;
  conteo: number;
}

interface Resumen {
  facturacion: number;
  cobradoMes: number;
  pendienteTotal: number;
  porcentaje: number;
  delta: number;
}

export default function CobrosPage() {
  const [cobros, setCobros] = useState<CobroObra[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [modalObra, setModalObra] = useState<CobroObra | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    const params = filtro ? `?filtro=${filtro}` : '';
    const [cobrosRes, alertasRes, resumenRes] = await Promise.all([
      fetch(`/api/cobros${params}`).then(r => r.json()),
      fetch('/api/cobros/alertas').then(r => r.json()),
      fetch('/api/cobros/resumen').then(r => r.json()),
    ]);
    if (cobrosRes.ok) setCobros(cobrosRes.data);
    if (alertasRes.ok) setAlertas(alertasRes.data);
    if (resumenRes.ok) setResumen(resumenRes.data);
    setLoading(false);
  }, [filtro]);

  useEffect(() => { cargar(); }, [cargar]);

  const fmt = (c: number) => (c / 100).toLocaleString('es-ES', { minimumFractionDigits: 0 });

  const agingColor = (dias: number) => {
    if (dias >= 30) return 'text-estado-red bg-estado-red/10';
    if (dias >= 15) return 'text-estado-amber bg-estado-amber/10';
    return 'text-estado-green bg-estado-green/10';
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-auro-navy mb-5">Cobros y pagos</h2>

      {/* KPIs resumen mensual */}
      {resumen && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
          {[
            { label: 'Facturación mes', value: `${fmt(resumen.facturacion)}€`, icon: '💶', color: 'text-auro-orange' },
            { label: 'Cobrado mes', value: `${fmt(resumen.cobradoMes)}€`, icon: '✅', color: 'text-estado-green' },
            { label: 'Pendiente total', value: `${fmt(resumen.pendienteTotal)}€`, icon: '⏰', color: 'text-estado-red' },
            { label: '% cobro mes', value: `${resumen.porcentaje}%`, icon: '📊', color: 'text-estado-blue' },
            { label: 'vs mes anterior', value: `${resumen.delta >= 0 ? '▲' : '▼'} ${Math.abs(resumen.delta)}%`, icon: resumen.delta >= 0 ? '📈' : '📉', color: resumen.delta >= 0 ? 'text-estado-green' : 'text-estado-red' },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-white rounded-card border border-auro-border p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{kpi.icon}</span>
                <span className="text-[10px] font-bold text-auro-navy/30 uppercase tracking-wider">{kpi.label}</span>
              </div>
              <div className={`text-xl font-extrabold ${kpi.color}`}>{kpi.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Alertas watchdog */}
      {alertas.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          <button
            onClick={() => setFiltro('')}
            className={`shrink-0 h-8 px-3 rounded-full text-xs font-semibold border transition-colors
              ${!filtro ? 'bg-auro-navy text-white border-auro-navy' : 'bg-white text-auro-navy/50 border-auro-border'}`}
          >
            Todos
          </button>
          {alertas.map((a) => (
            <button
              key={a.tipo}
              onClick={() => setFiltro(filtro === a.tipo ? '' : a.tipo)}
              className={`shrink-0 h-8 px-3 rounded-full text-xs font-semibold border transition-colors flex items-center gap-1.5
                ${filtro === a.tipo
                  ? a.color === 'red' ? 'bg-estado-red/10 text-estado-red border-estado-red/20' : 'bg-estado-amber/10 text-estado-amber border-estado-amber/20'
                  : 'bg-white text-auro-navy/50 border-auro-border'}`}
            >
              <span>{a.icon}</span> {a.label} · {a.conteo}
            </button>
          ))}
        </div>
      )}

      {/* Tabla de cobros pendientes */}
      {loading ? (
        <div className="bg-white rounded-card border border-auro-border p-12 text-center">
          <div className="w-8 h-8 border-3 border-auro-orange/20 border-t-auro-orange rounded-full animate-spin mx-auto" />
        </div>
      ) : cobros.length === 0 ? (
        <div className="bg-white rounded-card border border-auro-border p-12 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <p className="text-sm text-auro-navy/50 font-medium">Sin cobros pendientes</p>
        </div>
      ) : (
        <>
          {/* Tabla escritorio */}
          <div className="hidden lg:block bg-white rounded-card border border-auro-border overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="bg-auro-surface-2">
                  {['Aging', 'Código', 'Cliente', 'Presupuesto', 'Cobrado', 'Pendiente', '% Cobro', ''].map((h) => (
                    <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-auro-navy/30 px-4 py-3 border-b border-auro-border">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cobros.map((obra) => (
                  <tr key={obra.id} className="border-b border-auro-border last:border-0 hover:bg-auro-surface-2/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center justify-center w-10 h-7 rounded-lg text-[11px] font-bold ${agingColor(obra.diasSinCobro)}`}>
                        {obra.diasSinCobro}d
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] font-bold text-auro-orange">{obra.codigo}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold">{obra.cliente.nombre} {obra.cliente.apellidos}</div>
                      {obra.efectivoPendiente > 0 && (
                        <span className="text-[10px] font-bold text-estado-red bg-estado-red/10 px-1.5 py-0.5 rounded-full">
                          💵 {fmt(obra.efectivoPendiente)}€ efectivo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-auro-navy/50 tabular-nums text-right">{fmt(obra.presupuestoTotal)}€</td>
                    <td className="px-4 py-3 text-sm font-semibold text-estado-green tabular-nums text-right">{fmt(obra.totalCobrado)}€</td>
                    <td className="px-4 py-3 text-sm font-bold text-estado-red tabular-nums text-right">{fmt(obra.pendiente)}€</td>
                    <td className="px-4 py-3 w-28">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-auro-surface-3 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${obra.porcentaje >= 100 ? 'bg-estado-green' : obra.porcentaje >= 50 ? 'bg-auro-orange' : 'bg-estado-red'}`}
                            style={{ width: `${Math.min(obra.porcentaje, 100)}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-auro-navy/40 tabular-nums w-8 text-right">{obra.porcentaje}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setModalObra(obra)}
                        className="h-8 px-3 rounded-lg text-xs font-semibold bg-auro-orange/10 text-auro-orange hover:bg-auro-orange hover:text-white transition-colors"
                      >
                        💰 Cobrar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards móvil */}
          <div className="lg:hidden space-y-3">
            {cobros.map((obra) => (
              <div key={obra.id} className="bg-white border border-auro-border rounded-card p-4 shadow-sm" onClick={() => setModalObra(obra)}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-[11px] font-bold text-auro-orange">{obra.codigo}</div>
                    <div className="text-sm font-bold">{obra.cliente.nombre} {obra.cliente.apellidos}</div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${agingColor(obra.diasSinCobro)}`}>
                    {obra.diasSinCobro}d
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-estado-red">{fmt(obra.pendiente)}€ pte.</span>
                  <div className="flex items-center gap-2 w-20">
                    <div className="flex-1 h-1.5 bg-auro-surface-3 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${obra.porcentaje >= 50 ? 'bg-auro-orange' : 'bg-estado-red'}`} style={{ width: `${obra.porcentaje}%` }} />
                    </div>
                    <span className="text-[10px] font-semibold text-auro-navy/40">{obra.porcentaje}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal registrar cobro */}
      {modalObra && (
        <RegistrarCobroModal
          obra={modalObra}
          onClose={() => setModalObra(null)}
          onRegistrado={() => { setModalObra(null); cargar(); }}
        />
      )}
    </div>
  );
}

// ── Modal de registro de cobro ──
function RegistrarCobroModal({ obra, onClose, onRegistrado }: {
  obra: CobroObra;
  onClose: () => void;
  onRegistrado: () => void;
}) {
  const [importeEuros, setImporteEuros] = useState('');
  const [metodo, setMetodo] = useState('TRANSFERENCIA');
  const [concepto, setConcepto] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fmt = (c: number) => (c / 100).toLocaleString('es-ES', { minimumFractionDigits: 0 });

  async function handleSubmit() {
    if (!importeEuros) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/cobros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          obraId: obra.id,
          importe: Math.round(parseFloat(importeEuros) * 100),
          metodo,
          concepto: concepto || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        onRegistrado();
      } else {
        setError(data.error);
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  const METODOS = [
    { value: 'TRANSFERENCIA', icon: '🏦', label: 'Transferencia' },
    { value: 'EFECTIVO', icon: '💵', label: 'Efectivo' },
    { value: 'FINANCIACION', icon: '📄', label: 'Financiación' },
    { value: 'TARJETA', icon: '💳', label: 'Tarjeta' },
    { value: 'DOMICILIACION', icon: '📋', label: 'Domiciliación' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-10 lg:pt-16 px-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mb-10" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-auro-border flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-auro-orange">{obra.codigo}</div>
            <h3 className="text-base font-bold">{obra.cliente.nombre} {obra.cliente.apellidos}</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-auro-surface-2 hover:bg-auro-surface-3 flex items-center justify-center text-lg">✕</button>
        </div>

        {/* Barra de progreso */}
        <div className="px-5 py-4 bg-auro-surface-2/50 border-b border-auro-border">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-auro-navy/40">Presupuesto: <span className="font-bold text-auro-navy">{fmt(obra.presupuestoTotal)}€</span></span>
            <span className="text-auro-navy/40">Cobrado: <span className="font-bold text-estado-green">{fmt(obra.totalCobrado)}€</span></span>
          </div>
          <div className="h-3 bg-auro-surface-3 rounded-full overflow-hidden mb-1.5">
            <div
              className={`h-full rounded-full transition-all ${obra.porcentaje >= 100 ? 'bg-estado-green' : obra.porcentaje >= 50 ? 'bg-auro-orange' : 'bg-estado-red'}`}
              style={{ width: `${Math.min(obra.porcentaje, 100)}%` }}
            />
          </div>
          <div className="text-center text-sm font-bold text-estado-red">
            Pendiente: {fmt(obra.pendiente)}€
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Importe */}
          <div>
            <label className="block text-[10px] font-bold text-auro-navy/30 uppercase tracking-wider mb-1.5">Importe del cobro</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={importeEuros}
                onChange={(e) => setImporteEuros(e.target.value)}
                placeholder="0,00"
                autoFocus
                className="w-full h-14 px-4 pr-10 bg-auro-surface-2 border border-auro-border rounded-card text-center text-2xl font-extrabold placeholder-auro-navy/15 focus:outline-none focus:border-auro-orange/40"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl text-auro-navy/25 font-bold">€</span>
            </div>
          </div>

          {/* Método de pago */}
          <div>
            <label className="block text-[10px] font-bold text-auro-navy/30 uppercase tracking-wider mb-1.5">Método de pago</label>
            <div className="grid grid-cols-3 gap-2">
              {METODOS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMetodo(m.value)}
                  className={`py-2.5 rounded-button border-2 flex flex-col items-center gap-0.5 transition-all text-center
                    ${metodo === m.value ? 'border-auro-orange bg-auro-orange/5' : 'border-auro-border bg-white'}`}
                >
                  <span className="text-lg">{m.icon}</span>
                  <span className="text-[10px] font-bold leading-tight">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Aviso efectivo */}
          {metodo === 'EFECTIVO' && (
            <div className="bg-estado-amber/10 border border-estado-amber/20 rounded-xl px-3 py-2 text-xs text-estado-amber font-medium flex items-center gap-2">
              <span>⚡</span> El efectivo quedará como "pendiente de ingresar en banco"
            </div>
          )}

          {/* Concepto */}
          <input
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            placeholder="Concepto (ej: Anticipo 50%, Fin de obra...)"
            className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm placeholder-auro-navy/25 focus:outline-none focus:border-auro-orange/40"
          />

          {error && (
            <div className="bg-estado-red/10 border border-estado-red/20 rounded-xl px-3 py-2 text-xs text-estado-red font-medium">
              ⚠️ {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!importeEuros || loading}
            className="w-full h-12 bg-auro-orange hover:bg-auro-orange-dark text-white font-bold rounded-button text-sm transition-colors disabled:opacity-40 shadow-sm shadow-auro-orange/20 flex items-center justify-center gap-2"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>💰 Registrar cobro</>}
          </button>
        </div>
      </div>
    </div>
  );
}
