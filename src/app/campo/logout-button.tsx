'use client';
export default function LogoutButtonCampo({ nombre }: { nombre: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400">{nombre}</span>
      <button
        onClick={() => fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'X-Requested-With': 'aurosolar-erp', 'Content-Type': 'application/json' }
        }).then(() => window.location.href = '/login')}
        className="text-[10px] text-slate-500 hover:text-white border border-slate-700 rounded-lg px-2 py-1 transition-colors"
      >Salir</button>
    </div>
  );
}
