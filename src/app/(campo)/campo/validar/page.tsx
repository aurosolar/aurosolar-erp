// src/app/(campo)/campo/validar/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ValidarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preObraId = searchParams.get('obraId') || '';
  const [obras, setObras] = useState<any[]>([]);
  const [obraId, setObraId] = useState(preObraId);
  const [potenciaReal, setPotenciaReal] = useState('');
  const [numPanelesReal, setNumPanelesReal] = useState('');
  const [fotoInversor, setFotoInversor] = useState<string>('');
  const [fotoPaneles, setFotoPaneles] = useState<string>('');
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch('/api/campo/obras?activas=false').then(r => r.json()).then(d => {
      if (d.ok) setObras(d.data.filter((o: any) => ['INSTALANDO','VALIDACION_OPERATIVA'].includes(o.estado)));
    });
  }, []);

  function handleFoto(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) setter(URL.createObjectURL(file));
    };
  }

  async function handleSubmit() {
    if (!obraId || !fotoInversor || !fotoPaneles) return;
    setLoading(true);
    try {
      const res = await fetch('/api/campo/validacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          obraId,
          potenciaReal: potenciaReal ? parseFloat(potenciaReal) : null,
          numPanelesReal: numPanelesReal ? parseInt(numPanelesReal) : null,
          observaciones: observaciones || undefined,
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
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-xl font-extrabold mb-2">Validación enviada</h2>
        <p className="text-white/40 text-sm mb-1">Pendiente de revisión del coordinador</p>
        <p className="text-white/25 text-xs mb-6">Estado: Validación operativa</p>
        <button onClick={() => router.push('/campo')} className="h-12 px-8 bg-[#16A34A] text-white font-bold rounded-[14px] text-sm">
          Volver al inicio
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-extrabold mb-1">✅ Validación técnica</h2>
      <p className="text-sm text-white/40 mb-5">Cierra oficialmente la instalación</p>

      {/* Obra */}
      <div className="mb-4">
        <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5">Obra</label>
        <select value={obraId} onChange={(e) => setObraId(e.target.value)} className="w-full h-12 px-4 bg-white/[0.06] border border-white/[0.08] rounded-[14px] text-white text-sm font-medium appearance-none focus:outline-none focus:border-[#F5820A]/40">
          <option value="" className="bg-[#1A2E4A]">— Elige obra —</option>
          {obras.map((o: any) => <option key={o.id} value={o.id} className="bg-[#1A2E4A]">{o.codigo} · {o.cliente.nombre}</option>)}
        </select>
      </div>

      {/* Datos técnicos */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5">Potencia real (kWp)</label>
          <input type="number" step="0.1" value={potenciaReal} onChange={(e) => setPotenciaReal(e.target.value)} placeholder="8.5" className="w-full h-14 px-4 bg-white/[0.06] border border-white/[0.08] rounded-[14px] text-white text-xl font-bold text-center placeholder-white/15 focus:outline-none focus:border-[#F5820A]/40" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5">Nº paneles</label>
          <input type="number" value={numPanelesReal} onChange={(e) => setNumPanelesReal(e.target.value)} placeholder="16" className="w-full h-14 px-4 bg-white/[0.06] border border-white/[0.08] rounded-[14px] text-white text-xl font-bold text-center placeholder-white/15 focus:outline-none focus:border-[#F5820A]/40" />
        </div>
      </div>

      {/* Fotos obligatorias */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { label: 'Foto inversor', required: true, preview: fotoInversor, setter: setFotoInversor },
          { label: 'Foto paneles', required: true, preview: fotoPaneles, setter: setFotoPaneles },
        ].map((f) => (
          <div key={f.label}>
            <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5">
              {f.label} <span className="text-[#DC2626]">*</span>
            </label>
            {f.preview ? (
              <div className="relative w-full h-28 rounded-[14px] overflow-hidden">
                <img src={f.preview} alt={f.label} className="w-full h-full object-cover" />
                <button onClick={() => f.setter('')} className="absolute top-1 right-1 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-white text-xs">✕</button>
                <div className="absolute bottom-1 left-1 bg-[#16A34A] text-white text-[9px] font-bold px-2 py-0.5 rounded-full">✓ OK</div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-28 bg-white/[0.04] border-2 border-dashed border-[#DC2626]/30 rounded-[14px] cursor-pointer active:bg-white/[0.06]">
                <span className="text-2xl">📷</span>
                <span className="text-[10px] text-white/30 mt-0.5">OBLIGATORIA</span>
                <input type="file" accept="image/*" capture="environment" onChange={handleFoto(f.setter)} className="hidden" />
              </label>
            )}
          </div>
        ))}
      </div>

      {/* Observaciones */}
      <div className="mb-6">
        <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5">Observaciones finales</label>
        <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Incidencias, detalles, recomendaciones..." rows={2} className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.08] rounded-[14px] text-white text-sm placeholder-white/20 resize-none focus:outline-none focus:border-[#F5820A]/40" />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!obraId || !fotoInversor || !fotoPaneles || loading}
        className="w-full h-14 bg-[#16A34A] text-white font-extrabold text-base rounded-[14px] flex items-center justify-center gap-2 shadow-lg shadow-[#16A34A]/30 active:scale-[0.98] transition-transform disabled:opacity-40"
      >
        {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>✅ Cerrar instalación</>}
      </button>

      {(!fotoInversor || !fotoPaneles) && obraId && (
        <p className="text-center text-[11px] text-[#DC2626]/60 mt-2 font-medium">
          ⚠️ Necesitas las 2 fotos obligatorias para cerrar la instalación
        </p>
      )}
    </div>
  );
}
