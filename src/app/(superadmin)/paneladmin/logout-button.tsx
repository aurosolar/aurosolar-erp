'use client';
export default function LogoutButton() {
  const handleLogout = () => {
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'X-Requested-With': 'aurosolar-erp', 'Content-Type': 'application/json' }
    }).then(() => { window.location.href = '/login'; });
  };
  return (
    <button onClick={handleLogout} className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer">
      Cerrar sesión
    </button>
  );
}
