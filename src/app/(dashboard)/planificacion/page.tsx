// src/app/(dashboard)/planificacion/page.tsx
'use client';

import { useState, useEffect } from 'react';

interface Evento {
  id: string; codigo: string; titulo: string; fecha: string;
  tipo: string; estado: string; direccion: string | null;
  localidad: string | null; potencia: number | null;
  instaladores: Array<{ id: string; nombre: string }>;
}

interface ObraPendiente {
  id: string; codigo: string; tipo: string;
  cliente: { nombre: string; apellidos: string };
  direccionInstalacion: string | null; localidad: string | null;
  potenciaKwp: number | null;
}

interface InstaladorDisp {
  id: string; nombre: string; apellidos: string;
  nombreCompleto: string; obrasEseDia: number; disponible: boolean;
}

const TIPOS: Record<string, string> = {
  RESIDENCIAL: '🏠', INDUSTRIAL: '🏭', AGROINDUSTRIAL: '🌾',
  BATERIA: '🔋', AEROTERMIA: '🌡️', BESS: '⚡', BACKUP: '🔌',
};

export default function PlanificacionPage() {
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProgramar, setShowProgramar] = useState(false);
  const [fechaSeleccionada, setFechaSeleccionada] = useState('');

  const hoy = new Date();
  const inicioSemana = new Date(hoy);
  inicioSemana.setDate(hoy.getDate() - hoy.getDay() + 1 + semanaOffset * 7);
  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(inicioSemana);
    d.setDate(inicioSemana.getDate() + i);
    return d;
  });

  useEffect(() => { cargar(); }, [semanaOffset]);

  async function cargar() {
    setLoading(true);
    const desde = dias[0].toISOString();
    const hasta = dias[6].toISOString();
    const res = await fetch(`/api/planificacion?desde=${desde}&hasta=${hasta}`);
    const data = await res.json();
    if (data.ok) setEventos(data.data);
    setLoading(false);
  }

  function eventosDia(fecha: Date) {
    const fStr = fecha.toISOString().split('T')[0];
    return eventos.filter(e => e.fecha && e.fecha.split('T')[0] === fStr);
  }

  const esHoy = (d: Date) => d.toDateString() === hoy.toDateString();
  const nombreDia = (d: Date) => d.toLocaleDateString('es-ES', { weekday: 'short' });
  const numDia = (d: Date) => d.getDate();
  const mesSemana = inicioSemana.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-auro-navy">Planificación</h2>
          <p className="text-xs text-auro-navy/40 capitalize">{mesSemana}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setSemanaOffset(s => s - 1)} className="w-8 h-8 rounded-lg border border-auro-border flex items-center justify-center text-sm hover:bg-auro-surface-2">←</button>
          <button onClick={() => setSemanaOffset(0)} className="h-8 px-3 rounded-lg border border-auro-border text-xs font-semibold hover:bg-auro-surface-2">Hoy</button>
          <button onClick={() => setSemanaOffset(s => s + 1)} className="w-8 h-8 rounded-lg border border-auro-border flex items-center justify-center text-sm hover:bg-auro-surface-2">→</button>
          <button onClick={() => setShowProgramar(true)} className="h-8 px-3 bg-auro-orange hover:bg-auro-orange-dark text-white text-xs font-bold rounded-button ml-2 transition-colors">
            + Programar
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {dias.map((dia) => {
          const evs = eventosDia(dia);
          const esDomingo = dia.getDay() === 0;
          return (
            <div key={dia.toISOString()} className={`min-h-[200px] rounded-card border ${esHoy(dia) ? 'border-auro-orange bg-auro-orange/5' : 'border-auro-border bg-white'} ${esDomingo ? 'opacity-40' : ''}`}>
              {/* Day header */}
              <div className="px-2.5 py-2 border-b border-auro-border/50 flex items-center justify-between">
                <span className={`text-[10px] font-bold uppercase ${esHoy(dia) ? 'text-auro-orange' : 'text-auro-navy/30'}`}>{nombreDia(dia)}</span>
                <span className={`text-sm font-extrabold ${esHoy(dia) ? 'text-auro-orange' : 'text-auro-navy/50'}`}>{numDia(dia)}</span>
              </div>
              {/* Events */}
              <div className="p-1.5 space-y-1">
                {loading ? (
                  <div className="h-4 bg-auro-surface-2 rounded animate-pulse" />
                ) : evs.length === 0 ? (
                  !esDomingo && (
                    <button onClick={() => { setFechaSeleccionada(dia.toISOString().split('T')[0]); setShowProgramar(true); }}
                      className="w-full py-3 text-center text-[10px] text-auro-navy/15 hover:text-auro-orange hover:bg-auro-orange/5 rounded-lg transition-colors">
                      + Añadir
                    </button>
                  )
                ) : evs.map((ev) => (
                  <div key={ev.id} className={`p-2 rounded-lg border text-[10px] ${
                    ev.estado === 'INSTALANDO' ? 'bg-auro-orange/10 border-auro-orange/20' :
                    ev.estado === 'TERMINADA' ? 'bg-estado-green/10 border-estado-green/20' :
                    'bg-estado-blue/10 border-estado-blue/20'
                  }`}>
                    <div className="flex items-center gap-1 mb-0.5">
                      <span>{TIPOS[ev.tipo] || '🏠'}</span>
                      <span className="font-bold">{ev.codigo}</span>
                    </div>
                    {ev.localidad && <div className="text-auro-navy/40 truncate">📍 {ev.localidad}</div>}
                    {ev.potencia && <div className="text-auro-navy/40">⚡ {ev.potencia} kWp</div>}
                    {ev.instaladores.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {ev.instaladores.map(inst => (
                          <span key={inst.id} className="bg-white/60 px-1.5 py-0.5 rounded text-[9px] font-semibold">
                            👷 {inst.nombre.split(' ')[0]}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {showProgramar && (
        <ProgramarModal
          fechaInicial={fechaSeleccionada}
          onClose={() => { setShowProgramar(false); setFechaSeleccionada(''); }}
          onProgramado={() => { cargar(); setShowProgramar(false); setFechaSeleccionada(''); }}
        />
      )}
    </div>
  );
}

// ── Modal Programar Obra ──
function ProgramarModal({ fechaInicial, onClose, onProgramado }: {
  fechaInicial: string; onClose: () => void; onProgramado: () => void;
}) {
  const [obras, setObras] = useState<ObraPendiente[]>([]);
  const [instaladores, setInstaladores] = useState<InstaladorDisp[]>([]);
  const [obraId, setObraId] = useState('');
  const [fecha, setFecha] = useState(fechaInicial || new Date().toISOString().split('T')[0]);
  const [selectedInst, setSelectedInst] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/planificacion/sin-programar').then(r => r.json()).then(d => { if (d.ok) setObras(d.data); });
  }, []);

  useEffect(() => {
    if (fecha) {
      fetch(`/api/planificacion/disponibilidad?fecha=${fecha}`).then(r => r.json()).then(d => { if (d.ok) setInstaladores(d.data); });
    }
  }, [fecha]);

  function toggleInst(id: string) {
    setSelectedInst(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }

  async function programar() {
    if (!obraId || !fecha || selectedInst.length === 0) {
      setError('Selecciona obra, fecha e instaladores');
      return;
    }
    setGuardando(true);
    setError('');
    const res = await fetch('/api/planificacion', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ obraId, fecha, instaladorIds: selectedInst }),
    });
    const data = await res.json();
    if (data.ok) onProgramado();
    else setError(data.error || 'Error');
    setGuardando(false);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5">
          <h3 className="text-base font-bold mb-4">Programar instalación</h3>

          {error && <div className="mb-3 p-2.5 bg-estado-red/10 text-estado-red text-xs font-semibold rounded-xl">{error}</div>}

          {/* Seleccionar obra */}
          <div className="mb-3">
            <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1.5">Obra</label>
            {obras.length === 0 ? (
              <div className="text-xs text-auro-navy/40 bg-auro-surface-2 p-3 rounded-xl text-center">No hay obras pendientes de programar</div>
            ) : (
              <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                {obras.map(o => (
                  <button key={o.id} onClick={() => setObraId(o.id)}
                    className={`w-full text-left p-2.5 rounded-xl border-2 transition-all ${obraId === o.id ? 'border-auro-orange bg-auro-orange/5' : 'border-auro-border'}`}>
                    <div className="flex items-center gap-2">
                      <span>{TIPOS[o.tipo] || '🏠'}</span>
                      <span className="text-xs font-bold">{o.codigo}</span>
                      <span className="text-xs text-auro-navy/40">· {o.cliente.nombre} {o.cliente.apellidos}</span>
                    </div>
                    {o.localidad && <div className="text-[10px] text-auro-navy/30 ml-5">📍 {o.localidad} {o.potenciaKwp ? `· ${o.potenciaKwp} kWp` : ''}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Fecha */}
          <div className="mb-3">
            <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Fecha</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
              className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40" />
          </div>

          {/* Instaladores */}
          <div className="mb-4">
            <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1.5">Equipo instalador</label>
            <div className="space-y-1.5">
              {instaladores.map(inst => (
                <button key={inst.id} onClick={() => toggleInst(inst.id)}
                  className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl border-2 transition-all ${
                    selectedInst.includes(inst.id) ? 'border-auro-orange bg-auro-orange/5' : 'border-auro-border'
                  }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    selectedInst.includes(inst.id) ? 'bg-auro-orange text-white' : 'bg-auro-surface-2 text-auro-navy/40'
                  }`}>
                    {inst.nombre[0]}{inst.apellidos ? inst.apellidos[0] : ''}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-xs font-semibold">{inst.nombreCompleto}</div>
                    <div className="text-[10px] text-auro-navy/30">
                      {inst.disponible ? '✅ Disponible' : `⚠️ ${inst.obrasEseDia} obra${inst.obrasEseDia > 1 ? 's' : ''} ese día`}
                    </div>
                  </div>
                  {selectedInst.includes(inst.id) && <span className="text-auro-orange text-sm">✓</span>}
                </button>
              ))}
            </div>
          </div>

          <button onClick={programar} disabled={guardando || !obraId || selectedInst.length === 0}
            className="w-full h-11 bg-auro-orange hover:bg-auro-orange-dark text-white font-bold rounded-button text-sm disabled:opacity-50 transition-colors">
            {guardando ? 'Programando...' : '📅 Programar instalación'}
          </button>
        </div>
      </div>
    </div>
  );
}
