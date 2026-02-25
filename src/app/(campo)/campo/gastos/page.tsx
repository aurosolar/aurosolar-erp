// src/app/(campo)/campo/gastos/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const TIPOS_GASTO = [
  { value: 'MATERIAL_EXTRA', icon: '🔩', label: 'Material extra' },
  { value: 'COMBUSTIBLE', icon: '⛽', label: 'Combustible' },
  { value: 'DIETA', icon: '🍽️', label: 'Dieta' },
  { value: 'PARKING_PEAJE', icon: '🅿️', label: 'Parking/Peaje' },
  { value: 'HERRAMIENTA', icon: '🔧', label: 'Herramienta' },
  { value: 'OTRO', icon: '📦', label: 'Otro' },
];

export default function GastosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preObraId = searchParams.get('obraId') || '';
  const [obras, setObras] = useState<any[]>([]);
  const [obraId, setObraId] = useState(preObraId);
  const [tipo, setTipo] = useState('');
  const [importe, setImporte] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fotoPreview, setFotoPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch('/api/campo/obras?activas=false').then(r => r.json()).then(d => {
      if (d.ok) setObras(d.data.filter((o: any) => !['COMPLETADA','CANCELADA'].includes(o.estado)));
    });
  }, []);

  function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setFotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit() {
    if (!obraId || !tipo || !importe) return;
    setLoading(true);
    try {
      const res = await fetch('/api/campo/gastos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          obraId,
          tipo,
          importe: Math.round(parseFloat(importe) * 100), // Céntimos
          descripcion: descripcion || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) setDone(true);
      else alert(data.error);
    } catch { alert('Error de conexión'); }
    finally { setLoading(false); }
  }

  if (done) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">💾</div>
        <h2 className="text-xl font-extrabold mb-2">Gasto registrado</h2>
        <p className="text-white/40 text-sm mb-6">{importe}€ · {TIPOS_GASTO.find(t => t.value === tipo)?.label}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => { setDone(false); setImporte(''); setDescripcion(''); setTipo(''); setFotoPreview(''); }} className="h-12 px-6 bg-white/[0.08] text-white font-bold rounded-[14px] text-sm">
            + Otro gasto
          </button>
          <button onClick={() => router.push('/campo')} className="h-12 px-6 bg-[#F5820A] text-white font-bold rounded-[14px] text-sm">
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-extrabold mb-1">🧾 Registro de gasto</h2>
      <p className="text-sm text-white/40 mb-5">Registra un gasto asociado a una obra</p>

      {/* Obra */}
      <div className="mb-4">
        <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5">Obra</label>
        <select value={obraId} onChange={(e) => setObraId(e.target.value)} className="w-full h-12 px-4 bg-white/[0.06] border border-white/[0.08] rounded-[14px] text-white text-sm font-medium appearance-none focus:outline-none focus:border-[#F5820A]/40">
          <option value="" className="bg-[#1A2E4A]">— Elige obra —</option>
          {obras.map((o: any) => <option key={o.id} value={o.id} className="bg-[#1A2E4A]">{o.codigo} · {o.cliente.nombre}</option>)}
        </select>
      </div>

      {/* Tipo de gasto */}
      <div className="mb-4">
        <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5">Tipo de gasto</label>
        <div className="grid grid-cols-3 gap-2">
          {TIPOS_GASTO.map((t) => (
            <button
              key={t.value}
              onClick={() => setTipo(t.value)}
              className={`py-3 rounded-[14px] border-2 flex flex-col items-center gap-1 transition-all active:scale-95 text-center
                ${tipo === t.value ? 'border-[#F5820A] bg-[#F5820A]/10' : 'border-white/[0.08] bg-white/[0.03]'}`}
            >
              <span className="text-xl">{t.icon}</span>
              <span className="text-[10px] font-bold leading-tight">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Importe */}
      <div className="mb-4">
        <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5">Importe</label>
        <div className="relative">
          <input
            type="number"
            step="0.01"
            value={importe}
            onChange={(e) => setImporte(e.target.value)}
            placeholder="0,00"
            className="w-full h-16 px-4 pr-10 bg-white/[0.06] border border-white/[0.08] rounded-[14px] text-white text-2xl font-extrabold text-center placeholder-white/15 focus:outline-none focus:border-[#F5820A]/40"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl text-white/25 font-bold">€</span>
        </div>
      </div>

      {/* Descripción */}
      <div className="mb-4">
        <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5">Descripción</label>
        <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej: 2 conectores MC4 extra" className="w-full h-12 px-4 bg-white/[0.06] border border-white/[0.08] rounded-[14px] text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#F5820A]/40" />
      </div>

      {/* Foto ticket */}
      <div className="mb-6">
        <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5">📸 Foto del ticket</label>
        {fotoPreview ? (
          <div className="relative w-full h-32 rounded-[14px] overflow-hidden">
            <img src={fotoPreview} alt="Ticket" className="w-full h-full object-cover" />
            <button onClick={() => setFotoPreview('')} className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white text-sm">✕</button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center h-20 bg-white/[0.04] border-2 border-dashed border-white/[0.08] rounded-[14px] cursor-pointer">
            <span className="text-xl">📷</span>
            <span className="text-[10px] text-white/25 mt-0.5">Foto del ticket o factura</span>
            <input type="file" accept="image/*" capture="environment" onChange={handleFoto} className="hidden" />
          </label>
        )}
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!obraId || !tipo || !importe || loading}
        className="w-full h-14 bg-[#F5820A] text-white font-extrabold text-base rounded-[14px] flex items-center justify-center gap-2 shadow-lg shadow-[#F5820A]/30 active:scale-[0.98] transition-transform disabled:opacity-40"
      >
        {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>💾 Guardar gasto</>}
      </button>
    </div>
  );
}
