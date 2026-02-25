// src/app/(portal)/portal/documentos/page.tsx
'use client';
import { useState, useEffect } from 'react';

const TIPOS_ICON: Record<string, string> = {
  PRESUPUESTO: '📄', CONTRATO: '📝', FACTURA: '🧾', BOLETIN: '📋',
  CERTIFICADO: '🏅', MEMORIA_TECNICA: '📐', FOTO_INSTALACION: '📷',
  FOTO_INVERSOR: '⚡', FOTO_PANELES: '☀️', SUBVENCION: '🏛️', OTRO: '📎',
};

export default function PortalDocumentos() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/portal/documentos').then(r => r.json()).then(d => {
      if (d.ok) setDocs(d.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-3 border-auro-orange/20 border-t-auro-orange rounded-full animate-spin" /></div>;

  return (
    <div>
      <h2 className="text-xl font-bold text-auro-navy mb-5">📁 Mis documentos</h2>
      {docs.length === 0 ? (
        <div className="text-center py-12 text-auro-navy/30 text-sm">No hay documentos disponibles</div>
      ) : (
        <div className="space-y-1.5">
          {docs.map((d: any) => (
            <a key={d.id} href={d.url || '#'} target="_blank" rel="noreferrer"
              className="bg-white rounded-card border border-auro-border p-3.5 flex items-center gap-3 hover:border-auro-orange/30 transition-colors block">
              <div className="w-10 h-10 rounded-xl bg-auro-surface-2 flex items-center justify-center text-lg shrink-0">
                {TIPOS_ICON[d.tipo] || '📎'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{d.nombre}</div>
                <div className="text-[10px] text-auro-navy/30">
                  🏗️ {d.obra?.codigo} · {new Date(d.createdAt).toLocaleDateString('es-ES')}
                </div>
              </div>
              <span className="text-xs text-auro-orange font-semibold">↓</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
