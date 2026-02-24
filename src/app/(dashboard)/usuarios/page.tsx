// src/app/(dashboard)/usuarios/page.tsx
'use client';

import { useState, useEffect } from 'react';

interface Usuario {
  id: string; email: string; nombre: string; apellidos: string;
  rol: string; activo: boolean; telefono: string | null;
  zona: string | null; objetivoMensual: number | null; createdAt: string;
}

const ROLES: Record<string, { label: string; color: string }> = {
  ADMIN: { label: 'Admin', color: 'bg-estado-red/10 text-estado-red' },
  DIRECCION: { label: 'Dirección', color: 'bg-auro-navy/10 text-auro-navy' },
  COMERCIAL: { label: 'Comercial', color: 'bg-auro-orange/10 text-auro-orange' },
  JEFE_INSTALACIONES: { label: 'Jefe Inst.', color: 'bg-estado-purple/10 text-estado-purple' },
  INSTALADOR: { label: 'Instalador', color: 'bg-estado-blue/10 text-estado-blue' },
  ADMINISTRACION: { label: 'Administración', color: 'bg-estado-green/10 text-estado-green' },
};

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCrear, setShowCrear] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    const res = await fetch('/api/usuarios');
    const data = await res.json();
    if (data.ok) setUsuarios(data.data);
    setLoading(false);
  }

  async function toggleActivo(u: Usuario) {
    await fetch(`/api/usuarios/${u.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !u.activo }),
    });
    cargar();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-auro-navy">Usuarios</h2>
        <button onClick={() => setShowCrear(true)} className="h-9 px-4 bg-auro-orange hover:bg-auro-orange-dark text-white text-sm font-bold rounded-button transition-colors">
          + Nuevo usuario
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-3 border-auro-orange/20 border-t-auro-orange rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white rounded-card border border-auro-border overflow-hidden shadow-sm">
          {/* Desktop table */}
          <table className="w-full hidden sm:table">
            <thead>
              <tr className="bg-auro-surface-2">
                {['Usuario', 'Email', 'Rol', 'Teléfono', 'Estado', ''].map(h => (
                  <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-auro-navy/30 px-4 py-3 border-b border-auro-border">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => {
                const rolCfg = ROLES[u.rol] || ROLES.INSTALADOR;
                return (
                  <tr key={u.id} className={`border-b border-auro-border last:border-0 hover:bg-auro-surface-2/50 ${!u.activo ? 'opacity-40' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-auro-orange/10 flex items-center justify-center text-xs font-bold text-auro-orange shrink-0">
                          {u.nombre[0]}{u.apellidos ? u.apellidos[0] : ''}
                        </div>
                        <div>
                          <div className="text-sm font-semibold">{u.nombre} {u.apellidos}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-auro-navy/50">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${rolCfg.color}`}>{rolCfg.label}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-auro-navy/40">{u.telefono || '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActivo(u)} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${u.activo ? 'bg-estado-green/10 text-estado-green' : 'bg-estado-red/10 text-estado-red'}`}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setEditando(u)} className="text-[10px] font-semibold text-auro-orange hover:underline">Editar</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-auro-border">
            {usuarios.map((u) => {
              const rolCfg = ROLES[u.rol] || ROLES.INSTALADOR;
              return (
                <div key={u.id} onClick={() => setEditando(u)} className={`p-4 flex items-center gap-3 ${!u.activo ? 'opacity-40' : ''}`}>
                  <div className="w-10 h-10 rounded-full bg-auro-orange/10 flex items-center justify-center text-sm font-bold text-auro-orange shrink-0">
                    {u.nombre[0]}{u.apellidos ? u.apellidos[0] : ''}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{u.nombre} {u.apellidos}</div>
                    <div className="text-xs text-auro-navy/40">{u.email}</div>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${rolCfg.color}`}>{rolCfg.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showCrear && <UsuarioModal onClose={() => setShowCrear(false)} onGuardado={cargar} />}
      {editando && <UsuarioModal usuario={editando} onClose={() => setEditando(null)} onGuardado={cargar} />}
    </div>
  );
}

function UsuarioModal({ usuario, onClose, onGuardado }: { usuario?: Usuario; onClose: () => void; onGuardado: () => void }) {
  const esEditar = !!usuario;
  const [form, setForm] = useState({
    nombre: usuario?.nombre || '',
    apellidos: usuario?.apellidos || '',
    email: usuario?.email || '',
    password: '',
    rol: usuario?.rol || 'INSTALADOR',
    telefono: usuario?.telefono || '',
    zona: usuario?.zona || '',
    objetivoMensual: usuario?.objetivoMensual ? String(usuario.objetivoMensual / 100) : '',
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function guardar() {
    if (!form.nombre || (!esEditar && !form.email) || (!esEditar && !form.password)) {
      setError('Rellena los campos obligatorios');
      return;
    }
    setGuardando(true);
    setError('');

    const body: any = { ...form };
    if (form.objetivoMensual) body.objetivoMensual = Math.round(parseFloat(form.objetivoMensual) * 100);
    else delete body.objetivoMensual;
    if (!body.password) delete body.password;
    if (esEditar) delete body.email;

    const url = esEditar ? `/api/usuarios/${usuario!.id}` : '/api/usuarios';
    const method = esEditar ? 'PATCH' : 'POST';

    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();

    if (data.ok) { onGuardado(); onClose(); }
    else setError(data.error || 'Error al guardar');
    setGuardando(false);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5">
          <h3 className="text-base font-bold mb-4">{esEditar ? 'Editar usuario' : 'Nuevo usuario'}</h3>

          {error && <div className="mb-3 p-2.5 bg-estado-red/10 text-estado-red text-xs font-semibold rounded-xl">{error}</div>}

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Nombre *</label>
              <input value={form.nombre} onChange={e => set('nombre', e.target.value)} className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Apellidos</label>
              <input value={form.apellidos} onChange={e => set('apellidos', e.target.value)} className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40" />
            </div>
          </div>

          {!esEditar && (
            <div className="mb-3">
              <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Email *</label>
              <input value={form.email} onChange={e => set('email', e.target.value)} type="email" className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40" />
            </div>
          )}

          <div className="mb-3">
            <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">{esEditar ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}</label>
            <input value={form.password} onChange={e => set('password', e.target.value)} type="password" className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40" />
          </div>

          <div className="mb-3">
            <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Rol</label>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(ROLES).map(([key, cfg]) => (
                <button key={key} onClick={() => set('rol', key)}
                  className={`h-9 px-2.5 rounded-lg text-xs font-semibold border-2 transition-all ${form.rol === key ? cfg.color + ' border-current' : 'border-auro-border text-auro-navy/40'}`}>
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Teléfono</label>
              <input value={form.telefono} onChange={e => set('telefono', e.target.value)} type="tel" className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Objetivo (€/mes)</label>
              <input value={form.objetivoMensual} onChange={e => set('objetivoMensual', e.target.value)} type="number" placeholder="ej: 50000" className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40" />
            </div>
          </div>

          <button onClick={guardar} disabled={guardando} className="w-full h-11 bg-auro-orange hover:bg-auro-orange-dark text-white font-bold rounded-button text-sm disabled:opacity-50 transition-colors">
            {guardando ? 'Guardando...' : esEditar ? 'Guardar cambios' : '+ Crear usuario'}
          </button>
        </div>
      </div>
    </div>
  );
}
