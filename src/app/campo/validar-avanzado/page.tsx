// src/app/campo/validar-avanzado/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface ObraData {
  id: string; codigo: string; potenciaKwp: number | null; numPaneles: number | null;
  inversor: string | null; bateriaKwh: number | null; marcaPaneles: string | null;
  tipo: string; tienesBateria: boolean;
  cliente: { nombre: string; apellidos: string };
  checklistItems: Array<{ codigo: string; pregunta: string; critico: boolean }>;
}

export default function ValidarAvanzadoPage() {
  const router = useRouter();
  const [obras, setObras] = useState<Array<{ id: string; codigo: string }>>([]);
  const [obraId, setObraId] = useState('');
  const [obraData, setObraData] = useState<ObraData | null>(null);
  const [paso, setPaso] = useState(0);
  const [enviando, setEnviando] = useState(false);

  // Paso 1: Confirmación config
  const [coincide, setCoincide] = useState(true);
  const [kWpReal, setKWpReal] = useState('');
  const [panelesReal, setPanelesReal] = useState('');
  const [inversorReal, setInversorReal] = useState('');
  const [bateriaReal, setBateriaReal] = useState('');

  // Paso 2: Checklist
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});

  // Paso 3: Fotos y seriales
  const [serialInversor, setSerialInversor] = useState('');
  const [serialBateria, setSerialBateria] = useState('');
  const [serialSmartMeter, setSerialSmartMeter] = useState('');
  const [fotosCount, setFotosCount] = useState(0);

  // Paso 4: Resultado
  const [observaciones, setObservaciones] = useState('');

  useEffect(() => {
    fetch('/api/obras').then(r => r.json()).then(d => {
      if (d.ok) setObras(d.data.filter((o: any) => ['INSTALANDO', 'VALIDACION_OPERATIVA'].includes(o.estado)).map((o: any) => ({ id: o.id, codigo: o.codigo })));
    });
  }, []);

  async function cargarObra(id: string) {
    setObraId(id);
    const res = await fetch(`/api/validacion-avanzada?obraId=${id}`);
    const data = await res.json();
    if (data.ok) {
      setObraData(data.data);
      setKWpReal(String(data.data.potenciaKwp || ''));
      setPanelesReal(String(data.data.numPaneles || ''));
      setInversorReal(data.data.inversor || '');
      // Init respuestas
      const r: Record<string, string> = {};
      data.data.checklistItems.forEach((i: any) => { r[i.codigo] = 'SI'; });
      setRespuestas(r);
      setPaso(1);
    }
  }

  function resultadoAuto(): string {
    if (!obraData) return 'BORRADOR';
    const criticosFallidos = obraData.checklistItems.filter(i => i.critico && respuestas[i.codigo] === 'NO');
    if (criticosFallidos.length > 0) return 'NO_OK';
    const conObs = obraData.checklistItems.some(i => respuestas[i.codigo] === 'NO');
    if (conObs || observaciones.trim()) return 'OK_CON_OBS';
    return 'OK';
  }

  async function enviar() {
    if (!obraData) return;
    setEnviando(true);
    const resultado = resultadoAuto();
    await fetch('/api/validacion-avanzada', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'aurosolar-erp' },
      body: JSON.stringify({
        obraId: obraData.id,
        resultado,
        panelConfirmado: coincide,
        kWpReal: parseFloat(kWpReal) || undefined,
        panelesReal: parseInt(panelesReal) || undefined,
        inversorReal: inversorReal || undefined,
        bateriaReal: bateriaReal || undefined,
        serialInversor: serialInversor || undefined,
        serialBateria: serialBateria || undefined,
        serialSmartMeter: serialSmartMeter || undefined,
        observaciones: observaciones || undefined,
        items: Object.entries(respuestas).map(([codigo, respuesta]) => ({ codigo, respuesta })),
      }),
    });
    setEnviando(false);
    setPaso(5); // Pantalla éxito
  }

  const resultado = resultadoAuto();
  const criticosFallidos = obraData?.checklistItems.filter(i => i.critico && respuestas[i.codigo] === 'NO').length || 0;

  // ── Selector obra ──
  if (paso === 0) return (
    <div className="min-h-screen bg-[#0F1C2E] text-[#F0F4F8] p-4">
      <h2 className="text-lg font-bold mb-4">✅ Validación avanzada</h2>
      <p className="text-sm text-white/40 mb-4">Selecciona la obra a validar</p>
      <div className="space-y-2">
        {obras.map(o => (
          <button key={o.id} onClick={() => cargarObra(o.id)}
            className="w-full h-14 px-4 bg-[#1A2E4A] rounded-xl text-left text-sm font-semibold border border-white/10 active:bg-[#F58216]/20">
            🏗️ {o.codigo}
          </button>
        ))}
        {obras.length === 0 && <p className="text-sm text-white/30 text-center py-8">No hay obras listas para validar</p>}
      </div>
    </div>
  );

  // ── Éxito ──
  if (paso === 5) return (
    <div className="min-h-screen bg-[#0F1C2E] text-[#F0F4F8] flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-6xl mb-4">{resultado === 'OK' ? '✅' : resultado === 'OK_CON_OBS' ? '⚠️' : '❌'}</div>
        <h2 className="text-xl font-bold mb-2">Validación {resultado === 'OK' ? 'completada' : resultado === 'OK_CON_OBS' ? 'con observaciones' : 'NO OK'}</h2>
        <p className="text-sm text-white/40 mb-6">{obraData?.codigo} · Seriales registrados · Activos creados</p>
        <button onClick={() => router.push('/campo')} className="h-14 px-8 bg-[#F58216] rounded-xl font-bold text-lg">
          ← Volver
        </button>
      </div>
    </div>
  );

  // ── Progreso ──
  const Progress = () => (
    <div className="flex gap-1 mb-4">
      {[1, 2, 3, 4].map(p => (
        <div key={p} className={`flex-1 h-1 rounded-full ${paso >= p ? 'bg-[#F58216]' : 'bg-white/10'}`} />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0F1C2E] text-[#F0F4F8] p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-white/30">{obraData?.codigo} · {obraData?.cliente.nombre}</span>
        <span className="text-xs text-white/30">Paso {paso}/4</span>
      </div>
      <Progress />

      {/* PASO 1: Confirmación configuración */}
      {paso === 1 && (
        <div>
          <h3 className="text-base font-bold mb-4">⚡ Configuración instalada</h3>
          <div className="bg-[#1A2E4A] rounded-xl p-4 mb-4 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-white/40">Paneles</span><span className="font-bold">{obraData?.numPaneles || '—'}</span></div>
            <div className="flex justify-between text-sm"><span className="text-white/40">Potencia</span><span className="font-bold">{obraData?.potenciaKwp || '—'} kWp</span></div>
            <div className="flex justify-between text-sm"><span className="text-white/40">Inversor</span><span className="font-bold">{obraData?.inversor || '—'}</span></div>
            {obraData?.tienesBateria && <div className="flex justify-between text-sm"><span className="text-white/40">Batería</span><span className="font-bold">{obraData?.bateriaKwh} kWh</span></div>}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button onClick={() => { setCoincide(true); setPaso(2); }}
              className="h-14 bg-green-600/20 border-2 border-green-500/30 rounded-xl font-bold text-sm active:bg-green-600/40">
              ✅ Coincide
            </button>
            <button onClick={() => setCoincide(false)}
              className={`h-14 rounded-xl font-bold text-sm border-2 ${!coincide ? 'bg-amber-600/20 border-amber-500/30' : 'bg-[#1A2E4A] border-white/10'}`}>
              ⚠️ Hay cambios
            </button>
          </div>
          {!coincide && (
            <div className="space-y-3 mb-4">
              <input value={kWpReal} onChange={e => setKWpReal(e.target.value)} type="number" step="0.1" placeholder="kWp real"
                className="w-full h-12 px-4 bg-[#1A2E4A] border border-white/10 rounded-xl text-sm text-center text-lg font-bold" />
              <input value={panelesReal} onChange={e => setPanelesReal(e.target.value)} type="number" placeholder="Nº paneles real"
                className="w-full h-12 px-4 bg-[#1A2E4A] border border-white/10 rounded-xl text-sm text-center text-lg font-bold" />
              <input value={inversorReal} onChange={e => setInversorReal(e.target.value)} placeholder="Modelo inversor real"
                className="w-full h-12 px-4 bg-[#1A2E4A] border border-white/10 rounded-xl text-sm" />
              {obraData?.tienesBateria && (
                <input value={bateriaReal} onChange={e => setBateriaReal(e.target.value)} placeholder="Modelo batería real"
                  className="w-full h-12 px-4 bg-[#1A2E4A] border border-white/10 rounded-xl text-sm" />
              )}
              <button onClick={() => setPaso(2)} className="w-full h-14 bg-[#F58216] rounded-xl font-bold">
                Siguiente →
              </button>
            </div>
          )}
        </div>
      )}

      {/* PASO 2: Checklist */}
      {paso === 2 && (
        <div>
          <h3 className="text-base font-bold mb-4">📋 Checklist seguridad y puesta en marcha</h3>
          <div className="space-y-2 mb-4">
            {obraData?.checklistItems.map(item => (
              <div key={item.codigo} className={`bg-[#1A2E4A] rounded-xl p-3 flex items-center gap-3 ${item.critico ? 'border-l-4 border-red-500/50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{item.pregunta}</div>
                  {item.critico && <div className="text-[9px] text-red-400 font-bold uppercase">CRÍTICO</div>}
                </div>
                <div className="flex gap-1 shrink-0">
                  {['SI', 'NO', 'NA'].map(r => (
                    <button key={r} onClick={() => setRespuestas(p => ({ ...p, [item.codigo]: r }))}
                      className={`w-10 h-10 rounded-lg font-bold text-xs ${
                        respuestas[item.codigo] === r
                          ? r === 'SI' ? 'bg-green-600 text-white' : r === 'NO' ? 'bg-red-600 text-white' : 'bg-gray-500 text-white'
                          : 'bg-white/5 text-white/30'
                      }`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {criticosFallidos > 0 && (
            <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-3 mb-4 text-xs text-red-300 font-semibold">
              ⚠️ {criticosFallidos} ítem{criticosFallidos > 1 ? 's' : ''} crítico{criticosFallidos > 1 ? 's' : ''} en NO — la validación será NO_OK
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setPaso(1)} className="h-14 bg-[#1A2E4A] rounded-xl font-bold text-sm">← Atrás</button>
            <button onClick={() => setPaso(3)} className="h-14 bg-[#F58216] rounded-xl font-bold text-sm">Siguiente →</button>
          </div>
        </div>
      )}

      {/* PASO 3: Fotos y seriales */}
      {paso === 3 && (
        <div>
          <h3 className="text-base font-bold mb-4">📸 Fotos y seriales</h3>

          <div className="space-y-3 mb-4">
            <div className="bg-[#1A2E4A] rounded-xl p-4">
              <div className="text-xs text-white/40 uppercase font-bold mb-2">🔢 Serial inversor *</div>
              <input value={serialInversor} onChange={e => setSerialInversor(e.target.value)} placeholder="Ej: HW5000KDTL12345"
                className="w-full h-12 px-4 bg-[#0F1C2E] border border-white/10 rounded-xl text-sm font-mono text-center text-lg" />
              <div className="text-[9px] text-white/20 mt-1 text-center">Introduce el serial de la etiqueta del inversor</div>
            </div>

            {obraData?.tienesBateria && (
              <div className="bg-[#1A2E4A] rounded-xl p-4">
                <div className="text-xs text-white/40 uppercase font-bold mb-2">🔋 Serial batería</div>
                <input value={serialBateria} onChange={e => setSerialBateria(e.target.value)} placeholder="Serial batería"
                  className="w-full h-12 px-4 bg-[#0F1C2E] border border-white/10 rounded-xl text-sm font-mono text-center text-lg" />
              </div>
            )}

            <div className="bg-[#1A2E4A] rounded-xl p-4">
              <div className="text-xs text-white/40 uppercase font-bold mb-2">📡 Serial smart meter (si aplica)</div>
              <input value={serialSmartMeter} onChange={e => setSerialSmartMeter(e.target.value)} placeholder="Opcional"
                className="w-full h-12 px-4 bg-[#0F1C2E] border border-white/10 rounded-xl text-sm font-mono text-center" />
            </div>

            <div className="bg-[#1A2E4A] rounded-xl p-4 text-center">
              <div className="text-xs text-white/40 uppercase font-bold mb-2">📷 Fotos obligatorias</div>
              <p className="text-[10px] text-white/20 mb-3">Etiqueta inversor · Inversor instalado · Array paneles · Cuadro protecciones</p>
              <label className="inline-block h-14 px-6 bg-[#F58216]/20 border-2 border-dashed border-[#F58216]/40 rounded-xl cursor-pointer flex items-center justify-center gap-2 active:bg-[#F58216]/30">
                <span className="text-2xl">📷</span>
                <span className="text-sm font-bold">{fotosCount > 0 ? `${fotosCount} fotos` : 'Tomar fotos'}</span>
                <input type="file" accept="image/*" capture="environment" multiple className="hidden"
                  onChange={e => setFotosCount(e.target.files?.length || 0)} />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setPaso(2)} className="h-14 bg-[#1A2E4A] rounded-xl font-bold text-sm">← Atrás</button>
            <button onClick={() => setPaso(4)} disabled={!serialInversor}
              className="h-14 bg-[#F58216] rounded-xl font-bold text-sm disabled:opacity-50">
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* PASO 4: Confirmación */}
      {paso === 4 && (
        <div>
          <h3 className="text-base font-bold mb-4">📋 Resumen y confirmación</h3>

          <div className={`rounded-xl p-4 mb-4 text-center ${
            resultado === 'OK' ? 'bg-green-900/30 border border-green-500/30' :
            resultado === 'OK_CON_OBS' ? 'bg-amber-900/30 border border-amber-500/30' :
            'bg-red-900/30 border border-red-500/30'
          }`}>
            <div className="text-3xl mb-1">{resultado === 'OK' ? '✅' : resultado === 'OK_CON_OBS' ? '⚠️' : '❌'}</div>
            <div className="text-sm font-bold">{resultado === 'OK' ? 'Validación OK' : resultado === 'OK_CON_OBS' ? 'OK con observaciones' : 'Validación NO OK'}</div>
            {criticosFallidos > 0 && <div className="text-[10px] text-red-300 mt-1">{criticosFallidos} ítems críticos fallidos</div>}
          </div>

          <div className="bg-[#1A2E4A] rounded-xl p-4 mb-4 space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-white/40">Obra</span><span className="font-bold">{obraData?.codigo}</span></div>
            <div className="flex justify-between"><span className="text-white/40">Serial inversor</span><span className="font-mono">{serialInversor}</span></div>
            {serialBateria && <div className="flex justify-between"><span className="text-white/40">Serial batería</span><span className="font-mono">{serialBateria}</span></div>}
            <div className="flex justify-between"><span className="text-white/40">Config</span><span>{coincide ? 'Confirmada' : 'Modificada'}</span></div>
            <div className="flex justify-between"><span className="text-white/40">Fotos</span><span>{fotosCount}</span></div>
          </div>

          {(resultado !== 'OK') && (
            <div className="mb-4">
              <div className="text-xs text-white/40 uppercase font-bold mb-1">Observaciones {resultado === 'NO_OK' ? '*' : ''}</div>
              <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={3} placeholder="Describe las incidencias encontradas..."
                className="w-full px-4 py-3 bg-[#1A2E4A] border border-white/10 rounded-xl text-sm resize-none" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setPaso(3)} className="h-14 bg-[#1A2E4A] rounded-xl font-bold text-sm">← Atrás</button>
            <button onClick={enviar} disabled={enviando || (resultado === 'NO_OK' && !observaciones.trim())}
              className={`h-14 rounded-xl font-bold text-sm disabled:opacity-50 ${
                resultado === 'OK' ? 'bg-green-600' : resultado === 'OK_CON_OBS' ? 'bg-amber-600' : 'bg-red-600'
              }`}>
              {enviando ? 'Enviando...' : '✅ Finalizar validación'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
