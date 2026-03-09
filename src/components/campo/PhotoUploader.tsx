// src/components/campo/PhotoUploader.tsx
'use client';

import { useState, useEffect, useRef } from 'react';

interface MediaFile {
  id: string;
  nombre: string;
  url: string | null;
  mimeType: string | null;
  tamanoBytes: number | null;
  createdAt: string;
}

interface Props {
  entityType: string;
  entityId: string;
  obraId?: string;
  tipo?: string;
  maxFotos?: number;
  required?: boolean;
  label?: string;
  compact?: boolean;
  onCountChange?: (count: number) => void;
}

// Compress image on client before upload
async function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width;
      let h = img.height;
      if (w > maxWidth) {
        h = (h * maxWidth) / w;
        w = maxWidth;
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => resolve(blob || file), 'image/jpeg', quality);
    };
    img.src = URL.createObjectURL(file);
  });
}

export default function PhotoUploader({ entityType, entityId, obraId, tipo, maxFotos = 10, required, label, compact, onCountChange }: Props) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [viewFile, setViewFile] = useState<MediaFile | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!entityId || entityId === 'pending') return;
    fetch(`/api/media/${entityType}/${entityId}`)
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          setFiles(d.data);
          onCountChange?.(d.data.length);
        }
      })
      .catch(() => {});
  }, [entityType, entityId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    if (!selected?.length) return;
    setUploading(true);

    for (let i = 0; i < selected.length; i++) {
      if (files.length + i >= maxFotos) break;
      const file = selected[i];

      try {
        const compressed = file.type.startsWith('image/')
          ? await compressImage(file)
          : file;

        const fd = new FormData();
        fd.append('file', compressed, file.name);
        fd.append('entityType', entityType);
        fd.append('entityId', entityId);
        if (obraId) fd.append('obraId', obraId);
        if (tipo) fd.append('tipo', tipo);

        const res = await fetch('/api/media/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.ok) {
          setFiles(prev => {
            const updated = [...prev, data.data];
            onCountChange?.(updated.length);
            return updated;
          });
        }
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta foto?')) return;
    try {
      await fetch(`/api/media/delete/${id}`, { method: 'DELETE' });
      setFiles(prev => {
        const updated = prev.filter(f => f.id !== id);
        onCountChange?.(updated.length);
        return updated;
      });
    } catch {}
  }

  const canAdd = files.length < maxFotos;

  return (
    <div>
      {label && (
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
          {label} {required && <span className="text-red-400">*</span>}
          <span className="text-slate-300 font-normal normal-case ml-1">({files.length}/{maxFotos})</span>
        </label>
      )}

      <div className={`grid gap-2 ${compact ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {/* Existing photos */}
        {files.map(f => (
          <div key={f.id} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200 group">
            {f.url ? (
              <img src={f.url} alt={f.nombre}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setViewFile(f)} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300 text-2xl">📷</div>
            )}
            <button onClick={() => handleDelete(f.id)}
              className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/50 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              ✕
            </button>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent p-1.5">
              <p className="text-[8px] text-white font-semibold truncate">{f.nombre}</p>
            </div>
          </div>
        ))}

        {/* Add button */}
        {canAdd && (
          <label className={`aspect-square rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors ${
            uploading ? 'pointer-events-none opacity-50' : ''
          }`}>
            {uploading ? (
              <div className="w-6 h-6 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
            ) : (
              <>
                <span className="text-2xl text-slate-300 mb-0.5">📷</span>
                <span className="text-[9px] text-slate-400 font-semibold">
                  {files.length === 0 ? 'Añadir foto' : 'Más'}
                </span>
              </>
            )}
            <input ref={inputRef} type="file" accept="image/*" capture="environment"
              multiple={maxFotos > 1} onChange={handleUpload} className="hidden" />
          </label>
        )}
      </div>

      {required && files.length === 0 && (
        <p className="text-[10px] text-red-400 font-semibold mt-1">⚠️ Foto obligatoria</p>
      )}

      {/* Fullscreen viewer */}
      {viewFile && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setViewFile(null)}>
          <button className="absolute top-4 right-4 w-10 h-10 bg-white/10 rounded-full text-white text-xl flex items-center justify-center">
            ✕
          </button>
          <img src={viewFile.url || ''} alt={viewFile.nombre}
            className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}
    </div>
  );
}
