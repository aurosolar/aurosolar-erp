// src/components/NotificationBell.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Notificacion {
  id: string;
  titulo: string;
  mensaje: string;
  severidad: 'INFO' | 'WARNING' | 'CRITICAL';
  tipo: string | null;
  enlace: string | null;
  leida: boolean;
  createdAt: string;
}

const SEV_COLORS: Record<string, string> = {
  INFO: 'bg-estado-blue/10 border-estado-blue/20',
  WARNING: 'bg-auro-orange/10 border-auro-orange/20',
  CRITICAL: 'bg-estado-red/10 border-estado-red/20',
};

const SEV_DOT: Record<string, string> = {
  INFO: 'bg-estado-blue',
  WARNING: 'bg-auro-orange',
  CRITICAL: 'bg-estado-red',
};

function timeAgo(date: string) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export function NotificationBell() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Poll count every 30s
  useEffect(() => {
    const fetchCount = () => {
      fetch('/api/notificaciones/count')
        .then(r => r.json())
        .then(d => { if (d.ok) setCount(d.data.count); })
        .catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  async function toggleOpen() {
    if (!open) {
      setOpen(true);
      setLoading(true);
      const res = await fetch('/api/notificaciones');
      const data = await res.json();
      if (data.ok) setNotifs(data.data);
      setLoading(false);
    } else {
      setOpen(false);
    }
  }

  async function marcarLeida(id: string, enlace?: string | null) {
    await fetch('/api/notificaciones/leer', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'aurosolar-erp' },
      body: JSON.stringify({ id }),
    });
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
    setCount(c => Math.max(0, c - 1));
    if (enlace) { setOpen(false); router.push(enlace); }
  }

  async function marcarTodas() {
    await fetch('/api/notificaciones/leer', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'aurosolar-erp' },
      body: JSON.stringify({}),
    });
    setNotifs(prev => prev.map(n => ({ ...n, leida: true })));
    setCount(0);
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={toggleOpen}
        className="relative w-9 h-9 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] flex items-center justify-center text-base transition-colors">
        🔔
        {count > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-estado-red rounded-full flex items-center justify-center text-[10px] font-bold text-white animate-pulse">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-auro-border z-[200] overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-auro-border flex items-center justify-between">
            <h4 className="text-sm font-bold text-auro-navy">Notificaciones</h4>
            {count > 0 && (
              <button onClick={marcarTodas} className="text-[10px] font-semibold text-auro-orange hover:underline">
                Marcar todas leídas
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-auro-orange/20 border-t-auro-orange rounded-full animate-spin" />
              </div>
            ) : notifs.length === 0 ? (
              <div className="py-8 text-center text-auro-navy/25 text-xs">
                <div className="text-2xl mb-2">🔔</div>
                Sin notificaciones
              </div>
            ) : (
              notifs.map(n => (
                <div key={n.id}
                  onClick={() => marcarLeida(n.id, n.enlace)}
                  className={`px-4 py-3 border-b border-auro-border/50 last:border-0 cursor-pointer transition-colors hover:bg-auro-surface-2
                    ${!n.leida ? 'bg-auro-surface-2/60' : ''}`}>
                  <div className="flex items-start gap-2.5">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.leida ? SEV_DOT[n.severidad] : 'bg-transparent'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className={`text-xs font-semibold truncate ${!n.leida ? 'text-auro-navy' : 'text-auro-navy/50'}`}>
                          {n.titulo}
                        </span>
                        <span className="text-[10px] text-auro-navy/25 shrink-0">{timeAgo(n.createdAt)}</span>
                      </div>
                      <p className="text-[11px] text-auro-navy/40 leading-relaxed line-clamp-2">{n.mensaje}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
