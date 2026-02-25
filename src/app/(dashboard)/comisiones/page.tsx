// src/app/(dashboard)/comisiones/page.tsx
'use client';
import { useState, useEffect, useCallback } from 'react';

interface Comision {
  id: string; comercialEmail: string; presupuesto: number; porcentaje: number;
  importe: number; estado: string; createdAt: string;
  obra: {
    codigo: string; tipo: string; presupuestoTotal: number; estado: string;
    cliente: { nombre: string; apellidos: string };
    pagos: Array<{ importe: number }>;
  };
}

interface Resumen { total: number; pendientes: number; pagadas: number; importePendiente: number; importePagado: number }

const fmt = (c: number) => `${(c / 100).toLocaleString('es-ES', { minimumFractionDigits: 2 })}€`;

export default function ComisionesPage() {
  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [filtro, setFiltro] = useState('');
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    const params = filtro ? `?estado=${filtro}` : '';
    const [rCom, rRes] = await Promise.all([
      fetch(`/api/comisiones${params}`).then(r => r.json()),
      fetch('/api/comisiones/resumen').then(r => r.json()),
    ]);
    if (rCom.ok) setComisiones(rCom.data);
    if (rRes.ok) setResumen(rRes.data);
    setLoading(false);
  }, [filtro]);

  useEffect(() => { cargar(); }, [cargar]);

  async function marcarPagada(id: string) {
    if (!confirm('¿Marcar comisión como pagada?')) return;
    await fetch(`/api/comisiones/${id}`, { method: 'PATCH' });
    cargar();
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-auro-navy mb-5">Comisiones comerciales</h2>

      {resumen && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="bg-white rounded-card border border-auro-border p-3.5">
            <div className="text-lg mb-1">📊</div>
            <div className="text-2xl font-extrabold text-auro-navy">{resumen.total}</div>
            <div className="text-[10px] text-auro-navy/30 font-semibold uppercase">Total</div>
          </div>
          <div className="bg-white rounded-card border border-auro-border p-3.5">
            <div className="text-lg mb-1">⏳</div>
            <div className="text-2xl font-extrabold text-estado-amber">{fmt(resumen.importePendiente)}</div>
            <div className="text-[10px] text-auro-navy/30 font-semibold uppercase">Pendiente ({resumen.pendientes})</div>
          </div>
          <div className="bg-white rounded-card border border-auro-border p-3.5">
            <div className="text-lg mb-1">✅</div>
            <div className="text-2xl font-extrabold text-estado-green">{fmt(resumen.importePagado)}</div>
            <div className="text-[10px] text-auro-navy/30 font-semibold uppercase">Pagado ({resumen.pagadas})</div>
          </div>
          <div className="bg-white rounded-card border border-auro-border p-3.5">
            <div className="text-lg mb-1">💶</div>
            <div className="text-2xl font-extrabold text-auro-navy">{fmt(resumen.importePendiente + resumen.importePagado)}</div>
            <div className="text-[10px] text-auro-navy/30 font-semibold uppercase">Total generado</div>
          </div>
        </div>
      )}

      <div className="flex gap-1.5 mb-4">
        {[{ k: '', l: 'Todas' }, { k: 'PENDIENTE', l: '⏳ Pendientes' }, { k: 'PAGADA', l: '✅ Pagadas' }].map(f => (
          <button key={f.k} onClick={() => setFiltro(f.k)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold ${filtro === f.k ? 'bg-auro-orange text-white' : 'bg-auro-surface-2 text-auro-navy/50'}`}>
            {f.l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-3 border-auro-orange/20 border-t-auro-orange rounded-full animate-spin" /></div>
      ) : comisiones.length === 0 ? (
        <div className="text-center py-12 text-auro-navy/30 text-sm">Sin comisiones</div>
      ) : (
        <div className="space-y-1.5">
          {comisiones.map(c => {
            const cobrado = c.obra.pagos.reduce((s, p) => s + p.importe, 0);
            const pctCobro = c.obra.presupuestoTotal > 0 ? Math.round((cobrado / c.obra.presupuestoTotal) * 100) : 0;
            return (
              <div key={c.id} className="bg-white rounded-card border border-auro-border p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-auro-orange/10 flex items-center justify-center text-lg shrink-0">
                  {c.estado === 'PAGADA' ? '✅' : '⏳'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{c.obra.codigo} — {c.obra.cliente.nombre}</div>
                  <div className="text-[10px] text-auro-navy/30">
                    {c.comercialEmail} · {(c.porcentaje * 100).toFixed(1)}% · Obra {pctCobro}% cobrada
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-auro-orange">{fmt(c.importe)}</div>
                  {c.estado === 'PENDIENTE' && (
                    <button onClick={() => marcarPagada(c.id)}
                      className="text-[10px] font-semibold text-estado-green hover:underline mt-0.5">
                      💰 Marcar pagada
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
