// src/app/(campo)/campo/fotos/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const TIPOS_FOTO = [
  { value: 'GENERAL', icon: '📷', label: 'General' },
  { value: 'INVERSOR', icon: '⚡', label: 'Inversor' },
  { value: 'PANELES', icon: '☀️', label: 'Paneles' },
  { value: 'CUADRO', icon: '🔌', label: 'Cuadro eléc.' },
  { value: 'COMPLETA', icon: '🏠', label: 'Instalación' },
];

export default function FotosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preObraId = searchParams.get('obraId') || '';
  const [obras, setObras] = useState<any[]>([]);
  const [obraId, setObraId] = useState(preObraId);
  const [tipoFoto, setTipoFoto] = useState('GENERAL');
  const [fotos, setFotos] = useState<Array<{ file: File; preview: string; tipo: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch('/api/campo/obras?activas=false').then(r => r.json()).then(d => {
      if (d.ok) setObras(d.data.filter((o: any) => !['COMPLETADA', 'CANCELADA'].includes(o.estado)));
    });
  }, []);

  function addFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setFotos(prev => [...prev, { file, preview: URL.createObjectURL(file), tipo: tipoFoto }]);
    }
    e.target.value = '';
  }

  function removeFoto(index: number) {
    setFotos(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!obraId || fotos.length === 0) return;
    setLoading(true);
    // TODO: Upload real de archivos al storage
    // Por ahora registramos como documentos placeholder
    try {
      for (const foto of fotos) {
        await fetch('/api/campo/fotos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ obraId, tipo: foto.tipo, nombre: foto.file.name }),
        });
      }
      setDone(true);
    } catch { alert('Error de conexión'); }
    finally { setLoading(false); }
  }

  if (done) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📸</div>
        <h2 className="text-xl font-extrabold mb-2">{fotos.length} foto{fotos.length !== 1 ? 's' : ''} subida{fotos.length !== 1 ? 's' : ''}</h2>
        <p className="text-white/40 text-sm mb-6">Registradas en el sistema</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => { setDone(false); setFotos([]); }} className="h-12 px-6 bg-white/[0.08] text-white font-bold rounded-[14px] text-sm">+ Más fotos</button>
          <button onClick={() => router.push('/campo')} className="h-12 px-6 bg-[#F5820A] text-white font-bold rounded-[14px] text-sm">Volver</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-extrabold mb-1">📸 Subir fotos</h2>
      <p className="text-sm text-white/40 mb-5">Fotos clasificadas de la obra</p>

      {/* Obra */}
      <div className="mb-4">
        <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5">Obra</label>
        <select value={obraId} onChange={(e) => setObraId(e.target.value)} className="w-full h-12 px-4 bg-white/[0.06] border border-white/[0.08] rounded-[14px] text-white text-sm font-medium appearance-none focus:outline-none focus:border-[#F5820A]/40">
          <option value="" className="bg-[#1A2E4A]">— Elige obra —</option>
          {obras.map((o: any) => <option key={o.id} value={o.id} className="bg-[#1A2E4A]">{o.codigo} · {o.cliente.nombre}</option>)}
        </select>
      </div>

      {/* Tipo de foto */}
      <div className="mb-4">
        <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5">Tipo de foto</label>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TIPOS_FOTO.map((t) => (
            <button
              key={t.value}
              onClick={() => setTipoFoto(t.value)}
              className={`shrink-0 py-2 px-3 rounded-xl border-2 flex items-center gap-1.5 transition-all active:scale-95
                ${tipoFoto === t.value ? 'border-[#F5820A] bg-[#F5820A]/10' : 'border-white/[0.08] bg-white/[0.03]'}`}
            >
              <span>{t.icon}</span>
              <span className="text-xs font-bold">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Área de captura */}
      <div className="mb-4">
        <label className="flex flex-col items-center justify-center h-28 bg-white/[0.04] border-2 border-dashed border-white/[0.08] rounded-[14px] cursor-pointer active:bg-white/[0.06]">
          <span className="text-3xl">📷</span>
          <span className="text-sm text-white/40 font-medium mt-1">Tomar foto o elegir de galería</span>
          <input type="file" accept="image/*" capture="environment" onChange={addFoto} className="hidden" />
        </label>
      </div>

      {/* Preview de fotos */}
      {fotos.length > 0 && (
        <div className="mb-6">
          <div className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5">
            {fotos.length} foto{fotos.length !== 1 ? 's' : ''} lista{fotos.length !== 1 ? 's' : ''}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {fotos.map((f, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden">
                <img src={f.preview} alt="" className="w-full h-full object-cover" />
                <button onClick={() => removeFoto(i)} className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white text-[10px]">✕</button>
                <div className="absolute bottom-1 left-1 bg-black/50 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                  {TIPOS_FOTO.find(t => t.value === f.tipo)?.icon} {f.tipo}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!obraId || fotos.length === 0 || loading}
        className="w-full h-14 bg-[#F5820A] text-white font-extrabold text-base rounded-[14px] flex items-center justify-center gap-2 shadow-lg shadow-[#F5820A]/30 active:scale-[0.98] transition-transform disabled:opacity-40"
      >
        {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>📤 Subir {fotos.length} foto{fotos.length !== 1 ? 's' : ''}</>}
      </button>
    </div>
  );
}
