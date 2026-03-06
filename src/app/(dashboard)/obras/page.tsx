// src/app/(dashboard)/obras/page.tsx
// Sprint UX-3: Diseño InstalaPRO — sidebar ops + kanban principal
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ObraCard } from '@/components/obras/ObraCard';
import { KanbanBoard } from '@/components/obras/KanbanBoard';
import { NuevaObraModal } from '@/components/obras/NuevaObraModal';

interface Obra {
  id: string;
  codigo: string;
  tipo: string;
  estado: string;
  presupuestoTotal: number;
  cobrado: number;
  porcentajeCobro: number;
  potenciaKwp: number | null;
  localidad: string | null;
  fechaProgramada: string | null;
  cliente: { id: string; nombre: string; apellidos: string; telefono: string | null };
  comercial: { nombre: string; apellidos: string } | null;
  instaladores: Array<{ instalador: { nombre: string; apellidos: string } }>;
  _count: { incidencias: number };
}

const OPS_NAV = [
  { href: '/obras',         label: 'Gestión de Obras' },
  { href: '/planificacion', label: 'Planificación' },
  { href: '/materiales',    label: 'Materiales' },
  { href: '/incidencias',   label: 'Incidencias' },
  { href: '/legalizacion',  label: 'Legalización' },
  { href: '/activos',       label: 'Activos' },
  { href: '/subvenciones',  label: 'Subvenciones' },
];

const ESTADOS_TABLE: Record<string, { label: string; dot: string }> = {
  REVISION_TECNICA:      { label: 'Revisión',       dot: 'bg-violet-500' },
  PREPARANDO:            { label: 'Preparando',     dot: 'bg-amber-500' },
  PENDIENTE_MATERIAL:    { label: 'Pte. Material',  dot: 'bg-amber-500' },
  PROGRAMADA:            { label: 'Programada',     dot: 'bg-blue-500' },
  INSTALANDO:            { label: 'Instalando',     dot: 'bg-emerald-500 animate-pulse' },
  VALIDACION_OPERATIVA:  { label: 'Validación',     dot: 'bg-violet-500' },
  REVISION_COORDINADOR:  { label: 'Rev. Coord.',    dot: 'bg-violet-500' },
  LEGALIZACION:          { label: 'Legalización',   dot: 'bg-blue-500' },
  LEGALIZADA:            { label: 'Legalizada',     dot: 'bg-emerald-500' },
  COMPLETADA:            { label: 'Completada',     dot: 'bg-emerald-500' },
  CANCELADA:             { label: 'Cancelada',      dot: 'bg-slate-400' },
};

type ViewMode = 'kanban' | 'tabla';

export default function ObrasPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [obras, setObras] = useState<Obra[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [vista, setVista] = useState<ViewMode>('kanban');

  const cargarObras = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtroEstado) params.set('estado', filtroEstado);
    if (busqueda) params.set('q', busqueda);
    if (filtroTipo) params.set('tipo', filtroTipo);
    if (vista === 'kanban' && !filtroEstado) params.set('limit', '200');
    try {
      const res = await fetch(`/api/obras?${params}`);
      const data = await res.json();
      if (data.ok) { setObras(data.data.obras); setTotal(data.data.total); }
    } catch (e) { console.error('Error cargando obras:', e); }
    finally { setLoading(false); }
  }, [filtroEstado, filtroTipo, busqueda, vista]);

  useEffect(() => { cargarObras(); }, [cargarObras]);

  const alertas = useMemo(() => {
    let incidencias = 0, pteMaterial = 0;
    obras.forEach(o => { incidencias += o._count.incidencias; if (o.estado === 'PENDIENTE_MATERIAL') pteMaterial++; });
    return { incidencias, pteMaterial };
  }, [obras]);

  const contadores = useMemo(() => {
    return obras.reduce((acc, o) => { acc[o.estado] = (acc[o.estado] || 0) + 1; return acc; }, {} as Record<string, number>);
  }, [obras]);

  const hasFilters = !!(busqueda || filtroTipo || filtroEstado);

  return (
    <div className="flex gap-0 -m-4 lg:-m-6 min-h-[calc(100vh-3.5rem)]">

      {/* ═══ LEFT SIDEBAR ═══ */}
      <aside className="hidden xl:flex w-60 shrink-0 border-r border-slate-200 bg-white flex-col overflow-y-auto">
        <div className="p-5 flex-1">
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">Operaciones</h3>
          <nav className="space-y-0.5">
            {OPS_NAV.map(item => {
              const isActive = pathname === item.href || (item.href === '/obras' && pathname.startsWith('/obras'));
              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-slate-50 text-slate-900 border border-slate-200 shadow-sm'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-transparent'
                  }`}>
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* System status */}
          <div className="mt-8 bg-gradient-to-br from-emerald-50/80 to-transparent rounded-xl p-4 border border-emerald-100/60">
            <p className="text-[10px] font-bold text-emerald-700 uppercase mb-2 tracking-wider">Estado del sistema</p>
            <div className="flex items-center gap-2 mb-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-semibold text-slate-700">{total} obras activas</span>
            </div>
            <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${Math.min((obras.filter(o => o.estado === 'INSTALANDO').length / Math.max(total, 1)) * 100 * 5, 100)}%` }} />
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">{obras.filter(o => o.estado === 'INSTALANDO').length} instalando ahora</p>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100">
          <button onClick={() => setMostrarNueva(true)}
            className="w-full py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-sm">
            <span className="text-base">+</span> Nueva obra
          </button>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══ */}
      <main className="flex-1 flex flex-col bg-slate-50/50 overflow-hidden">

        {/* Header */}
        <div className="px-5 lg:px-8 pt-5 lg:pt-6 pb-1">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Operaciones</span>
                <span className="text-slate-300 text-xs">/</span>
                <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">
                  {vista === 'kanban' ? 'Kanban' : 'Tabla'}
                </span>
              </div>
              <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">Gestión de Obras</h1>
            </div>
            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex items-center bg-white rounded-lg p-0.5 shadow-sm border border-slate-200">
                <button onClick={() => setVista('kanban')}
                  className={`px-3 py-1.5 flex items-center gap-1.5 rounded-md text-xs font-semibold transition-all ${
                    vista === 'kanban'
                      ? 'bg-slate-100 text-slate-900 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}>
                  ▦ Kanban
                </button>
                <button onClick={() => setVista('tabla')}
                  className={`px-3 py-1.5 flex items-center gap-1.5 rounded-md text-xs font-semibold transition-all ${
                    vista === 'tabla'
                      ? 'bg-slate-100 text-slate-900 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}>
                  ☰ Tabla
                </button>
              </div>
              <button onClick={() => setMostrarNueva(true)}
                className="xl:hidden h-9 px-4 bg-slate-900 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 hover:bg-slate-800 transition-colors shadow-sm">
                + Nueva
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-slate-200/60">
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
              <input type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar obras..."
                className="w-full pl-9 pr-3 h-[34px] bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-slate-400 transition-colors" />
            </div>
            <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}
              className="h-[34px] px-3 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-600 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer">
              <option value="">Todos los tipos</option>
              <option value="RESIDENCIAL">🏠 Residencial</option>
              <option value="INDUSTRIAL">🏭 Industrial</option>
              <option value="AGROINDUSTRIAL">🌾 Agroindustrial</option>
              <option value="BATERIA">🔋 Batería</option>
              <option value="AEROTERMIA">🌡️ Aerotermia</option>
              <option value="ALQUILER_CUBIERTA">🏭 Alquiler cubierta</option>
              <option value="REPARACION">🔧 Reparación</option>
              <option value="SUSTITUCION">🔄 Sustitución</option>
            </select>
            {vista === 'tabla' && (
              <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}
                className="h-[34px] px-3 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-600 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer">
                <option value="">Todos los estados</option>
                {Object.entries(ESTADOS_TABLE).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}{contadores[key] ? ` (${contadores[key]})` : ''}</option>
                ))}
              </select>
            )}
            {hasFilters && (
              <button onClick={() => { setBusqueda(''); setFiltroTipo(''); setFiltroEstado(''); }}
                className="h-[34px] px-3 text-[11px] text-slate-400 hover:text-red-500 font-medium transition-colors">
                ✕ Limpiar
              </button>
            )}
            {/* Alerts — right */}
            {(alertas.incidencias > 0 || alertas.pteMaterial > 0) && (
              <div className="ml-auto hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Alertas:</span>
                {alertas.pteMaterial > 0 && (
                  <Link href="/materiales" className="flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100 hover:bg-red-100 transition-colors">
                    ⚠️ {alertas.pteMaterial} Pte. Material
                  </Link>
                )}
                {alertas.incidencias > 0 && (
                  <Link href="/incidencias" className="flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 hover:bg-amber-100 transition-colors">
                    🔔 {alertas.incidencias} Incidencia{alertas.incidencias !== 1 ? 's' : ''}
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-5 lg:px-8 pt-4 pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-400 font-medium">Cargando obras...</p>
              </div>
            </div>
          ) : obras.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-sm text-slate-500 font-medium">No se encontraron obras</p>
                {hasFilters && (
                  <button onClick={() => { setBusqueda(''); setFiltroTipo(''); setFiltroEstado(''); }}
                    className="text-xs text-emerald-600 font-semibold mt-2 hover:underline">Limpiar filtros</button>
                )}
              </div>
            </div>
          ) : vista === 'kanban' ? (
            <KanbanBoard obras={obras} onObraClick={(id) => router.push(`/obras/${id}`)} onUpdate={cargarObras} />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden lg:block bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/80">
                      {['Código', 'Cliente', 'Localidad', 'Tipo', 'Estado', 'Total', 'Cobro'].map(h => (
                        <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 px-4 py-3 border-b border-slate-200">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {obras.map(obra => {
                      const cfg = ESTADOS_TABLE[obra.estado] || { label: obra.estado, dot: 'bg-slate-400' };
                      const euros = (obra.presupuestoTotal / 100).toLocaleString('es-ES', { minimumFractionDigits: 0 });
                      return (
                        <tr key={obra.id} onClick={() => router.push(`/obras/${obra.id}`)}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 cursor-pointer transition-colors">
                          <td className="px-4 py-3"><span className="text-[12px] font-mono font-bold text-slate-400">{obra.codigo}</span></td>
                          <td className="px-4 py-3"><span className="text-sm font-semibold text-slate-800 truncate block max-w-[200px]">{obra.cliente.nombre} {obra.cliente.apellidos}</span></td>
                          <td className="px-4 py-3 text-sm text-slate-500">{obra.localidad || '—'}</td>
                          <td className="px-4 py-3 text-xs text-slate-500 font-medium">{obra.tipo === 'RESIDENCIAL' ? '🏠' : obra.tipo === 'INDUSTRIAL' ? '🏭' : '⚡'} {obra.tipo.charAt(0) + obra.tipo.slice(1).toLowerCase()}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
                            </span>
                            {obra._count.incidencias > 0 && <span className="ml-1 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full border border-red-100">{obra._count.incidencias}</span>}
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-slate-800 text-right tabular-nums">{euros}€</td>
                          <td className="px-4 py-3 w-28">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${obra.porcentajeCobro >= 100 ? 'bg-emerald-500' : obra.porcentajeCobro >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                  style={{ width: `${Math.min(obra.porcentajeCobro, 100)}%` }} />
                              </div>
                              <span className="text-[11px] font-semibold text-slate-400 tabular-nums w-8 text-right">{obra.porcentajeCobro}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="lg:hidden space-y-2">
                {obras.map(obra => <ObraCard key={obra.id} obra={obra} onClick={() => router.push(`/obras/${obra.id}`)} />)}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <footer className="h-7 border-t border-slate-200 bg-white px-5 lg:px-8 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Online</span>
            <span className="text-slate-300">{total} obras</span>
          </div>
          <span className="text-emerald-600">Auro Solar ERP</span>
        </footer>
      </main>

      {mostrarNueva && (
        <NuevaObraModal onClose={() => setMostrarNueva(false)} onCreated={() => { setMostrarNueva(false); cargarObras(); }} />
      )}
    </div>
  );
}
