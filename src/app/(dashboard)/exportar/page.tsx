// src/app/(dashboard)/exportar/page.tsx
'use client';

import { useState } from 'react';

export default function ExportarPage() {
  const [anonClienteId, setAnonClienteId] = useState('');
  const [confirmacion, setConfirmacion] = useState(false);
  const [resultado, setResultado] = useState('');
  const [procesando, setProcesando] = useState(false);

  function descargar(tipo: string) {
    window.open(`/api/export?tipo=${tipo}`, '_blank');
  }

  async function exportarGDPR() {
    if (!anonClienteId) return;
    const res = await fetch(`/api/export/gdpr?clienteId=${anonClienteId}`);
    const data = await res.json();
    if (data.ok) {
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `gdpr_export_${anonClienteId.slice(0, 8)}.json`; a.click();
      URL.revokeObjectURL(url);
    }
  }

  async function anonimizar() {
    if (!anonClienteId || !confirmacion) return;
    setProcesando(true);
    const res = await fetch('/api/export/gdpr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clienteId: anonClienteId, confirmacion: true }),
    });
    const data = await res.json();
    setProcesando(false);
    setResultado(data.ok ? '✅ Cliente anonimizado correctamente' : `❌ ${data.error}`);
    setConfirmacion(false);
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-auro-navy mb-5">Exportación de datos y GDPR</h2>

      {/* Export CSV */}
      <div className="bg-white rounded-card border border-auro-border p-5 mb-5">
        <h3 className="text-sm font-bold mb-3">📥 Exportar datos a CSV</h3>
        <p className="text-xs text-auro-navy/40 mb-4">Descarga archivos CSV compatibles con Excel. Separador punto y coma (;).</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { tipo: 'obras', icon: '🏗️', label: 'Obras', desc: 'Todas las obras con cliente, estado, importes' },
            { tipo: 'clientes', icon: '👥', label: 'Clientes', desc: 'Datos de contacto y nº obras' },
            { tipo: 'cobros', icon: '💰', label: 'Cobros', desc: 'Historial de pagos con obra y método' },
          ].map(e => (
            <button key={e.tipo} onClick={() => descargar(e.tipo)}
              className="bg-auro-surface-2 rounded-xl p-4 text-left hover:bg-auro-orange/5 hover:border-auro-orange/30 border border-auro-border transition-all">
              <div className="text-2xl mb-2">{e.icon}</div>
              <div className="text-sm font-bold mb-1">{e.label}</div>
              <div className="text-[10px] text-auro-navy/30">{e.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* GDPR */}
      <div className="bg-white rounded-card border border-auro-border p-5">
        <h3 className="text-sm font-bold mb-1">🔒 Cumplimiento GDPR</h3>
        <p className="text-xs text-auro-navy/40 mb-4">Derecho de acceso y derecho al olvido del interesado.</p>

        <div className="mb-4">
          <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">ID del cliente</label>
          <input value={anonClienteId} onChange={e => setAnonClienteId(e.target.value)} placeholder="UUID del cliente"
            className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40" />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <button onClick={exportarGDPR} disabled={!anonClienteId}
            className="h-11 bg-estado-blue text-white font-bold rounded-button text-sm disabled:opacity-50 transition-colors hover:opacity-90">
            📥 Exportar datos (derecho acceso)
          </button>
          <div>
            <label className="flex items-center gap-2 mb-2 cursor-pointer">
              <input type="checkbox" checked={confirmacion} onChange={e => setConfirmacion(e.target.checked)}
                className="w-4 h-4 rounded border-auro-border accent-estado-red" />
              <span className="text-[10px] text-estado-red font-semibold">Confirmo la anonimización IRREVERSIBLE</span>
            </label>
            <button onClick={anonimizar} disabled={!anonClienteId || !confirmacion || procesando}
              className="w-full h-11 bg-estado-red text-white font-bold rounded-button text-sm disabled:opacity-50 transition-colors hover:opacity-90">
              {procesando ? 'Procesando...' : '🗑️ Anonimizar (derecho al olvido)'}
            </button>
          </div>
        </div>

        {resultado && (
          <div className={`text-xs font-semibold p-3 rounded-lg ${resultado.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {resultado}
          </div>
        )}
      </div>
    </div>
  );
}
