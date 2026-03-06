'use client';
import { useState, useEffect, useRef } from 'react';

interface Obra {
  id: string;
  codigo: string;
  cliente?: { nombre: string; apellidos?: string };
  direccionInstalacion?: string;
  tipo?: string;
  estado?: string;
}

interface Props {
  value: string;
  onChange: (obraId: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

export default function BuscadorObras({ value, onChange, label = 'Obra', placeholder = 'Buscar por codigo, cliente o direccion...', className = '' }: Props) {
  const [query, setQuery] = useState('');
  const [obras, setObras] = useState<Obra[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Obra | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (value && !selected) {
      fetch('/api/obras?limit=100')
        .then(r => r.json())
        .then(d => {
          if (d.ok) {
            const list = d.data.obras || d.data.data || d.data;
            const found = list.find((o: Obra) => o.id === value);
            if (found) setSelected(found);
          }
        })
        .catch(() => {});
    }
  }, [value]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function buscar(texto: string) {
    setQuery(texto);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (texto.length < 2) { setObras([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/obras?q=' + encodeURIComponent(texto) + '&limit=10');
        const d = await res.json();
        if (d.ok) setObras(d.data.obras || d.data.data || d.data);
      } catch { setObras([]); }
      setLoading(false);
    }, 300);
  }

  function seleccionar(obra: Obra) {
    setSelected(obra);
    setQuery('');
    setOpen(false);
    onChange(obra.id);
  }

  function limpiar() {
    setSelected(null);
    setQuery('');
    onChange('');
  }

  const ec: Record<string, string> = {
    REVISION: 'bg-blue-100 text-blue-700',
    PREPARANDO: 'bg-yellow-100 text-yellow-700',
    PROGRAMADA: 'bg-purple-100 text-purple-700',
    INSTALANDO: 'bg-orange-100 text-orange-700',
    LEGALIZACION: 'bg-indigo-100 text-indigo-700',
    COMPLETADA: 'bg-green-100 text-green-700',
  };

  return (
    <div ref={ref} className={'relative ' + className}>
      {label && <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">{label}</label>}
      {selected ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-auro-surface-2 border border-auro-border rounded-button">
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-auro-navy text-sm">{selected.codigo}</span>
            {selected.cliente && (
              <span className="text-gray-500 text-sm ml-2">
                {'— ' + selected.cliente.nombre + ' ' + (selected.cliente.apellidos || '')}
              </span>
            )}
          </div>
          {selected.estado && (
            <span className={'px-2 py-0.5 rounded-full text-[10px] font-bold ' + (ec[selected.estado] || 'bg-gray-100 text-gray-600')}>
              {selected.estado}
            </span>
          )}
          <button onClick={limpiar} className="text-gray-400 hover:text-red-500 text-lg leading-none" title="Cambiar obra">x</button>
        </div>
      ) : (
        <input
          type="text"
          value={query}
          onChange={e => { buscar(e.target.value); setOpen(true); }}
          onFocus={() => { if (query.length >= 2) setOpen(true); }}
          placeholder={placeholder}
          className="w-full px-3 py-2 bg-auro-surface-2 border border-auro-border rounded-button text-sm focus:ring-2 focus:ring-auro-orange/30 focus:border-auro-orange outline-none"
        />
      )}
      {open && !selected && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-auro-border rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {loading && <div className="px-3 py-2 text-sm text-gray-400">Buscando...</div>}
          {!loading && query.length >= 2 && obras.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-400">No se encontraron obras</div>
          )}
          {obras.map(o => (
            <button
              key={o.id}
              onClick={() => seleccionar(o)}
              className="w-full text-left px-3 py-2 hover:bg-auro-orange/10 transition-colors border-b border-gray-50 last:border-0"
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-auro-navy text-sm">{o.codigo}</span>
                {o.tipo && <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{o.tipo}</span>}
                {o.estado && (
                  <span className={'px-1.5 py-0.5 rounded text-[10px] font-bold ' + (ec[o.estado] || 'bg-gray-100 text-gray-600')}>
                    {o.estado}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {o.cliente ? (o.cliente.nombre + ' ' + (o.cliente.apellidos || '')) : 'Sin cliente'}
                {o.direccionInstalacion ? (' - ' + o.direccionInstalacion) : ''}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
