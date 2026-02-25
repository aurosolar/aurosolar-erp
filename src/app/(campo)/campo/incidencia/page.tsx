// src/app/(campo)/campo/incidencia/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function IncidenciaPage() {
  const router = useRouter();
  const [obras, setObras] = useState<any[]>([]);
  const [obraId, setObraId] = useState('');
  const [gravedad, setGravedad] = useState<'BAJA' | 'MEDIA' | 'ALTA' | ''>('');
  const [descripcion, setDescripcion] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch('/api/obras?limit=50').then(r => r.json()).then(d => {
      if (d.ok) setObras(d.data.obras.filter((o: any) => ['PROGRAMADA','INSTALANDO','TERMINADA'].includes(o.estado)));
    });
  }, []);

  function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) { setFoto(file); setFotoPreview(URL.createObjectURL(file)); }
  }

  async function handleSubmit() {
    if (!obraId || !gravedad || !descripcion) return;
    setLoading(true);
    try {
      const res = await fetch('/api/campo/incidencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ obraId, gravedad, descripcion }),
      });
      const data = await res.json();
      if (data.ok) { setDone(true); }
      else { alert(data.error); }
    } catch { alert('Error de conexión'); }
    finally { setLoading(false); }
  }

  if (done) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-xl font-extrabold mb-2">Incidencia reportada</h2>
        <p className="text-white/40 text-sm mb-6">El coordinador ha sido notificado</p>
        <button onClick={() => router.push('/campo')} className="h-12 px-8 bg-[#F5820A] text-white font-bold rounded-[14px] text-sm">
          Volver al inicio
        </button>
      </div>
    );
  }

  const GRAVEDADES = [
    { value: 'ALTA', icon: '🔴', label: 'Alta', color: 'border-[#DC2626] bg-[#DC2626]/10' },
    { value: 'MEDIA', icon: '🟡', label: 'Media', color: 'border-[#D97706] bg-[#D97706]/10' },
    { value: 'BAJA', icon: '🔵', label: 'Baja', color: 'border-[#2563EB] bg-[#2563EB]/10' },
  ] as const;

  return (
    <div>
      <h2 className="text-lg font-extrabold mb-1">⚠️ Reportar incidencia</h2>
      <p className="text-sm text-white/40 mb-5">Informa de un problema en la obra</p>

      {/* Obra */}
      <div className="mb-4">
        <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5">Obra</label>
        <select value={obraId} onChange={(e) => setObraId(e.target.value)} className="w-full h-12 px-4 bg-white/[0.06] border border-white/[0.08] rounded-[14px] text-white text-sm font-medium appearance-none focus:outline-none focus:border-[#F5820A]/40">
          <option value="" className="bg-[#1A2E4A]">— Elige obra —</option>
          {obras.map((o: any) => <option key={o.id} value={o.id} className="bg-[#1A2E4A]">{o.codigo} · {o.cliente.nombre}</option>)}
        </select>
      </div>

      {/* Gravedad */}
      <div className="mb-4">
        <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5">Gravedad</label>
        <div className="grid grid-cols-3 gap-2">
          {GRAVEDADES.map((g) => (
            <button
              key={g.value}
              onClick={() => setGravedad(g.value)}
              className={`py-3 rounded-[14px] border-2 flex flex-col items-center gap-1 transition-all active:scale-95
                ${gravedad === g.value ? g.color : 'border-white/[0.08] bg-white/[0.03]'}`}
            >
              <span className="text-2xl">{g.icon}</span>
              <span className="text-xs font-bold">{g.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Descripción */}
      <div className="mb-4">
        <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5">Descripción del problema</label>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Describe qué ha pasado..."
          rows={3}
          className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.08] rounded-[14px] text-white text-sm placeholder-white/20 resize-none focus:outline-none focus:border-[#F5820A]/40"
        />
      </div>

      {/* Foto */}
      <div className="mb-6">
        <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5">
          📸 Foto del problema <span className="text-white/15 font-normal normal-case tracking-normal">(recomendada)</span>
        </label>
        {fotoPreview ? (
          <div className="relative w-full h-36 rounded-[14px] overflow-hidden">
            <img src={fotoPreview} alt="Preview" className="w-full h-full object-cover" />
            <button onClick={() => { setFoto(null); setFotoPreview(''); }} className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white text-sm">✕</button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center h-24 bg-white/[0.04] border-2 border-dashed border-white/[0.08] rounded-[14px] cursor-pointer">
            <span className="text-2xl">📷</span>
            <span className="text-xs text-white/30 mt-0.5">Toca para abrir cámara</span>
            <input type="file" accept="image/*" capture="environment" onChange={handleFoto} className="hidden" />
          </label>
        )}
      </div>

      {/* Enviar */}
      <button
        onClick={handleSubmit}
        disabled={!obraId || !gravedad || !descripcion || loading}
        className="w-full h-14 bg-[#DC2626] text-white font-extrabold text-base rounded-[14px] flex items-center justify-center gap-2 shadow-lg shadow-[#DC2626]/30 active:scale-[0.98] transition-transform disabled:opacity-40"
      >
        {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>⚠️ Enviar incidencia</>}
      </button>
    </div>
  );
}
