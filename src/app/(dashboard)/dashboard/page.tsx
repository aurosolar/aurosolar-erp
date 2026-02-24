// src/app/(dashboard)/dashboard/page.tsx
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { tienePermiso } from '@/lib/auth';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session || !tienePermiso(session.rol, 'dashboard:ver')) {
    redirect('/obras');
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-auro-navy">
          Buenos días, {session.nombre} 👋
        </h2>
        <p className="text-sm text-auro-navy/50 mt-1">
          Aquí tienes el resumen de hoy
        </p>
      </div>

      {/* Placeholder KPIs — se desarrollarán en Sprint posterior */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {[
          { icon: '💶', label: 'Facturación mes', value: '—', color: 'bg-auro-orange/10 text-auro-orange' },
          { icon: '✅', label: 'Cobrado mes', value: '—', color: 'bg-estado-green/10 text-estado-green' },
          { icon: '⏰', label: 'Pendiente cobro', value: '—', color: 'bg-estado-red/10 text-estado-red' },
          { icon: '🏗️', label: 'Obras activas', value: '—', color: 'bg-estado-blue/10 text-estado-blue' },
          { icon: '👷', label: 'Instalaciones hoy', value: '—', color: 'bg-estado-amber/10 text-estado-amber' },
          { icon: '📊', label: 'Margen bruto', value: '—', color: 'bg-auro-navy/5 text-auro-navy' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-card border border-auro-border p-4 shadow-sm">
            <div className={`w-9 h-9 rounded-xl ${kpi.color} flex items-center justify-center text-lg mb-3`}>
              {kpi.icon}
            </div>
            <div className="text-[11px] text-auro-navy/40 font-semibold uppercase tracking-wider mb-1">
              {kpi.label}
            </div>
            <div className="text-xl font-extrabold text-auro-navy">
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-card border border-auro-border p-8 text-center">
        <div className="text-4xl mb-3">🚧</div>
        <p className="text-sm text-auro-navy/50 font-medium">
          Dashboard de KPIs en desarrollo — Sprint 2
        </p>
        <p className="text-xs text-auro-navy/30 mt-1">
          Ve a <a href="/obras" className="text-auro-orange font-semibold hover:underline">Obras</a> para gestionar el pipeline operativo
        </p>
      </div>
    </div>
  );
}
