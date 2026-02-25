// src/app/(dashboard)/rentabilidad/page.tsx
'use client';

import { useState, useEffect } from 'react';

interface ObraRent {
  id: string; codigo: string; cliente: string; tipo: string; estado: string;
  localidad: string | null; potencia: number | null;
  presupuesto: number; cobrado: number; pendiente: number;
  costeMaterial: number; margenBruto: number; margenPct: number;
}

interface Resumen {
  totalObras: number; totalPresupuesto: number; totalCobrado: number;
  totalPendiente: number; totalMaterial: number; totalMargen: number;
  margenPctGlobal: number; peorMargen: ObraRent[]; mayorPendiente: ObraRent[];
  obras: ObraRent[];
}

const fmt = (cents: number) => (cents / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

export default function RentabilidadPage() {
  const [data, setData] = useState<Resumen | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/rentabilidad').then(r => r.json()).then(d => {
      if (d.ok) setData(d.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-3 border-auro-orange/20 border-t-auro-orange rounded-full animate-spin" /></div>;
  if (!data) return <div className="text-center py-12 text-auro-navy/30">Error cargando datos</div>;

  const margenColor = data.margenPctGlobal >= 30 ? 'text-estado-green' : data.margenPctGlobal >= 20 ? 'text-auro-orange' : 'text-estado-red';

  return (
    <div>
      <h2 className="text-xl font-bold text-auro-navy mb-5">Rentabilidad</h2>

      {/* KPIs financieros */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { icon: '💰', label: 'Facturado', val: fmt(data.totalPresupuesto), color: 'text-auro-navy' },
          { icon: '✅', label: 'Cobrado', val: fmt(data.totalCobrado), color: 'text-estado-green' },
          { icon: '📦', label: 'Coste material', val: fmt(data.totalMaterial), color: 'text-estado-blue' },
          { icon: '📊', label: 'Margen bruto', val: `${data.margenPctGlobal}%`, color: margenColor },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-card border border-auro-border p-4">
            <div className="text-lg mb-1">{k.icon}</div>
            <div className={`text-xl font-extrabold ${k.color}`}>{k.val}</div>
            <div className="text-[10px] text-auro-navy/30 font-semibold uppercase">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Dos columnas: peor margen + mayor pendiente */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Peor margen */}
        <div className="bg-white rounded-card border border-auro-border p-4">
          <div className="text-xs font-bold text-auro-navy mb-3">⚠️ Peor margen</div>
          {data.peorMargen.length === 0 ? (
            <div className="text-xs text-auro-navy/30">Sin datos</div>
          ) : (
            <div className="space-y-2">
              {data.peorMargen.map(o => (
                <div key={o.id} className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold">{o.codigo}</div>
                    <div className="text-[10px] text-auro-navy/40">{o.cliente}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-extrabold ${o.margenPct < 20 ? 'text-estado-red' : 'text-auro-orange'}`}>{o.margenPct}%</div>
                    <div className="text-[10px] text-auro-navy/30">{fmt(o.margenBruto)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mayor pendiente */}
        <div className="bg-white rounded-card border border-auro-border p-4">
          <div className="text-xs font-bold text-auro-navy mb-3">⏰ Mayor deuda</div>
          {data.mayorPendiente.length === 0 ? (
            <div className="text-xs text-auro-navy/30">Sin datos</div>
          ) : (
            <div className="space-y-2">
              {data.mayorPendiente.map(o => (
                <div key={o.id} className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold">{o.codigo}</div>
                    <div className="text-[10px] text-auro-navy/40">{o.cliente}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-extrabold text-estado-red">{fmt(o.pendiente)}</div>
                    <div className="text-[10px] text-auro-navy/30">de {fmt(o.presupuesto)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabla completa */}
      <div className="bg-white rounded-card border border-auro-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-auro-surface-2">
                {['Obra', 'Cliente', 'Presupuesto', 'Material', 'Margen', 'Cobrado', 'Pendiente'].map(h => (
                  <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-auro-navy/30 px-3 py-2.5 border-b border-auro-border whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.obras.filter(o => o.presupuesto > 0).map(o => (
                <tr key={o.id} className="border-b border-auro-border last:border-0 hover:bg-auro-surface-2/50">
                  <td className="px-3 py-2.5 text-xs font-bold">{o.codigo}</td>
                  <td className="px-3 py-2.5 text-xs text-auro-navy/50 max-w-[120px] truncate">{o.cliente}</td>
                  <td className="px-3 py-2.5 text-xs font-semibold">{fmt(o.presupuesto)}</td>
                  <td className="px-3 py-2.5 text-xs text-auro-navy/50">{fmt(o.costeMaterial)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 h-1.5 bg-auro-surface-2 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${o.margenPct >= 30 ? 'bg-estado-green' : o.margenPct >= 20 ? 'bg-auro-orange' : 'bg-estado-red'}`}
                          style={{ width: `${Math.min(o.margenPct, 100)}%` }} />
                      </div>
                      <span className={`text-[10px] font-bold ${o.margenPct >= 30 ? 'text-estado-green' : o.margenPct >= 20 ? 'text-auro-orange' : 'text-estado-red'}`}>
                        {o.margenPct}%
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-estado-green font-semibold">{fmt(o.cobrado)}</td>
                  <td className="px-3 py-2.5 text-xs text-estado-red font-semibold">{o.pendiente > 0 ? fmt(o.pendiente) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
