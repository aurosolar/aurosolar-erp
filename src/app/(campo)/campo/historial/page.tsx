// src/app/(campo)/campo/historial/page.tsx
'use client';

import { useSession } from '@/lib/useSession';
import { useState, useEffect } from 'react';

interface CheckinHistorial {
  id: string;
  obraId: string;
  horaEntrada: string;
  horaSalida: string | null;
  nota: string | null;
  obra?: {
    codigo: string;
    cliente?: { nombre: string; apellidos: string };
    direccionInstalacion?: string;
  };
}

export default function HistorialPage() {
  const { usuario, loading } = useSession();
  const [checkins, setCheckins] = useState<CheckinHistorial[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (usuario) {
      fetch('/api/campo/checkin')
        .then(r => r.json())
        .then(res => {
          if (res.ok && Array.isArray(res.data)) {
            // Ordenar por fecha descendente
            const sorted = res.data.sort((a: any, b: any) =>
              new Date(b.horaEntrada).getTime() - new Date(a.horaEntrada).getTime()
            );
            setCheckins(sorted);
          }
        })
        .catch(() => {})
        .finally(() => setCargando(false));
    }
  }, [usuario]);

  if (loading || cargando) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-[#F5820A]/30 border-t-[#F5820A] rounded-full animate-spin" />
      </div>
    );
  }

  // Agrupar por día
  const porDia: Record<string, CheckinHistorial[]> = {};
  checkins.forEach(c => {
    const dia = new Date(c.horaEntrada).toLocaleDateString('es-ES', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
    if (!porDia[dia]) porDia[dia] = [];
    porDia[dia].push(c);
  });

  function formatHora(iso: string) {
    return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  function calcularHoras(entrada: string, salida: string | null) {
    if (!salida) return 'En curso';
    const diff = new Date(salida).getTime() - new Date(entrada).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-extrabold">📋 Historial de actividad</h2>

      {checkins.length === 0 ? (
        <div className="bg-white/[0.04] border border-white/[0.06] rounded-[14px] p-8 text-center">
          <div className="text-3xl mb-2">📭</div>
          <p className="text-sm text-white/40">No hay registros de actividad todavía</p>
        </div>
      ) : (
        Object.entries(porDia).map(([dia, items]) => (
          <div key={dia}>
            <div className="text-xs font-bold text-white/30 uppercase tracking-wide mb-2 px-1">
              {dia}
            </div>
            <div className="space-y-2">
              {items.map(c => (
                <div
                  key={c.id}
                  className="bg-white/[0.04] border border-white/[0.06] rounded-[14px] p-3.5"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                      c.horaSalida
                        ? 'bg-[#16A34A]/10 border border-[#16A34A]/20'
                        : 'bg-[#D97706]/10 border border-[#D97706]/20'
                    }`}>
                      {c.horaSalida ? '✅' : '🔄'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold leading-tight truncate">
                        {c.obra?.codigo ?? 'Obra'}
                      </div>
                      {c.obra?.cliente && (
                        <div className="text-xs text-white/40 mt-0.5 truncate">
                          {c.obra.cliente.nombre} {c.obra.cliente.apellidos}
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-white/50">
                        <span>🕐 {formatHora(c.horaEntrada)}</span>
                        {c.horaSalida && <span>→ {formatHora(c.horaSalida)}</span>}
                        <span className={`font-bold ${c.horaSalida ? 'text-[#16A34A]' : 'text-[#D97706]'}`}>
                          {calcularHoras(c.horaEntrada, c.horaSalida)}
                        </span>
                      </div>
                      {c.nota && (
                        <div className="text-xs text-white/30 mt-1 italic truncate">
                          {c.nota}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
