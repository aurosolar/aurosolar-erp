// src/app/(dashboard)/incidencias/page.tsx
'use client';

import { useState, useEffect } from 'react';

interface Incidencia {
  id: string; gravedad: string; estado: string; descripcion: string; createdAt: string;
  fechaResolucion: string | null; notasResolucion: string | null;
  obra: { codigo: string }; creadoPor: { nombre: string };
}

export default function IncidenciasPage() {
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [resolverModal, setResolverModal] = useState<Incidencia | null>(null);
  const [notaResolucion, setNotaResolucion] = useState('');
  const [resolviendo, setResolviendo] = useState(false);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    const res = await fetch('/api/incidencias');
    const data = await res.json();
    if (data.ok) setIncidencias(data.data);
    setLoading(false);
  }

  async function resolver() {
    if (!resolverModal) return;
    setResolviendo(true);
    const res = await fetch(`/api/incidencias/${resolverModal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'RESUELTA', notasResolucion: notaResolucion }),
    });
    if ((await res.json()).ok) { setResolverModal(null); setNotaResolucion(''); cargar(); }
    setResolviendo(false);
  }

  const filtradas = filtroEstado ? incidencias.filter(i => i.estado === filtroEstado) : incidencias;

  const GRAV_CONFIG: Record<string, { icon: string; color: string }> = {
    CRITICA: { icon: '🟣', color: 'text-estado-purple' }, ALTA: { icon: '🔴', color: 'text-estado-red' },
    MEDIA: { icon: '🟡', color: 'text-estado-amber' }, BAJA: { icon: '🔵', color: 'text-estado-blue' },
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-auro-navy mb-5">Incidencias</h2>

      <div className="flex gap-2 mb-4">
        {['', 'ABIERTA', 'EN_PROCESO', 'RESUELTA'].map((e) => (
          <button key={e} onClick={() => setFiltroEstado(e)} className={`h-8 px-3 rounded-full text-xs font-semibold border transition-colors ${filtroEstado === e ? 'bg-auro-navy text-white border-auro-navy' : 'bg-white text-auro-navy/50 border-auro-border'}`}>
            {e || 'Todas'} · {e ? incidencias.filter(i => i.estado === e).length : incidencias.length}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-card border border-auro-border p-12 text-center">
          <div className="w-8 h-8 border-3 border-auro-orange/20 border-t-auro-orange rounded-full animate-spin mx-auto" />
        </div>
      ) : filtradas.length === 0 ? (
        <div className="bg-white rounded-card border border-auro-border p-12 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <p className="text-sm text-auro-navy/50">Sin incidencias</p>
        </div>
      ) : (
        <div className="bg-white rounded-card border border-auro-border overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-auro-surface-2">
                {['Gravedad', 'Obra', 'Descripción', 'Reportado', 'Días', 'Estado', ''].map(h => (
                  <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-auro-navy/30 px-4 py-3 border-b border-auro-border">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map((inc) => {
                const dias = Math.floor((Date.now() - new Date(inc.createdAt).getTime()) / 86400000);
                const grav = GRAV_CONFIG[inc.gravedad] || GRAV_CONFIG.BAJA;
                return (
                  <tr key={inc.id} className="border-b border-auro-border last:border-0 hover:bg-auro-surface-2/50">
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold ${grav.color}`}>{grav.icon} {inc.gravedad}</span>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-auro-orange">{inc.obra.codigo}</td>
                    <td className="px-4 py-3 text-sm text-auro-navy/70 max-w-[250px] truncate">{inc.descripcion}</td>
                    <td className="px-4 py-3 text-xs text-auro-navy/40">{inc.creadoPor.nombre}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold ${dias >= 7 ? 'text-estado-red' : dias >= 3 ? 'text-estado-amber' : 'text-auro-navy/40'}`}>{dias}d</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        inc.estado === 'ABIERTA' ? 'bg-estado-red/10 text-estado-red' : inc.estado === 'EN_PROCESO' ? 'bg-estado-amber/10 text-estado-amber' : 'bg-estado-green/10 text-estado-green'
                      }`}>{inc.estado}</span>
                    </td>
                    <td className="px-4 py-3">
                      {inc.estado !== 'RESUELTA' && inc.estado !== 'CERRADA' && (
                        <button onClick={() => setResolverModal(inc)} className="h-7 px-2.5 rounded-lg text-[10px] font-semibold bg-estado-green/10 text-estado-green hover:bg-estado-green hover:text-white transition-colors">
                          ✅ Resolver
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal resolver */}
      {resolverModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setResolverModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold mb-1">Resolver incidencia</h3>
            <p className="text-xs text-auro-navy/40 mb-4">{resolverModal.obra.codigo} · {resolverModal.gravedad}</p>
            <p className="text-sm text-auro-navy/60 mb-4 bg-auro-surface-2 p-3 rounded-xl">{resolverModal.descripcion}</p>
            <textarea value={notaResolucion} onChange={e => setNotaResolucion(e.target.value)} placeholder="Nota de resolución..." rows={3} className="w-full px-3 py-2 bg-auro-surface-2 border border-auro-border rounded-input text-sm resize-none focus:outline-none focus:border-auro-orange/40 mb-4" />
            <button onClick={resolver} disabled={resolviendo} className="w-full h-10 bg-estado-green text-white font-bold rounded-button text-sm disabled:opacity-50">
              {resolviendo ? 'Resolviendo...' : '✅ Marcar como resuelta'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
