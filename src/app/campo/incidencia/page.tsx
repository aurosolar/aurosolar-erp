'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
const H = { 'X-Requested-With': 'aurosolar-erp' };
const TIPOS = ['AVERIA', 'DANO_FISICO', 'PROBLEMA_ELECTRICO', 'MONITORIZACIÓN', 'OTRO'];
const PRIORIDADES = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'];
const PRIORIDAD_COLOR: Record<string, string> = {
  BAJA: 'bg-slate-700 text-slate-300', MEDIA: 'bg-yellow-500/20 text-yellow-400',
  ALTA: 'bg-orange-500/20 text-orange-400', CRITICA: 'bg-red-500/20 text-red-400',
};
function IncidenciaForm() {
  const params = useSearchParams();
  const obraIdInicial = params.get('obraId') || '';
  const [obraId, setObraId] = useState(obraIdInicial);
  const [tipo, setTipo] = useState('AVERIA');
  const [prioridad, setPrioridad] = useState('MEDIA');
  const [descripcion, setDescripcion] = useState('');
  const [obras, setObras] = useState<{id: string; codigo: string}[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  useEffect(() => {
    fetch('/api/campo/obras?todas=true', { headers: H })
      .then(r => r.json()).then(d => { if (d.ok) setObras(d.data); });
  }, []);
  const enviar = async () => {
    if (!obraId || !descripcion.trim()) return alert('Selecciona obra y describe la incidencia');
    setEnviando(true);
    const r = await fetch('/api/campo/incidencias', {
      method: 'POST',
      headers: { ...H, 'Content-Type': 'application/json' },
      body: JSON.stringify({ obraId, tipo, prioridad, descripcion }),
    }).then(r => r.json());
    setEnviando(false);
    if (r.ok) { setExito(true); setDescripcion(''); setTimeout(() => setExito(false), 3000); }
    else alert(r.error || 'Error al crear incidencia');
  };
  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-white font-bold text-xl">Nueva incidencia</h1>
        <p className="text-slate-400 text-sm">Reporta un problema en obra</p>
      </div>
      {exito && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 text-green-400 text-sm font-bold text-center">
          ✅ Incidencia creada correctamente
        </div>
      )}
      <div className="space-y-3">
        <div>
          <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Obra</label>
          <select value={obraId} onChange={e => setObraId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500/50">
            <option value="">Seleccionar obra...</option>
            {obras.map(o => <option key={o.id} value={o.id}>{o.codigo}</option>)}
          </select>
        </div>
        <div>
          <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Tipo</label>
          <div className="grid grid-cols-3 gap-2">
            {TIPOS.map(t => (
              <button key={t} onClick={() => setTipo(t)}
                className={`py-2 rounded-xl text-xs font-medium transition-colors ${tipo === t ? 'bg-green-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Prioridad</label>
          <div className="grid grid-cols-4 gap-2">
            {PRIORIDADES.map(p => (
              <button key={p} onClick={() => setPrioridad(p)}
                className={`py-2 rounded-xl text-xs font-bold transition-all ${prioridad === p ? PRIORIDAD_COLOR[p] + ' ring-1 ring-current' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Descripción</label>
          <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)}
            placeholder="Describe el problema con detalle..." rows={4}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50 resize-none" />
        </div>
        <button onClick={enviar} disabled={enviando || !obraId || !descripcion.trim()}
          className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white font-bold py-3.5 rounded-xl text-sm transition-colors">
          {enviando ? 'Enviando...' : '📤 Crear incidencia'}
        </button>
      </div>
    </div>
  );
}
export default function CampoIncidencia() {
  return <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" /></div>}><IncidenciaForm /></Suspense>;
}
