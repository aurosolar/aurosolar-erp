// src/app/(campo)/campo/perfil/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PerfilPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.ok) setUser(d.data);
    });
  }, []);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  if (!user) return (
    <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /></div>
  );

  return (
    <div>
      <h2 className="text-lg font-extrabold text-slate-800 mb-5">👤 Mi perfil</h2>

      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-xl font-bold text-emerald-700">
            {user.nombre?.[0]}{user.apellidos?.[0]}
          </div>
          <div>
            <p className="text-base font-extrabold text-slate-800">{user.nombre} {user.apellidos}</p>
            <p className="text-xs text-slate-400">{user.email}</p>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-1 inline-block">{user.rol}</span>
          </div>
        </div>
        {user.telefono && (
          <div className="flex items-center gap-2 text-sm text-slate-500 border-t border-slate-100 pt-3">
            <span>📞</span> {user.telefono}
          </div>
        )}
      </div>

      <button onClick={handleLogout}
        className="w-full h-11 bg-red-50 border border-red-200 text-red-600 font-bold text-sm rounded-xl hover:bg-red-100 transition-colors">
        🚪 Cerrar sesión
      </button>
    </div>
  );
}
