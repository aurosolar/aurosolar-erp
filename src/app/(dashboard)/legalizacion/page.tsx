// src/app/(dashboard)/legalizacion/page.tsx
'use client';

import { useState, useEffect } from 'react';

interface ObraLegal {
  id: string;
  codigo: string;
  estado: string;
  estadoLegalizacion: string | null;
  expedienteLegal: string | null;
  updatedAt: string;
  cliente: { nombre: string; apellidos: string };
}

const ESTADOS_LEGAL = [
  { value: 'PENDIENTE', label: 'Pendiente', icon: '⏳', color: 'bg-estado-amber/10 text-estado-amber border-estado-amber/20' },
  { value: 'SOLICITADA', label: 'Solicitada', icon: '📤', color: 'bg-estado-blue/10 text-estado-blue border-estado-blue/20' },
  { value: 'EN_TRAMITE', label: 'En trámite', icon: '⚙️', color: 'bg-estado-purple/10 text-estado-purple border-estado-purple/20' },
  { value: 'APROBADA', label: 'Aprobada', icon: '✅', color: 'bg-estado-green/10 text-estado-green border-estado-green/20' },
  { value: 'INSCRITA', label: 'Inscrita', icon: '🏆', color: 'bg-estado-green/10 text-estado-green border-estado-green/20' },
];

export default function LegalizacionPage() {
  const [obras, setObras] = useState<ObraLegal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<ObraLegal | null>(null);
  const [nuevoEstadoLegal, setNuevoEstadoLegal] = useState('');
  const [expediente, setExpediente] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    const res = await fetch('/api/legalizacion');
    const data = await res.json();
    if (data.ok) setObras(data.data);
    setLoading(false);
  }

  async function guardar() {
    if (!editando) return;
    setGuardando(true);
    const res = await fetch(`/api/legalizacion/${editando.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estadoLegal: nuevoEstadoLegal, expediente: expediente || undefined }),
    });
    if ((await res.json()).ok) {
      setEditando(null);
      cargar();
    }
    setGuardando(false);
  }

  function abrirEditar(obra: ObraLegal) {
    setEditando(obra);
    setNuevoEstadoLegal(obra.estadoLegalizacion || 'PENDIENTE');
    setExpediente(obra.expedienteLegal || '');
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-auro-navy mb-5">Legalización</h2>

      {/* Resumen por estado legal */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {ESTADOS_LEGAL.map((e) => {
          const count = obras.filter(o => (o.estadoLegalizacion || 'PENDIENTE') === e.value).length;
          return (
            <div key={e.value} className={`shrink-0 rounded-xl border px-4 py-2.5 text-center min-w-[90px] ${e.color}`}>
              <div className="text-xl font-extrabold">{count}</div>
              <div className="text-[10px] font-bold">{e.icon} {e.label}</div>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="bg-white rounded-card border border-auro-border p-12 text-center">
          <div className="w-8 h-8 border-3 border-auro-orange/20 border-t-auro-orange rounded-full animate-spin mx-auto" />
        </div>
      ) : obras.length === 0 ? (
        <div className="bg-white rounded-card border border-auro-border p-12 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-sm text-auro-navy/50">Sin obras en legalización</p>
        </div>
      ) : (
        <div className="bg-white rounded-card border border-auro-border overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-auro-surface-2">
                {['Código', 'Cliente', 'Estado legal', 'Expediente', 'Días en estado', ''].map(h => (
                  <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-auro-navy/30 px-4 py-3 border-b border-auro-border">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {obras.map((obra) => {
                const dias = Math.floor((Date.now() - new Date(obra.updatedAt).getTime()) / 86400000);
                const estLegal = obra.estadoLegalizacion || 'PENDIENTE';
                const cfg = ESTADOS_LEGAL.find(e => e.value === estLegal) || ESTADOS_LEGAL[0];
                return (
                  <tr key={obra.id} className="border-b border-auro-border last:border-0 hover:bg-auro-surface-2/50">
                    <td className="px-4 py-3 text-xs font-bold text-auro-orange">{obra.codigo}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{obra.cliente.nombre} {obra.cliente.apellidos}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-auro-navy/50 font-mono">{obra.expedienteLegal || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold ${dias >= 30 ? 'text-estado-red' : dias >= 15 ? 'text-estado-amber' : 'text-auro-navy/40'}`}>
                        {dias}d
                      </span>
                      {dias >= 30 && <span className="ml-1 text-[9px] text-estado-red">⚠️</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => abrirEditar(obra)} className="h-7 px-2.5 rounded-lg text-[10px] font-semibold bg-estado-blue/10 text-estado-blue hover:bg-estado-blue hover:text-white transition-colors">
                        Actualizar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal editar estado legal */}
      {editando && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setEditando(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold mb-1">Actualizar legalización</h3>
            <p className="text-xs text-auro-navy/40 mb-4">{editando.codigo} · {editando.cliente.nombre}</p>

            <div className="mb-4">
              <label className="block text-[10px] font-bold text-auro-navy/30 uppercase tracking-wider mb-1.5">Estado legal</label>
              <div className="space-y-1.5">
                {ESTADOS_LEGAL.map((e) => (
                  <button
                    key={e.value}
                    onClick={() => setNuevoEstadoLegal(e.value)}
                    className={`w-full h-10 px-3 rounded-xl border-2 text-sm font-semibold flex items-center gap-2 transition-all
                      ${nuevoEstadoLegal === e.value ? `${e.color}` : 'border-auro-border bg-white text-auro-navy/50'}`}
                  >
                    <span>{e.icon}</span> {e.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-[10px] font-bold text-auro-navy/30 uppercase tracking-wider mb-1.5">Nº expediente</label>
              <input value={expediente} onChange={e => setExpediente(e.target.value)} placeholder="EXP-2026-..." className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm font-mono focus:outline-none focus:border-auro-orange/40" />
            </div>

            <button onClick={guardar} disabled={guardando} className="w-full h-10 bg-auro-orange hover:bg-auro-orange-dark text-white font-bold rounded-button text-sm disabled:opacity-50 transition-colors">
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
