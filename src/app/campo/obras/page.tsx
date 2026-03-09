'use client';
import { useState, useEffect } from 'react';
const H = { 'X-Requested-With': 'aurosolar-erp' };
interface Obra {
  id: string; codigo: string; estado: string;
  cliente: { nombre: string; apellidos: string };
  direccionInstalacion: string;
  _count?: { incidencias: number };
}
const ESTADO_LABEL: Record<string, string> = {
  REVISION: 'Revisión', PREPARANDO: 'Preparando', PROGRAMADA: 'Programada',
  INSTALANDO: 'Instalando', VALIDACION_OPERATIVA: 'Validación',
  LEGALIZACION: 'Legalización', COMPLETADA: 'Completada', INCIDENCIA: 'Incidencia',
};
const ESTADO_COLOR: Record<string, string> = {
  PROGRAMADA: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  INSTALANDO: 'bg-green-500/10 text-green-400 border-green-500/20',
  VALIDACION_OPERATIVA: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  COMPLETADA: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  INCIDENCIA: 'bg-red-500/10 text-red-400 border-red-500/20',
};
export default function CampoObras() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  useEffect(() => {
    fetch('/api/campo/obras?todas=true', { headers: H })
      .then(r => r.json())
      .then(d => { if (d.ok) setObras(d.data); })
      .finally(() => setLoading(false));
  }, []);
  const filtradas = obras.filter(o =>
    o.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
    o.cliente.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    o.direccionInstalacion.toLowerCase().includes(busqueda.toLowerCase())
  );
  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" /></div>;
  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-white font-bold text-xl">Mis obras</h1>
        <p className="text-slate-400 text-sm">{obras.length} obras asignadas</p>
      </div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
        <input
          type="text" placeholder="Buscar obra, cliente..." value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50"
        />
      </div>
      {filtradas.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-2">🔧</div>
          <p className="text-slate-400 text-sm">No se encontraron obras</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map(obra => (
            <div key={obra.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-white font-bold text-sm">{obra.codigo}</p>
                  <p className="text-slate-400 text-xs">{obra.cliente.nombre} {obra.cliente.apellidos}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ESTADO_COLOR[obra.estado] || 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                  {ESTADO_LABEL[obra.estado] || obra.estado}
                </span>
              </div>
              <p className="text-slate-500 text-xs mb-3">📍 {obra.direccionInstalacion}</p>
              <div className="grid grid-cols-3 gap-2">
                <a href={`/campo/fotos?obraId=${obra.id}`}
                  className="flex flex-col items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-xs transition-colors">
                  <span>📷</span><span>Fotos</span>
                </a>
                <a href={`/campo/incidencia?obraId=${obra.id}`}
                  className="flex flex-col items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-xs transition-colors">
                  <span>⚠️</span><span>Incidencia</span>
                </a>
                <a href={`/campo/validar?obraId=${obra.id}`}
                  className="flex flex-col items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-xs transition-colors">
                  <span>✅</span><span>Validar</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
