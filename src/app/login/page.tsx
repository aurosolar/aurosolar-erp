// src/app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!data.ok) {
        setError(data.error || 'Error al iniciar sesión');
        setLoading(false);
        return;
      }

      // Redirigir según rol
      const rol = data.data.rol;
      if (rol === 'INSTALADOR') {
        router.push('/campo');
      } else if (rol === 'COMERCIAL') {
        router.push('/crm');
      } else {
        router.push('/dashboard');
      }
    } catch {
      setError('Error de conexión');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-auro-navy relative overflow-hidden">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-auro-orange/5 blur-3xl" />
        <div className="absolute -bottom-60 -left-40 w-[500px] h-[500px] rounded-full bg-auro-orange/3 blur-3xl" />
        {/* Patrón sutil de grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-auro-orange flex items-center justify-center text-3xl shadow-lg shadow-auro-orange/30">
              ☀️
            </div>
          </div>
          <h1 className="text-white text-2xl font-extrabold tracking-tight">
            Auro <span className="text-auro-orange">Solar</span>
          </h1>
          <p className="text-white/40 text-sm mt-1 font-medium">
            Sistema de gestión interno
          </p>
        </div>

        {/* Card de login */}
        <div className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-white text-lg font-bold mb-1">Iniciar sesión</h2>
          <p className="text-white/40 text-sm mb-6">Accede con tu cuenta de Auro Solar</p>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-white/60 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@aurosolar.es"
                required
                className="w-full h-12 px-4 bg-white/[0.07] border border-white/10 rounded-xl text-white placeholder-white/25 text-sm font-medium focus:outline-none focus:border-auro-orange/50 focus:bg-white/[0.09] transition-all duration-200"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-white/60 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full h-12 px-4 bg-white/[0.07] border border-white/10 rounded-xl text-white placeholder-white/25 text-sm font-medium focus:outline-none focus:border-auro-orange/50 focus:bg-white/[0.09] transition-all duration-200"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-estado-red/10 border border-estado-red/20 rounded-xl px-4 py-3 text-estado-red text-sm font-medium flex items-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-auro-orange hover:bg-auro-orange-dark text-white font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 mt-6 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-auro-orange/25"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-white/20 text-xs mt-8 font-medium">
          Auro Solar Energía · ERP v1.0
        </p>
      </div>
    </div>
  );
}
