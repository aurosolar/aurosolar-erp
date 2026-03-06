// src/components/incidencias/NuevaIncidenciaModal.tsx
'use client';
import { useState } from 'react';

interface Props {
  obraId: string;
  obraCodigo: string;
  onCreated: () => void;
  onClose: () => void;
}

const GRAVEDADES = [
  { value: 'BAJA', label: 'Baja', icon: '🟢', desc: 'SLA 72h' },
  { value: 'MEDIA', label: 'Media', icon: '🟡', desc: 'SLA 48h' },
  { value: 'ALTA', label: 'Alta', icon: '🟠', desc: 'SLA 24h' },
  { value: 'CRITICA', label: 'Crítica', icon: '🔴', desc: 'SLA 4h — bloquea obra' },
];

const CATEGORIAS = [
  { value: 'ELECTRICA', label: '⚡ Eléctrica' },
  { value: 'ESTRUCTURAL', label: '🏗️ Estructural' },
  { value: 'ESTETICA', label: '🎨 Estética' },
  { value: 'DOCUMENTAL', label: '📄 Documental' },
  { value: 'GARANTIA', label: '🛡️ Garantía' },
];

export function NuevaIncidenciaModal({ obraId, obraCodigo, onCreated, onClose }: Props) {
  const [gravedad, setGravedad] = useState('MEDIA');
  const [categoria, setCategoria] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  async function guardar() {
    if (descripcion.trim().length < 5) {
      setError('La descripción debe tener al menos 5 caracteres');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      const res = await fetch('/api/campo/incidencias', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'aurosolar-erp' },
        body: JSON.stringify({
          obraId,
          gravedad,
          descripcion: descripcion.trim(),
          categoria: categoria || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        onCreated();
      } else {
        setError(data.error || 'Error al crear incidencia');
      }
    } catch (e) {
      setError('Error de conexión');
    }
    setGuardando(false);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-auro-border">
          <div>
            <h3 className="text-base font-bold text-auro-navy">Nueva incidencia</h3>
            <p className="text-xs text-auro-navy/40 mt-0.5">{obraCodigo}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-auro-surface-2 text-auro-navy/40">✕</button>
        </div>

        <div className="p-4 space-y-4">
          {/* Gravedad */}
          <div>
            <label className="text-xs font-semibold text-auro-navy/50 uppercase tracking-wider mb-2 block">Gravedad</label>
            <div className="grid grid-cols-2 gap-2">
              {GRAVEDADES.map(g => (
                <button
                  key={g.value}
                  onClick={() => setGravedad(g.value)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-colors ${
                    gravedad === g.value
                      ? 'border-auro-orange bg-auro-orange/5'
                      : 'border-auro-border hover:border-auro-navy/20'
                  }`}
                >
                  <span className="text-lg">{g.icon}</span>
                  <div>
                    <div className="text-sm font-semibold text-auro-navy">{g.label}</div>
                    <div className="text-[10px] text-auro-navy/40">{g.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Categoría */}
          <div>
            <label className="text-xs font-semibold text-auro-navy/50 uppercase tracking-wider mb-2 block">Categoría</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIAS.map(c => (
                <button
                  key={c.value}
                  onClick={() => setCategoria(categoria === c.value ? '' : c.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    categoria === c.value
                      ? 'border-auro-orange bg-auro-orange/5 text-auro-orange'
                      : 'border-auro-border text-auro-navy/50 hover:border-auro-navy/20'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="text-xs font-semibold text-auro-navy/50 uppercase tracking-wider mb-2 block">Descripción</label>
            <textarea
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Describe el problema con detalle..."
              rows={3}
              className="w-full px-3 py-2 bg-auro-surface-2 border border-auro-border rounded-lg text-sm focus:outline-none focus:border-auro-orange/40 resize-none"
            />
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-auro-border">
          <button onClick={onClose} className="h-9 px-4 text-sm text-auro-navy/50 hover:text-auro-navy transition-colors">
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando || descripcion.trim().length < 5}
            className="h-9 px-5 bg-auro-orange hover:bg-auro-orange-dark text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
          >
            {guardando ? 'Creando...' : 'Crear incidencia'}
          </button>
        </div>
      </div>
    </div>
  );
}
