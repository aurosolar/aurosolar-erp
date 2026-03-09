// src/app/(campo)/campo/gastos/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PhotoUploader from '@/components/campo/PhotoUploader';

const TIPOS = [
  { value: 'MATERIAL_EXTRA', label: '📦 Material extra' },
  { value: 'COMBUSTIBLE', label: '⛽ Combustible' },
  { value: 'DIETA', label: '🍽️ Dieta' },
  { value: 'PARKING_PEAJE', label: '🅿️ Parking/Peaje' },
  { value: 'HERRAMIENTA', label: '🔧 Herramienta' },
  { value: 'OTRO', label: '📎 Otro' },
];

export default function GastosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preObraId = searchParams.get('obraId') || '';
  const [obras, setObras] = useState<any[]>([]);
  const [obraId, setObraId] = useState(preObraId);
  const [tipo, setTipo] = useState('MATERIAL_EXTRA');
  const [importe, setImporte] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [gastoId, setGastoId] = useState('');
  const [fotoCount, setFotoCount] = useState(0);

  useEffect(() => {
    fetch('/api/campo/obras?activas=false').then(r => r.json()).then(d => { if (d.ok) setObras(d.data); });
  }, []);

  async function handleSubmit() {
    if (!obraId || !importe || !fotoCount) return;
    setLoading(true);
    try {
      const cents = Math.round(parseFloat(importe) * 100);
      const res = await fetch('/api/campo/gastos', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'aurosolar-erp' },
        body: JSON.stringify({ obraId, tipo, importe: cents, descripcion: descripcion || undefined }),
      });
      const data = await res.json();
      if (data.ok) { setGastoId(data.data.id); setDone(true); }
      else alert(data.error || 'Error');
    } catch { alert('Error de conexión'); }
    finally { setLoading(false); }
  }

  if (done) return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">???</div>
      <h2 className="text-xl font-extrabold text-slate-800 mb-2">Gasto registrado</h2>
      <p className="text-slate-400 text-sm mb-6">{importe}??? ?? {TIPOS.find(t => t.value === tipo)?.label}</p>
      <button onClick={() => router.push('/campo')} className="h-11 px-8 bg-emerald-600 text-white font-bold rounded-xl text-sm active:scale-95">Volver</button>
    </div>
  );

  return (
    <div>
      <h2 className="text-lg font-extrabold text-slate-800 mb-1">🧾 Registrar gasto</h2>
      <p className="text-sm text-slate-400 mb-5">Añade un gasto de obra</p>

      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Obra</label>
          <select value={obraId} onChange={e => setObraId(e.target.value)}
            className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 appearance-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400">
            <option value="">Seleccionar obra</option>
            {obras.map((o: any) => <option key={o.id} value={o.id}>{o.codigo} ?? {o.cliente.nombre}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tipo</label>
          <div className="grid grid-cols-2 gap-2">
            {TIPOS.map(t => (
              <button key={t.value} onClick={() => setTipo(t.value)}
                className={`h-10 rounded-xl text-xs font-bold transition-colors border ${tipo === t.value ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'bg-white border-slate-200 text-slate-500'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Importe (???)</label>
          <input type="number" step="0.01" value={importe} onChange={e => setImporte(e.target.value)}
            placeholder="0.00" className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 text-center text-lg font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"/>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Descripción <span className="text-slate-300 font-normal normal-case">(opcional)</span></label>
          <input type="text" value={descripcion} onChange={e => setDescripcion(e.target.value)}
            placeholder="Detalle del gasto" className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"/>
        </div>

        <PhotoUploader entityType="GASTO" entityId={gastoId || 'pending'} obraId={obraId} tipo="TICKET_GASTO"
          maxFotos={3} required label="Foto del ticket" onCountChange={setFotoCount} />

        <button onClick={handleSubmit} disabled={!obraId || !importe || !fotoCount || loading}
          className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/25 transition-all disabled:opacity-40 active:scale-[0.98]">
          {loading ? 'Guardando...' : '🧾 Registrar gasto'}
        </button>
      </div>
    </div>
  );
}
