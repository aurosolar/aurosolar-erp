// src/app/(superadmin)/paneladmin/page.tsx
'use client';
import { useState, useEffect } from 'react';

interface EmpresaData {
  id: string;
  nombre: string;
  email: string;
  activa: boolean;
  createdAt: string;
  totales: { usuarios: number; obras: number; clientes: number; documentos: number; mb: number };
  usuariosPorRol: Record<string, number>;
}

const ROL_LABELS: Record<string, string> = {
  ADMIN: 'Admin', DIRECCION: 'Dirección', COMERCIAL: 'Comercial',
  JEFE_INSTALACIONES: 'Jefe Inst.', INSTALADOR: 'Instalador',
  ADMINISTRACION: 'Adm.', CLIENTE: 'Cliente',
};

export default function PanelAdminPage() {
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

  const totalUsuarios = data?.empresas.reduce((s, e) => s + e.totales.usuarios, 0) || 0;
  const totalObras = data?.empresas.reduce((s, e) => s + e.totales.obras, 0) || 0;
  const totalMb = data?.empresas.reduce((s, e) => s + e.totales.mb, 0) || 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Empresas', value: data?.total || 0, sub: `${data?.empresas.filter(e => e.activa).length} activas`, icon: '🏢' },
          { label: 'Usuarios totales', value: totalUsuarios, sub: 'en todas las empresas', icon: '👤' },
          { label: 'Obras totales', value: totalObras, sub: 'en todas las empresas', icon: '🔧' },
          { label: 'Almacenamiento', value: `${totalMb.toFixed(1)} MB`, sub: 'documentos subidos', icon: '💾' },
        ].map(stat => (
          <div key={stat.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-2xl mb-2">{stat.icon}</div>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
            <div className="text-xs font-semibold text-slate-300 mt-0.5">{stat.label}</div>
            <div className="text-xs text-slate-500 mt-0.5">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-white font-bold text-sm">Empresas registradas</h2>
          <span className="text-xs text-slate-500">{data?.total} empresa{data?.total !== 1 ? 's' : ''}</span>
        </div>

        {/* Header tabla */}
        <div className="grid grid-cols-12 gap-4 px-5 py-2.5 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          <div className="col-span-3">Empresa</div>
          <div className="col-span-2 text-center">Usuarios</div>
          <div className="col-span-2 text-center">Obras</div>
          <div className="col-span-2 text-center">Almacenamiento</div>
          <div className="col-span-2 text-center">Plan</div>
          <div className="col-span-1 text-center">Estado</div>
        </div>

        <div className="divide-y divide-slate-800">
          {data?.empresas.map(empresa => (
            <div key={empresa.id} className="grid grid-cols-12 gap-4 px-5 py-4 items-center hover:bg-slate-800/30 transition-colors">

              {/* Empresa */}
              <div className="col-span-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm shrink-0">
                  {empresa.nombre[0]}
                </div>
                <div className="min-w-0">
                  <div className="text-white font-semibold text-sm truncate">{empresa.nombre}</div>
                  <div className="text-slate-500 text-xs truncate">{empresa.email}</div>
                  <div className="text-slate-600 text-[10px]">{new Date(empresa.createdAt).toLocaleDateString('es-ES')}</div>
                </div>
              </div>

              {/* Usuarios */}
              <div className="col-span-2 text-center">
                <div className="text-white font-bold text-lg">{empresa.totales.usuarios}</div>
                <div className="flex flex-wrap justify-center gap-1 mt-1">
                  {Object.entries(empresa.usuariosPorRol).map(([rol, count]) => (
                    <span key={rol} className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full">
                      {ROL_LABELS[rol] || rol} {count}
                    </span>
                  ))}
                </div>
              </div>

              {/* Obras */}
              <div className="col-span-2 text-center">
                <div className="text-white font-bold text-lg">{empresa.totales.obras}</div>
                <div className="text-slate-500 text-xs">{empresa.totales.clientes} clientes</div>
              </div>

              {/* Almacenamiento */}
              <div className="col-span-2 text-center">
                <div className="text-white font-bold text-lg">{empresa.totales.mb.toFixed(1)}</div>
                <div className="text-slate-500 text-xs">MB · {empresa.totales.documentos} docs</div>
              </div>

              {/* Plan */}
              <div className="col-span-2 text-center">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-700 text-slate-400 border border-slate-600">
                  — Sin plan —
                </span>
              </div>

              {/* Estado */}
              <div className="col-span-1 text-center">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${empresa.activa ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                  {empresa.activa ? 'Activa' : 'Inactiva'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-slate-700 text-xs">
        Instalyx SaaS · Panel interno · {new Date().toLocaleDateString('es-ES')}
      </p>
    </div>
  );
}
