// src/app/(portal)/portal/pagos/page.tsx
'use client';
import { useState, useEffect } from 'react';

const fmtMoney = (c: number) => `${(c / 100).toLocaleString('es-ES', { minimumFractionDigits: 2 })}€`;

export default function PortalPagos() {
  const [pagos, setPagos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/portal/pagos').then(r => r.json()).then(d => {
      if (d.ok) setPagos(d.data);
      setLoading(false);
    });
  }, []);

  const total = pagos.reduce((s, p) => s + p.importe, 0);

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-3 border-auro-orange/20 border-t-auro-orange rounded-full animate-spin" /></div>;

  return (
    <div>
      <h2 className="text-xl font-bold text-auro-navy mb-2">💰 Mis pagos</h2>
      <div className="text-sm text-auro-navy/40 mb-5">Total pagado: <span className="font-bold text-estado-green">{fmtMoney(total)}</span></div>
      {pagos.length === 0 ? (
        <div className="text-center py-12 text-auro-navy/30 text-sm">Sin pagos registrados</div>
      ) : (
        <div className="space-y-1.5">
          {pagos.map((p: any) => (
            <div key={p.id} className="bg-white rounded-card border border-auro-border p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-estado-green/10 flex items-center justify-center text-lg shrink-0">💰</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">{fmtMoney(p.importe)}</div>
                <div className="text-[10px] text-auro-navy/30">
                  🏗️ {p.obra?.codigo} · {p.metodo} · {new Date(p.fechaCobro).toLocaleDateString('es-ES')}
                </div>
              </div>
              {p.concepto && <span className="text-[10px] text-auro-navy/25 shrink-0">{p.concepto}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
