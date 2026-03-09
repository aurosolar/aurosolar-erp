// src/app/(campo)/campo/incidencia/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PhotoUploader from '@/components/campo/PhotoUploader';

const GRAVEDAD = [
  { value: 'BAJA', label: 'Baja', color: 'bg-slate-100 border-slate-300 text-slate-600' },
  { value: 'MEDIA', label: 'Media', color: 'bg-amber-50 border-amber-300 text-amber-700' },
  { value: 'ALTA', label: 'Alta', color: 'bg-orange-50 border-orange-300 text-orange-700' },
  { value: 'CRITICA', label: 'Cr\u00edtica', color: 'bg-red-50 border-red-300 text-red-700' },
];

const CATEGORIAS = [
  { value: 'ELECTRICA', label: '??? El\u00e9ctrica' },
  { value: 'ESTRUCTURAL', label: '🏗️ Estructural' },
  { value: 'ESTETICA', label: '🎨 Estética' },
  { value: 'DOCUMENTAL', label: '📄 Documental' },
  { value: 'GARANTIA', label: '🛡️ Garantía' },
];

export default function IncidenciaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preObraId = searchParams.get('obraId') || '';
  const [obras, setObras] = useState<any[]>([]);
  const [obraId, setObraId] = useState(preObraId);
  const [gravedad, setGravedad] = useState('MEDIA');
  const [categoria, setCategoria] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [incidenciaId, setIncidenciaId] = useState('');

  useEffect(() => {
    fetch('/api/campo/obras?activas=false').then(r => r.json()).then(d => { if (d.ok) setObras(d.data); });
  }, []);

  async function handleSubmit() {
    if (!obraId || !descripcion || descripcion.length < 5) return;
    setLoading(true);
    try {
      const res = await fetch('/api/campo/incidencias', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'aurosolar-erp' },
        body: JSON.stringify({ obraId, gravedad, categoria: categoria || undefined, descripcion }),
      });
      const data = await res.json();
      if (data.ok) { setIncidenciaId(data.data.id); setDone(true); }
      else alert(data.error || 'Error');
    } catch { alert('Error de conexión'); }
    finally { setLoading(false); }
  }

  if (done) return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">⚠️</div>
      <h2 className="text-xl font-extrabold text-slate-800 mb-2">Incidencia reportada</h2>
      <p className="text-slate-400 text-sm mb-3">Gravedad: {gravedad}</p>
      <div className="mb-6"><PhotoUploader entityType="INCIDENCIA" entityId={incidenciaId} obraId={obraId} tipo="FOTO_GENERAL" maxFotos={5} label="Añadir fotos de la incidencia"/></div>
      <button onClick={() => router.push('/campo')} className="h-11 px-8 bg-emerald-600 text-white font-bold rounded-xl text-sm active:scale-95">Volver</button>
    </div>
  );

  return (
    <div>
      <h2 className="text-lg font-extrabold text-slate-800 mb-1">⚠️ Reportar incidencia</h2>
      <p className="text-sm text-slate-400 mb-5">Informa de un problema en la obra</p>

      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Obra</label>
          <select value={obraId} onChange={e => setObraId(e.target.value)}
            className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 appearance-none focus:ring-2 focus:ring-emerald-500/20">
            <option value="">Seleccionar obra</option>
            {obras.map((o: any) => <option key={o.id} value={o.id}>{o.codigo} ?? {o.cliente.nombre}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Gravedad</label>
          <div className="grid grid-cols-4 gap-2">
            {GRAVEDAD.map(g => (
              <button key={g.value} onClick={() => setGravedad(g.value)}
                className={`h-10 rounded-xl text-xs font-bold border transition-colors ${gravedad === g.value ? g.color : 'bg-white border-slate-200 text-slate-400'}`}>
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Categoría <span className="text-slate-300 font-normal normal-case">(opcional)</span></label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIAS.map(c => (
              <button key={c.value} onClick={() => setCategoria(categoria === c.value ? '' : c.value)}
                className={`h-9 px-3 rounded-lg text-xs font-bold border transition-colors ${categoria === c.value ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'bg-white border-slate-200 text-slate-400'}`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Descripción <span className="text-red-400">*</span></label>
          <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)}
            placeholder="Describe el problema con detalle..." rows={3}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-300 resize-none focus:ring-2 focus:ring-emerald-500/20"/>
        </div>

        <button onClick={handleSubmit} disabled={!obraId || descripcion.length < 5 || loading}
          className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl shadow-md shadow-amber-500/25 transition-all disabled:opacity-40 active:scale-[0.98]">
          {loading ? 'Enviando...' : '⚠️ Reportar incidencia'}
        </button>
      </div>
    </div>
  );
}
