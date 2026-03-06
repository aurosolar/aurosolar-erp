// src/app/(campo)/campo/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface ObraCampo {
  id: string; codigo: string; tipo: string; estado: string;
  localidad: string | null; direccionInstalacion: string | null;
  potenciaKwp: number | null;
  cliente: { nombre: string; apellidos: string; telefono: string | null };
}

interface Sesion {
  id: string; startTime: string; endTime: string | null; cierreTipo: string | null;
  obra: ObraCampo;
}

interface SesionPausada {
  id: string; obraId: string; endTime: string;
  obra: { id: string; codigo: string; tipo: string; cliente: { nombre: string; apellidos: string }; localidad: string | null };
}

interface JornadaActiva {
  shift: { id: string; startTime: string; };
  sesionActiva: Sesion | null;
  pausaActiva: { id: string; startTime: string; } | null;
  obrasPausadas: SesionPausada[];
}

const TIPO_ICONS: Record<string, string> = {
  RESIDENCIAL: '🏠', INDUSTRIAL: '🏭', AGROINDUSTRIAL: '🌾',
  BATERIA: '🔋', AEROTERMIA: '🌡️', BESS: '⚡', BACKUP: '🔌',
};

const MOTIVOS_PAUSA = [
  { value: 'AVERIA_OTRA_OBRA', label: 'Avería urgente en otra obra' },
  { value: 'COMPRAR_MATERIAL', label: 'Comprar material faltante' },
  { value: 'REUNION_GESTION', label: 'Reunión / gestión' },
  { value: 'ORDEN_JEFE', label: 'Orden del jefe' },
  { value: 'INCLEMENCIA_METEO', label: 'Inclemencia meteorológica' },
  { value: 'OTRO', label: 'Otro' },
];

const AVISO_LOPD = 'Se registrará tu ubicación para control de presencia laboral (art. 20.3 ET y normativa de protección de datos). Al continuar, aceptas el uso de geolocalización durante tu jornada.';

function tiempoDesde(fecha: string) {
  const mins = Math.round((Date.now() - new Date(fecha).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function CampoHomePage() {
  const [jornada, setJornada] = useState<JornadaActiva | null>(null);
  const [obras, setObras] = useState<ObraCampo[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [showSalirObra, setShowSalirObra] = useState(false);
  const [showPausaMotivo, setShowPausaMotivo] = useState(false);
  const [pausaMotivo, setPausaMotivo] = useState('');
  const [pausaTexto, setPausaTexto] = useState('');
  const [showFinalizar, setShowFinalizar] = useState(false);
  const [showSeleccionarObra, setShowSeleccionarObra] = useState(false);
  const [showLOPD, setShowLOPD] = useState<'jornada' | 'checkin' | null>(null);
  const [pendingObraId, setPendingObraId] = useState<string | undefined>();
  const [obrasPausadasSinCierre, setObrasPausadasSinCierre] = useState<SesionPausada[]>([]);
  const [showParteEspecial, setShowParteEspecial] = useState(false);
  const [parteEspecialTexto, setParteEspecialTexto] = useState('');
  const [parteEspecialObra, setParteEspecialObra] = useState<SesionPausada | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const i = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(i);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [jr, or] = await Promise.all([
        fetch('/api/jornada').then(r => r.json()),
        fetch('/api/campo/obras').then(r => r.json()),
      ]);
      setJornada(jr.ok ? jr.data : null);
      if (or.ok) setObras(or.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function getGeo(): Promise<{lat?: number; lng?: number}> {
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 8000 })
      );
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch { return {}; }
  }

  // ── Iniciar jornada (tras aceptar LOPD) ──
  async function doIniciarJornada(obraId?: string) {
    setActionLoading('iniciar');
    setShowLOPD(null);
    try {
      const geo = await getGeo();
      const res = await fetch('/api/jornada/iniciar', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'aurosolar-erp' },
        body: JSON.stringify({ ...geo, obraId }),
      });
      const data = await res.json();
      if (data.ok) await fetchData();
      else alert(data.error || 'Error');
    } catch { alert('Error de conexión'); }
    setActionLoading('');
  }

  function solicitarInicioJornada(obraId?: string) {
    setPendingObraId(obraId);
    setShowLOPD('jornada');
  }

  // ── Iniciar sesión en obra (check-in con foto) ──
  async function doIniciarSesion(obraId: string) {
    setActionLoading('sesion');
    setShowLOPD(null);
    setShowSeleccionarObra(false);
    try {
      const res = await fetch('/api/jornada/sesion/iniciar', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'aurosolar-erp' },
        body: JSON.stringify({ obraId }),
      });
      const data = await res.json();
      if (data.ok) await fetchData();
      else alert(data.error || 'Error');
    } catch { alert('Error de conexión'); }
    setActionLoading('');
  }

  function solicitarCheckin(obraId: string) {
    setPendingObraId(obraId);
    setShowSeleccionarObra(false);
    setShowLOPD('checkin');
  }

  // ── Retomar obra pausada (nuevo check-in) ──
  function solicitarRetomar(obraId: string) {
    setPendingObraId(obraId);
    setShowLOPD('checkin');
  }

  // ── Salir de obra ──
  async function salirDeObra(motivo: 'PARTE' | 'VALIDACION' | 'PAUSA', pausaMotivoStr?: string) {
    setActionLoading('salir');
    try {
      const res = await fetch('/api/jornada/sesion/cerrar', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'aurosolar-erp' },
        body: JSON.stringify({ cierreTipo: motivo, pausaMotivo: pausaMotivoStr }),
      });
      const data = await res.json();
      if (data.ok) {
        setShowSalirObra(false);
        setShowPausaMotivo(false);
        setPausaMotivo('');
        setPausaTexto('');
        // TODO Sprint B: if motivo === 'PARTE' → open parte form
        // TODO Sprint D: if motivo === 'VALIDACION' → open validation wizard
        await fetchData();
      } else alert(data.error || 'Error');
    } catch { alert('Error de conexión'); }
    setActionLoading('');
  }

  // ── Pausa personal (jornada) ──
  async function togglePausa() {
    setActionLoading('pausa');
    try { await fetch('/api/jornada/pausa', { method: 'POST' }); await fetchData(); } catch {}
    setActionLoading('');
  }

  // ── Finalizar jornada ──
  async function intentarFinalizar() {
    // Check pausadas sin cierre
    try {
      const res = await fetch('/api/jornada/pausadas-sin-cierre');
      const data = await res.json();
      if (data.ok && data.data.length > 0) {
        setObrasPausadasSinCierre(data.data);
        setShowParteEspecial(true);
        setParteEspecialObra(data.data[0]);
        return;
      }
    } catch {}
    setShowFinalizar(true);
  }

  async function enviarParteEspecial() {
    if (!parteEspecialObra || parteEspecialTexto.length < 5) return;
    setActionLoading('parteEsp');
    try {
      // Crear parte especial como work_report
      await fetch('/api/jornada/sesion/cerrar-pausada', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'aurosolar-erp' },
        body: JSON.stringify({ obraId: parteEspecialObra.obraId, motivo: parteEspecialTexto }),
      });
      // Remove from list
      const remaining = obrasPausadasSinCierre.filter(o => o.obraId !== parteEspecialObra.obraId);
      setObrasPausadasSinCierre(remaining);
      setParteEspecialTexto('');
      if (remaining.length > 0) {
        setParteEspecialObra(remaining[0]);
      } else {
        setShowParteEspecial(false);
        setShowFinalizar(true);
      }
    } catch { alert('Error'); }
    setActionLoading('');
  }

  async function doFinalizarJornada() {
    setActionLoading('finalizar');
    try {
      const geo = await getGeo();
      const nota = (document.getElementById('notaCierre') as HTMLTextAreaElement)?.value;
      const res = await fetch('/api/jornada/finalizar', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'aurosolar-erp' },
        body: JSON.stringify({ ...geo, nota }),
      });
      const data = await res.json();
      if (data.ok) { setShowFinalizar(false); await fetchData(); }
      else alert(data.error || 'Error');
    } catch { alert('Error de conexión'); }
    setActionLoading('');
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
    </div>
  );

  const obrasActivas = obras.filter(o => ['PROGRAMADA','INSTALANDO','VALIDACION_OPERATIVA'].includes(o.estado));
  const sesion = jornada?.sesionActiva;
  const enPausa = !!jornada?.pausaActiva;

  // ═══ SIN JORNADA ═══
  if (!jornada) {
    return (
      <div>
        <div className="text-center py-6">
          <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4">☀️</div>
          <h2 className="text-xl font-extrabold text-slate-800 mb-1">¡Buenos días!</h2>
          <p className="text-sm text-slate-400 mb-6">Inicia tu jornada para empezar a trabajar</p>
          <button onClick={() => solicitarInicioJornada()} disabled={!!actionLoading}
            className="w-full max-w-sm mx-auto h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-emerald-600/25 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
            {actionLoading === 'iniciar' ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '▶️ INICIAR JORNADA'}
          </button>
        </div>
        {obrasActivas.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">O inicia directamente en una obra</p>
            <div className="space-y-2">
              {obrasActivas.map(obra => (
                <button key={obra.id} onClick={() => solicitarInicioJornada(obra.id)} disabled={!!actionLoading}
                  className="w-full flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3 hover:border-emerald-300 transition-colors text-left active:scale-[0.99]">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-lg shrink-0">{TIPO_ICONS[obra.tipo] || '⚡'}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-emerald-600">{obra.codigo}</p>
                    <p className="text-sm font-bold text-slate-800 truncate">{obra.cliente.nombre} {obra.cliente.apellidos}</p>
                    {obra.localidad && <p className="text-[10px] text-slate-400 truncate">📍 {obra.localidad}</p>}
                  </div>
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg shrink-0">Iniciar →</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* LOPD Modal */}
        {showLOPD && <LOPDModal onAccept={() => { showLOPD === 'jornada' ? doIniciarJornada(pendingObraId) : doIniciarSesion(pendingObraId!); }} onCancel={() => setShowLOPD(null)} />}
      </div>
    );
  }

  // ═══ CON JORNADA ACTIVA ═══
  return (
    <div>
      {/* Tarjeta jornada */}
      <div className={`rounded-2xl p-4 mb-4 text-white shadow-md ${enPausa ? 'bg-amber-500' : 'bg-emerald-600'}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{enPausa ? '☕' : '⚡'}</span>
            <span className="text-xs font-bold text-white/70 uppercase">{enPausa ? 'En pausa' : 'Jornada activa'}</span>
          </div>
          <div className="text-right">
            <p className="text-xl font-extrabold">{tiempoDesde(jornada.shift.startTime)}</p>
            <p className="text-[10px] text-white/60">desde {new Date(jornada.shift.startTime).toLocaleTimeString('es-ES', {hour:'2-digit',minute:'2-digit'})}</p>
          </div>
        </div>

        {sesion && (
          <div className="bg-white/15 rounded-xl p-3 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{TIPO_ICONS[sesion.obra.tipo] || '🏠'}</span>
                <div>
                  <p className="text-[10px] text-white/70">{sesion.obra.codigo}</p>
                  <p className="text-sm font-bold">{sesion.obra.cliente.nombre} {sesion.obra.cliente.apellidos}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-base font-extrabold">{tiempoDesde(sesion.startTime)}</p>
                <p className="text-[9px] text-white/50">en obra</p>
              </div>
            </div>
            {sesion.obra.localidad && <p className="text-[10px] text-white/50 mt-1">📍 {sesion.obra.localidad}</p>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {!sesion ? (
            <button onClick={() => setShowSeleccionarObra(true)}
              className="col-span-2 h-11 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold transition-colors active:scale-[0.98]">
              🏗️ Iniciar trabajo en obra
            </button>
          ) : (
            <button onClick={() => setShowSalirObra(true)}
              className="col-span-2 h-11 bg-white text-emerald-700 rounded-xl text-xs font-bold transition-colors active:scale-[0.98]">
              🚪 Salir de esta obra
            </button>
          )}
          <button onClick={togglePausa} disabled={actionLoading === 'pausa'}
            className={`h-10 rounded-xl text-xs font-bold transition-colors active:scale-[0.98] ${enPausa ? 'bg-white text-amber-600' : 'bg-white/20 hover:bg-white/30'}`}>
            {enPausa ? '▶️ Reanudar' : '☕ Pausa'}
          </button>
          <button onClick={intentarFinalizar}
            className="h-10 bg-red-500/80 hover:bg-red-500 rounded-xl text-xs font-bold transition-colors active:scale-[0.98]">
            🏁 Fin jornada
          </button>
        </div>
      </div>

      {/* Obras pausadas */}
      {jornada.obrasPausadas && jornada.obrasPausadas.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-2">⏸️ Obras en pausa</p>
          <div className="space-y-2">
            {jornada.obrasPausadas.map(sp => (
              <div key={sp.id} className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-base shrink-0">{TIPO_ICONS[sp.obra.tipo] || '⚡'}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-amber-700">{sp.obra.codigo}</p>
                  <p className="text-xs font-bold text-slate-800 truncate">{sp.obra.cliente.nombre} {sp.obra.cliente.apellidos}</p>
                </div>
                <button onClick={() => solicitarRetomar(sp.obraId)} disabled={!!actionLoading}
                  className="text-[9px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-lg hover:bg-amber-200 transition-colors">
                  ▶️ Retomar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acciones rápidas */}
      {sesion && (
        <div className="grid grid-cols-4 gap-2 mb-5">
          {[
            { href: `/campo/fotos?obraId=${sesion.obra.id}`, icon: '📸', label: 'Fotos' },
            { href: `/campo/incidencia?obraId=${sesion.obra.id}`, icon: '⚠️', label: 'Incidencia' },
            { href: `/campo/gastos?obraId=${sesion.obra.id}`, icon: '🧾', label: 'Gasto' },
            { href: `/campo/validar?obraId=${sesion.obra.id}`, icon: '✅', label: 'Validar' },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className="bg-white border border-slate-200 rounded-xl p-2.5 text-center hover:border-emerald-300 transition-all active:scale-[0.97]">
              <span className="text-lg block">{item.icon}</span>
              <p className="text-[9px] font-bold text-slate-600 mt-0.5">{item.label}</p>
            </Link>
          ))}
        </div>
      )}

      {/* Mis obras */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-extrabold text-slate-800">Mis obras</h3>
        <Link href="/campo/obras" className="text-[11px] text-emerald-600 font-bold">Ver todas</Link>
      </div>
      <div className="space-y-2">
        {obrasActivas.map(obra => (
          <div key={obra.id} className={`flex items-center gap-3 bg-white border rounded-xl p-3 ${sesion?.obra.id === obra.id ? 'border-emerald-400 bg-emerald-50/30' : 'border-slate-200'}`}>
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-base shrink-0">{TIPO_ICONS[obra.tipo] || '⚡'}</div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-emerald-600">{obra.codigo}</p>
              <p className="text-xs font-bold text-slate-800 truncate">{obra.cliente.nombre} {obra.cliente.apellidos}</p>
            </div>
            {sesion?.obra.id === obra.id
              ? <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Activa</span>
              : <button onClick={() => solicitarCheckin(obra.id)} disabled={!!actionLoading}
                  className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg hover:bg-emerald-100">Ir a obra</button>
            }
          </div>
        ))}
      </div>

      {/* ═══ MODAL: Salir de obra ═══ */}
      {showSalirObra && sesion && !showPausaMotivo && (
        <BottomSheet onClose={() => setShowSalirObra(false)}>
          <h3 className="text-base font-extrabold text-slate-800 mb-1">Salir de {sesion.obra.codigo}</h3>
          <p className="text-sm text-slate-400 mb-4">Tiempo en obra: <span className="font-bold text-slate-700">{tiempoDesde(sesion.startTime)}</span></p>
          <div className="space-y-2">
            <button onClick={() => salirDeObra('PARTE')} disabled={!!actionLoading}
              className="w-full flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 text-left hover:bg-blue-100 transition-colors active:scale-[0.99]">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-xl shrink-0">📋</div>
              <div><p className="text-sm font-bold text-slate-800">Parte de trabajo</p><p className="text-[11px] text-slate-400">La obra continúa otro día</p></div>
            </button>
            <button onClick={() => salirDeObra('VALIDACION')} disabled={!!actionLoading}
              className="w-full flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-left hover:bg-emerald-100 transition-colors active:scale-[0.99]">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-xl shrink-0">✅</div>
              <div><p className="text-sm font-bold text-slate-800">Validación (obra terminada)</p><p className="text-[11px] text-slate-400">Completar checklist y firma</p></div>
            </button>
            <button onClick={() => setShowPausaMotivo(true)}
              className="w-full flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-left hover:bg-amber-100 transition-colors active:scale-[0.99]">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-xl shrink-0">⏸️</div>
              <div><p className="text-sm font-bold text-slate-800">Pausa (volveré luego)</p><p className="text-[11px] text-slate-400">Urgencia u otra tarea</p></div>
            </button>
          </div>
          <button onClick={() => setShowSalirObra(false)} className="w-full h-11 bg-slate-100 text-slate-500 font-bold text-sm rounded-xl mt-3">Cancelar</button>
        </BottomSheet>
      )}

      {/* ═══ MODAL: Motivo de pausa ═══ */}
      {showPausaMotivo && (
        <BottomSheet onClose={() => { setShowPausaMotivo(false); setShowSalirObra(false); }}>
          <h3 className="text-base font-extrabold text-slate-800 mb-3">¿Por qué pausas esta obra?</h3>
          <div className="space-y-2 mb-3">
            {MOTIVOS_PAUSA.map(m => (
              <button key={m.value} onClick={() => setPausaMotivo(m.value)}
                className={`w-full h-10 rounded-xl text-xs font-bold border transition-colors text-left px-4 ${
                  pausaMotivo === m.value ? 'bg-amber-50 border-amber-400 text-amber-700' : 'bg-white border-slate-200 text-slate-500'}`}>
                {m.label}
              </button>
            ))}
          </div>
          {pausaMotivo === 'OTRO' && (
            <textarea value={pausaTexto} onChange={e => setPausaTexto(e.target.value)}
              placeholder="Describe el motivo..." rows={2}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-300 resize-none mb-3" />
          )}
          <button
            onClick={() => salirDeObra('PAUSA', pausaMotivo === 'OTRO' ? pausaTexto : MOTIVOS_PAUSA.find(m => m.value === pausaMotivo)?.label)}
            disabled={!pausaMotivo || (pausaMotivo === 'OTRO' && pausaTexto.length < 3) || !!actionLoading}
            className="w-full h-12 bg-amber-500 text-white font-bold text-sm rounded-xl disabled:opacity-40 active:scale-[0.98]">
            {actionLoading === 'salir' ? 'Guardando...' : '⏸️ Confirmar pausa'}
          </button>
          <button onClick={() => { setShowPausaMotivo(false); setPausaMotivo(''); setPausaTexto(''); }}
            className="w-full h-11 bg-slate-100 text-slate-500 font-bold text-sm rounded-xl mt-2">Volver</button>
        </BottomSheet>
      )}

      {/* ═══ MODAL: Seleccionar obra (sin la activa) ═══ */}
      {showSeleccionarObra && (
        <BottomSheet onClose={() => setShowSeleccionarObra(false)}>
          <h3 className="text-base font-extrabold text-slate-800 mb-3">Seleccionar obra</h3>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {obrasActivas.filter(o => o.id !== sesion?.obra.id).map(obra => (
              <button key={obra.id} onClick={() => solicitarCheckin(obra.id)} disabled={actionLoading === 'sesion'}
                className="w-full flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3 hover:border-emerald-300 text-left active:scale-[0.99]">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-lg shrink-0">{TIPO_ICONS[obra.tipo] || '⚡'}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-emerald-600">{obra.codigo}</p>
                  <p className="text-sm font-bold text-slate-800 truncate">{obra.cliente.nombre} {obra.cliente.apellidos}</p>
                  {obra.localidad && <p className="text-[10px] text-slate-400">📍 {obra.localidad}</p>}
                </div>
              </button>
            ))}
          </div>
          <button onClick={() => setShowSeleccionarObra(false)} className="w-full h-11 bg-slate-100 text-slate-600 font-bold text-sm rounded-xl mt-3">Cancelar</button>
        </BottomSheet>
      )}

      {/* ═══ MODAL: Partes especiales (obras pausadas sin cerrar) ═══ */}
      {showParteEspecial && parteEspecialObra && (
        <BottomSheet onClose={() => {}}>
          <div className="text-center mb-3">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-2xl mx-auto mb-2">⚠️</div>
            <h3 className="text-base font-extrabold text-slate-800">Obra sin cerrar</h3>
            <p className="text-[11px] text-slate-400 mt-1">{parteEspecialObra.obra.codigo} · {parteEspecialObra.obra.cliente.nombre} quedó en pausa</p>
          </div>
          <p className="text-xs text-slate-500 mb-2">Explica por qué no se completó parte ni validación:</p>
          <textarea value={parteEspecialTexto} onChange={e => setParteEspecialTexto(e.target.value)}
            placeholder="Ej: No dio tiempo a volver, se continuará mañana..." rows={3}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-300 resize-none mb-3" />
          <button onClick={enviarParteEspecial}
            disabled={parteEspecialTexto.length < 5 || actionLoading === 'parteEsp'}
            className="w-full h-12 bg-amber-500 text-white font-bold text-sm rounded-xl disabled:opacity-40 active:scale-[0.98]">
            {actionLoading === 'parteEsp' ? 'Guardando...' : `Enviar (${obrasPausadasSinCierre.length} pendiente${obrasPausadasSinCierre.length > 1 ? 's' : ''})`}
          </button>
        </BottomSheet>
      )}

      {/* ═══ MODAL: Finalizar jornada ═══ */}
      {showFinalizar && (
        <BottomSheet onClose={() => setShowFinalizar(false)}>
          <div className="text-center mb-4">
            <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3">🏁</div>
            <h3 className="text-lg font-extrabold text-slate-800">¿Finalizar jornada?</h3>
            <p className="text-sm text-slate-500 mt-1">Duración: <span className="font-bold text-slate-700">{tiempoDesde(jornada.shift.startTime)}</span></p>
            {sesion && <p className="text-[11px] text-amber-600 mt-1">⚠️ Se cerrará la sesión en {sesion.obra.codigo}</p>}
          </div>
          <textarea id="notaCierre" placeholder="Nota de cierre (opcional)..." rows={2}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-300 resize-none mb-3" />
          <div className="flex gap-3">
            <button onClick={() => setShowFinalizar(false)} className="flex-1 h-12 bg-slate-100 text-slate-600 font-bold text-sm rounded-xl">Cancelar</button>
            <button onClick={doFinalizarJornada} disabled={actionLoading === 'finalizar'}
              className="flex-1 h-12 bg-red-500 text-white font-bold text-sm rounded-xl shadow-md shadow-red-500/25 disabled:opacity-50 active:scale-[0.98]">
              {actionLoading === 'finalizar' ? 'Finalizando...' : '🏁 Finalizar'}
            </button>
          </div>
        </BottomSheet>
      )}

      {/* ═══ MODAL: LOPD ═══ */}
      {showLOPD && (
        <BottomSheet onClose={() => setShowLOPD(null)}>
          <div className="text-center mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl mx-auto mb-3">📍</div>
            <h3 className="text-base font-extrabold text-slate-800">Aviso de geolocalización</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed mb-4">{AVISO_LOPD}</p>
          <button onClick={() => { showLOPD === 'jornada' ? doIniciarJornada(pendingObraId) : doIniciarSesion(pendingObraId!); }}
            disabled={!!actionLoading}
            className="w-full h-12 bg-emerald-600 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/25 disabled:opacity-50 active:scale-[0.98]">
            {actionLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : '✅ Aceptar y continuar'}
          </button>
          <button onClick={() => setShowLOPD(null)} className="w-full h-11 bg-slate-100 text-slate-500 font-bold text-sm rounded-xl mt-2">Cancelar</button>
        </BottomSheet>
      )}

      <style jsx>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  );
}

// ═══ Componentes auxiliares ═══

function BottomSheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const nav = document.getElementById("bottom-nav");
    if (nav) nav.style.display = "none";
    return () => { if (nav) nav.style.display = ""; };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-end justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-2xl w-full max-w-lg p-5 pb-8 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()} style={{animation:'slideUp .3s ease-out'}}>
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4 shrink-0" />
        {children}
      </div>
    </div>
  );
}

function LOPDModal({ onAccept, onCancel }: { onAccept: () => void; onCancel: () => void }) {
  const [geoState, setGeoState] = useState<'idle'|'loading'|'ok'|'error'>('idle');
  const [coords, setCoords] = useState<{lat:number;lng:number}|null>(null);

  async function captarUbicacion() {
    setGeoState('loading');
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 10000 })
      );
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setGeoState('ok');
    } catch {
      setGeoState('error');
    }
  }

  return (
    <BottomSheet onClose={onCancel}>
      <div className="text-center mb-4">
        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl mx-auto mb-3">📍</div>
        <h3 className="text-base font-extrabold text-slate-800">Aviso de geolocalización</h3>
      </div>
      <p className="text-xs text-slate-500 leading-relaxed mb-4">{AVISO_LOPD}</p>

      {geoState === 'idle' && (
        <button onClick={captarUbicacion} className="w-full h-12 bg-emerald-600 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/25 active:scale-[0.98]">
          📍 Aceptar y obtener ubicación
        </button>
      )}
      {geoState === 'loading' && (
        <div className="w-full h-12 bg-emerald-100 rounded-xl flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
          <span className="text-sm text-emerald-700 font-semibold">Obteniendo ubicación...</span>
        </div>
      )}
      {geoState === 'ok' && coords && (
        <div className="space-y-2">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
            <p className="text-xs text-emerald-700 font-bold mb-0.5">✅ Ubicación obtenida</p>
            <p className="text-[10px] text-emerald-600">{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</p>
          </div>
          <button onClick={onAccept} className="w-full h-12 bg-emerald-600 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/25 active:scale-[0.98]">
            ▶️ Continuar
          </button>
        </div>
      )}
      {geoState === 'error' && (
        <div className="space-y-2">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
            <p className="text-xs text-amber-700 font-bold">⚠️ No se pudo obtener ubicación</p>
            <p className="text-[10px] text-amber-600">Puedes continuar sin geolocalización</p>
          </div>
          <button onClick={onAccept} className="w-full h-12 bg-emerald-600 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/25 active:scale-[0.98]">
            ▶️ Continuar sin ubicación
          </button>
          <button onClick={captarUbicacion} className="w-full h-10 bg-slate-100 text-slate-600 font-bold text-sm rounded-xl">
            🔄 Reintentar
          </button>
        </div>
      )}
      <button onClick={onCancel} className="w-full h-11 bg-slate-100 text-slate-500 font-bold text-sm rounded-xl mt-2">Cancelar</button>
    </BottomSheet>
  );
}
