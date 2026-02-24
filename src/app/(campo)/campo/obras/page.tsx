// src/app/(campo)/campo/obras/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CampoObrasPage() {
  const [obras, setObras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/obras?limit=100').then(r => r.json()).then(d => {
      if (d.ok) setObras(d.data.obras);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const ESTADO_LABELS: Record<string, { label: string; color: string }> = {
    PROGRAMADA: { label: 'Pendiente', color: 'bg-[#2563EB]/15 text-[#60A5FA]' },
    INSTALANDO: { label: 'En curso', color: 'bg-[#F5820A]/15 text-[#F5820A]' },
    TERMINADA: { label: 'Terminada', color: 'bg-[#16A34A]/15 text-[#4ADE80]' },
    INCIDENCIA: { label: 'Incidencia', color: 'bg-[#DC2626]/15 text-[#F87171]' },
    LEGALIZACION: { label: 'Legalización', color: 'bg-[#2563EB]/15 text-[#60A5FA]' },
    COMPLETADA: { label: 'Completada', color: 'bg-[#16A34A]/15 text-[#4ADE80]' },
  };

  return (
    <div>
      <h2 className="text-lg font-extrabold mb-4">🏗️ Todas mis obras</h2>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-3 border-[#F5820A]/20 border-t-[#F5820A] rounded-full animate-spin mx-auto" />
        </div>
      ) : obras.length === 0 ? (
        <div className="bg-white/[0.04] border border-white/[0.06] rounded-[14px] p-8 text-center">
          <p className="text-sm text-white/40">No tienes obras asignadas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {obras.map((obra: any) => {
            const est = ESTADO_LABELS[obra.estado] || { label: obra.estado, color: 'bg-white/10 text-white/50' };
            return (
              <div key={obra.id} className="bg-white/[0.04] border border-white/[0.06] rounded-[12px] p-3.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold text-[#F5820A]">{obra.codigo}</div>
                  <div className="text-sm font-bold truncate">{obra.cliente.nombre} {obra.cliente.apellidos}</div>
                  {obra.localidad && <div className="text-[11px] text-white/30 truncate">📍 {obra.localidad}</div>}
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${est.color}`}>
                  {est.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
