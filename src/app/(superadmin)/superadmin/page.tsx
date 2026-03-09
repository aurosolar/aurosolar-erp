// src/app/(superadmin)/superadmin/page.tsx
'use client';
import { useState, useEffect } from 'react';

interface EmpresaData {
  id: string;
  nombre: string;
  email: string;
  activa: boolean;
  createdAt: string;
  totales: { usuarios: number; obras: number; clientes: number; documentos: number };
  usuariosPorRol: Record<string, number>;
}

const ROL_LABELS: Record<string, string> = {
  ADMIN: 'Admin', DIRECCION: 'Dirección', COMERCIAL: 'Comercial',
  JEFE_INSTALACIONES: 'Jefe Inst.', INSTALADOR: 'Instalador',
  ADMINISTRACION: 'Administración', CLIENTE: 'Cliente',
};

export default function SuperAdminPage() {
  const [data, setData] = useState<{ empresas: EmpresaData[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/superadmin', { headers: { 'X-Requested-With': 'aurosolar-erp' } })
      .then(r => r.json())
      .then(d => { if (d.ok) setData(d.data); else setError(d.error); })
      .catch(() => setError('Error de conexión'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-red-400 text-sm">{error}</div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Empresas', value: data?.total || 0, icon: '🏢', color: 'emerald' },
          { label: 'Activas', value: data?.empresas.filter(e => e.activa).length || 0, icon: '✅', color: 'green' },
          { label: 'Total usuarios', value: data?.empresas.reduce((s, e) => s + e.totales.usuarios, 0) || 0, icon: '👤', color: 'blue' },
          { label: 'Total obras', value: data?.empresas.reduce((s, e) => s + e.totales.obras, 0) || 0, icon: '🔧', color: 'orange' },
        ].map(stat => (
          <div key={stat.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
            <div className="text-xs text-slate-400">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tabla empresas */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h2 className="text-white font-bold text-sm">Empresas registradas</h2>
        </div>
        <div className="divide-y divide-slate-800">
          {data?.empresas.map(empresa => (
            <div key={empresa.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
                    {empresa.nombre[0]}
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">{empresa.nombre}</div>
                    <div className="text-slate-400 text-xs">{empresa.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${empresa.activa ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    {empresa.activa ? 'Activa' : 'Inactiva'}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(empresa.createdAt).toLocaleDateString('es-ES')}
                  </span>
                </div>
              </div>

              {/* Métricas */}
              <div className="grid grid-cols-4 gap-3 mb-3">
                {[
                  { label: 'Usuarios', value: empresa.totales.usuarios },
                  { label: 'Obras', value: empresa.totales.obras },
                  { label: 'Clientes', value: empresa.totales.clientes },
                  { label: 'Documentos', value: empresa.totales.documentos },
                ].map(m => (
                  <div key={m.label} className="bg-slate-800/50 rounded-lg p-2.5 text-center">
                    <div className="text-white font-bold text-lg">{m.value}</div>
                    <div className="text-slate-500 text-[10px]">{m.label}</div>
                  </div>
                ))}
              </div>

              {/* Usuarios por rol */}
              {Object.keys(empresa.usuariosPorRol).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(empresa.usuariosPorRol).map(([rol, count]) => (
                    <span key={rol} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
                      {ROL_LABELS[rol] || rol}: {count}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-slate-600 text-xs">
        Instalyx SaaS — Panel de control interno · {new Date().toLocaleDateString('es-ES')}
      </p>
    </div>
  );
}
