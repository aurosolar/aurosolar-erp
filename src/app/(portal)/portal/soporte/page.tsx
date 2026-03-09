// src/app/(portal)/portal/soporte/page.tsx
'use client';

import { useState, useEffect } from 'react';

interface ObraSimple { id: string; codigo: string; tipo: string; estado: string; }

export default function PortalSoportePage() {
  const [obras, setObras] = useState<ObraSimple[]>([]);
  const [obraId, setObraId] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    fetch('/api/portal/obras').then(r => r.json()).then(d => {
      if (d.ok) {
        setObras(d.data);
        if (d.data.length === 1) setObraId(d.data[0].id);
      }
    });
  }, []);

  async function enviar() {
    if (!obraId || descripcion.length < 10) return;
    setEnviando(true);
    const res = await fetch('/api/portal/soporte', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'aurosolar-erp' },
      body: JSON.stringify({ obraId, descripcion }),
    });
    if ((await res.json()).ok) {
      setEnviado(true);
      setDescripcion('');
    }
    setEnviando(false);
  }

  if (enviado) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-extrabold text-auro-navy mb-2">Ticket enviado</h2>
        <p className="text-sm text-auro-navy/40 mb-6">Nuestro equipo revisará tu solicitud lo antes posible</p>
        <button onClick={() => setEnviado(false)} className="h-10 px-6 bg-auro-orange text-white font-bold text-sm rounded-button">
          Enviar otro ticket
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-extrabold text-auro-navy mb-2">Soporte</h1>
      <p className="text-sm text-auro-navy/40 mb-6">Cuéntanos tu problema y te ayudamos</p>

      <div className="bg-white rounded-xl border border-auro-border p-4">
        {/* Selector de obra */}
        <div className="mb-4">
          <label className="block text-[10px] font-bold text-auro-navy/30 uppercase tracking-wider mb-1.5">Instalación</label>
          {obras.length <= 1 ? (
            <div className="h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-xl flex items-center text-sm">
              {obras[0]?.codigo || 'Cargando...'} — {obras[0]?.tipo}
            </div>
          ) : (
            <select value={obraId} onChange={e => setObraId(e.target.value)}
              className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-xl text-sm focus:outline-none focus:border-auro-orange/40">
              <option value="">Selecciona una instalación</option>
              {obras.map(o => <option key={o.id} value={o.id}>{o.codigo} — {o.tipo}</option>)}
            </select>
          )}
        </div>

        {/* Descripción */}
        <div className="mb-4">
          <label className="block text-[10px] font-bold text-auro-navy/30 uppercase tracking-wider mb-1.5">¿Qué ha pasado?</label>
          <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={4}
            placeholder="Describe el problema con el mayor detalle posible..."
            className="w-full px-3 py-2.5 bg-auro-surface-2 border border-auro-border rounded-xl text-sm resize-none focus:outline-none focus:border-auro-orange/40" />
          <div className="text-[10px] text-auro-navy/20 mt-1">{descripcion.length}/10 caracteres mínimo</div>
        </div>

        <button onClick={enviar} disabled={enviando || !obraId || descripcion.length < 10}
          className="w-full h-11 bg-auro-orange hover:bg-auro-orange-dark text-white font-bold text-sm rounded-button disabled:opacity-40 transition-colors">
          {enviando ? 'Enviando...' : '💬 Enviar ticket de soporte'}
        </button>
      </div>

      {/* Info */}
      <div className="mt-4 p-3 bg-estado-blue/5 rounded-xl border border-estado-blue/10">
        <div className="text-[10px] font-bold text-estado-blue/60 uppercase mb-1">¿Cómo funciona?</div>
        <div className="text-xs text-auro-navy/40 space-y-1">
          <p>1. Describe tu problema con el mayor detalle posible</p>
          <p>2. Nuestro equipo recibe el ticket automáticamente</p>
          <p>3. Te contactaremos para resolver la incidencia</p>
        </div>
      </div>
    </div>
  );
}
