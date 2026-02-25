// src/app/(dashboard)/crm/page.tsx
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PipelineCol {
  estado: string; orden: number; conteo: number; valor: number;
}

interface Trato {
  id: string; titulo: string; estado: string; importe: number | null;
  tipo: string | null; createdAt: string;
  contacto: { id: string; nombre: string; apellidos: string; comercialId: string | null;
    comercial: { id: string; nombre: string; apellidos: string } | null };
  obra: { id: string; codigo: string; estado: string } | null;
}

interface DashData {
  tipo: string;
  data: any;
}

const COLS_CONFIG: Record<string, { label: string; icon: string; color: string; border: string }> = {
  NUEVO_CONTACTO: { label: 'Nuevo', icon: '🆕', color: 'bg-blue-500/10', border: 'border-t-blue-500' },
  VISITA_AGENDADA: { label: 'Visita', icon: '📅', color: 'bg-indigo-500/10', border: 'border-t-indigo-500' },
  A_LA_ESPERA_PRESUPUESTO: { label: 'Espera ppto', icon: '⏳', color: 'bg-yellow-500/10', border: 'border-t-yellow-500' },
  PRESUPUESTO_ENVIADO: { label: 'Ppto enviado', icon: '📄', color: 'bg-orange-500/10', border: 'border-t-orange-500' },
  NEGOCIACION: { label: 'Negociación', icon: '🤝', color: 'bg-purple-500/10', border: 'border-t-purple-500' },
  GANADO: { label: 'Ganado', icon: '✅', color: 'bg-green-500/10', border: 'border-t-green-500' },
  PERDIDO: { label: 'Perdido', icon: '❌', color: 'bg-red-500/10', border: 'border-t-red-500' },
};

const VISIBLE_COLS = ['NUEVO_CONTACTO', 'VISITA_AGENDADA', 'A_LA_ESPERA_PRESUPUESTO', 'PRESUPUESTO_ENVIADO', 'NEGOCIACION'];
const fmt = (c: number) => `${(c / 100).toLocaleString('es-ES', { minimumFractionDigits: 0 })}€`;

export default function CRMPage() {
  const [pipeline, setPipeline] = useState<PipelineCol[]>([]);
  const [tratos, setTratos] = useState<Trato[]>([]);
  const [dash, setDash] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtroComercial, setFiltroComercial] = useState('');

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    const params = filtroComercial ? `?comercialId=${filtroComercial}` : '';
    const [rPipe, rTratos, rDash] = await Promise.all([
      fetch(`/api/crm-v2/pipeline${params}`).then(r => r.json()),
      fetch(`/api/tratos${params}`).then(r => r.json()),
      fetch('/api/crm-v2/dashboard').then(r => r.json()),
    ]);
    if (rPipe.ok) setPipeline(rPipe.data);
    if (rTratos.ok) setTratos(rTratos.data);
    if (rDash.ok) setDash(rDash.data);
    setLoading(false);
  }

  const tratosActivos = tratos.filter(t => !['GANADO', 'PERDIDO'].includes(t.estado));
  const totalPipelineValor = pipeline.filter(p => !['GANADO', 'PERDIDO'].includes(p.estado)).reduce((s, p) => s + p.valor, 0);
  const totalPipelineConteo = pipeline.filter(p => !['GANADO', 'PERDIDO'].includes(p.estado)).reduce((s, p) => s + p.conteo, 0);
  const ganados = pipeline.find(p => p.estado === 'GANADO');
  const perdidos = pipeline.find(p => p.estado === 'PERDIDO');

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando CRM...</div>;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Pipeline activo</div>
          <div className="text-2xl font-bold text-white mt-1">{totalPipelineConteo}</div>
          <div className="text-xs text-orange-400 font-semibold">{fmt(totalPipelineValor)}</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Ganados</div>
          <div className="text-2xl font-bold text-green-400 mt-1">{ganados?.conteo || 0}</div>
          <div className="text-xs text-green-400/70">{fmt(ganados?.valor || 0)}</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Perdidos</div>
          <div className="text-2xl font-bold text-red-400 mt-1">{perdidos?.conteo || 0}</div>
          <div className="text-xs text-red-400/70">{fmt(perdidos?.valor || 0)}</div>
        </div>
        {dash?.tipo === 'direccion' && dash.data?.kpis && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Tasa conversión</div>
            <div className="text-2xl font-bold text-purple-400 mt-1">{dash.data.kpis.tasaConversion}%</div>
            <div className="text-xs text-gray-500">ganados / cerrados</div>
          </div>
        )}
        {dash?.tipo === 'comercial' && dash.data && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Mis tareas hoy</div>
            <div className="text-2xl font-bold text-blue-400 mt-1">{dash.data.tareasHoy || 0}</div>
            <div className="text-xs text-gray-500">{dash.data.tareasPendientes || 0} pendientes</div>
          </div>
        )}
      </div>

      {/* Pipeline Kanban */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold text-white">Pipeline de tratos</h2>
          <Link href="/contactos" className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold">
            + Nuevo contacto
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {VISIBLE_COLS.map(est => {
            const cfg = COLS_CONFIG[est];
            const col = pipeline.find(p => p.estado === est);
            const tratosCol = tratosActivos.filter(t => t.estado === est);
            return (
              <div key={est} className={`rounded-xl border-t-3 ${cfg.border} border border-gray-700/50 ${cfg.color} min-h-[200px]`}>
                {/* Column header */}
                <div className="px-3 py-2 border-b border-gray-700/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-300">{cfg.icon} {cfg.label}</span>
                    <span className="text-[10px] bg-gray-700/50 px-1.5 py-0.5 rounded-full text-gray-400">{col?.conteo || 0}</span>
                  </div>
                  {(col?.valor || 0) > 0 && <div className="text-[10px] text-orange-400 font-semibold mt-0.5">{fmt(col!.valor)}</div>}
                </div>
                {/* Cards */}
                <div className="p-1.5 space-y-1.5">
                  {tratosCol.map(t => (
                    <Link key={t.id} href={`/contactos/${t.contacto.id}`}
                      className="block p-2.5 bg-gray-800/80 rounded-lg border border-gray-700/50 hover:border-orange-500/30 transition-colors cursor-pointer">
                      <div className="text-xs font-semibold text-white truncate">{t.titulo}</div>
                      <div className="text-[10px] text-gray-400 truncate mt-0.5">
                        {t.contacto.nombre} {t.contacto.apellidos}
                      </div>
                      <div className="flex justify-between items-center mt-1.5">
                        {t.importe ? <span className="text-[10px] font-bold text-orange-400">{fmt(t.importe)}</span> : <span />}
                        {t.contacto.comercial && (
                          <span className="text-[9px] text-gray-500">{t.contacto.comercial.nombre}</span>
                        )}
                      </div>
                    </Link>
                  ))}
                  {tratosCol.length === 0 && (
                    <div className="text-center py-4 text-[10px] text-gray-600">Vacío</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ranking comerciales (solo dirección) */}
      {dash?.tipo === 'direccion' && dash.data?.ranking && dash.data.ranking.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3">🏆 Ranking comerciales (mes actual)</h3>
          <div className="space-y-1.5">
            {dash.data.ranking.map((r: any, i: number) => (
              <div key={r.id} className="flex items-center gap-3 p-3 bg-gray-800/50 border border-gray-700 rounded-xl">
                <span className="text-lg w-8 text-center">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white">{r.nombre}</div>
                  <div className="text-[10px] text-gray-500">{r.zona || 'Sin zona'} · {r.totalContactos} contactos · {r.tratosAbiertos} tratos abiertos</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-green-400">{fmt(r.valorGanadoMes)}</div>
                  <div className="text-[10px] text-gray-500">{r.tratosGanadosMes} ganados · {r.cumplimiento}% obj.</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
