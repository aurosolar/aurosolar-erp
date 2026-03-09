'use client';
import { useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
const H = { 'X-Requested-With': 'aurosolar-erp' };
function FotosForm() {
  const params = useSearchParams();
  const obraId = params.get('obraId') || '';
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [exito, setExito] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const seleccionar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selected]);
    selected.forEach(f => {
      const r = new FileReader();
      r.onload = ev => setPreviews(p => [...p, ev.target?.result as string]);
      r.readAsDataURL(f);
    });
  };
  const subir = async () => {
    if (!obraId || files.length === 0) return alert('Selecciona fotos primero');
    setSubiendo(true);
    let ok = 0;
    for (const file of files) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('entityType', 'obra');
      fd.append('entityId', obraId);
      fd.append('categoria', 'FOTO_INSTALACION');
      const r = await fetch('/api/media/upload', { method: 'POST', headers: H, body: fd }).then(r => r.json());
      if (r.ok) ok++;
    }
    setSubiendo(false);
    setExito(ok);
    setFiles([]);
    setPreviews([]);
    setTimeout(() => setExito(0), 3000);
  };
  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-white font-bold text-xl">Subir fotos</h1>
        <p className="text-slate-400 text-sm">{obraId ? `Obra: ${obraId.slice(-6)}` : 'Sin obra seleccionada'}</p>
      </div>
      {exito > 0 && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 text-green-400 text-sm font-bold text-center">
          ✅ {exito} foto{exito > 1 ? 's' : ''} subida{exito > 1 ? 's' : ''} correctamente
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" multiple capture="environment" onChange={seleccionar} className="hidden" />
      <button onClick={() => inputRef.current?.click()}
        className="w-full border-2 border-dashed border-slate-700 hover:border-green-500/50 bg-slate-900 rounded-2xl py-8 flex flex-col items-center gap-2 transition-colors">
        <span className="text-4xl">📷</span>
        <span className="text-slate-300 font-medium text-sm">Toca para añadir fotos</span>
        <span className="text-slate-500 text-xs">Cámara o galería</span>
      </button>
      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {previews.map((p, i) => (
            <div key={i} className="aspect-square rounded-xl overflow-hidden bg-slate-800">
              <img src={p} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}
      {files.length > 0 && (
        <button onClick={subir} disabled={subiendo}
          className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-sm transition-colors">
          {subiendo ? 'Subiendo...' : `📤 Subir ${files.length} foto${files.length > 1 ? 's' : ''}`}
        </button>
      )}
    </div>
  );
}
export default function CampoFotos() {
  return <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" /></div>}><FotosForm /></Suspense>;
}
