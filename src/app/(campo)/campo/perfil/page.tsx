// src/app/(campo)/campo/perfil/page.tsx
'use client';

import { useRouter } from 'next/navigation';

export default function PerfilPage() {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <div>
      <h2 className="text-lg font-extrabold mb-4">👤 Mi perfil</h2>

      <div className="bg-white/[0.04] border border-white/[0.06] rounded-[14px] p-6 text-center mb-4">
        <div className="text-3xl mb-2">🚧</div>
        <p className="text-sm text-white/40">Perfil completo — próximo sprint</p>
      </div>

      <button
        onClick={handleLogout}
        className="w-full h-12 bg-[#DC2626]/15 border border-[#DC2626]/20 text-[#F87171] font-bold rounded-[14px] text-sm active:scale-[0.98] transition-transform"
      >
        Cerrar sesión
      </button>
    </div>
  );
}
