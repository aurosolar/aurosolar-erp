// src/app/(dashboard)/documentos/page.tsx
'use client';
import BuscadorObras from '@/components/ui/BuscadorObras';
import { useState, useEffect, useCallback, useRef } from 'react';

interface Doc {
  id: string; tipo: string; nombre: string; descripcion: string | null;
  mimeType: string | null; tamanoBytes: number | null; estado: string;
  visible: boolean; url: string | null; createdAt: string;
  obra: { codigo: string };
  subidoPor: { nombre: string };
}

const TIPOS: Record<string, { label: string; icon: string }> = {
  PRESUPUESTO: { label: 'Presupuesto', icon: '📄' },
  CONTRATO: { label: 'Contrato', icon: '📝' },
  FACTURA: { label: 'Factura', icon: '🧾' },
  BOLETIN: { label: 'Boletín', icon: '📋' },
  CERTIFICADO: { label: 'Certificado', icon: '🏅' },
  MEMORIA_TECNICA: { label: 'Memoria técnica', icon: '📐' },
  FOTO_INSTALACION: { label: 'Foto instalación', icon: '📷' },
  FOTO_INVERSOR: { label: 'Foto inversor', icon: '⚡' },
  FOTO_PANELES: { label: 'Foto paneles', icon: '☀️' },
  FOTO_CUADRO: { label: 'Foto cuadro', icon: '🔌' },
  FOTO_GENERAL: { label: 'Foto general', icon: '📸' },
  JUSTIFICANTE_PAGO: { label: 'Justificante pago', icon: '💳' },
  TICKET_GASTO: { label: 'Ticket gasto', icon: '🧾' },
  SUBVENCION: { label: 'Subvención', icon: '🏛️' },
  OTRO: { label: 'Otro', icon: '📎' },
};

const fmtSize = (b: number | null) => {
  if (!b) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
};

const isImage = (mime: string | null) => mime?.startsWith('image/') || false;

export default function DocumentosPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [showUpload, setShowUpload] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    const params = filtroTipo ? `?tipo=${filtroTipo}` : '';
    const res = await fetch(`/api/documentos${params}`);
    const data = await res.json();
    if (data.ok) setDocs(data.data);
    setLoading(false);
  }, [filtroTipo]);

  useEffect(() => { cargar(); }, [cargar]);

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar documento?')) return;
    await fetch(`/api/documentos/${id}`, { method: 'DELETE' });
    cargar();
  }

  async function toggleVisible(id: string) {
    await fetch(`/api/documentos/${id}`, { method: 'PATCH' });
    cargar();
  }

  const fotos = docs.filter(d => isImage(d.mimeType));
  const archivos = docs.filter(d => !isImage(d.mimeType));

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-auro-navy">Documentos</h2>
        <button onClick={() => setShowUpload(true)} className="h-9 px-4 bg-auro-orange hover:bg-auro-orange-dark text-white text-sm font-bold rounded-button transition-colors">
          📤 Subir archivo
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-card border border-auro-border p-3.5">
          <div className="text-lg mb-1">📁</div>
          <div className="text-2xl font-extrabold text-auro-navy">{docs.length}</div>
          <div className="text-[10px] text-auro-navy/30 font-semibold uppercase">Total documentos</div>
        </div>
        <div className="bg-white rounded-card border border-auro-border p-3.5">
          <div className="text-lg mb-1">📷</div>
          <div className="text-2xl font-extrabold text-estado-blue">{fotos.length}</div>
          <div className="text-[10px] text-auro-navy/30 font-semibold uppercase">Fotos</div>
        </div>
        <div className="bg-white rounded-card border border-auro-border p-3.5">
          <div className="text-lg mb-1">👁️</div>
          <div className="text-2xl font-extrabold text-estado-green">{docs.filter(d => d.visible).length}</div>
          <div className="text-[10px] text-auro-navy/30 font-semibold uppercase">Visible portal</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {[{ key: '', label: 'Todos' }, ...Object.entries(TIPOS).slice(0, 8).map(([k, v]) => ({ key: k, label: `${v.icon} ${v.label}` }))].map(f => (
          <button key={f.key} onClick={() => setFiltroTipo(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${filtroTipo === f.key ? 'bg-auro-orange text-white' : 'bg-auro-surface-2 text-auro-navy/50'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Galería fotos */}
      {!filtroTipo && fotos.length > 0 && (
        <div className="mb-5">
          <h3 className="text-xs font-bold text-auro-navy/30 uppercase mb-2">Fotos recientes</h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {fotos.slice(0, 12).map(f => (
              <a key={f.id} href={f.url || '#'} target="_blank" rel="noreferrer"
                className="w-20 h-20 rounded-xl bg-auro-surface-2 border border-auro-border flex items-center justify-center text-2xl shrink-0 overflow-hidden hover:border-auro-orange/40 transition-colors">
                {f.url ? (
                  <img src={f.url} alt={f.nombre} className="w-full h-full object-cover" />
                ) : (
                  <span>{TIPOS[f.tipo]?.icon || '📷'}</span>
                )}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Lista archivos */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-3 border-auro-orange/20 border-t-auro-orange rounded-full animate-spin" /></div>
      ) : docs.length === 0 ? (
        <div className="text-center py-12 text-auro-navy/30 text-sm">Sin documentos</div>
      ) : (
        <div className="space-y-1.5">
          {(filtroTipo ? docs : archivos).map(d => {
            const tipoCfg = TIPOS[d.tipo] || TIPOS.OTRO;
            return (
              <div key={d.id} className="bg-white rounded-card border border-auro-border p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-auro-surface-2 flex items-center justify-center text-lg shrink-0">
                  {tipoCfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{d.nombre}</div>
                  <div className="flex items-center gap-2 text-[10px] text-auro-navy/30">
                    <span>🏗️ {d.obra.codigo}</span>
                    <span>{tipoCfg.label}</span>
                    <span>{fmtSize(d.tamanoBytes)}</span>
                    <span>{new Date(d.createdAt).toLocaleDateString('es-ES')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => toggleVisible(d.id)} title={d.visible ? 'Visible en portal' : 'Oculto'}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${d.visible ? 'bg-estado-green/10 text-estado-green' : 'bg-auro-surface-2 text-auro-navy/25'}`}>
                    {d.visible ? '👁️' : '🔒'}
                  </button>
                  {d.url && (
                    <a href={d.url} target="_blank" rel="noreferrer" className="text-[10px] font-semibold text-auro-orange hover:underline">
                      ↓
                    </a>
                  )}
                  <button onClick={() => eliminar(d.id)} className="text-[10px] text-estado-red/40 hover:text-estado-red">✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSubido={() => { cargar(); setShowUpload(false); }} />}
    </div>
  );
}

function UploadModal({ onClose, onSubido }: { onClose: () => void; onSubido: () => void }) {
  const [obraId, setObraId] = useState('');
  const [tipo, setTipo] = useState('FOTO_GENERAL');
  const [descripcion, setDescripcion] = useState('');
  const [visible, setVisible] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);


  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) setFiles(Array.from(e.target.files));
  }

  async function subir() {
    if (!obraId || files.length === 0) return;
    setSubiendo(true);
    for (let i = 0; i < files.length; i++) {
      setProgreso(`Subiendo ${i + 1}/${files.length}...`);
      const fd = new FormData();
      fd.append('archivo', files[i]);
      fd.append('obraId', obraId);
      fd.append('tipo', tipo);
      if (descripcion) fd.append('descripcion', descripcion);
      fd.append('visible', String(visible));
      await fetch('/api/documentos', { method: 'POST', body: fd });
    }
    setSubiendo(false);
    onSubido();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5">
          <h3 className="text-base font-bold mb-4">📤 Subir documentos</h3>

          <div className="mb-3">
            <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Obra</label>
<div className="mb-3">
            <BuscadorObras value={obraId} onChange={v => setObraId(v)} />
          </div>
          </div>

          <div className="mb-3">
            <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1.5">Tipo de documento</label>
            <div className="grid grid-cols-3 gap-1.5 max-h-[150px] overflow-y-auto">
              {Object.entries(TIPOS).map(([key, cfg]) => (
                <button key={key} onClick={() => setTipo(key)}
                  className={`h-9 px-2 rounded-lg text-[10px] font-semibold border-2 transition-all truncate ${tipo === key ? 'border-auro-orange bg-auro-orange/10 text-auro-orange' : 'border-auro-border text-auro-navy/40'}`}>
                  {cfg.icon} {cfg.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Archivos</label>
            <input ref={inputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              onChange={onFileChange} className="hidden" />
            <button onClick={() => inputRef.current?.click()}
              className="w-full h-16 border-2 border-dashed border-auro-border rounded-xl flex items-center justify-center gap-2 text-sm text-auro-navy/40 hover:border-auro-orange/40 hover:text-auro-orange transition-colors">
              📎 {files.length > 0 ? `${files.length} archivo${files.length > 1 ? 's' : ''} seleccionado${files.length > 1 ? 's' : ''}` : 'Seleccionar archivos'}
            </button>
            {files.length > 0 && (
              <div className="mt-1.5 space-y-1">
                {files.map((f, i) => (
                  <div key={i} className="text-[10px] text-auro-navy/40 flex justify-between">
                    <span className="truncate">{f.name}</span>
                    <span>{fmtSize(f.size)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mb-3">
            <label className="block text-[10px] font-bold text-auro-navy/30 uppercase mb-1">Descripción (opcional)</label>
            <input value={descripcion} onChange={e => setDescripcion(e.target.value)}
              className="w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm focus:outline-none focus:border-auro-orange/40" />
          </div>

          <label className="flex items-center gap-2 mb-4 cursor-pointer">
            <input type="checkbox" checked={visible} onChange={e => setVisible(e.target.checked)}
              className="w-4 h-4 rounded border-auro-border accent-auro-orange" />
            <span className="text-xs text-auro-navy/50">👁️ Visible en portal del cliente</span>
          </label>

          <button onClick={subir} disabled={subiendo || !obraId || files.length === 0}
            className="w-full h-11 bg-auro-orange hover:bg-auro-orange-dark text-white font-bold rounded-button text-sm disabled:opacity-50 transition-colors">
            {subiendo ? progreso : `📤 Subir ${files.length} archivo${files.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
