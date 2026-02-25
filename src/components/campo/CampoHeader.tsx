// src/components/campo/CampoHeader.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface CheckinActivo {
  id: string;
  horaEntrada: string;
  obra: {
    id: string;
    codigo: string;
    tipo: string;
    estado: string;
    direccionInstalacion: string | null;
    localidad: string | null;
    potenciaKwp: number | null;
    cliente: { nombre: string; apellidos: string };
  };
}

function formatDuracion(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function CampoHeader({ nombreUsuario }: { nombreUsuario: string }) {
  const router = useRouter();
  const [checkin, setCheckin] = useState<CheckinActivo | null>(null);
  const [duracion, setDuracion] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Cargar checkin activo al montar
  const fetchCheckinActivo = useCallback(async () => {
    try {
      const res = await fetch('/api/campo/checkin/activo');
      const data = await res.json();
      if (data.ok && data.data) {
        setCheckin(data.data);
      } else {
        setCheckin(null);
      }
    } catch {
      // Silencioso — se reintenta al navegar
    }
  }, []);

  useEffect(() => {
    fetchCheckinActivo();
  }, [fetchCheckinActivo]);

  // Timer que se actualiza cada segundo
  useEffect(() => {
    if (!checkin) {
      setDuracion('');
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const entradaMs = new Date(checkin.horaEntrada).getTime();

    function tick() {
      const diff = Date.now() - entradaMs;
      setDuracion(formatDuracion(diff));
    }

    tick();
    timerRef.current = setInterval(tick, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [checkin]);

  async function handleCheckout() {
    if (!checkin) return;
    setCheckoutLoading(true);
    try {
      const res = await fetch('/api/campo/checkin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkinId: checkin.id }),
      });
      const data = await res.json();
      if (data.ok) {
        setCheckin(null);
        setShowConfirm(false);
        router.refresh();
      } else {
        alert(data.error || 'Error al registrar check-out');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setCheckoutLoading(false);
    }
  }

  const saludo = new Date().getHours() < 14 ? 'Buenos días' : 'Buenas tardes';

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-b from-[#1A2E4A] to-[#162640] border-b border-white/[0.06] px-5 pt-4 pb-5">
      {/* Top row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-[10px] bg-[#F5820A] flex items-center justify-center text-lg shadow-md shadow-[#F5820A]/30">
            ☀️
          </div>
          <div>
            <div className="text-[15px] font-extrabold leading-tight">
              Auro <span className="text-[#F5820A]">Solar</span>
            </div>
          </div>
        </div>
        <button className="w-10 h-10 bg-white/[0.06] border border-white/[0.08] rounded-xl flex items-center justify-center text-lg relative">
          🔔
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#DC2626] border-2 border-[#1A2E4A]" />
        </button>
      </div>

      {/* Saludo */}
      <div className="mb-3">
        <div className="text-[13px] text-white/40 font-medium">{saludo} 👷</div>
        <div className="text-[22px] font-extrabold leading-tight">{nombreUsuario}</div>
      </div>

      {/* Tarjeta de jornada */}
      {checkin ? (
        <div
          onClick={() => setShowConfirm(true)}
          className="bg-[#F5820A]/10 border border-[#F5820A]/20 rounded-[14px] p-3.5 flex items-center gap-3 cursor-pointer active:bg-[#F5820A]/15 transition-colors"
        >
          <div className="w-11 h-11 rounded-xl bg-[#F5820A]/20 flex items-center justify-center text-xl shrink-0 relative">
            ⚡
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#16A34A] border-2 border-[#162640] animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold leading-tight truncate">
              {checkin.obra.codigo} · {checkin.obra.cliente.nombre}
            </div>
            <div className="text-xs text-white/40 mt-0.5 truncate">
              {checkin.obra.localidad || checkin.obra.direccionInstalacion} · En instalación
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-lg font-extrabold tabular-nums text-[#F5820A]">
              {duracion}
            </div>
            <div className="text-[9px] text-white/25 font-medium uppercase tracking-wider">
              Toca para salir
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white/[0.06] border border-white/[0.08] rounded-[14px] p-3.5 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#2563EB]/10 flex items-center justify-center text-xl shrink-0">
            ☕
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold leading-tight">Sin jornada activa</div>
            <div className="text-xs text-white/40 mt-0.5">Haz check-in en una obra para empezar</div>
          </div>
        </div>
      )}

      {/* Modal confirmación check-out */}
      {showConfirm && checkin && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="bg-[#1A2E4A] w-full max-w-md rounded-t-[20px] border-t border-white/[0.08] p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-5" />
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">🏁</div>
              <h3 className="text-lg font-extrabold mb-1">¿Finalizar jornada?</h3>
              <p className="text-sm text-white/40">
                {checkin.obra.codigo} · Duración: <span className="font-bold text-white">{duracion}</span>
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 h-12 bg-white/[0.06] border border-white/[0.08] text-white font-bold rounded-[14px] text-sm active:scale-95 transition-transform"
              >
                Cancelar
              </button>
              <button
                onClick={handleCheckout}
                disabled={checkoutLoading}
                className="flex-1 h-12 bg-[#DC2626] text-white font-bold rounded-[14px] text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
              >
                {checkoutLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>🛑 Check-out</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
