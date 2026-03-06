// src/app/(campo)/campo/obras/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ObraCampo {
  id: string;
  codigo: string;
  tipo: string;
  estado: string;
  localidad: string | null;
  direccionInstalacion: string | null;
  potenciaKwp: number | null;
  cliente: { nombre: string; apellidos: string; telefono: string | null };
  checkinActivo: { id: string; horaEntrada: string } | null;
  instaladores: Array<{ instalador: { id: string; nombre: string; apellidos: string } }>;
  _count: { incidencias: number };
}

const TIPO_ICONS: Record<string, string> = {
  RESIDENCIAL: '🏠', INDUSTRIAL: '🏭', AGROINDUSTRIAL: '🌾',
  BATERIA: '🔋', AEROTERMIA: '🌡️', BESS: '⚡', BACKUP: '🔌',
};

const ESTADO_CFG: Record<string, { label: string; color: string }> = {
  PROGRAMADA: { label: 'Programada', color: 'bg-[#2563EB]/15 text-[#60A5FA]' },
  INSTALANDO: { label: 'En curso', color: 'bg-[#F5820A]/15 text-[#F5820A]' },
  VALIDACION_OPERATIVA: { label: 'Validación', color: 'bg-[#7C3AED]/15 text-[#A78BFA]' },
  REVISION_COORDINADOR: { label: 'Revisión', color: 'bg-[#D97706]/15 text-[#FBBF24]' },
  COMPLETADA: { label: 'Completada', color: 'bg-[#16A34A]/15 text-[#4ADE80]' },
  LEGALIZACION: { label: 'Legalización', color: 'bg-[#2563EB]/15 text-[#60A5FA]' },
};

export default function CampoObrasPage() {
  const [obras, setObras] = useState<ObraCampo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<'activas' | 'todas'>('activas');

  useEffect(() => {
    const activas = filtro === 'activas' ? 'true' : 'false';
    setLoading(true);
    fetch(`/api/campo/obras?activas=${activas}`).then(r => r.json()).then(d => {
      if (d.ok) setObras(d.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [filtro]);

  const obrasConCheckin = obras.filter(o => o.checkinActivo);
  const obrasSinCheckin = obras.filter(o => !o.checkinActivo);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-extrabold">🏗️ Mis obras</h2>
        <div className="flex bg-white/[0.06] rounded-lg p-0.5">
          <button onClick={() => setFiltro('activas')}
            className={`px-3 py-1 rounded-md text-[11px] font-bold transition-colors ${filtro === 'activas' ? 'bg-[#F5820A] text-white' : 'text-white/40'}`}>
            Activas
          </button>
          <button onClick={() => setFiltro('todas')}
            className={`px-3 py-1 rounded-md text-[11px] font-bold transition-colors ${filtro === 'todas' ? 'bg-[#F5820A] text-white' : 'text-white/40'}`}>
            Todas
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-3 border-[#F5820A]/20 border-t-[#F5820A] rounded-full animate-spin mx-auto" />
        </div>
      ) : obras.length === 0 ? (
        <div className="bg-white/[0.04] border border-white/[0.06] rounded-[14px] p-8 text-center">
          <span className="text-3xl block mb-2">📭</span>
          <p className="text-sm text-white/40">No tienes obras {filtro === 'activas' ? 'activas ' : ''}asignadas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {obrasConCheckin.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-[#F5820A] uppercase tracking-wider mb-2">⚡ En obra ahora</p>
              {obrasConCheckin.map(obra => <ObraCard key={obra.id} obra={obra} />)}
            </div>
          )}
          {obrasSinCheckin.length > 0 && (
            <div>
              {obrasConCheckin.length > 0 && (
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-2 mt-4">Otras obras</p>
              )}
              <div className="space-y-2">
                {obrasSinCheckin.map(obra => <ObraCard key={obra.id} obra={obra} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ObraCard({ obra }: { obra: ObraCampo }) {
  const [expanded, setExpanded] = useState(false);
  const est = ESTADO_CFG[obra.estado] || { label: obra.estado, color: 'bg-white/10 text-white/50' };
  const tipoIcon = TIPO_ICONS[obra.tipo] || '⚡';
  const tiempoCheckin = obra.checkinActivo
    ? Math.round((Date.now() - new Date(obra.checkinActivo.horaEntrada).getTime()) / 60000)
    : 0;

  return (
    <div className={`bg-white/[0.04] border rounded-[14px] overflow-hidden transition-all ${
      obra.checkinActivo ? 'border-[#F5820A]/30 bg-[#F5820A]/[0.04]' : 'border-white/[0.06]'
    }`}>
      <div className="p-3.5 flex items-start gap-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center text-lg shrink-0">
          {tipoIcon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[11px] font-bold text-[#F5820A]">{obra.codigo}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${est.color}`}>{est.label}</span>
            {obra._count.incidencias > 0 && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#DC2626]/15 text-[#F87171]">
                ⚠️ {obra._count.incidencias}
              </span>
            )}
          </div>
          <p className="text-sm font-bold truncate">{obra.cliente.nombre} {obra.cliente.apellidos}</p>
          {obra.localidad && <p className="text-[11px] text-white/30 truncate">📍 {obra.localidad}</p>}
          {obra.checkinActivo && (
            <p className="text-[10px] text-[#F5820A] font-semibold mt-1">
              🕔 En obra desde hace {tiempoCheckin < 60 ? `${tiempoCheckin} min` : `${Math.floor(tiempoCheckin / 60)}h ${tiempoCheckin % 60}m`}
            </p>
          )}
        </div>
        <div className="text-white/20 text-sm shrink-0 pt-1">{expanded ? '▲' : '▼'}</div>
      </div>

      {expanded && (
        <div className="px-3.5 pb-3.5 border-t border-white/[0.04] pt-3 space-y-3">
          <div className="flex gap-4 text-[11px]">
            {obra.potenciaKwp && (
              <div><span className="text-white/30">Potencia</span><p className="font-bold">{obra.potenciaKwp} kWp</p></div>
            )}
            <div><span className="text-white/30">Tipo</span><p className="font-bold">{obra.tipo}</p></div>
            {obra.direccionInstalacion && (
              <div className="flex-1 min-w-0"><span className="text-white/30">Dirección</span><p className="font-bold truncate">{obra.direccionInstalacion}</p></div>
            )}
          </div>

          {obra.instaladores.length > 0 && (
            <div>
              <p className="text-[10px] text-white/30 mb-1">Equipo</p>
              <div className="flex flex-wrap gap-1.5">
                {obra.instaladores.map(({ instalador }) => (
                  <span key={instalador.id} className="text-[10px] font-semibold bg-white/[0.06] text-white/60 px-2 py-0.5 rounded-full">
                    {instalador.nombre} {instalador.apellidos?.[0]}.
                  </span>
                ))}
              </div>
            </div>
          )}

          {obra.cliente.telefono && (
            <a href={`tel:${obra.cliente.telefono}`}
              className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-xl p-2.5 text-sm">
              <span>📞</span>
              <span className="font-semibold">{obra.cliente.telefono}</span>
              <span className="text-[10px] text-white/30 ml-auto">Llamar cliente</span>
            </a>
          )}

          <div className="grid grid-cols-2 gap-2">
            {!obra.checkinActivo && ['PROGRAMADA', 'INSTALANDO'].includes(obra.estado) && (
              <Link href={`/campo/checkin?obraId=${obra.id}`}
                className="h-11 bg-[#F5820A] rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold active:scale-95 transition-transform col-span-2">
                📍 Check-in
              </Link>
            )}
            {obra.checkinActivo && (
              <Link href={`/campo/checkin?obraId=${obra.id}&checkout=1`}
                className="h-11 bg-[#DC2626]/80 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold active:scale-95 transition-transform">
                🚪 Check-out
              </Link>
            )}
            {obra.checkinActivo && (
              <Link href={`/campo/fotos?obraId=${obra.id}`}
                className="h-11 bg-white/[0.06] border border-white/[0.08] rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold active:scale-95 transition-transform">
                📸 Fotos
              </Link>
            )}
            {['INSTALANDO', 'VALIDACION_OPERATIVA'].includes(obra.estado) && (
              <Link href={`/campo/validar?obraId=${obra.id}`}
                className="h-11 bg-[#16A34A]/80 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold active:scale-95 transition-transform">
                ✅ Validar
              </Link>
            )}
            <Link href={`/campo/incidencia?obraId=${obra.id}`}
              className="h-11 bg-white/[0.06] border border-white/[0.08] rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold active:scale-95 transition-transform">
              ⚠️ Incidencia
            </Link>
            <Link href={`/campo/gastos?obraId=${obra.id}`}
              className="h-11 bg-white/[0.06] border border-white/[0.08] rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold active:scale-95 transition-transform">
              🧾 Gasto
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
