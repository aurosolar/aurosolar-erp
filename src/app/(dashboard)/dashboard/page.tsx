// src/app/(dashboard)/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DashboardData {
  kpis: {
    facturacion: { valor: number; delta: number };
    cobradoMes: { valor: number; delta: number };
    pendiente: { valor: number; obrasMas15d: number };
    obrasActivas: number;
    instalandoHoy: number;
    margen: number;
  };
  alertas: Array<{ tipo: string; icon: string; label: string; color: string; conteo: number; href: string }>;
  grafico: Array<{ mes: string; presupuestado: number; cobrado: number; esFuturo: boolean }>;
  incidencias: Array<{
    id: string; gravedad: string; estado: string; descripcion: string; createdAt: string;
    obra: { codigo: string }; creadoPor: { nombre: string };
  }>;
  contadores: Record<string, number>;
  actividad: Array<{
    id: string; accion: string; entidad: string; createdAt: string;
    usuario: { nombre: string }; obra: { codigo: string } | null;
  }>;
  ranking: Array<{ nombre: string; obras: number; volumen: number }>;
}

const ICONOS_ACCION: Record<string, string> = {
  ESTADO_CAMBIADO: '🔄', PAGO_REGISTRADO: '💰', DOCUMENTO_SUBIDO: '📤',
  INCIDENCIA_CREADA: '⚠️', OBRA_CREADA: '🏗️', LEAD_CREADO: '📊',
  LEAD_CONVERTIDO: '🎯', CHECKIN: '📍', SUBVENCION_CREADA: '🏛️',
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json()).then(d => {
      if (d.ok) setData(d.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const fmt = (c: number) => {
    if (c >= 10000000) return `${Math.round(c / 100000)}K€`;
    return `${(c / 100).toLocaleString('es-ES', { maximumFractionDigits: 0 })}€`;
  };

  const tiempoRel = (f: string) => {
    const min = Math.floor((Date.now() - new Date(f).getTime()) / 60000);
    if (min < 1) return 'Ahora';
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  if (loading) return <div className="flex items-center justify-center py-24"><div className="w-10 h-10 border-4 border-auro-orange/20 border-t-auro-orange rounded-full animate-spin" /></div>;
  if (!data) return <p className="text-center text-auro-navy/40 py-12">Error cargando dashboard</p>;

  const { kpis, alertas, grafico, incidencias, contadores, actividad, ranking } = data;
  const maxGrafico = Math.max(...grafico.map(m => Math.max(m.presupuestado, m.cobrado)), 1);

  return (
    <div>
      {/* Alertas watchdog */}
      {alertas.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {alertas.map((a) => (
            <Link key={a.tipo} href={a.href}
              className={`shrink-0 h-8 px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all hover:scale-105 ${
                a.color === 'red' ? 'bg-estado-red/10 text-estado-red border-estado-red/20' :
                a.color === 'blue' ? 'bg-estado-blue/10 text-estado-blue border-estado-blue/20' :
                'bg-estado-amber/10 text-estado-amber border-estado-amber/20'
              }`}>
              <span>{a.icon}</span> {a.label} <span className="font-extrabold">{a.conteo}</span>
            </Link>
          ))}
        </div>
      )}

      {/* 6 KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        {[
          { icon: '💶', label: 'Facturación mes', value: fmt(kpis.facturacion.valor), delta: kpis.facturacion.delta, color: 'border-t-auro-orange', valueColor: 'text-auro-orange' },
          { icon: '✅', label: 'Cobrado mes', value: fmt(kpis.cobradoMes.valor), delta: kpis.cobradoMes.delta, color: 'border-t-estado-green', valueColor: 'text-estado-green' },
          { icon: '⏰', label: 'Pendiente cobro', value: fmt(kpis.pendiente.valor), sub: `${kpis.pendiente.obrasMas15d} obras >15d`, color: 'border-t-estado-red', valueColor: 'text-estado-red' },
          { icon: '🏗️', label: 'Obras activas', value: `${kpis.obrasActivas}`, color: 'border-t-estado-blue', valueColor: 'text-estado-blue' },
          { icon: '👷', label: 'Instalando hoy', value: `${kpis.instalandoHoy}`, color: 'border-t-estado-amber', valueColor: 'text-estado-amber' },
          { icon: '📊', label: 'Margen bruto', value: `${kpis.margen}%`, color: 'border-t-auro-navy', valueColor: 'text-auro-navy' },
        ].map((kpi: any) => (
          <div key={kpi.label} className={`bg-white rounded-card border border-auro-border border-t-[3px] ${kpi.color} p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all`}>
            <span className="text-2xl block mb-2">{kpi.icon}</span>
            <div className="text-[10px] font-bold text-auro-navy/30 uppercase tracking-wider mb-1">{kpi.label}</div>
            <div className={`text-2xl font-extrabold leading-none mb-1 ${kpi.valueColor}`}>{kpi.value}</div>
            {kpi.delta !== undefined && kpi.delta !== 0 && (
              <div className={`text-[11px] font-medium ${kpi.delta > 0 ? 'text-estado-green' : 'text-estado-red'}`}>
                {kpi.delta > 0 ? '▲' : '▼'} {Math.abs(kpi.delta)}% vs mes ant.
              </div>
            )}
            {kpi.sub && <div className="text-[10px] text-auro-navy/30">{kpi.sub}</div>}
          </div>
        ))}
      </div>

      {/* Pipeline + Incidencias */}
      <div className="grid lg:grid-cols-[1fr_340px] gap-4 mb-4">
        <div className="bg-white rounded-card border border-auro-border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-auro-border flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-auro-orange/10 flex items-center justify-center text-sm">🏗️</span>
            <span className="text-[13px] font-bold flex-1">Pipeline operativo</span>
            <Link href="/obras" className="text-xs font-semibold text-auro-orange hover:underline">Ver todas →</Link>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { e: 'REVISION_TECNICA', l: '🔍 Revisión', c: 'bg-estado-purple/10 text-estado-purple border-estado-purple/20' },
              { e: 'PREPARANDO', l: '📋 Preparando', c: 'bg-estado-amber/10 text-estado-amber border-estado-amber/20' },
              { e: 'PROGRAMADA', l: '📅 Programada', c: 'bg-estado-blue/10 text-estado-blue border-estado-blue/20' },
              { e: 'INSTALANDO', l: '⚡ Instalando', c: 'bg-auro-orange/10 text-auro-orange border-auro-orange/20' },
              { e: 'INCIDENCIA', l: '⚠️ Incidencia', c: 'bg-estado-red/10 text-estado-red border-estado-red/20' },
              { e: 'LEGALIZACION', l: '📋 Legal.', c: 'bg-estado-blue/10 text-estado-blue border-estado-blue/20' },
              { e: 'COMPLETADA', l: '🏆 Completada', c: 'bg-estado-green/10 text-estado-green border-estado-green/20' },
            ].map((item) => (
              <div key={item.e} className={`rounded-xl border p-3 text-center ${item.c}`}>
                <div className="text-2xl font-extrabold">{contadores[item.e] || 0}</div>
                <div className="text-[10px] font-bold mt-0.5">{item.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-card border border-auro-border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-auro-border flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-estado-red/10 flex items-center justify-center text-sm">⚠️</span>
            <span className="text-[13px] font-bold flex-1">Incidencias abiertas</span>
            <Link href="/incidencias" className="text-xs font-semibold text-auro-orange hover:underline">Ver →</Link>
          </div>
          <div className="divide-y divide-auro-border">
            {incidencias.length === 0 ? (
              <div className="p-6 text-center text-sm text-auro-navy/30">Sin incidencias 🎉</div>
            ) : incidencias.slice(0, 5).map((inc) => {
              const dias = Math.floor((Date.now() - new Date(inc.createdAt).getTime()) / 86400000);
              return (
                <div key={inc.id} className="px-4 py-2.5 flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${inc.gravedad === 'CRITICA' || inc.gravedad === 'ALTA' ? 'bg-estado-red' : inc.gravedad === 'MEDIA' ? 'bg-estado-amber' : 'bg-estado-blue'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-auro-orange">{inc.obra.codigo}</div>
                    <div className="text-xs text-auro-navy/60 truncate">{inc.descripcion}</div>
                  </div>
                  <span className="text-[10px] font-bold text-auro-navy/30 shrink-0">{dias}d</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Gráfico + Actividad + Ranking */}
      <div className="grid lg:grid-cols-[1fr_340px] gap-4">
        {/* Gráfico facturación */}
        <div className="bg-white rounded-card border border-auro-border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-auro-border flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-auro-navy/5 flex items-center justify-center text-sm">📈</span>
            <span className="text-[13px] font-bold flex-1">Facturación {new Date().getFullYear()}</span>
            <div className="flex items-center gap-4 text-[10px] font-medium text-auro-navy/40">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-auro-orange/30" /> Presup.</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-auro-orange" /> Cobrado</span>
            </div>
          </div>
          <div className="p-4">
            <div className="flex items-end gap-1.5 h-40">
              {grafico.map((m, i) => {
                const hPres = maxGrafico > 0 ? (m.presupuestado / maxGrafico) * 100 : 0;
                const hCob = maxGrafico > 0 ? (m.cobrado / maxGrafico) * 100 : 0;
                const esMesActual = i === new Date().getMonth();
                return (
                  <div key={m.mes} className={`flex-1 flex flex-col items-center gap-1 ${m.esFuturo ? 'opacity-25' : ''}`}>
                    <div className="w-full flex items-end justify-center gap-[2px] h-32">
                      <div className="w-[40%] rounded-t-sm bg-auro-orange/20 transition-all" style={{ height: `${hPres}%`, minHeight: m.presupuestado > 0 ? '4px' : '0' }} />
                      <div className={`w-[40%] rounded-t-sm transition-all ${esMesActual ? 'bg-auro-orange shadow-sm shadow-auro-orange/30' : 'bg-auro-orange/70'}`} style={{ height: `${hCob}%`, minHeight: m.cobrado > 0 ? '4px' : '0' }} />
                    </div>
                    <span className={`text-[9px] font-bold uppercase ${esMesActual ? 'text-auro-orange' : 'text-auro-navy/25'}`}>{m.mes}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Actividad reciente + Ranking */}
        <div className="space-y-4">
          {/* Actividad reciente */}
          <div className="bg-white rounded-card border border-auro-border shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-auro-border flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-auro-navy/5 flex items-center justify-center text-sm">🕐</span>
              <span className="text-[13px] font-bold flex-1">Actividad reciente</span>
              <Link href="/auditoria" className="text-xs font-semibold text-auro-orange hover:underline">Ver →</Link>
            </div>
            <div className="divide-y divide-auro-border">
              {actividad.slice(0, 6).map(a => (
                <div key={a.id} className="px-4 py-2 flex items-center gap-2">
                  <span className="text-sm">{ICONOS_ACCION[a.accion] || '📋'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold truncate">{a.accion.replace(/_/g, ' ').toLowerCase()}</div>
                    <div className="text-[10px] text-auro-navy/30 truncate">{a.usuario.nombre}{a.obra ? ` · ${a.obra.codigo}` : ''}</div>
                  </div>
                  <span className="text-[9px] text-auro-navy/20 shrink-0">{tiempoRel(a.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ranking comerciales */}
          {ranking.length > 0 && (
            <div className="bg-white rounded-card border border-auro-border shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-auro-border flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-estado-amber/10 flex items-center justify-center text-sm">🏆</span>
                <span className="text-[13px] font-bold flex-1">Ranking comerciales</span>
                <Link href="/comerciales" className="text-xs font-semibold text-auro-orange hover:underline">Ver →</Link>
              </div>
              <div className="divide-y divide-auro-border">
                {ranking.slice(0, 5).map((c, i) => (
                  <div key={i} className="px-4 py-2.5 flex items-center gap-2.5">
                    <span className="text-sm font-bold text-auro-navy/20 w-5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate">{c.nombre}</div>
                      <div className="text-[10px] text-auro-navy/30">{c.obras} obras este mes</div>
                    </div>
                    <span className="text-xs font-bold text-auro-orange">{fmt(c.volumen)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
