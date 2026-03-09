'use client';
import { useState, useEffect } from 'react';
const H = { 'X-Requested-With': 'aurosolar-erp' };
interface Me { id: string; nombre: string; apellidos: string; email: string; rol: string; telefono?: string }
export default function CampoPerfil() {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    fetch('/api/auth/me', { headers: H }).then(r => r.json()).then(d => { if (d.ok) setMe(d.data); });
  }, []);
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-white font-bold text-xl">Mi perfil</h1>
      {me ? (
        <div className="space-y-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 font-bold text-xl">
              {me.nombre[0]}
            </div>
            <div>
              <p className="text-white font-bold">{me.nombre} {me.apellidos}</p>
              <p className="text-slate-400 text-sm">{me.email}</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                {me.rol.replace('_', ' ')}
              </span>
            </div>
          </div>
          {[
            { label: 'Email', value: me.email, icon: '✉️' },
            { label: 'Teléfono', value: me.telefono || '—', icon: '📞' },
            { label: 'Rol', value: me.rol.replace('_', ' '), icon: '🔑' },
          ].map(item => (
            <div key={item.label} className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-lg">{item.icon}</span>
              <div>
                <p className="text-slate-500 text-xs">{item.label}</p>
                <p className="text-white text-sm font-medium">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
