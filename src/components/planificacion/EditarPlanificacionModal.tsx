// src/components/planificacion/EditarPlanificacionModal.tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Jornada {
  id: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  notas: string | null;
  instaladores: Array<{ id: string; nombre: string; apellidos: string }>;
}

interface ObraInfo {
  id: string; codigo: string; tipo: string; estado: string;
  localidad: string | null; potenciaKwp: number | null; cliente: string;
}

interface Instalador {
  id: string; nombre: string; apellidos: string; rol: string;
}

const TIPO_ICONS: Record<string, string> = {
  RESIDENCIAL: '🏠', INDUSTRIAL: '🏭', AGROINDUSTRIAL: '🌾',
  BATERIA: '🔋', AEROTERMIA: '🌡️', BESS: '⚡', BACKUP: '🔌',
};

interface Props {
  obraId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export function EditarPlanificacionModal({ obraId, onClose, onUpdate }: Props) {
  const [obra, setObra] = useState<ObraInfo | null>(null);
  const [jornadas, setJornadas] = useState<Jornada[]>([]);
  const [allInstaladores, setAllInstaladores] = useState<Instalador[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [jorRes, instRes] = await Promise.all([
        fetch(`/api/planificacion/jornadas?obraId=${obraId}`),
        fetch('/api/planificacion/instaladores'),
      ]);
      const jorData = await jorRes.json();
      const instData = await instRes.json();
      if (jorData.ok) {
        setObra(jorData.data.obra);
        setJornadas(jorData.data.jornadas);
      }
      if (instData.ok) setAllInstaladores(instData.data);
    } catch { setError('Error cargando datos'); }
    finally { setLoading(false); }
  }, [obraId]);

  useEffect(() => { loadData(); }, [loadData]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  // ── Delete jornada ──
  async function handleDelete(jornadaId: string) {
    if (!confirm('¿Eliminar esta jornada?')) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/planificacion/jornadas/${jornadaId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        showToast('Jornada eliminada');
        await loadData();
        onUpdate();
      } else { setError(data.error || 'Error'); }
    } catch { setError('Error de conexión'); }
    finally { setSaving(false); }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
        <div className="bg-white rounded-2xl p-8" onClick={e => e.stopPropagation()}>
          <div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">{TIPO_ICONS[obra?.tipo || ''] || '⚡'}</span>
              <h3 className="text-sm font-bold text-slate-900">{obra?.codigo}</h3>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-500">{obra?.cliente}</span>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-slate-400">
            {obra?.localidad && <span>📍 {obra.localidad}</span>}
            {obra?.potenciaKwp && <span>⚡ {obra.potenciaKwp} kWp</span>}
            <Link href={`/obras/${obraId}`} className="text-emerald-600 font-semibold hover:text-emerald-700 ml-auto">
              Ver obra completa →
            </Link>
          </div>
        </div>

        {/* Toast */}
        {toast && <div className="mx-5 mt-3 px-3 py-2 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-100">{toast}</div>}
        {error && <div className="mx-5 mt-3 px-3 py-2 bg-red-50 text-red-600 text-xs font-semibold rounded-lg border border-red-100">{error}<button onClick={() => setError('')} className="ml-2">✕</button></div>}

        {/* Jornadas list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Jornadas ({jornadas.length})</h4>
            <button onClick={() => { setShowAddForm(true); setEditingId(null); }}
              className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700">+ Añadir jornada</button>
          </div>

          {jornadas.length === 0 && !showAddForm && (
            <div className="py-8 text-center text-sm text-slate-400">Sin jornadas programadas</div>
          )}

          {jornadas.map(j => (
            <JornadaRow key={j.id} jornada={j} allInstaladores={allInstaladores}
              isEditing={editingId === j.id}
              onEdit={() => { setEditingId(j.id); setShowAddForm(false); }}
              onCancel={() => setEditingId(null)}
              onSave={async (updates) => {
                if (updates.horaFin <= updates.horaInicio) {
                  setError('La hora de fin debe ser posterior a la de inicio');
                  return;
                }
                if (updates.instaladorIds?.length === 0) {
                  setError('Selecciona al menos un instalador');
                  return;
                }
                setSaving(true);
                setError('');
                try {
                  const res = await fetch(`/api/planificacion/jornadas/${j.id}`, {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'aurosolar-erp' },
                    body: JSON.stringify(updates),
                  });
                  const data = await res.json();
                  if (data.ok) {
                    showToast('Jornada actualizada');
                    setEditingId(null);
                    await loadData();
                    onUpdate();
                  } else { setError(data.error || 'Error'); }
                } catch { setError('Error de conexión'); }
                finally { setSaving(false); }
              }}
              onDelete={() => handleDelete(j.id)}
              saving={saving}
            />
          ))}

          {/* Add form */}
          {showAddForm && (
            <AddJornadaForm
              obraId={obraId}
              allInstaladores={allInstaladores}
              lastJornada={jornadas[jornadas.length - 1]}
              onCancel={() => setShowAddForm(false)}
              onSaved={async () => {
                showToast('Jornada añadida');
                setShowAddForm(false);
                await loadData();
                onUpdate();
              }}
              onError={(msg) => setError(msg)}
            />
          )}
        </div>
      </div>
    </div>
  );
}


const HOURS = Array.from({ length: 17 }, (_, i) => String(i + 6).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [h, m] = value.split(':');
  return (
    <div className="flex items-center gap-0">
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
// JORNADA ROW — view + edit mode
// ═══════════════════════════════════════
function JornadaRow({ jornada, allInstaladores, isEditing, onEdit, onCancel, onSave, onDelete, saving }: {
  jornada: Jornada;
  allInstaladores: Instalador[];
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (updates: any) => Promise<void>;
  onDelete: () => void;
  saving: boolean;
}) {
  const [fecha, setFecha] = useState(jornada.fecha.includes('T') ? jornada.fecha.split('T')[0] : jornada.fecha);
  const [horaInicio, setHoraInicio] = useState(jornada.horaInicio);
  const [horaFin, setHoraFin] = useState(jornada.horaFin);
  const [instIds, setInstIds] = useState(jornada.instaladores.map(i => i.id));

  // Reset on edit toggle
  useEffect(() => {
    if (isEditing) {
      setFecha(jornada.fecha.includes('T') ? jornada.fecha.split('T')[0] : jornada.fecha);
      setHoraInicio(jornada.horaInicio);
      setHoraFin(jornada.horaFin);
      setInstIds(jornada.instaladores.map(i => i.id));
    }
  }, [isEditing, jornada]);

  const fechaLabel = new Date(jornada.fecha + 'T12:00:00Z').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });

  if (!isEditing) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition-colors group">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 capitalize">{fechaLabel}</span>
            <span className="text-[10px] text-slate-400">{jornada.horaInicio} - {jornada.horaFin}</span>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} className="text-[10px] font-bold text-blue-600 hover:text-blue-700 px-1.5 py-0.5 rounded hover:bg-blue-50">Editar</button>
            <button onClick={onDelete} className="text-[10px] font-bold text-red-500 hover:text-red-600 px-1.5 py-0.5 rounded hover:bg-red-50">Eliminar</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {jornada.instaladores.map(inst => (
            <span key={inst.id} className="inline-flex items-center gap-1 text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[8px] font-bold">{inst.nombre[0]}{inst.apellidos?.[0]}</span>
              {inst.nombre}
            </span>
          ))}
          {jornada.instaladores.length === 0 && <span className="text-[10px] text-slate-300 italic">Sin equipo</span>}
        </div>
      </div>
    );
  }

  // Edit mode
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
          className="flex-1 h-8 px-2 bg-white border border-slate-200 rounded text-xs" />
        <TimeSelect value={horaInicio} onChange={setHoraInicio} />
        <span className="text-slate-400 text-xs">—</span>
        <TimeSelect value={horaFin} onChange={setHoraFin} />
      </div>
      <div>
        <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Equipo</p>
        <div className="flex flex-wrap gap-1.5">
          {allInstaladores.map(inst => {
            const selected = instIds.includes(inst.id);
            return (
              <button key={inst.id}
                onClick={() => setInstIds(prev => selected ? prev.filter(i => i !== inst.id) : [...prev, inst.id])}
                className={`text-[10px] font-semibold px-2 py-1 rounded-full border transition-colors ${
                  selected ? 'bg-emerald-100 border-emerald-300 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                }`}>
                {inst.nombre} {inst.apellidos?.[0]}.
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button onClick={() => onSave({ fecha, horaInicio, horaFin, instaladorIds: instIds })}
          disabled={saving || instIds.length === 0}
          className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded disabled:opacity-40">
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
        <button onClick={onCancel} className="h-7 px-3 text-slate-500 text-[10px] font-semibold hover:text-slate-700">Cancelar</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// ADD JORNADA FORM
// ═══════════════════════════════════════
function AddJornadaForm({ obraId, allInstaladores, lastJornada, onCancel, onSaved, onError }: {
  obraId: string;
  allInstaladores: Instalador[];
  lastJornada?: Jornada;
  onCancel: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const defaultDate = (() => {
    if (!lastJornada) {
      const n = new Date();
      return n.getFullYear() + "-" + String(n.getMonth()+1).padStart(2,"0") + "-" + String(n.getDate()).padStart(2,"0");
    }
    const next = new Date(lastJornada.fecha + 'T12:00:00Z');
    next.setDate(next.getDate() + 1);
    if (next.getDay() === 0) next.setDate(next.getDate() + 1);
    return next.getUTCFullYear() + '-' + String(next.getUTCMonth()+1).padStart(2,'0') + '-' + String(next.getUTCDate()).padStart(2,'0');
  })();

  const [fecha, setFecha] = useState(defaultDate);
  const [horaInicio, setHoraInicio] = useState(lastJornada?.horaInicio || '08:00');
  const [horaFin, setHoraFin] = useState(lastJornada?.horaFin || '17:00');
  const [instIds, setInstIds] = useState<string[]>(lastJornada?.instaladores.map(i => i.id) || []);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (horaFin <= horaInicio) { onError('La hora de fin debe ser posterior a la de inicio'); return; }
    if (instIds.length === 0) { onError('Selecciona al menos un instalador'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/planificacion/jornadas', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'aurosolar-erp' },
        body: JSON.stringify({ obraId, fecha, horaInicio, horaFin, instaladorIds: instIds }),
      });
      const data = await res.json();
      if (data.ok) onSaved();
      else onError(data.error || 'Error');
    } catch { onError('Error de conexión'); }
    finally { setSaving(false); }
  }

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-2.5">
      <p className="text-[10px] font-bold text-emerald-700 uppercase">Nueva jornada</p>
      <div className="flex items-center gap-2">
        <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
          className="flex-1 h-8 px-2 bg-white border border-slate-200 rounded text-xs" />
        <TimeSelect value={horaInicio} onChange={setHoraInicio} />
        <span className="text-slate-400 text-xs">—</span>
        <TimeSelect value={horaFin} onChange={setHoraFin} />
      </div>
      <div>
        <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Equipo</p>
        <div className="flex flex-wrap gap-1.5">
          {allInstaladores.map(inst => {
            const selected = instIds.includes(inst.id);
            return (
              <button key={inst.id}
                onClick={() => setInstIds(prev => selected ? prev.filter(i => i !== inst.id) : [...prev, inst.id])}
                className={`text-[10px] font-semibold px-2 py-1 rounded-full border transition-colors ${
                  selected ? 'bg-emerald-100 border-emerald-300 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                }`}>
                {inst.nombre} {inst.apellidos?.[0]}.
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button onClick={handleSave} disabled={saving || instIds.length === 0}
          className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded disabled:opacity-40">
          {saving ? 'Añadiendo...' : 'Añadir jornada'}
        </button>
        <button onClick={onCancel} className="h-7 px-3 text-slate-500 text-[10px] font-semibold hover:text-slate-700">Cancelar</button>
      </div>
    </div>
  );
}
