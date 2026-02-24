// src/app/(dashboard)/comerciales/page.tsx
'use client';

import { useState, useEffect } from 'react';

interface Comercial {
  id: string; nombre: string; leads: number; convertidos: number;
  volumen: number; objetivo: number; porcentaje: number;
}

export default function ComercialesPage() {
  const [ranking, setRanking] = useState<Comercial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/crm/ranking').then(r => r.json()).then(d => {
      if (d.ok) setRanking(d.data);
      setLoading(false);
    });
  }, []);

  const fmt = (c: number) => c >= 10000000 ? `${Math.round(c / 100000)}K€` : `${(c / 100).toLocaleString('es-ES', { maximumFractionDigits: 0 })}€`;

  if (loading) return <div className="flex items-center justify-center py-24"><div className="w-10 h-10 border-4 border-auro-orange/20 border-t-auro-orange rounded-full animate-spin" /></div>;

  return (
    <div>
      <h2 className="text-xl font-bold text-auro-navy mb-5">Ranking comerciales</h2>

      {ranking.length === 0 ? (
        <div className="bg-white rounded-card border border-auro-border p-12 text-center">
          <div className="text-4xl mb-3">👥</div>
          <p className="text-sm text-auro-navy/50">Sin comerciales registrados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ranking.map((com, i) => {
            const medalla = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
            const pctColor = com.porcentaje >= 100 ? 'text-estado-green' : com.porcentaje >= 60 ? 'text-auro-orange' : 'text-estado-red';
            const barColor = com.porcentaje >= 100 ? 'bg-estado-green' : com.porcentaje >= 60 ? 'bg-auro-orange' : 'bg-estado-red';

            return (
              <div key={com.id} className="bg-white rounded-card border border-auro-border shadow-sm p-4">
                <div className="flex items-center gap-4">
                  {/* Posición */}
                  <div className="text-2xl w-10 text-center shrink-0">{medalla}</div>

                  {/* Avatar + nombre */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-full bg-auro-orange/10 flex items-center justify-center text-xs font-bold text-auro-orange shrink-0">
                        {com.nombre.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <span className="font-bold text-sm truncate">{com.nombre}</span>
                    </div>
                    {/* Barra de progreso */}
                    {com.objetivo > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-auro-surface-2 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(com.porcentaje, 100)}%` }} />
                        </div>
                        <span className={`text-xs font-extrabold ${pctColor}`}>{com.porcentaje}%</span>
                      </div>
                    )}
                  </div>

                  {/* KPIs */}
                  <div className="hidden sm:flex items-center gap-6 shrink-0">
                    <div className="text-center">
                      <div className="text-lg font-extrabold text-auro-navy">{com.leads}</div>
                      <div className="text-[9px] text-auro-navy/30 uppercase font-bold">Leads</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-extrabold text-estado-green">{com.convertidos}</div>
                      <div className="text-[9px] text-auro-navy/30 uppercase font-bold">Convertidos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-extrabold text-auro-orange">{fmt(com.volumen)}</div>
                      <div className="text-[9px] text-auro-navy/30 uppercase font-bold">Volumen</div>
                    </div>
                  </div>

                  {/* Mobile KPIs */}
                  <div className="sm:hidden text-right shrink-0">
                    <div className="text-base font-extrabold text-auro-orange">{fmt(com.volumen)}</div>
                    <div className="text-[10px] text-auro-navy/30">{com.leads} leads · {com.convertidos} conv.</div>
                  </div>
                </div>

                {/* Alerta si está por debajo del 60% */}
                {com.objetivo > 0 && com.porcentaje < 60 && (
                  <div className="mt-2 ml-14 text-[10px] font-semibold text-estado-red/70 bg-estado-red/5 px-2.5 py-1 rounded-lg inline-block">
                    ⚠️ Por debajo del 60% del objetivo ({fmt(com.objetivo)})
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
