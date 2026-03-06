// src/app/(campo)/campo/historial/page.tsx
'use client';
import { useState, useEffect } from 'react';

interface CheckinHist {
  id: string; horaEntrada: string; horaSalida: string | null; nota: string | null;
  obra: { codigo: string; direccionInstalacion: string | null; estado: string; cliente: { nombre: string; apellidos: string } };
}

export default function HistorialPage() {
  const [checkins, setCheckins] = useState<CheckinHist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/campo/checkin?limit=50').then(r => r.json()).then(d => {
      if (d.ok) setCheckins(d.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  function duracion(entrada: string, salida: string | null) {
    if (!salida) return 'En curso';
    const mins = Math.round((new Date(salida).getTime() - new Date(entrada).getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }

  function fecha(d: string) {
    return new Date(d).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  function hora(d: string) {
    return new Date(d).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  // Group by date
  const grouped: Record<string, CheckinHist[]> = {};
  checkins.forEach(c => {
    const key = new Date(c.horaEntrada).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(c);
  });

  return (
    <div>
      <h2 className="text-lg font-extrabold text-slate-800 mb-1">📋 Historial</h2>
      <p className="text-sm text-slate-400 mb-5">Tus jornadas de trabajo</p>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /></div>
      ) : checkins.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-sm text-slate-400">Sin registros de jornadas</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([date, items]) => {
            const totalMins = items.reduce((acc, c) => {
              if (!c.horaSalida) return acc;
              return acc + Math.round((new Date(c.horaSalida).getTime() - new Date(c.horaEntrada).getTime()) / 60000);
            }, 0);
            return (
              <div key={date}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-slate-500 capitalize">{date}</p>
                  {totalMins > 0 && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{Math.floor(totalMins/60)}h {totalMins%60}m total</span>}
                </div>
                <div className="space-y-2">
                  {items.map(c => (
                    <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-3">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <p className="text-[11px] font-bold text-emerald-600">{c.obra.codigo}</p>
                          <p className="text-sm font-bold text-slate-800">{c.obra.cliente.nombre} {c.obra.cliente.apellidos}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.horaSalida ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-700'}`}>
                          {duracion(c.horaEntrada, c.horaSalida)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span>🕐 {hora(c.horaEntrada)}</span>
                        <span>???</span>
                        <span>{c.horaSalida ? `🕐 ${hora(c.horaSalida)}` : '...'}</span>
                      </div>
                      {c.nota && <p className="text-[10px] text-slate-400 mt-1 italic">"{c.nota}"</p>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
