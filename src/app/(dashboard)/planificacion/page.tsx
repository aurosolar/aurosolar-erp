// src/app/(dashboard)/planificacion/page.tsx
// Sprint UX-4: Planificación estilo Gantt/Stitch
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EditarPlanificacionModal } from '@/components/planificacion/EditarPlanificacionModal';

// ═══════════════════════════════════════
// TYPES
// ═══════════════════════════════════════
interface ScheduleJornada {
  id: string;
  obraId: string;
  codigo: string;
  tipo: string;
  estado: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  notas: string | null;
  localidad: string | null;
  potenciaKwp: number | null;
  cliente: string;
}

interface ScheduleInstalador {
  id: string;
  nombre: string;
  apellidos: string;
  rol: string;
  esJefe: boolean;
  jornadas: ScheduleJornada[];
}

interface BacklogObra {
  id: string;
  codigo: string;
  tipo: string;
  estado: string;
  direccionInstalacion: string | null;
  localidad: string | null;
  potenciaKwp: number | null;
  numPaneles: number | null;
  inversor: string | null;
  bateriaKwh: number | null;
  cliente: { nombre: string; apellidos: string };
}

interface InstaladorDisp {
  id: string;
  nombre: string;
  apellidos: string;
  nombreCompleto: string;
  obrasEseDia: number;
  disponible: boolean;
}

// ═══════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════
const TIPO_ICONS: Record<string, string> = {
  RESIDENCIAL: '🏠', INDUSTRIAL: '🏭', AGROINDUSTRIAL: '🌾',
  BATERIA: '🔋', AEROTERMIA: '🌡️', BESS: '⚡', BACKUP: '🔌',
  ALQUILER_CUBIERTA: '🏭', REPARACION: '🔧', SUSTITUCION: '🔄',
};

const ESTADO_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  PROGRAMADA:            { bg: 'from-blue-50 to-white',   border: 'border-blue-200', text: 'text-blue-700 bg-blue-100',  label: 'Programada' },
  INSTALANDO:            { bg: 'from-emerald-50 to-white', border: 'border-emerald-200', text: 'text-emerald-700 bg-emerald-100', label: 'Instalando' },
  VALIDACION_OPERATIVA:  { bg: 'from-amber-50 to-white',  border: 'border-amber-200', text: 'text-amber-700 bg-amber-100', label: 'Validación' },
  REVISION_COORDINADOR:  { bg: 'from-amber-50 to-white',  border: 'border-amber-200', text: 'text-amber-700 bg-amber-100', label: 'Revisión' },
};

const ESTADO_BAR: Record<string, string> = {
  PROGRAMADA: 'bg-blue-500',
  INSTALANDO: 'bg-emerald-500',
  VALIDACION_OPERATIVA: 'bg-amber-500',
  REVISION_COORDINADOR: 'bg-amber-500',
};

const BACKLOG_ESTADO: Record<string, { label: string; color: string }> = {
  PREPARANDO:         { label: 'Preparando', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  PENDIENTE_MATERIAL: { label: 'Pte. Material', color: 'text-amber-600 bg-amber-50 border-amber-200' },
};

const AVATAR_COLORS = ['bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 'bg-violet-500', 'bg-rose-500', 'bg-cyan-500'];

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════
function localDateStr(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function getWeekDays(offset: number): Date[] {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay() + 1 + offset * 7);
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

// ═══════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════
export default function PlanificacionPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [schedule, setSchedule] = useState<ScheduleInstalador[]>([]);
  const [backlog, setBacklog] = useState<BacklogObra[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProgramar, setShowProgramar] = useState(false);
  const [prefillFecha, setPrefillFecha] = useState('');
  const [prefillInst, setPrefillInst] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [editingObraId, setEditingObraId] = useState<string | null>(null);
  const router = useRouter();

  const days = useMemo(() => getWeekDays(weekOffset), [weekOffset]);
  const weekLabel = useMemo(() => {
    const s = days[0];
    const e = days[6];
    const monthS = s.toLocaleDateString('es-ES', { month: 'short' });
    const monthE = e.toLocaleDateString('es-ES', { month: 'short' });
    const weekNum = Math.ceil(((s.getTime() - new Date(s.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7);
    return `Semana ${weekNum} (${s.getDate()} ${monthS} - ${e.getDate()} ${monthE} ${e.getFullYear()})`;
  }, [days]);

  const todayColIndex = useMemo(() => {
    return days.findIndex(d => isToday(d));
  }, [days]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const desde = days[0].toISOString();
      const hasta = days[6].toISOString();
      const [schedRes, backlogRes] = await Promise.all([
        fetch(`/api/planificacion/schedule?desde=${desde}&hasta=${hasta}`),
        fetch('/api/planificacion/sin-programar'),
      ]);
      const schedData = await schedRes.json();
      const backlogData = await backlogRes.json();
      if (schedData.ok) setSchedule(schedData.data);
      if (backlogData.ok) {
        // Filter to only PREPARANDO and PENDIENTE_MATERIAL
        setBacklog(backlogData.data.filter((o: BacklogObra) =>
          ['PREPARANDO', 'PENDIENTE_MATERIAL'].includes(o.estado)
        ));
      }
    } catch (e) { console.error('Error loading:', e); }
    finally { setLoading(false); }
  }, [days]);

  useEffect(() => { loadData(); }, [loadData]);

  function showToastMsg(type: 'success' | 'error', msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  function openProgramar(fecha?: string, instId?: string) {
    setPrefillFecha(fecha || '');
    setPrefillInst(instId || '');
    setShowProgramar(true);
  }

  function closeProgramar() {
    setShowProgramar(false);
    setPrefillFecha('');
    setPrefillInst('');
  }

  // Count stats
  const stats = useMemo(() => {
    const activeMembers = schedule.length;
    const obrasEnCurso = schedule.reduce((acc, inst) => acc + inst.jornadas.filter(j => j.estado === 'INSTALANDO').length, 0);
    return { activeMembers, obrasEnCurso };
  }, [schedule]);

  const DAY_NAMES = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

  return (
    <div className="flex gap-0 -m-4 lg:-m-6 h-[calc(100vh-3.5rem)] overflow-hidden">

      {/* ═══ TOAST ═══ */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-semibold ${
          toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
        }`}>{toast.msg}</div>
      )}

      {/* ═══ LEFT SIDEBAR — BACKLOG ═══ */}
      <aside className="hidden xl:flex w-72 shrink-0 border-r border-slate-200 bg-white flex-col z-30">
        {/* Backlog header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-bold text-[11px] uppercase tracking-widest text-slate-500">Backlog</h3>
          <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-md border border-slate-200">
            {backlog.length} Pendientes
          </span>
        </div>

        {/* Backlog cards */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 bg-slate-100 rounded-xl animate-pulse" />
            ))
          ) : backlog.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-slate-400">Sin obras pendientes</p>
            </div>
          ) : (
            backlog.map(obra => (
              <BacklogCard key={obra.id} obra={obra} onProgramar={() => { setPrefillFecha(''); setPrefillInst(''); setShowProgramar(true); }} />
            ))
          )}
        </div>

        {/* New project button */}
        <div className="p-3 border-t border-slate-100">
          <button onClick={() => openProgramar()}
            className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-sm font-semibold text-slate-400 hover:border-emerald-400 hover:text-emerald-600 transition-colors flex items-center justify-center gap-2">
            + Programar obra
          </button>
        </div>
      </aside>

      {/* ═══ MAIN — GANTT SCHEDULE ═══ */}
      <main className="flex-1 flex flex-col bg-slate-50/50 overflow-hidden">

        {/* Header */}
        <div className="px-5 lg:px-8 pt-5 pb-3 bg-white border-b border-slate-200">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">Planificación</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                <span className="text-xs font-medium text-slate-500 capitalize">{weekLabel}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Week/Month toggle (week only for now) */}
              <div className="flex items-center bg-slate-50 rounded-lg p-0.5 border border-slate-200">
                <span className="px-3 py-1.5 text-xs font-semibold bg-white text-slate-900 rounded-md shadow-sm">Semana</span>
                <span className="px-3 py-1.5 text-xs font-medium text-slate-400 cursor-not-allowed">Mes</span>
              </div>
              {/* Navigation */}
              <div className="flex items-center gap-1 ml-2">
                <button onClick={() => setWeekOffset(w => w - 1)}
                  className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">←</button>
                <button onClick={() => setWeekOffset(0)}
                  className="h-8 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Hoy</button>
                <button onClick={() => setWeekOffset(w => w + 1)}
                  className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">→</button>
              </div>
              {/* Mobile programar */}
              <button onClick={() => openProgramar()}
                className="xl:hidden h-8 px-3 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors">
                + Programar
              </button>
            </div>
          </div>
        </div>

        {/* Gantt Grid */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="min-w-[900px]">
              {/* Column headers */}
              <div className="grid border-b border-slate-200 bg-white sticky top-0 z-10" style={{ gridTemplateColumns: '220px repeat(5, 1fr) 0.4fr 0.4fr' }}>
                <div className="p-3 border-r border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Equipo / Instalador
                </div>
                {days.map((day, i) => (
                  <div key={i} className={`p-3 text-center border-r border-slate-100 last:border-r-0 ${isToday(day) ? 'bg-emerald-50/50' : ''} ${[5,6].includes(i) ? 'bg-slate-50' : ''}`}>
                    <div className={`text-[10px] font-bold uppercase tracking-wider ${isToday(day) ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {DAY_NAMES[i]}
                    </div>
                    <div className={`text-lg font-bold ${isToday(day) ? 'text-emerald-600' : 'text-slate-700'}`}>
                      {day.getDate()}
                    </div>
                  </div>
                ))}
              </div>

              {/* Rows */}
              {schedule.length === 0 ? (
                <div className="py-20 text-center text-slate-400 text-sm">No hay instaladores activos</div>
              ) : (
                schedule.map((inst, instIdx) => {
                  const color = AVATAR_COLORS[instIdx % AVATAR_COLORS.length];
                  const initial = inst.nombre[0] + (inst.apellidos ? inst.apellidos[0] : '');

                  return (
                    <div key={inst.id}
                      className="grid border-b border-slate-100 hover:bg-slate-50/50 transition-colors group"
                      style={{ gridTemplateColumns: '220px repeat(5, 1fr) 0.4fr 0.4fr' }}>

                      {/* Installer info */}
                      <div className="p-3 border-r border-slate-200 bg-white group-hover:bg-slate-50/50 transition-colors flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full ${color} text-white flex items-center justify-center font-bold text-xs shadow-lg ring-2 ring-white`}>
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-sm font-bold text-slate-800 truncate">{inst.nombre} {inst.apellidos}</h5>
                          <p className="text-[10px] text-slate-400 truncate">
                            {inst.esJefe ? '👷 Jefe equipo' : '🔧 Instalador'}
                            {inst.jornadas.length > 0 && ` · ${inst.jornadas.length} jornada${inst.jornadas.length > 1 ? 's' : ''}`}
                          </p>
                        </div>
                      </div>

                      {/* Day cells */}
                      {days.map((day, dayIdx) => {
                        const dayStr = localDateStr(day);
                        const obrasHoy = inst.jornadas.filter(j =>
                          j.fecha && j.fecha.split('T')[0] === dayStr
                        );
                        const isTodayCol = isToday(day);
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                        return (
                          <div key={dayIdx}
                            className={`relative border-r border-slate-100 last:border-r-0 min-h-[88px] p-1.5 ${
                              isTodayCol ? 'bg-emerald-50/30' : ''
                            } ${isWeekend ? 'bg-slate-100/50 opacity-60' : ''}`}
                            onClick={() => {
                              if (!isWeekend) {
                                openProgramar(dayStr, inst.id);
                              }
                            }}>

                            {/* Today indicator */}
                            {isTodayCol && dayIdx === todayColIndex && (
                              <div className="absolute top-0 left-0 w-full flex justify-center -mt-0.5 z-10">
                                <span className="bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">Hoy</span>
                              </div>
                            )}

                            {/* Obra blocks */}
                            {obrasHoy.map(jornada => {
                              const ec = ESTADO_COLORS[jornada.estado] || ESTADO_COLORS.PROGRAMADA;
                              const bar = ESTADO_BAR[jornada.estado] || 'bg-blue-500';
                              return (
                                <div key={jornada.id}
                                  onClick={(e) => { e.stopPropagation(); setEditingObraId(jornada.obraId); }}
                                  onDoubleClick={(e) => { e.stopPropagation(); router.push(`/obras/${jornada.obraId}`); }}
                                  className={`block mb-1 bg-gradient-to-r ${ec.bg} border ${ec.border} rounded-lg cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden relative`}>
                                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${bar}`} />
                                  <div className="pl-3 pr-2 py-1.5">
                                    <div className="flex items-center justify-between mb-0.5">
                                      <span className="text-[11px] font-bold text-slate-800 truncate">{jornada.cliente}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-[9px] text-slate-500 font-medium truncate">
                                        {jornada.localidad || jornada.codigo}
                                      </span>
                                      <span className={`text-[8px] font-bold px-1 py-0.5 rounded uppercase tracking-wider ${ec.text}`}>
                                        {ec.label}
                                      </span>
                                    </div>
                                    <div className="text-[8px] text-slate-400 mt-0.5">{jornada.horaInicio} - {jornada.horaFin}</div>
                                  </div>
                                </div>
                              );
                            })}

                            {/* Cell hint */}
                            {!isWeekend && (
                              <div className={`flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${obrasHoy.length === 0 ? 'h-full' : 'pt-1'}`}>
                                <span className="text-[10px] text-slate-300 font-medium">+ Asignar</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer — legend + stats */}
        <footer className="h-10 border-t border-slate-200 bg-white px-5 lg:px-8 flex items-center gap-6 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Instalando</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-blue-500 rounded-sm"></div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Programada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-amber-500 rounded-sm"></div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Validación</span>
          </div>
          <div className="h-4 w-px bg-slate-200 mx-1"></div>
          <div className="ml-auto flex items-center gap-4">
            <span className="text-[10px] font-bold text-slate-500">
              👷 <span className="text-slate-800">{stats.activeMembers}</span> Instaladores
            </span>
            <span className="text-[10px] font-bold text-slate-500">
              ⚡ <span className="text-slate-800">{stats.obrasEnCurso}</span> Instalando
            </span>
          </div>
        </footer>
      </main>

      {/* ═══ MODAL EDITAR PLANIFICACIÓN ═══ */}
      {editingObraId && (
        <EditarPlanificacionModal
          obraId={editingObraId}
          onClose={() => setEditingObraId(null)}
          onUpdate={() => loadData()}
        />
      )}

      {/* ═══ MODAL PROGRAMAR ═══ */}
      {showProgramar && (
        <ProgramarModal
          fechaInicial={prefillFecha}
          instaladorInicial={prefillInst}
          onClose={closeProgramar}
          onProgramado={() => {
            loadData();
            closeProgramar();
            showToastMsg('success', '📅 Obra programada correctamente');
          }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// BACKLOG CARD
// ═══════════════════════════════════════
function BacklogCard({ obra, onProgramar }: { obra: BacklogObra; onProgramar: () => void }) {
  const estadoCfg = BACKLOG_ESTADO[obra.estado] || BACKLOG_ESTADO.PREPARANDO;
  const tipoIcon = TIPO_ICONS[obra.tipo] || '⚡';
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="group p-4 bg-white border border-slate-200 rounded-xl hover:border-emerald-300 hover:shadow-sm transition-all relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
      <div className="flex justify-between items-start mb-2 pl-2">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border ${estadoCfg.color}`}>
          {estadoCfg.label}
        </span>
        <div className="relative">
          <button onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="text-slate-300 hover:text-slate-500 text-lg leading-none px-1 transition-colors">⋮</button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg border border-slate-200 shadow-lg py-1 z-50">
              <a href={`/obras/${obra.id}`}
                className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors">
                <span>🔗</span> Ver obra completa
              </a>
              <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setShowDetails(!showDetails); }}
                className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors w-full text-left">
                <span>📋</span> {showDetails ? 'Ocultar detalles' : 'Ver detalles'}
              </button>
              <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onProgramar(); }}
                className="flex items-center gap-2 px-3 py-2 text-xs text-emerald-700 hover:bg-emerald-50 transition-colors w-full text-left">
                <span>📅</span> Programar
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="pl-2">
        <h4 className="text-sm font-bold text-slate-800 mb-0.5">
          {obra.cliente.nombre} {obra.cliente.apellidos}
        </h4>
        {obra.localidad && (
          <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
            📍 {obra.localidad}
          </p>
        )}
        <div className="flex items-center gap-3 pt-2.5 border-t border-slate-100">
          {obra.potenciaKwp && (
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400 uppercase font-semibold">Sistema</span>
              <span className="text-xs font-bold text-slate-700">{obra.potenciaKwp}kW</span>
            </div>
          )}
          {obra.potenciaKwp && <div className="w-px h-5 bg-slate-100" />}
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-400 uppercase font-semibold">Tipo</span>
            <span className="text-xs font-bold text-slate-700">{tipoIcon} {obra.tipo.charAt(0) + obra.tipo.slice(1, 4).toLowerCase()}.</span>
          </div>
          <div className="w-px h-5 bg-slate-100" />
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-400 uppercase font-semibold">Código</span>
            <span className="text-xs font-bold text-slate-700">{obra.codigo}</span>
          </div>
        </div>
        {/* Expandable details */}
        {showDetails && (
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
            {obra.potenciaKwp && <div className="flex justify-between"><span className="text-[10px] text-slate-400">Potencia</span><span className="text-[10px] font-bold text-slate-700">{obra.potenciaKwp} kWp</span></div>}
            {obra.numPaneles && <div className="flex justify-between"><span className="text-[10px] text-slate-400">Paneles</span><span className="text-[10px] font-bold text-slate-700">{obra.numPaneles} uds</span></div>}
            {obra.inversor && <div className="flex justify-between"><span className="text-[10px] text-slate-400">Inversor</span><span className="text-[10px] font-bold text-slate-700">{obra.inversor}</span></div>}
            {obra.bateriaKwh && <div className="flex justify-between"><span className="text-[10px] text-slate-400">Batería</span><span className="text-[10px] font-bold text-slate-700">{obra.bateriaKwh} kWh</span></div>}
            {obra.direccionInstalacion && <div className="flex justify-between"><span className="text-[10px] text-slate-400">Dirección</span><span className="text-[10px] font-bold text-slate-700 text-right max-w-[140px] truncate">{obra.direccionInstalacion}</span></div>}
            <button onClick={() => setShowDetails(false)} className="w-full mt-2 text-[10px] text-slate-400 hover:text-slate-600 font-semibold transition-colors">Ocultar detalles ▲</button>
          </div>
        )}
      </div>
    </div>
  );
}


// ── Time selector component ──
const HOURS = Array.from({ length: 17 }, (_, i) => String(i + 6).padStart(2, '0')); // 06-22
const MINUTES = ['00', '15', '30', '45'];

function TimeSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) {
  const [h, m] = value.split(':');
  return (
    <div className="flex items-center gap-0.5">
      {label && <span className="text-[9px] text-slate-400 mr-1">{label}</span>}
      <select value={h} onChange={e => onChange(e.target.value + ':' + m)}
        className="h-8 px-1 bg-white border border-slate-200 rounded-l text-xs font-semibold text-slate-700 appearance-none text-center w-14">
        {HOURS.map(hr => <option key={hr} value={hr}>{hr}</option>)}
      </select>
      <select value={m} onChange={e => onChange(h + ':' + e.target.value)}
        className="h-8 px-1 bg-white border border-slate-200 rounded-r border-l-0 text-xs font-semibold text-slate-700 appearance-none text-center w-12">
        {MINUTES.map(mn => <option key={mn} value={mn}>{mn}</option>)}
      </select>
    </div>
  );
}

// ═══════════════════════════════════════
// PROGRAMAR MODAL
// ═══════════════════════════════════════
function ProgramarModal({ fechaInicial, instaladorInicial, onClose, onProgramado }: {
  fechaInicial: string;
  instaladorInicial: string;
  onClose: () => void;
  onProgramado: () => void;
}) {
  const [obras, setObras] = useState<BacklogObra[]>([]);
  const [instaladores, setInstaladores] = useState<InstaladorDisp[]>([]);
  const [obraId, setObraId] = useState('');
  const [jornadasForm, setJornadasForm] = useState<Array<{ fecha: string; horaInicio: string; horaFin: string }>>([
    { fecha: fechaInicial || localDateStr(new Date()), horaInicio: '08:00', horaFin: '17:00' },
  ]);
  const [selectedInst, setSelectedInst] = useState<string[]>(instaladorInicial ? [instaladorInicial] : []);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/planificacion/sin-programar').then(r => r.json()).then(d => {
      if (d.ok) setObras(d.data.filter((o: BacklogObra) => ['PREPARANDO', 'PENDIENTE_MATERIAL'].includes(o.estado)));
    });
  }, []);

  const primeraFecha = jornadasForm[0]?.fecha || '';
  useEffect(() => {
    if (primeraFecha) {
      fetch(`/api/planificacion/disponibilidad?fecha=${primeraFecha}`).then(r => r.json()).then(d => { if (d.ok) setInstaladores(d.data); });
    }
  }, [primeraFecha]);

  function toggleInst(id: string) {
    setSelectedInst(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }

  function addJornada() {
    const last = jornadasForm[jornadasForm.length - 1];
    const nextDate = new Date(last.fecha + 'T12:00:00');
    nextDate.setDate(nextDate.getDate() + 1);
    // Skip Sunday
    if (nextDate.getDay() === 0) nextDate.setDate(nextDate.getDate() + 1);
    setJornadasForm([...jornadasForm, {
      fecha: nextDate.toISOString().split('T')[0],
      horaInicio: last.horaInicio,
      horaFin: last.horaFin,
    }]);
  }

  function removeJornada(idx: number) {
    if (jornadasForm.length <= 1) return;
    setJornadasForm(jornadasForm.filter((_, i) => i !== idx));
  }

  function updateJornada(idx: number, field: string, value: string) {
    const updated = [...jornadasForm];
    (updated[idx] as any)[field] = value;
    setJornadasForm(updated);
  }

  async function programar() {
    if (!obraId || jornadasForm.length === 0 || selectedInst.length === 0) {
      setError('Selecciona obra, al menos una jornada e instaladores');
      return;
    }
    setGuardando(true);
    setError('');
    const res = await fetch('/api/planificacion', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'aurosolar-erp' },
      body: JSON.stringify({ obraId, jornadas: jornadasForm, instaladorIds: selectedInst }),
    });
    const data = await res.json();
    if (data.ok) onProgramado();
    else setError(data.error || 'Error al programar');
    setGuardando(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900">Programar instalación</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
          </div>

          {error && <div className="mb-3 p-2.5 bg-red-50 text-red-600 text-xs font-semibold rounded-lg border border-red-100">{error}</div>}

          {/* Select obra */}
          <div className="mb-3">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Obra</label>
            {obras.length === 0 ? (
              <div className="text-xs text-slate-400 bg-slate-50 p-3 rounded-lg text-center border border-slate-200">No hay obras pendientes</div>
            ) : (
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                {obras.map(o => (
                  <button key={o.id} onClick={() => setObraId(o.id)}
                    className={`w-full text-left p-2.5 rounded-lg border-2 transition-all text-sm ${
                      obraId === o.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
                    }`}>
                    <div className="flex items-center gap-2">
                      <span>{TIPO_ICONS[o.tipo] || '⚡'}</span>
                      <span className="font-bold text-slate-800">{o.codigo}</span>
                      <span className="text-slate-500">· {o.cliente.nombre} {o.cliente.apellidos}</span>
                    </div>
                    {o.localidad && <div className="text-[10px] text-slate-400 ml-6">📍 {o.localidad}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Jornadas */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jornadas de trabajo</label>
              <button type="button" onClick={addJornada} className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors">+ Añadir día</button>
            </div>
            <div className="space-y-2 max-h-[180px] overflow-y-auto">
              {jornadasForm.map((j, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <input type="date" value={j.fecha} onChange={e => updateJornada(idx, 'fecha', e.target.value)}
                    className="flex-1 h-8 px-2 bg-white border border-slate-200 rounded text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                  <TimeSelect value={j.horaInicio} onChange={v => updateJornada(idx, 'horaInicio', v)} />
                  <span className="text-slate-400 text-xs">—</span>
                  <TimeSelect value={j.horaFin} onChange={v => updateJornada(idx, 'horaFin', v)} />
                  {jornadasForm.length > 1 && (
                    <button type="button" onClick={() => removeJornada(idx)} className="text-slate-400 hover:text-red-500 text-sm transition-colors">✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Instaladores */}
          <div className="mb-4">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Equipo instalador</label>
            <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
              {instaladores.map(inst => (
                <button key={inst.id} onClick={() => toggleInst(inst.id)}
                  className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg border-2 transition-all ${
                    selectedInst.includes(inst.id) ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
                  }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    selectedInst.includes(inst.id) ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {inst.nombre[0]}{inst.apellidos ? inst.apellidos[0] : ''}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-xs font-semibold text-slate-800">{inst.nombreCompleto}</div>
                    <div className="text-[10px] text-slate-400">
                      {inst.disponible ? '✅ Disponible' : `⚠️ ${inst.obrasEseDia} obra${inst.obrasEseDia > 1 ? 's' : ''} ese día`}
                    </div>
                  </div>
                  {selectedInst.includes(inst.id) && <span className="text-emerald-500 font-bold">✓</span>}
                </button>
              ))}
            </div>
          </div>

          <button onClick={programar} disabled={guardando || !obraId || jornadasForm.length === 0 || selectedInst.length === 0}
            className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-sm disabled:opacity-40 transition-colors">
            {guardando ? 'Programando...' : '📅 Programar instalación'}
          </button>
        </div>
      </div>
    </div>
  );
}
