'use client';
import { useState, useEffect } from 'react';
const H = { 'X-Requested-With': 'aurosolar-erp' };
interface Obra {
  id: string; codigo: string; estado: string;
  cliente: { nombre: string; apellidos: string };
  direccionInstalacion: string;
  _count?: { incidencias: number };
}
interface Checkin { id: string; obraId: string; obra: { codigo: string } }
const ESTADO_LABEL: Record<string, string> = {
  PROGRAMADA: 'Programada', INSTALANDO: 'Instalando',
  VALIDACION_OPERATIVA: 'Validación', REVISION_COORDINADOR: 'En revisión',
};
const ESTADO_COLOR: Record<string, string> = {
  PROGRAMADA: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  INSTALANDO: 'bg-green-500/10 text-green-400 border-green-500/20',
  VALIDACION_OPERATIVA: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  REVISION_COORDINADOR: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};
export default function CampoHoy() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [checkinActivo, setCheckinActivo] = useState<Checkin | null>(null);
  const [loading, setLoading] = useState(true);
  const [accion, setAccion] = useState('');
  const cargar = async () => {
    setLoading(true);
    const [o, c] = await Promise.all([
      fetch('/api/campo/obras', { headers: H }).then(r => r.json()),
      fetch('/api/campo/checkin/activo', { headers: H }).then(r => r.json()),
    ]);
    setObras(o.ok ? o.data : []);
    setCheckinActivo(c.ok && c.data ? c.data : null);
    setLoading(false);
  };
  useEffect(() => { cargar(); }, []);
  const checkin = async (obraId: string) => {
    setAccion(obraId);
    const r = await fetch('/api/campo/checkin', {
      method: 'POST', headers: { ...H, 'Content-Type': 'application/json' },
      body: JSON.stringify({ obraId }),
    }).then(r => r.json());
    if (r.ok) cargar(); else alert(r.error || 'Error');
    setAccion('');
  };
  const checkout = async () => {
    if (!checkinActivo) return;
    setAccion('out');
    const r = await fetch('/api/campo/checkin', {
      method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkinId: checkinActivo.id }),
    }).then(r => r.json());
    if (r.ok) cargar(); else alert(r.error || 'Error');
    setAccion('');
  };
  const hoy = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" /></div>;
  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-white font-bold text-xl capitalize">{hoy}</h1>
        <p className="text-slate-400 text-sm">{obras.length > 0 ? `${obras.length} obra${obras.length > 1 ? 's' : ''} asignada${obras.length > 1 ? 's' : ''} hoy` : 'Sin obras programadas hoy'}</p>
      </div>
      {checkinActivo && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-green-400 font-bold text-sm">Jornada activa · {checkinActivo.obra.codigo}</span>
          </div>
          <button onClick={checkout} disabled={accion === 'out'}
            className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-colors">
            {accion === 'out' ? 'Procesando...' : '✅ Finalizar jornada'}
          </button>
        </div>
      )}
      {obras.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">📅</div>
          <p className="text-slate-400 text-sm">No tienes obras programadas hoy</p>
        </div>
      ) : (
        <div className="space-y-3">
          {obras.map(obra => (
            <div key={obra.id} className={`bg-slate-900 border rounded-2xl p-4 ${checkinActivo?.obraId === obra.id ? 'border-green-500/40' : 'border-slate-800'}`}>
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
              {(obra._count?.incidencias || 0) > 0 && (
                <p className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-full px-2 py-0.5 inline-block mb-3">
                  ⚠️ {obra._count?.incidencias} incidencia{(obra._count?.incidencias || 0) > 1 ? 's' : ''} abierta{(obra._count?.incidencias || 0) > 1 ? 's' : ''}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                {!checkinActivo && (
                  <button onClick={() => checkin(obra.id)} disabled={!!accion}
                    className="col-span-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-colors">
                    {accion === obra.id ? 'Procesando...' : '▶ Iniciar jornada'}
                  </button>
                )}
                <a href={`/campo/fotos?obraId=${obra.id}`}
                  className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2.5 rounded-xl text-xs transition-colors">
                  📷 Fotos
                </a>
                <a href={`/campo/incidencia?obraId=${obra.id}`}
                  className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2.5 rounded-xl text-xs transition-colors">
                  ⚠️ Incidencia
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
