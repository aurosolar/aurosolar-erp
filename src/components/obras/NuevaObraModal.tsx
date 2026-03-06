// src/components/obras/NuevaObraModal.tsx
'use client';

import { useState } from 'react';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export function NuevaObraModal({ onClose, onCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Formulario básico — se expandirá con selector de clientes, etc.
  const [form, setForm] = useState({
    clienteNombre: '',
    clienteApellidos: '',
    clienteTelefono: '',
    clienteEmail: '',
    tipo: 'RESIDENCIAL',
    direccionInstalacion: '',
    localidad: '',
    provincia: 'Cáceres',
    potenciaKwp: '',
    numPaneles: '',
    inversor: '',
    presupuestoEuros: '',
    notas: '',
  });

  function updateForm(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Primero crear el cliente
      // TODO: En siguiente sprint, permitir seleccionar cliente existente
      const clienteRes = await fetch('/api/clientes', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'aurosolar-erp' },
        body: JSON.stringify({
          nombre: form.clienteNombre,
          apellidos: form.clienteApellidos,
          telefono: form.clienteTelefono || undefined,
          email: form.clienteEmail || undefined,
        }),
      });
      const clienteData = await clienteRes.json();

      if (!clienteData.ok) {
        setError(clienteData.error || 'Error creando cliente');
        setLoading(false);
        return;
      }

      // Crear la obra
      const obraRes = await fetch('/api/obras', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'aurosolar-erp' },
        body: JSON.stringify({
          clienteId: clienteData.data.id,
          tipo: form.tipo,
          direccionInstalacion: form.direccionInstalacion || undefined,
          localidad: form.localidad || undefined,
          provincia: form.provincia || undefined,
          potenciaKwp: form.potenciaKwp ? parseFloat(form.potenciaKwp) : undefined,
          numPaneles: form.numPaneles ? parseInt(form.numPaneles) : undefined,
          inversor: form.inversor || undefined,
          presupuestoTotal: form.presupuestoEuros ? Math.round(parseFloat(form.presupuestoEuros) * 100) : 0,
          notas: form.notas || undefined,
        }),
      });
      const obraData = await obraRes.json();

      if (obraData.ok) {
        onCreated();
      } else {
        setError(obraData.error || 'Error creando obra');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-10 lg:pt-16 px-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mb-10" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 border-b border-auro-border flex items-center justify-between">
          <h3 className="text-lg font-bold text-auro-navy">Nueva obra</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-auro-surface-2 hover:bg-auro-surface-3 flex items-center justify-center text-lg">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Sección: Cliente */}
          <div className="text-xs font-semibold text-auro-navy/30 uppercase tracking-wider">Cliente</div>
          <div className="grid grid-cols-2 gap-3">
            <input value={form.clienteNombre} onChange={(e) => updateForm('clienteNombre', e.target.value)} placeholder="Nombre *" required className="h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40" />
            <input value={form.clienteApellidos} onChange={(e) => updateForm('clienteApellidos', e.target.value)} placeholder="Apellidos" className="h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40" />
            <input value={form.clienteTelefono} onChange={(e) => updateForm('clienteTelefono', e.target.value)} placeholder="Teléfono" type="tel" className="h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40" />
            <input value={form.clienteEmail} onChange={(e) => updateForm('clienteEmail', e.target.value)} placeholder="Email" type="email" className="h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40" />
          </div>

          {/* Sección: Instalación */}
          <div className="text-xs font-semibold text-auro-navy/30 uppercase tracking-wider pt-2">Instalación</div>
          <select value={form.tipo} onChange={(e) => updateForm('tipo', e.target.value)} className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40">
            <option value="RESIDENCIAL">🏠 Residencial</option>
            <option value="INDUSTRIAL">🏭 Industrial</option>
            <option value="AGROINDUSTRIAL">🌾 Agroindustrial</option>
            <option value="BATERIA">🔋 Batería</option>
            <option value="AEROTERMIA">🌡️ Aerotermia</option>
            <option value="BESS">🔋 BESS</option>
            <option value="BACKUP">⚡ Backup</option>
            <option value="ALQUILER_CUBIERTA">🏭 Alquiler cubierta</option>
            <option value="REPARACION">🔧 Reparación</option>
            <option value="SUSTITUCION">🔄 Sustitución equipo</option>
          </select>

          <input value={form.direccionInstalacion} onChange={(e) => updateForm('direccionInstalacion', e.target.value)} placeholder="Dirección de instalación" className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40" />

          <div className="grid grid-cols-2 gap-3">
            <input value={form.localidad} onChange={(e) => updateForm('localidad', e.target.value)} placeholder="Localidad" className="h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40" />
            <input value={form.provincia} onChange={(e) => updateForm('provincia', e.target.value)} placeholder="Provincia" className="h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40" />
          </div>

          {/* Sección: Técnico */}
          <div className="text-xs font-semibold text-auro-navy/30 uppercase tracking-wider pt-2">Datos técnicos</div>
          <div className="grid grid-cols-3 gap-3">
            <input value={form.potenciaKwp} onChange={(e) => updateForm('potenciaKwp', e.target.value)} placeholder="kWp" type="number" step="0.1" className="h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40" />
            <input value={form.numPaneles} onChange={(e) => updateForm('numPaneles', e.target.value)} placeholder="Nº paneles" type="number" className="h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40" />
            <input value={form.inversor} onChange={(e) => updateForm('inversor', e.target.value)} placeholder="Inversor" className="h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40" />
          </div>

          {/* Presupuesto */}
          <div className="text-xs font-semibold text-auro-navy/30 uppercase tracking-wider pt-2">Económico</div>
          <div className="relative">
            <input value={form.presupuestoEuros} onChange={(e) => updateForm('presupuestoEuros', e.target.value)} placeholder="Presupuesto total" type="number" step="0.01" className="w-full h-10 px-3 pr-8 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-auro-navy/30 font-bold">€</span>
          </div>

          {/* Notas */}
          <textarea value={form.notas} onChange={(e) => updateForm('notas', e.target.value)} placeholder="Notas..." rows={2} className="w-full px-3 py-2 bg-auro-surface-2 border border-auro-border rounded-input text-sm resize-none focus:outline-none focus:border-auro-orange/40" />

          {/* Error */}
          {error && (
            <div className="bg-estado-red/10 border border-estado-red/20 rounded-xl px-4 py-2 text-estado-red text-xs font-medium">
              ⚠️ {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !form.clienteNombre}
            className="w-full h-11 bg-auro-orange hover:bg-auro-orange-dark text-white font-bold rounded-button text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-auro-orange/20"
          >
            {loading ? 'Creando...' : 'Crear obra'}
          </button>
        </form>
      </div>
    </div>
  );
}
